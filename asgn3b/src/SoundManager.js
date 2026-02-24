class SoundManager {
  constructor() {
    this.audioContext = null;
    this.masterGainNode = null;
    this.sfxGainNode = null;
    this.ambienceGainNode = null;

    this.buffers = new Map();
    this.loadingPromises = new Map();
    this.oneShotCooldownUntilMs = new Map();
    this.activeVoiceCounts = new Map();
    this.loopEntries = new Map();

    this.grassStepSoundIds = ['grass1', 'grass2', 'grass3', 'grass4'];
    this.echoStepSoundIds = ['echo_step_1', 'echo_step_2', 'echo_step_3', 'echo_step_4'];
    this.footstepSoundIds = [...this.grassStepSoundIds];
    this.lastGrassStepIndex = -1;
    this.footstepSurfaceBlockIds = new Set([
      'grass',
      'grass_path',
      'dirt',
      'gravel',
      'trap_grass_top',
      'trap_path_top',
    ]);
    this.footstepDistanceAccumulator = 0;
    this.footstepMinSpeed = 0.35;
    this.footstepBaseDistance = 0.95;

    this.cicadaLoopKey = 'cicada-ambience';
    this.cicadaEnabled = false;
  }

  ensureAudioGraph() {
    if (this.audioContext && this.masterGainNode && this.sfxGainNode && this.ambienceGainNode) {
      return this.audioContext;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      console.warn('Web Audio API is not supported in this browser.');
      return null;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContextCtor();
    }

    if (!this.masterGainNode) {
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = 0.9;
      this.masterGainNode.connect(this.audioContext.destination);
    }

    if (!this.sfxGainNode) {
      this.sfxGainNode = this.audioContext.createGain();
      this.sfxGainNode.gain.value = 0.95;
      this.sfxGainNode.connect(this.masterGainNode);
    }

    if (!this.ambienceGainNode) {
      this.ambienceGainNode = this.audioContext.createGain();
      this.ambienceGainNode.gain.value = 0.45;
      this.ambienceGainNode.connect(this.masterGainNode);
    }

    return this.audioContext;
  }

  async loadSound(name, url) {
    if (!name || !url) return null;
    if (this.buffers.has(name)) return this.buffers.get(name);
    if (this.loadingPromises.has(name)) return this.loadingPromises.get(name);

    const context = this.ensureAudioGraph();
    if (!context) return null;

    const loadPromise = (async () => {
      let response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) {
        // If a sound file was added/replaced after the page initially loaded, force-cache can reuse
        // a stale cached miss. Retry once with a cache-busting request.
        response = await fetch(url, { cache: 'reload' });
      }
      if (!response.ok) {
        throw new Error(`Failed to load sound "${name}" from ${url} (${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const decoded = await context.decodeAudioData(arrayBuffer);
      this.buffers.set(name, decoded);
      return decoded;
    })()
      .catch((error) => {
        console.warn(error);
        return null;
      })
      .finally(() => {
        this.loadingPromises.delete(name);
      });

    this.loadingPromises.set(name, loadPromise);
    return loadPromise;
  }

  async loadAll(manifest = {}) {
    const entries = Object.entries(manifest || {});
    if (entries.length === 0) return;
    await Promise.all(entries.map(([name, url]) => this.loadSound(name, url)));
  }

  async resume() {
    const context = this.ensureAudioGraph();
    if (!context) return false;

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }

    if (this.cicadaEnabled) {
      this.ensureCicadaLoop();
    }
    return context.state === 'running';
  }

  getOutputNode(bus = 'sfx') {
    this.ensureAudioGraph();
    if (bus === 'ambience') return this.ambienceGainNode || this.masterGainNode || null;
    return this.sfxGainNode || this.masterGainNode || null;
  }

  getActiveVoiceCount(name) {
    return this.activeVoiceCounts.get(name) || 0;
  }

  incrementActiveVoice(name) {
    this.activeVoiceCounts.set(name, this.getActiveVoiceCount(name) + 1);
  }

  decrementActiveVoice(name) {
    const next = Math.max(0, this.getActiveVoiceCount(name) - 1);
    if (next <= 0) {
      this.activeVoiceCounts.delete(name);
      return;
    }
    this.activeVoiceCounts.set(name, next);
  }

  play(name, options = {}) {
    const buffer = this.buffers.get(name);
    if (!buffer) return null;

    const context = this.ensureAudioGraph();
    if (!context) return null;

    const cooldownMs = Math.max(0, Number(options.cooldownMs) || 0);
    const nowMs = performance.now();
    const cooldownKey = String(options.cooldownKey || name);
    const cooldownUntil = this.oneShotCooldownUntilMs.get(cooldownKey) || 0;
    if (cooldownMs > 0 && nowMs < cooldownUntil) {
      return null;
    }

    const maxVoices = Number.isFinite(options.maxVoices) ? Math.max(1, Math.floor(options.maxVoices)) : Infinity;
    if (Number.isFinite(maxVoices) && this.getActiveVoiceCount(name) >= maxVoices) {
      return null;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;

    const detune = Number(options.detuneCents);
    if (Number.isFinite(detune)) {
      source.detune.value = detune;
    }

    const playbackRate = Number(options.playbackRate);
    if (Number.isFinite(playbackRate) && playbackRate > 0) {
      source.playbackRate.value = playbackRate;
    }

    const gainNode = context.createGain();
    const volume = Number.isFinite(options.volume) ? Math.max(0, Number(options.volume)) : 1.0;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    const outputNode = this.getOutputNode(options.bus);
    if (!outputNode) return null;
    gainNode.connect(outputNode);

    this.incrementActiveVoice(name);
    source.onended = () => {
      this.decrementActiveVoice(name);
      try { source.disconnect(); } catch (e) {}
      try { gainNode.disconnect(); } catch (e) {}
    };

    if (cooldownMs > 0) {
      this.oneShotCooldownUntilMs.set(cooldownKey, nowMs + cooldownMs);
    }

    try {
      source.start();
    } catch (error) {
      this.decrementActiveVoice(name);
      try { source.disconnect(); } catch (e) {}
      try { gainNode.disconnect(); } catch (e) {}
      return null;
    }

    return source;
  }

  playRandom(names = [], options = {}) {
    if (!Array.isArray(names) || names.length === 0) return null;

    let index = 0;
    if (names.length === 1) {
      index = 0;
    } else {
      index = Math.floor(Math.random() * names.length);
      if (index === this.lastGrassStepIndex) {
        index = (index + 1) % names.length;
      }
    }
    this.lastGrassStepIndex = index;

    const detuneJitter = Number(options.detuneJitterCents);
    const detuneCents = Number.isFinite(detuneJitter)
      ? (Math.random() * 2 - 1) * detuneJitter
      : undefined;

    return this.play(names[index], {
      ...options,
      detuneCents,
    });
  }

  startLoop(name, loopKey = name, options = {}) {
    if (!name || !loopKey) return null;
    const existing = this.loopEntries.get(loopKey);
    if (existing) return existing;

    const buffer = this.buffers.get(name);
    if (!buffer) return null;

    const context = this.ensureAudioGraph();
    if (!context) return null;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = context.createGain();
    const targetVolume = Number.isFinite(options.volume) ? Math.max(0, Number(options.volume)) : 1.0;
    gainNode.gain.value = targetVolume;

    source.connect(gainNode);
    const outputNode = this.getOutputNode(options.bus || 'ambience');
    if (!outputNode) return null;
    gainNode.connect(outputNode);

    const entry = { name, loopKey, source, gainNode };
    this.loopEntries.set(loopKey, entry);
    source.onended = () => {
      const current = this.loopEntries.get(loopKey);
      if (current && current.source === source) {
        this.loopEntries.delete(loopKey);
      }
      try { source.disconnect(); } catch (e) {}
      try { gainNode.disconnect(); } catch (e) {}
    };

    try {
      source.start();
    } catch (error) {
      this.loopEntries.delete(loopKey);
      try { source.disconnect(); } catch (e) {}
      try { gainNode.disconnect(); } catch (e) {}
      return null;
    }

    return entry;
  }

  stopLoop(loopKey, fadeOutMs = 0) {
    const entry = this.loopEntries.get(loopKey);
    if (!entry || !entry.source || !entry.gainNode) return false;
    this.loopEntries.delete(loopKey);

    const context = this.audioContext;
    const safeFadeMs = Math.max(0, Number(fadeOutMs) || 0);

    try {
      if (context && safeFadeMs > 0) {
        const now = context.currentTime;
        entry.gainNode.gain.cancelScheduledValues(now);
        entry.gainNode.gain.setValueAtTime(entry.gainNode.gain.value, now);
        entry.gainNode.gain.linearRampToValueAtTime(0, now + safeFadeMs / 1000);
        entry.source.stop(now + safeFadeMs / 1000 + 0.02);
      } else {
        entry.source.stop();
      }
    } catch (error) {
      try { entry.source.stop(); } catch (e) {}
    }

    return true;
  }

  setLoopVolume(loopKey, volume, rampMs = 0) {
    const entry = this.loopEntries.get(loopKey);
    if (!entry || !entry.gainNode) return false;

    const targetVolume = Math.max(0, Number(volume) || 0);
    const safeRampMs = Math.max(0, Number(rampMs) || 0);
    const context = this.audioContext;

    try {
      if (context && safeRampMs > 0) {
        const now = context.currentTime;
        entry.gainNode.gain.cancelScheduledValues(now);
        entry.gainNode.gain.setValueAtTime(entry.gainNode.gain.value, now);
        entry.gainNode.gain.linearRampToValueAtTime(targetVolume, now + safeRampMs / 1000);
      } else if (context) {
        const now = context.currentTime;
        entry.gainNode.gain.cancelScheduledValues(now);
        entry.gainNode.gain.setValueAtTime(targetVolume, now);
      } else {
        entry.gainNode.gain.value = targetVolume;
      }
    } catch (error) {
      try {
        entry.gainNode.gain.value = targetVolume;
      } catch (e) {}
    }

    return true;
  }

  stopCicadaAbrupt() {
    this.cicadaEnabled = false;
    this.stopLoop(this.cicadaLoopKey, 0);
    return true;
  }

  fadeOutCicada(fadeOutMs = 400) {
    const durationMs = Number.isFinite(fadeOutMs) ? Math.max(0, fadeOutMs) : 0;
    this.cicadaEnabled = false;
    this.stopLoop(this.cicadaLoopKey, durationMs);
    return true;
  }

  setCicadaEnabled(enabled) {
    const nextEnabled = !!enabled;
    if (this.cicadaEnabled === nextEnabled) return this.cicadaEnabled;

    this.cicadaEnabled = nextEnabled;
    if (!this.cicadaEnabled) {
      this.stopLoop(this.cicadaLoopKey, 400);
      return this.cicadaEnabled;
    }

    this.ensureCicadaLoop();
    return this.cicadaEnabled;
  }

  ensureCicadaLoop() {
    if (!this.cicadaEnabled) return null;
    return this.startLoop('cicada', this.cicadaLoopKey, {
      bus: 'ambience',
      volume: 0.6,
    });
  }

  setFootstepSoundSet(kind = 'grass') {
    const key = String(kind || 'grass').toLowerCase();
    if (key === 'echo') {
      this.footstepSoundIds = [...this.echoStepSoundIds];
    } else {
      this.footstepSoundIds = [...this.grassStepSoundIds];
    }
    this.lastGrassStepIndex = -1;
    this.footstepDistanceAccumulator = 0;
    return key;
  }

  getSurfaceBlockIdUnderPlayer(world, player) {
    if (!world || !player) return null;
    const p = player.transform?.position?.elements;
    if (!p || p.length < 3) return null;

    const gx = Math.floor(p[0]);
    const gy = Math.floor(p[1] - 0.05);
    const gz = Math.floor(p[2]);
    const key = (typeof world.toGridKey === 'function')
      ? world.toGridKey(gx, gy, gz)
      : `${gx},${gy},${gz}`;
    const block = world.blocks?.get?.(key) || null;
    return block?.blockId || null;
  }

  updateFootsteps(world, dt) {
    if (!world || dt <= 0) return;
    const player = world.player;
    if (!player || player.isFreeCam) {
      this.footstepDistanceAccumulator = 0;
      return;
    }

    if (!player.isGrounded) {
      this.footstepDistanceAccumulator = 0;
      return;
    }

    const velocity = player.playerVelocity?.elements;
    if (!velocity || velocity.length < 3) {
      this.footstepDistanceAccumulator = 0;
      return;
    }

    const horizontalSpeed = Math.hypot(velocity[0], velocity[2]);
    if (horizontalSpeed < this.footstepMinSpeed) {
      this.footstepDistanceAccumulator = 0;
      return;
    }

    const surfaceBlockId = this.getSurfaceBlockIdUnderPlayer(world, player);
    if (!surfaceBlockId || !this.footstepSurfaceBlockIds.has(surfaceBlockId)) {
      this.footstepDistanceAccumulator = 0;
      return;
    }

    this.footstepDistanceAccumulator += horizontalSpeed * dt;

    const stepDistance = Math.max(0.45, this.footstepBaseDistance);
    let safety = 0;
    while (this.footstepDistanceAccumulator >= stepDistance && safety < 2) {
      this.footstepDistanceAccumulator -= stepDistance;
      this.playRandom(this.footstepSoundIds, {
        bus: 'sfx',
        volume: 0.20,
        cooldownMs: 25,
        cooldownKey: 'footstep',
        maxVoices: 3,
        detuneJitterCents: 90,
      });
      safety += 1;
    }
  }

  update(world, dt) {
    this.updateFootsteps(world, dt);
    if (this.cicadaEnabled) {
      this.ensureCicadaLoop();
    }
  }
}

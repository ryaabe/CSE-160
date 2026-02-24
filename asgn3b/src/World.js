// ColoredPoint.js (c) 2012 matsuda
const ENABLE_INFECTION = false;

class World {
  constructor() {
    this.player = new Player();
    this.spawn = { x: 0, y: 0, z: 6 };
    // static block data keyed by integer grid coords
    this.blocks = new Map();
    this.blockRevision = 0;
    this.groundPaddingBlocks = 1; 
    this.groundCollisionBounds = null;

    // dynamic/non-block objects
    this.entities = [];
    this.time = 0;
    this.infectionEnabled = ENABLE_INFECTION;
    this.playerTriggers = [];
    this.playerTriggerState = new Map();
    this.nextPlayerTriggerId = 1;

    // block infection config/state
    this.infectionSeedCoord = { x: 70, y: 2, z: 99 };
    this.infectionSpreadInterval = 0.35;
    this.infectionSpreadTimer = 0;
    this.infectionColor = [0.02, 0.02, 0.02, 1.0];
    this.infectionNeighborOffsets = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1],
    ];
    this.infectedBlockKeys = new Set();
    this.infectedBlockCoords = [];
    this.infectionRevision = 0;
    this.infectionFrontier = [];
    this.infectionFrontierKeys = new Set();
    this.infectionSpreadBounds = null;
    this.infectionExcludedKeys = new Set();
    this.infectionParticles = [];
    this.infectionParticlesEnabled = false;
    this.infectionParticleEmitAccumulator = 0;
    this.infectionParticleLifetime = 2.0;
    this.infectionParticleMaxCount = 240;
    this.infectionParticleEmitRate = 36.0;
    this.infectionParticleEmitRadius = 10.0;
    this.infectionParticleSpawnAttemptsPerParticle = 8;
    this.infectionParticleColor = [0.0, 0.0, 0.0, 1.0];
    this.dreadChaseInfectionEnabled = false;
    this.dreadChaseInfectionProgress = 0;
    this.dreadChaseInfectionColor = [0.02, 0.02, 0.02, 1.0];
    this.dreadChaseInfectionRevision = 0;
    this.dreadChaseInfectionUpdateAccumulator = 0;
    this.dreadChaseInfectionUpdateInterval = 1.0 / 12.0;
    this.dreadChaseInfectedKeys = new Set();
    this.dreadChaseInfectedCoords = [];
    this.dreadChaseInfectedCoordsMaxCount = 1800;
    this.dreadChaseFollowCenter = null;
    this.dreadChasePathForwardX = 1.0;
    this.dreadChasePathForwardZ = 0.0;
    this.dreadChaseFrontGapDotThreshold = 0.18;
    this.dreadChaseBaseFollowDistance = 8.5;
    this.dreadChaseEndFollowDistance = 4.0;
    this.dreadChaseFillOuterRadius = 28.0;
    this.dreadChaseOuterRadiusStart = 18.0;
    this.dreadChaseOuterRadiusEnd = 4.75;
    this.dreadChaseThicknessStart = 2.0;
    this.dreadChaseThicknessEnd = 3.1;
    this.dreadChaseGapHalfAngleDegStart = 70;
    this.dreadChaseGapHalfAngleDegEnd = 24;
    this.dreadChaseCenterFollowLerpSpeed = 2.2;
    this.dreadChaseColumnSearchBelow = 4;
    this.dreadChaseColumnSearchAbove = 2;
    this.windLeafParticlesEnabled = false;
    this.windLeafParticles = [];
    this.windLeafParticleEmitAccumulator = 0;
    this.windLeafParticleLifetime = 2.0;
    this.windLeafParticleMaxCount = 180;
    this.windLeafParticleEmitRate = 34.0;
    this.windLeafParticleEmitRadius = 12.0;
    this.windLeafParticleColor = [0.07, 0.2, 0.08, 1.0];

    // test block
    this.placeBlock(0, 0, 0, {
      textureNum: -2,
      color: [0.35, 0.8, 0.95, 1.0],
    });
    this.placeBlock(1, 0, 0, { blockId: "sky" });

    // temp skybox
    this.skyboxSize = 120;
    this.skyboxTransform = new Transform();
    this.skyboxTransform.setScale(this.skyboxSize, this.skyboxSize, this.skyboxSize);
    this.skybox = this.addEntity(createEntity("skybox", {
      renderShape: "cube",
      transform: this.skyboxTransform,
      textureNum: -2,
      // fallback color used if texture 0 is missing/not loaded yet
      color: [0.7529, 0.8471, 1.0, 1.0],
    }));
    this.updateSkyboxTransform();

    // temp
    this.groundTransform = new Transform();
    this.groundTransform.setPosition(-16, -2, -16);
    this.groundTransform.setScale(32, 1, 32);
    this.ground = this.addEntity(createEntity("ground", {
      renderShape: "cube",
      transform: this.groundTransform,
      textureNum: -2,
      color: [0.28, 0.65, 0.3, 1.0],
    }));
    this.updateGroundCollisionBoundsFromTransform();

    this.animal = this.addEntity(createEntity("animal", {
      renderShape: "animal",
      coords: { x: this.spawn.x + 0.5, y: this.spawn.y, z: this.spawn.z + 0.5 },
      yaw: 180,
      scale: 1.2,
    }));

    this.initializeInfection();
  }

  update(dt) {
    this.time += dt;
    this.player.update(dt, this);
    this.updatePlayerTriggers();
    this.updateSkyboxTransform();
    this.updateBlockInfection(dt);
    this.updateDreadChaseInfection(dt);
    this.updateInfectionParticles(dt);
    this.updateWindLeafParticles(dt);
  }

  addPlayerTrigger(trigger = {}) {
    if (!trigger || typeof trigger !== "object") return null;

    const hasValidId = (typeof trigger.id === "string" && trigger.id.trim().length > 0);
    const id = hasValidId ? trigger.id.trim() : `trigger-${this.nextPlayerTriggerId++}`;
    const normalizedTrigger = { ...trigger, id };
    const existingIndex = this.playerTriggers.findIndex((entry) => entry && entry.id === id);
    if (existingIndex >= 0) {
      this.playerTriggers[existingIndex] = normalizedTrigger;
    } else {
      this.playerTriggers.push(normalizedTrigger);
    }

    if (!this.playerTriggerState.has(id)) {
      this.playerTriggerState.set(id, { firedCount: 0, lastFiredTime: -Infinity });
    }

    return id;
  }

  removePlayerTrigger(id) {
    if (typeof id !== "string" || id.trim().length === 0) return false;
    const targetId = id.trim();
    const before = this.playerTriggers.length;
    this.playerTriggers = this.playerTriggers.filter((trigger) => trigger && trigger.id !== targetId);
    this.playerTriggerState.delete(targetId);
    return this.playerTriggers.length !== before;
  }

  clearPlayerTriggers() {
    this.playerTriggers = [];
    this.playerTriggerState.clear();
    this.nextPlayerTriggerId = 1;
  }

  resetPlayerTriggerState(id = null) {
    if (id == null) {
      for (const key of this.playerTriggerState.keys()) {
        this.playerTriggerState.set(key, { firedCount: 0, lastFiredTime: -Infinity });
      }
      return;
    }

    if (typeof id !== "string" || id.trim().length === 0) return;
    const targetId = id.trim();
    this.playerTriggerState.set(targetId, { firedCount: 0, lastFiredTime: -Infinity });
  }

  setPlayerTriggerEnabled(id, enabled) {
    if (typeof id !== "string" || id.trim().length === 0) return false;
    const targetId = id.trim();
    const trigger = this.playerTriggers.find((entry) => entry && entry.id === targetId);
    if (!trigger) return false;
    trigger.enabled = !!enabled;
    return true;
  }

  getPlayerCoordSnapshot() {
    const coords = this.player?.coords;
    if (coords && Number.isFinite(coords.x) && Number.isFinite(coords.y) && Number.isFinite(coords.z)) {
      return {
        x: Math.floor(coords.x),
        y: Math.floor(coords.y),
        z: Math.floor(coords.z),
      };
    }

    const p = this.player?.transform?.position?.elements;
    if (!p || p.length < 3) return null;
    return {
      x: Math.floor(p[0]),
      y: Math.floor(p[1]),
      z: Math.floor(p[2]),
    };
  }

  normalizeTriggerBox(boxLike) {
    if (!boxLike || typeof boxLike !== "object") return null;
    const minX = Number(boxLike.minX ?? boxLike.min?.x);
    const minY = Number(boxLike.minY ?? boxLike.min?.y);
    const minZ = Number(boxLike.minZ ?? boxLike.min?.z);
    const maxX = Number(boxLike.maxX ?? boxLike.max?.x);
    const maxY = Number(boxLike.maxY ?? boxLike.max?.y);
    const maxZ = Number(boxLike.maxZ ?? boxLike.max?.z);
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(minZ)) return null;
    if (!Number.isFinite(maxX) || !Number.isFinite(maxY) || !Number.isFinite(maxZ)) return null;

    return {
      minX: Math.floor(Math.min(minX, maxX)),
      maxX: Math.floor(Math.max(minX, maxX)),
      minY: Math.floor(Math.min(minY, maxY)),
      maxY: Math.floor(Math.max(minY, maxY)),
      minZ: Math.floor(Math.min(minZ, maxZ)),
      maxZ: Math.floor(Math.max(minZ, maxZ)),
    };
  }

  normalizeTriggerRadius(radiusLike, trigger = null) {
    if (radiusLike == null) return null;

    if (Number.isFinite(radiusLike)) {
      const center = trigger?.center || trigger?.positionCenter || trigger?.position?.center;
      if (!center) return null;
      const cx = Number(center.x);
      const cy = Number(center.y);
      const cz = Number(center.z);
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(cz)) return null;
      return {
        x: cx,
        y: cy,
        z: cz,
        radius: Math.max(0, Number(radiusLike)),
      };
    }

    if (typeof radiusLike !== "object") return null;
    const centerLike = radiusLike.center || radiusLike;
    const cx = Number(centerLike.x);
    const cy = Number(centerLike.y);
    const cz = Number(centerLike.z);
    const radius = Number(radiusLike.radius ?? radiusLike.r);
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(cz)) return null;
    if (!Number.isFinite(radius) || radius < 0) return null;

    return { x: cx, y: cy, z: cz, radius };
  }

  normalizeTriggerTimeWindow(timeLike) {
    if (!timeLike || typeof timeLike !== "object") return null;

    let start = Number(timeLike.start ?? timeLike.min ?? timeLike.after ?? -Infinity);
    let end = Number(timeLike.end ?? timeLike.max ?? timeLike.before ?? Infinity);
    if (!Number.isFinite(start)) start = -Infinity;
    if (!Number.isFinite(end)) end = Infinity;
    if (end < start) {
      const temp = start;
      start = end;
      end = temp;
    }

    return { start, end };
  }

  isCoordInsideBox(coords, box) {
    if (!coords || !box) return false;
    return (
      coords.x >= box.minX && coords.x <= box.maxX &&
      coords.y >= box.minY && coords.y <= box.maxY &&
      coords.z >= box.minZ && coords.z <= box.maxZ
    );
  }

  isCoordInsideRadius(coords, radiusConfig) {
    if (!coords || !radiusConfig) return false;
    const dx = coords.x - radiusConfig.x;
    const dy = coords.y - radiusConfig.y;
    const dz = coords.z - radiusConfig.z;
    return (dx * dx + dy * dy + dz * dz) <= (radiusConfig.radius * radiusConfig.radius);
  }

  doesTriggerMatchPosition(trigger, playerCoords) {
    const box = this.normalizeTriggerBox(
      trigger?.positionBox || trigger?.bounds || trigger?.position?.box || null
    );
    const radius = this.normalizeTriggerRadius(
      trigger?.positionRadius || trigger?.radius || trigger?.position?.radius || null,
      trigger
    );

    if (!box && !radius) return true;
    if (box && this.isCoordInsideBox(playerCoords, box)) return true;
    if (radius && this.isCoordInsideRadius(playerCoords, radius)) return true;
    return false;
  }

  doesTriggerMatchTime(trigger, currentTime) {
    const timeWindow = this.normalizeTriggerTimeWindow(
      trigger?.timeWindow || trigger?.time || trigger?.when || null
    );
    if (!timeWindow) return true;
    return currentTime >= timeWindow.start && currentTime <= timeWindow.end;
  }

  updatePlayerTriggers() {
    if (!Array.isArray(this.playerTriggers) || this.playerTriggers.length === 0) return;

    const playerCoords = this.getPlayerCoordSnapshot();
    if (!playerCoords) return;
    const currentTime = Number.isFinite(this.time) ? this.time : 0;

    for (const trigger of this.playerTriggers) {
      if (!trigger || typeof trigger !== "object") continue;
      if (trigger.enabled === false) continue;

      const triggerId = (typeof trigger.id === "string" && trigger.id.length > 0) ? trigger.id : null;
      if (!triggerId) continue;

      let state = this.playerTriggerState.get(triggerId);
      if (!state) {
        state = { firedCount: 0, lastFiredTime: -Infinity };
        this.playerTriggerState.set(triggerId, state);
      }

      const shouldFireOnce = trigger.once !== false;
      if (shouldFireOnce && state.firedCount > 0) continue;

      const cooldown = Math.max(0, Number(trigger.cooldown) || 0);
      const sinceLastFire = currentTime - state.lastFiredTime;
      if (cooldown > 0 && sinceLastFire < cooldown) continue;

      if (!this.doesTriggerMatchTime(trigger, currentTime)) continue;
      if (!this.doesTriggerMatchPosition(trigger, playerCoords)) continue;

      const context = {
        world: this,
        player: this.player,
        trigger,
        playerCoords: { ...playerCoords },
        time: currentTime,
        firedCount: state.firedCount,
      };

      if (typeof trigger.test === "function") {
        let passed = false;
        try {
          passed = !!trigger.test(context);
        } catch (error) {
          console.log(`Player trigger "${triggerId}" test failed:`, error);
        }
        if (!passed) continue;
      }

      state.firedCount += 1;
      state.lastFiredTime = currentTime;
      this.playerTriggerState.set(triggerId, state);

      if (typeof trigger.onTrigger === "function") {
        try {
          trigger.onTrigger({
            ...context,
            firedCount: state.firedCount,
          });
        } catch (error) {
          console.log(`Player trigger "${triggerId}" onTrigger failed:`, error);
        }
      }
    }
  }

  updateSkyboxTransform() {
    if (!this.skyboxTransform || !this.player) return;
    const p = this.player.transform.position.elements;
    const halfSize = this.skyboxSize * 0.5;
    this.skyboxTransform.setPosition(
      p[0] - halfSize,
      p[1] - halfSize,
      p[2] - halfSize
    );
  }

  getInfectionSeedCoord() {
    return {
      x: Math.floor(this.infectionSeedCoord.x),
      y: Math.floor(this.infectionSeedCoord.y),
      z: Math.floor(this.infectionSeedCoord.z),
    };
  }

  setInfectionEnabled(enabled) {
    this.infectionEnabled = !!enabled;
    if (!this.infectionEnabled) {
      this.infectionSpreadTimer = 0;
    }
    return this.infectionEnabled;
  }

  setInfectionParticlesEnabled(enabled, options = {}) {
    this.infectionParticlesEnabled = !!enabled;
    if (!this.infectionParticlesEnabled) {
      this.infectionParticleEmitAccumulator = 0;
      if (options && options.clear === true) {
        this.infectionParticles = [];
      }
    }
    return this.infectionParticlesEnabled;
  }

  setInfectionSpreadBounds(bounds = null) {
    if (!bounds) {
      this.infectionSpreadBounds = null;
      return null;
    }

    const normalized = this.normalizeTriggerBox(bounds);
    this.infectionSpreadBounds = normalized;
    return normalized;
  }

  setDreadChaseInfectionEnabled(enabled, options = {}) {
    const nextEnabled = !!enabled;
    this.dreadChaseInfectionEnabled = nextEnabled;
    if (nextEnabled) {
      // Force a refresh on the next update tick so the effect appears immediately.
      this.dreadChaseInfectionUpdateAccumulator = Math.max(
        this.dreadChaseInfectionUpdateAccumulator,
        Number(this.dreadChaseInfectionUpdateInterval) || 0
      );
    }
    if (!nextEnabled) {
      this.dreadChaseFollowCenter = null;
      this.dreadChaseInfectionUpdateAccumulator = 0;
      if (options && options.clear === true) {
        const hadCoords = this.dreadChaseInfectedCoords.length > 0;
        this.dreadChaseInfectedKeys.clear();
        this.dreadChaseInfectedCoords = [];
        if (hadCoords) {
          this.dreadChaseInfectionRevision += 1;
        }
      }
    }
    return this.dreadChaseInfectionEnabled;
  }

  setDreadChaseInfectionProgress(progress) {
    const next = Number(progress);
    this.dreadChaseInfectionProgress = Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : 0;
    return this.dreadChaseInfectionProgress;
  }

  setWindLeafParticlesEnabled(enabled, options = {}) {
    const nextEnabled = !!enabled;
    this.windLeafParticlesEnabled = nextEnabled;
    if (!nextEnabled) {
      this.windLeafParticleEmitAccumulator = 0;
      if (options && options.clear === true) {
        this.windLeafParticles = [];
      }
    }
    return this.windLeafParticlesEnabled;
  }

  isInfectionExcludedAt(x, y, z) {
    return this.infectionExcludedKeys.has(this.toGridKey(x, y, z));
  }

  clearInfectionAt(x, y, z) {
    const gx = Math.floor(Number(x));
    const gy = Math.floor(Number(y));
    const gz = Math.floor(Number(z));
    if (!Number.isFinite(gx) || !Number.isFinite(gy) || !Number.isFinite(gz)) return false;

    const key = this.toGridKey(gx, gy, gz);
    let changed = false;

    const block = this.blocks.get(key);
    if (block && block.isInfected) {
      block.isInfected = false;
      changed = true;
    }

    if (this.infectedBlockKeys.delete(key)) {
      changed = true;
    }

    const prevInfectedCount = this.infectedBlockCoords.length;
    if (prevInfectedCount > 0) {
      this.infectedBlockCoords = this.infectedBlockCoords.filter(
        (coord) => !(coord && coord.x === gx && coord.y === gy && coord.z === gz)
      );
      if (this.infectedBlockCoords.length !== prevInfectedCount) {
        changed = true;
      }
    }

    if (this.infectionFrontierKeys.delete(key)) {
      changed = true;
    }

    const prevFrontierCount = this.infectionFrontier.length;
    if (prevFrontierCount > 0) {
      this.infectionFrontier = this.infectionFrontier.filter(
        (coord) => !(coord && coord.x === gx && coord.y === gy && coord.z === gz)
      );
      if (this.infectionFrontier.length !== prevFrontierCount) {
        changed = true;
      }
    }

    if (changed) {
      this.infectionRevision += 1;
    }
    return changed;
  }

  setInfectionExcludedCoords(coords = []) {
    this.infectionExcludedKeys.clear();
    if (!Array.isArray(coords)) return 0;

    let count = 0;
    for (const coord of coords) {
      if (!coord || typeof coord !== "object") continue;
      const x = Math.floor(Number(coord.x));
      const y = Math.floor(Number(coord.y));
      const z = Math.floor(Number(coord.z));
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      this.infectionExcludedKeys.add(this.toGridKey(x, y, z));
      this.clearInfectionAt(x, y, z);
      count += 1;
    }
    return count;
  }

  isCoordInsideInfectionSpreadBounds(x, y, z) {
    if (!this.infectionSpreadBounds) return true;
    const box = this.infectionSpreadBounds;
    return (
      x >= box.minX && x <= box.maxX &&
      y >= box.minY && y <= box.maxY &&
      z >= box.minZ && z <= box.maxZ
    );
  }

  startInfectionAt(x, y, z, options = {}) {
    const gx = Math.floor(Number(x));
    const gy = Math.floor(Number(y));
    const gz = Math.floor(Number(z));
    if (!Number.isFinite(gx) || !Number.isFinite(gy) || !Number.isFinite(gz)) return false;

    this.infectionEnabled = true;
    if (!this.isCoordInsideInfectionSpreadBounds(gx, gy, gz)) return false;
    if (this.isInfectionExcludedAt(gx, gy, gz)) return false;

    const placeIfMissing = options?.placeIfMissing === true;
    const seedKey = this.toGridKey(gx, gy, gz);
    if (placeIfMissing && !this.blocks.has(seedKey)) {
      this.placeBlock(gx, gy, gz, {
        textureNum: -2,
        color: [...this.infectionColor],
      });
    }

    if (!this.blocks.has(seedKey)) return false;
    if (!this.infectBlockAt(gx, gy, gz)) return false;

    this.enqueueInfectionNeighbors(gx, gy, gz);
    return true;
  }

  infectBlockAt(x, y, z) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const gz = Math.floor(z);
    if (!this.isCoordInsideInfectionSpreadBounds(gx, gy, gz)) return false;
    if (this.isInfectionExcludedAt(gx, gy, gz)) return false;
    const key = this.toGridKey(gx, gy, gz);
    const block = this.blocks.get(key);
    if (!block || block.isInfected) return false;

    block.isInfected = true;
    this.infectedBlockKeys.add(key);
    this.infectedBlockCoords.push({ x: gx, y: gy, z: gz });
    this.infectionRevision += 1;
    return true;
  }

  enqueueInfectionNeighbors(x, y, z) {
    for (const offset of this.infectionNeighborOffsets) {
      const nx = x + offset[0];
      const ny = y + offset[1];
      const nz = z + offset[2];
      const key = this.toGridKey(nx, ny, nz);
      if (this.infectedBlockKeys.has(key) || this.infectionFrontierKeys.has(key)) continue;
      if (this.isInfectionExcludedAt(nx, ny, nz)) continue;
      if (!this.blocks.has(key)) continue;

      this.infectionFrontier.push({ x: nx, y: ny, z: nz });
      this.infectionFrontierKeys.add(key);
    }
  }

  spreadInfectionStep() {
    if (this.infectionFrontier.length === 0) return;

    const next = this.infectionFrontier.shift();
    const key = this.toGridKey(next.x, next.y, next.z);
    this.infectionFrontierKeys.delete(key);

    if (!this.infectBlockAt(next.x, next.y, next.z)) return;
    this.enqueueInfectionNeighbors(next.x, next.y, next.z);
  }

  initializeInfection() {
    this.infectionSpreadTimer = 0;
    this.infectedBlockKeys.clear();
    this.infectedBlockCoords = [];
    this.infectionRevision = 0;
    this.infectionFrontier = [];
    this.infectionFrontierKeys.clear();
    this.infectionParticles = [];
    this.infectionParticleEmitAccumulator = 0;
    this.dreadChaseInfectedKeys.clear();
    this.dreadChaseInfectedCoords = [];
    this.dreadChaseFollowCenter = null;
    this.dreadChaseInfectionProgress = 0;
    this.dreadChaseInfectionRevision = 0;
    this.dreadChaseInfectionUpdateAccumulator = 0;
    this.windLeafParticles = [];
    this.windLeafParticleEmitAccumulator = 0;
    if (!this.infectionEnabled) return;

    const seed = this.getInfectionSeedCoord();
    const seedKey = this.toGridKey(seed.x, seed.y, seed.z);
    if (!this.blocks.has(seedKey)) {
      this.placeBlock(seed.x, seed.y, seed.z, {
        textureNum: -2,
        color: [...this.infectionColor],
      });
    }

    if (!this.infectBlockAt(seed.x, seed.y, seed.z)) return;
    this.enqueueInfectionNeighbors(seed.x, seed.y, seed.z);
  }

  updateBlockInfection(dt) {
    if (!this.infectionEnabled) return;
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.infectionSpreadTimer += dt;

    while (this.infectionSpreadTimer >= this.infectionSpreadInterval) {
      this.infectionSpreadTimer -= this.infectionSpreadInterval;
      this.spreadInfectionStep();
      if (this.infectionFrontier.length === 0) break;
    }
  }

  getTopSolidBlockYInColumnNear(x, z, aroundY, belowRange = 4, aboveRange = 2) {
    const gx = Math.floor(Number(x));
    const gz = Math.floor(Number(z));
    const centerY = Math.floor(Number(aroundY));
    if (!Number.isFinite(gx) || !Number.isFinite(gz) || !Number.isFinite(centerY)) return null;

    const minY = centerY - Math.max(0, Math.floor(Number(belowRange) || 0));
    const maxY = centerY + Math.max(0, Math.floor(Number(aboveRange) || 0));
    for (let y = maxY; y >= minY; y -= 1) {
      if (this.isSolidBlockAtGrid(gx, y, gz)) return y;
    }
    return null;
  }

  updateDreadChaseInfection(dt) {
    if (!this.dreadChaseInfectionEnabled) {
      if (this.dreadChaseInfectedCoords.length > 0) {
        this.dreadChaseInfectedKeys.clear();
        this.dreadChaseInfectedCoords = [];
        this.dreadChaseInfectionRevision += 1;
      }
      this.dreadChaseInfectionUpdateAccumulator = 0;
      return;
    }
    if (!this.player?.transform?.position?.elements) return;

    const safeDt = Number.isFinite(dt) && dt > 0 ? Number(dt) : 0;
    this.dreadChaseInfectionUpdateAccumulator += safeDt;
    const updateInterval = Math.max(0.01, Number(this.dreadChaseInfectionUpdateInterval) || (1.0 / 12.0));
    if (this.dreadChaseInfectionUpdateAccumulator < updateInterval) {
      return;
    }
    // Keep the remainder only; this intentionally limits work to one ring update per frame.
    this.dreadChaseInfectionUpdateAccumulator = this.dreadChaseInfectionUpdateAccumulator % updateInterval;

    const playerPos = this.player.transform.position.elements;
    const playerX = Number(playerPos[0]) || 0;
    const playerY = Number(playerPos[1]) || 0;
    const playerZ = Number(playerPos[2]) || 0;
    let fx = Number(this.dreadChasePathForwardX);
    let fz = Number(this.dreadChasePathForwardZ);
    const flatLen = Math.hypot(fx, fz);
    if (flatLen > 0.0001) {
      fx /= flatLen;
      fz /= flatLen;
    } else {
      fx = 1;
      fz = 0;
    }

    const progress = Math.max(0, Math.min(1, Number(this.dreadChaseInfectionProgress) || 0));
    const approxGroundY = Math.floor(playerY) - 1;
    const centerX = playerX;
    const centerY = approxGroundY;
    const centerZ = playerZ;
    const safeRadius = this.dreadChaseOuterRadiusStart +
      (this.dreadChaseOuterRadiusEnd - this.dreadChaseOuterRadiusStart) * progress;
    const fillOuterRadius = Math.max(
      safeRadius + 1.0,
      Number(this.dreadChaseFillOuterRadius) || (this.dreadChaseOuterRadiusStart + 10.0)
    );
    const searchRadius = Math.max(1, Math.ceil(fillOuterRadius + 1));
    const centerGridY = Math.floor(centerY);
    let changed = false;

    for (let gx = Math.floor(centerX) - searchRadius; gx <= Math.floor(centerX) + searchRadius; gx += 1) {
      for (let gz = Math.floor(centerZ) - searchRadius; gz <= Math.floor(centerZ) + searchRadius; gz += 1) {
        const sampleX = gx + 0.5;
        const sampleZ = gz + 0.5;
        const dxCenter = sampleX - centerX;
        const dzCenter = sampleZ - centerZ;
        const distSq = dxCenter * dxCenter + dzCenter * dzCenter;
        if (distSq <= (safeRadius * safeRadius) || distSq >= (fillOuterRadius * fillOuterRadius)) continue;

        const dxPlayer = sampleX - playerX;
        const dzPlayer = sampleZ - playerZ;
        const playerVecLen = Math.hypot(dxPlayer, dzPlayer);
        if (playerVecLen > 0.0001) {
          const dotForward = ((dxPlayer / playerVecLen) * fx) + ((dzPlayer / playerVecLen) * fz);
          if (dotForward > (Number(this.dreadChaseFrontGapDotThreshold) || 0.0)) {
            // Keep most of the front open in a fixed world direction (path forward),
            // while letting the corruption wrap slightly past a perfect semicircle.
            continue;
          }
        }

        const topY = this.getTopSolidBlockYInColumnNear(
          gx,
          gz,
          centerGridY,
          this.dreadChaseColumnSearchBelow,
          this.dreadChaseColumnSearchAbove
        );
        if (topY == null) continue;
        if (this.isInfectionExcludedAt(gx, topY, gz)) continue;
        const key = this.toGridKey(gx, topY, gz);
        if (this.dreadChaseInfectedKeys.has(key)) continue;
        this.dreadChaseInfectedKeys.add(key);
        this.dreadChaseInfectedCoords.push({ x: gx, y: topY, z: gz });
        changed = true;
      }
    }

    const maxCoords = Math.max(64, Math.floor(Number(this.dreadChaseInfectedCoordsMaxCount) || 1800));
    if (this.dreadChaseInfectedCoords.length > maxCoords) {
      const overflow = this.dreadChaseInfectedCoords.length - maxCoords;
      const removedCoords = this.dreadChaseInfectedCoords.splice(0, overflow);
      for (const coord of removedCoords) {
        if (!coord) continue;
        this.dreadChaseInfectedKeys.delete(this.toGridKey(coord.x, coord.y, coord.z));
      }
      changed = true;
    }

    if (changed) {
      this.dreadChaseInfectionRevision += 1;
    }
  }

  spawnInfectionParticleAt(coord) {
    if (!coord) return false;
    if (this.infectionParticles.length >= this.infectionParticleMaxCount) return false;

    const x = Number(coord.x);
    const y = Number(coord.y);
    const z = Number(coord.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;

    this.infectionParticles.push({
      originX: x,
      originY: y,
      originZ: z,
      spawnTime: this.time,
      lifetime: this.infectionParticleLifetime,
      phase: Math.random() * Math.PI * 2,
      swayAmpX: 0.03 + Math.random() * 0.05,
      swayAmpZ: 0.03 + Math.random() * 0.05,
      riseSpeed: 0.28 + Math.random() * 0.18,
      bobAmp: 0.01 + Math.random() * 0.03,
      bobFreq: 7.0 + Math.random() * 5.0,
      sizeBase: 0.035 + Math.random() * 0.04,
      x: x + 0.5,
      y: y + 1.02,
      z: z + 0.5,
      size: 0.05,
    });
    return true;
  }

  tryEmitNearbyInfectionParticles(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (!this.infectionEnabled) return;
    if (!Array.isArray(this.infectedBlockCoords) || this.infectedBlockCoords.length === 0) return;
    if (!this.player?.transform?.position?.elements) return;

    this.infectionParticleEmitAccumulator += dt * this.infectionParticleEmitRate;
    let emitCount = Math.floor(this.infectionParticleEmitAccumulator);
    if (emitCount <= 0) return;
    this.infectionParticleEmitAccumulator -= emitCount;

    const playerPos = this.player.transform.position.elements;
    const playerX = Number(playerPos[0]) || 0;
    const playerY = Number(playerPos[1]) || 0;
    const playerZ = Number(playerPos[2]) || 0;
    const radius = Math.max(0, Number(this.infectionParticleEmitRadius) || 0);
    const radiusSq = radius * radius;
    const infected = this.infectedBlockCoords;
    const maxAttemptsPerParticle = Math.max(1, Math.floor(this.infectionParticleSpawnAttemptsPerParticle) || 1);

    emitCount = Math.min(
      emitCount,
      Math.max(0, this.infectionParticleMaxCount - this.infectionParticles.length),
      8 // cap burst work per frame
    );
    if (emitCount <= 0) return;

    for (let i = 0; i < emitCount; i += 1) {
      let emitted = false;
      for (let attempt = 0; attempt < maxAttemptsPerParticle; attempt += 1) {
        const idx = Math.floor(Math.random() * infected.length);
        const coord = infected[idx];
        if (!coord) continue;
        const dx = (coord.x + 0.5) - playerX;
        const dy = (coord.y + 0.5) - (playerY + (this.player.cameraEyeHeight || 0));
        const dz = (coord.z + 0.5) - playerZ;
        if ((dx * dx + dy * dy + dz * dz) > radiusSq) continue;
        if (this.isInfectionExcludedAt(coord.x, coord.y, coord.z)) continue;
        emitted = this.spawnInfectionParticleAt(coord);
        if (emitted) break;
      }
      if (!emitted && i === 0) {
        // If we couldn't find a nearby infected block, avoid repeated random scans this frame.
        break;
      }
    }
  }

  updateInfectionParticles(dt) {
    if (!this.infectionParticlesEnabled) {
      if (this.infectionParticles.length > 0) {
        this.infectionParticles = [];
      }
      this.infectionParticleEmitAccumulator = 0;
      return;
    }
    if (Array.isArray(this.infectionParticles) && this.infectionParticles.length > 0) {
      const nextParticles = [];
      const now = this.time;
      for (const particle of this.infectionParticles) {
        if (!particle) continue;
        const lifetime = Math.max(0.05, Number(particle.lifetime) || this.infectionParticleLifetime);
        const age = now - (Number(particle.spawnTime) || 0);
        if (!Number.isFinite(age) || age < 0 || age >= lifetime) continue;

        const t = age / lifetime;
        const phase = Number(particle.phase) || 0;
        const swayX = Math.sin(age * 5.3 + phase) * (Number(particle.swayAmpX) || 0);
        const swayZ = Math.cos(age * 4.7 + phase) * (Number(particle.swayAmpZ) || 0);
        const bob = Math.sin(age * (Number(particle.bobFreq) || 8.0) + phase) * (Number(particle.bobAmp) || 0);
        const rise = age * (Number(particle.riseSpeed) || 0.3);

        particle.x = (Number(particle.originX) || 0) + 0.5 + swayX;
        particle.y = (Number(particle.originY) || 0) + 1.02 + rise + bob;
        particle.z = (Number(particle.originZ) || 0) + 0.5 + swayZ;

        const baseSize = Math.max(0.01, Number(particle.sizeBase) || 0.04);
        const fadeScale = 1.0 - (t * 0.7);
        particle.size = Math.max(0.008, baseSize * fadeScale);

        nextParticles.push(particle);
      }
      this.infectionParticles = nextParticles;
    }

    this.tryEmitNearbyInfectionParticles(dt);
  }

  spawnWindLeafParticleNearPlayer() {
    if (!this.player?.transform?.position?.elements) return false;
    if (this.windLeafParticles.length >= this.windLeafParticleMaxCount) return false;

    const playerPos = this.player.transform.position.elements;
    const playerX = Number(playerPos[0]) || 0;
    const playerY = Number(playerPos[1]) || 0;
    const playerZ = Number(playerPos[2]) || 0;
    const eyeHeight = Number(this.player.cameraEyeHeight) || 0.6;
    const radius = Math.max(1, Number(this.windLeafParticleEmitRadius) || 12);
    const angle = Math.random() * Math.PI * 2;
    const distance = radius * (0.35 + Math.random() * 0.65);
    const spawnX = playerX + Math.cos(angle) * distance;
    const spawnZ = playerZ + Math.sin(angle) * distance;
    const spawnY = playerY + eyeHeight * (0.15 + Math.random() * 1.35);

    this.windLeafParticles.push({
      spawnTime: this.time,
      lifetime: this.windLeafParticleLifetime * (0.8 + Math.random() * 0.5),
      phase: Math.random() * Math.PI * 2,
      baseX: spawnX,
      baseY: spawnY,
      baseZ: spawnZ,
      x: spawnX,
      y: spawnY,
      z: spawnZ,
      vx: 1.2 + Math.random() * 1.6,
      vy: -0.03 + Math.random() * 0.08,
      vz: -0.25 + Math.random() * 0.5,
      gustAmp: 0.08 + Math.random() * 0.14,
      flutterAmp: 0.03 + Math.random() * 0.05,
      flutterFreq: 6.0 + Math.random() * 5.0,
      sizeBase: 0.018 + Math.random() * 0.018,
      size: 0.02,
    });
    return true;
  }

  tryEmitWindLeafParticles(dt) {
    if (!this.windLeafParticlesEnabled) return;
    if (!Number.isFinite(dt) || dt <= 0) return;

    this.windLeafParticleEmitAccumulator += dt * this.windLeafParticleEmitRate;
    let emitCount = Math.floor(this.windLeafParticleEmitAccumulator);
    if (emitCount <= 0) return;
    this.windLeafParticleEmitAccumulator -= emitCount;

    emitCount = Math.min(
      emitCount,
      Math.max(0, this.windLeafParticleMaxCount - this.windLeafParticles.length),
      10
    );
    if (emitCount <= 0) return;

    for (let i = 0; i < emitCount; i += 1) {
      if (!this.spawnWindLeafParticleNearPlayer()) break;
    }
  }

  updateWindLeafParticles(dt) {
    if (Array.isArray(this.windLeafParticles) && this.windLeafParticles.length > 0) {
      const nextParticles = [];
      const now = this.time;
      for (const particle of this.windLeafParticles) {
        if (!particle) continue;
        const lifetime = Math.max(0.05, Number(particle.lifetime) || this.windLeafParticleLifetime);
        const age = now - (Number(particle.spawnTime) || 0);
        if (!Number.isFinite(age) || age < 0 || age >= lifetime) continue;

        const t = age / lifetime;
        const phase = Number(particle.phase) || 0;
        const vx = Number(particle.vx) || 0;
        const vy = Number(particle.vy) || 0;
        const vz = Number(particle.vz) || 0;
        const gustAmp = Number(particle.gustAmp) || 0;
        const flutterAmp = Number(particle.flutterAmp) || 0;
        const flutterFreq = Number(particle.flutterFreq) || 8.0;
        const gustX = Math.sin(age * 2.1 + phase) * gustAmp;
        const gustZ = Math.cos(age * 1.7 + phase * 0.9) * gustAmp * 0.65;
        const flutterY = Math.sin(age * flutterFreq + phase) * flutterAmp;

        particle.x = (Number(particle.baseX) || 0) + age * vx + gustX;
        particle.y = (Number(particle.baseY) || 0) + age * vy + flutterY;
        particle.z = (Number(particle.baseZ) || 0) + age * vz + gustZ;

        const baseSize = Math.max(0.008, Number(particle.sizeBase) || 0.02);
        const fadeScale = 1.0 - (t * 0.55);
        particle.size = Math.max(0.006, baseSize * fadeScale);

        nextParticles.push(particle);
      }
      this.windLeafParticles = nextParticles;
    }

    this.tryEmitWindLeafParticles(dt);
  }

  isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  updateGroundCollisionBoundsFromTransform() {
    if (!this.groundTransform) return;

    const position = this.groundTransform.position.elements;
    const scale = this.groundTransform.scale.elements;
    const minX = Math.floor(position[0]);
    const minY = Math.floor(position[1]);
    const minZ = Math.floor(position[2]);
    const width = Math.max(1, Math.round(scale[0]));
    const depth = Math.max(1, Math.round(scale[2]));
    this.groundCollisionBounds = {
      minX,
      maxX: minX + width - 1,
      y: minY,
      minZ,
      maxZ: minZ + depth - 1,
    };
  }

  fitGroundPlaneToBounds(bounds, paddingBlocks = this.groundPaddingBlocks) {
    if (!this.groundTransform || !bounds) return;

    const padding = Math.max(0, Math.floor(paddingBlocks));
    const minX = Math.floor(bounds.minX);
    const minY = Math.floor(bounds.minY);
    const minZ = Math.floor(bounds.minZ);
    const maxX = Math.floor(bounds.maxX);
    const maxZ = Math.floor(bounds.maxZ);
    const width = Math.max(1, (maxX - minX + 1) + padding * 2);
    const depth = Math.max(1, (maxZ - minZ + 1) + padding * 2);
    const groundX = minX - padding;
    const groundY = minY - 21;
    const groundZ = minZ - padding;

    this.groundTransform.setPosition(groundX, groundY, groundZ);
    this.groundTransform.setScale(width, 1, depth);
    this.updateGroundCollisionBoundsFromTransform();
  }

  resolveAnimalPlacement(bounds = null) {
    const fallback = bounds
      ? {
          x: Math.floor((bounds.minX + bounds.maxX) * 0.5) + 0.5,
          y: bounds.maxY + 1,
          z: Math.floor((bounds.minZ + bounds.maxZ) * 0.5) + 0.5,
        }
      : {
          x: this.spawn.x + 0.5,
          y: this.spawn.y + 1,
          z: this.spawn.z + 0.5,
        };

    let glassCount = 0;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    for (const block of this.blocks.values()) {
      if (!block || !block.coords || block.blockId !== "glass") continue;
      glassCount += 1;
      sumX += block.coords.x;
      sumY += block.coords.y;
      sumZ += block.coords.z;
    }

    if (glassCount === 0) {
      return { ...fallback, yaw: 180, scale: 1.2 };
    }

    const centerX = Math.round(sumX / glassCount);
    const centerZ = Math.round(sumZ / glassCount);
    const avgGlassY = sumY / glassCount;
    const minSearchY = bounds ? Math.floor(bounds.minY) - 32 : -64;
    let floorY = null;
    for (let y = Math.floor(avgGlassY) - 1; y >= minSearchY; y -= 1) {
      if (this.isSolidBlockAtGrid(centerX, y, centerZ)) {
        floorY = y;
        break;
      }
    }

    if (!Number.isFinite(floorY)) {
      floorY = bounds ? Math.floor(bounds.minY) : 0;
    }

    return {
      x: centerX + 0.5,
      y: floorY + 1,
      z: centerZ + 0.5,
      yaw: 180,
      scale: 1.2,
    };
  }

  updateAnimalPlacement(bounds = null) {
    if (!this.animal) return;
    const placement = this.resolveAnimalPlacement(bounds);
    this.animal.coords = {
      x: placement.x,
      y: placement.y,
      z: placement.z,
    };
    this.animal.yaw = placement.yaw;
    this.animal.scale = placement.scale;
  }

  setSpawn(spawn, movePlayer = true) {
    if (!spawn || !this.isFiniteNumber(spawn.x) || !this.isFiniteNumber(spawn.y) || !this.isFiniteNumber(spawn.z)) {
      return false;
    }

    const safeSpawn = this.resolveSafeSpawn(spawn);
    const nextSpawn = { x: safeSpawn.x, y: safeSpawn.y, z: safeSpawn.z };
    if (this.isFiniteNumber(spawn.pitch)) nextSpawn.pitch = spawn.pitch;
    if (this.isFiniteNumber(spawn.yaw)) nextSpawn.yaw = spawn.yaw;
    if (this.isFiniteNumber(spawn.roll)) nextSpawn.roll = spawn.roll;
    this.spawn = nextSpawn;
    if (movePlayer && this.player) {
      this.player.setPosition(safeSpawn.x, safeSpawn.y, safeSpawn.z, true);
      const rotation = this.player.transform?.rotation?.elements;
      if (rotation) {
        if (this.isFiniteNumber(spawn.pitch)) rotation[0] = spawn.pitch;
        if (this.isFiniteNumber(spawn.yaw)) rotation[1] = spawn.yaw;
        if (this.isFiniteNumber(spawn.roll)) rotation[2] = spawn.roll;
        if (typeof this.player.updateVectors === "function") {
          this.player.updateVectors();
        }
      }
      this.updateSkyboxTransform();
    }
    return true;
  }

  resolveSafeSpawn(spawn, maxLift = 64) {
    if (!this.player || typeof this.player.collidesWithWorld !== "function") {
      return { x: spawn.x, y: spawn.y, z: spawn.z };
    }

    if (!this.player.collidesWithWorld(this, spawn.x, spawn.y, spawn.z)) {
      return { x: spawn.x, y: spawn.y, z: spawn.z };
    }

    for (let lift = 1; lift <= maxLift; lift += 1) {
      const testY = spawn.y + lift;
      if (!this.player.collidesWithWorld(this, spawn.x, testY, spawn.z)) {
        return { x: spawn.x, y: testY, z: spawn.z };
      }
    }

    return { x: spawn.x, y: spawn.y, z: spawn.z };
  }

  resolveSpawnFromWorldData(worldData, offsetX, offsetY, offsetZ, bounds) {
    const fromTopLevel = worldData?.spawn;
    if (fromTopLevel && this.isFiniteNumber(fromTopLevel.x) && this.isFiniteNumber(fromTopLevel.y) && this.isFiniteNumber(fromTopLevel.z)) {
      const resolved = {
        x: fromTopLevel.x + offsetX,
        y: fromTopLevel.y + offsetY,
        z: fromTopLevel.z + offsetZ,
      };
      if (this.isFiniteNumber(fromTopLevel.pitch)) resolved.pitch = fromTopLevel.pitch;
      if (this.isFiniteNumber(fromTopLevel.yaw)) resolved.yaw = fromTopLevel.yaw;
      if (this.isFiniteNumber(fromTopLevel.roll)) resolved.roll = fromTopLevel.roll;
      return resolved;
    }

    const fromMeta = worldData?.meta?.spawn;
    if (fromMeta && this.isFiniteNumber(fromMeta.x) && this.isFiniteNumber(fromMeta.y) && this.isFiniteNumber(fromMeta.z)) {
      const resolved = {
        x: fromMeta.x + offsetX,
        y: fromMeta.y + offsetY,
        z: fromMeta.z + offsetZ,
      };
      if (this.isFiniteNumber(fromMeta.pitch)) resolved.pitch = fromMeta.pitch;
      if (this.isFiniteNumber(fromMeta.yaw)) resolved.yaw = fromMeta.yaw;
      if (this.isFiniteNumber(fromMeta.roll)) resolved.roll = fromMeta.roll;
      return resolved;
    }

    if (bounds && this.isFiniteNumber(bounds.minX) && this.isFiniteNumber(bounds.maxX) &&
        this.isFiniteNumber(bounds.maxY) && this.isFiniteNumber(bounds.minZ) && this.isFiniteNumber(bounds.maxZ)) {
      return {
        x: Math.floor((bounds.minX + bounds.maxX) * 0.5),
        y: bounds.maxY + 2,
        z: Math.floor((bounds.minZ + bounds.maxZ) * 0.5),
      };
    }

    return { ...this.spawn };
  }

  toGridKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  isSolidBlockAtGrid(x, y, z) {
    const key = this.toGridKey(x, y, z);
    return this.blocks.has(key);
  }

  isCollidableBlockAtGrid(x, y, z) {
    const key = this.toGridKey(x, y, z);
    const block = this.blocks.get(key);
    if (!block) return false;
    return block.collides !== false;
  }

  isGroundPlaneSolidAtGrid(x, y, z) {
    const bounds = this.groundCollisionBounds;
    if (!bounds) return false;
    if (y !== bounds.y) return false;
    if (x < bounds.minX || x > bounds.maxX) return false;
    if (z < bounds.minZ || z > bounds.maxZ) return false;
    return true;
  }

  isSolidForCollisionAtGrid(x, y, z) {
    if (this.isCollidableBlockAtGrid(x, y, z)) return true;
    return this.isGroundPlaneSolidAtGrid(x, y, z);
  }

  isSolidAtWorld(x, y, z) {
    return this.isSolidForCollisionAtGrid(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z)
    );
  }

  raycastBlock(origin, direction, maxDistance = 6.0, step = 0.05) {
    if (!origin || !direction) return null;

    const dx = Number(direction.x);
    const dy = Number(direction.y);
    const dz = Number(direction.z);
    const length = Math.hypot(dx, dy, dz);
    if (length <= 0) return null;

    const invLength = 1 / length;
    const dirX = dx * invLength;
    const dirY = dy * invLength;
    const dirZ = dz * invLength;
    const safeStep = Math.max(0.01, step);

    let cellX = Math.floor(origin.x);
    let cellY = Math.floor(origin.y);
    let cellZ = Math.floor(origin.z);
    let lastEmpty = null;
    if (!this.isSolidBlockAtGrid(cellX, cellY, cellZ)) {
      lastEmpty = { x: cellX, y: cellY, z: cellZ };
    }

    for (let distance = safeStep; distance <= maxDistance; distance += safeStep) {
      const sampleX = origin.x + dirX * distance;
      const sampleY = origin.y + dirY * distance;
      const sampleZ = origin.z + dirZ * distance;
      const nextCellX = Math.floor(sampleX);
      const nextCellY = Math.floor(sampleY);
      const nextCellZ = Math.floor(sampleZ);

      if (nextCellX === cellX && nextCellY === cellY && nextCellZ === cellZ) {
        continue;
      }

      cellX = nextCellX;
      cellY = nextCellY;
      cellZ = nextCellZ;

      if (this.isSolidBlockAtGrid(cellX, cellY, cellZ)) {
        return {
          block: { x: cellX, y: cellY, z: cellZ },
          place: lastEmpty ? { ...lastEmpty } : null,
          distance,
        };
      }

      lastEmpty = { x: cellX, y: cellY, z: cellZ };
    }

    return null;
  }

  canPlaceBlockAt(x, y, z) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const gz = Math.floor(z);
    if (this.isSolidBlockAtGrid(gx, gy, gz)) return false;

    if (!this.player || typeof this.player.collidesWithWorld !== "function") {
      return true;
    }

    const key = this.toGridKey(gx, gy, gz);
    this.blocks.set(key, {
      type: "block",
      coords: { x: gx, y: gy, z: gz },
    });

    const playerPos = this.player.transform.position.elements;
    const wouldCollide = this.player.collidesWithWorld(
      this,
      playerPos[0],
      playerPos[1],
      playerPos[2]
    );

    this.blocks.delete(key);
    return !wouldCollide;
  }

  placeStoneBlockAt(x, y, z) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const gz = Math.floor(z);
    if (!this.canPlaceBlockAt(gx, gy, gz)) return false;
    this.placeBlock(gx, gy, gz, { blockId: "stone" });
    return true;
  }

  placeBlock(x, y, z, options = {}) {
    const block = createBlock(x, y, z, options);
    const key = this.toGridKey(block.coords.x, block.coords.y, block.coords.z);
    this.blocks.set(key, block);
    this.blockRevision += 1;
    return block;
  }

  addEntity(entity) {
    if (!entity) return null;

    if (entity.type === "block" && entity.coords) {
      const key = this.toGridKey(entity.coords.x, entity.coords.y, entity.coords.z);
      this.blocks.set(key, entity);
      this.blockRevision += 1;
      return entity;
    }

    this.entities.push(entity);
    return entity;
  }

  removeBlock(x, y, z) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const gz = Math.floor(z);
    const key = this.toGridKey(gx, gy, gz);
    const removed = this.blocks.delete(key);
    if (removed) {
      this.blockRevision += 1;
      this.clearInfectionAt(gx, gy, gz);
    }
    return removed;
  }

  // Temporary compatibility names while call sites migrate.
  placeCube(x, y, z, options = {}) {
    return this.placeBlock(x, y, z, options);
  }

  removeCube(x, y, z) {
    return this.removeBlock(x, y, z);
  }

  placeEntity(def) {
    return this.addEntity(def);
  }

  clearBlocks() {
    if (this.blocks.size > 0) {
      this.blockRevision += 1;
    }
    this.blocks.clear();
    this.infectedBlockKeys.clear();
    this.infectedBlockCoords = [];
    this.infectionRevision = 0;
    this.infectionFrontier = [];
    this.infectionFrontierKeys.clear();
    this.infectionSpreadTimer = 0;
    this.infectionParticles = [];
    this.infectionParticleEmitAccumulator = 0;
    this.dreadChaseInfectedKeys.clear();
    this.dreadChaseInfectedCoords = [];
    this.dreadChaseFollowCenter = null;
    this.dreadChaseInfectionEnabled = false;
    this.dreadChaseInfectionProgress = 0;
    this.dreadChaseInfectionRevision = 0;
    this.dreadChaseInfectionUpdateAccumulator = 0;
    this.windLeafParticles = [];
    this.windLeafParticleEmitAccumulator = 0;
    this.windLeafParticlesEnabled = false;
  }

  loadFromWorldData(worldData, options = {}) {
    if (!worldData || !Array.isArray(worldData.palette) || !Array.isArray(worldData.blocks)) {
      console.log("Invalid world data format. Expected { palette: [], blocks: [] }");
      return 0;
    }

    const offset = options.offset || { x: 0, y: 0, z: 0 };
    const offsetX = Number.isFinite(offset.x) ? offset.x : 0;
    const offsetY = Number.isFinite(offset.y) ? offset.y : 0;
    const offsetZ = Number.isFinite(offset.z) ? offset.z : 0;

    this.clearBlocks();
    this.resetPlayerTriggerState();

    let placedCount = 0;
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (const entry of worldData.blocks) {
      if (!Array.isArray(entry) || entry.length < 4) continue;

      const x = Number(entry[0]);
      const y = Number(entry[1]);
      const z = Number(entry[2]);
      const paletteIndex = Number(entry[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      if (!Number.isInteger(paletteIndex)) continue;

      const blockId = worldData.palette[paletteIndex];
      if (typeof blockId !== "string" || blockId === "air") continue;

      const wx = x + offsetX;
      const wy = y + offsetY;
      const wz = z + offsetZ;
      this.placeBlock(wx, wy, wz, { blockId });
      if (wx < minX) minX = wx;
      if (wy < minY) minY = wy;
      if (wz < minZ) minZ = wz;
      if (wx > maxX) maxX = wx;
      if (wy > maxY) maxY = wy;
      if (wz > maxZ) maxZ = wz;
      placedCount += 1;
    }

    const hasBounds = placedCount > 0 && Number.isFinite(minX) && Number.isFinite(maxX);
    const worldBounds = hasBounds ? { minX, minY, minZ, maxX, maxY, maxZ } : null;
    if (hasBounds) {
      this.fitGroundPlaneToBounds(worldBounds);
    }
    this.updateAnimalPlacement(worldBounds);
    const nextSpawn = this.resolveSpawnFromWorldData(
      worldData,
      offsetX,
      offsetY,
      offsetZ,
      worldBounds
    );
    this.setSpawn(nextSpawn, true);
    this.initializeInfection();

    return placedCount;
  }
}

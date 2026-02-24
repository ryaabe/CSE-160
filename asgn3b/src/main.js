let canvas;
let gl;

let renderer;
let world;
let input;
let soundManager;

// ui elements
let playerCoordsElement;
let fpsCounterElement;
let mouseSensitivitySliderElement;
let mouseSensitivityValueElement;
let fogAmountSliderElement;
let fogAmountValueElement;
let fogFarMinSliderElement;
let fogFarMinValueElement;
let fogFarMaxSliderElement;
let fogFarMaxValueElement;
let startObjectiveElement;
let hudOverlayCanvas;
let hudOverlayCtx;
let hudMessageText = '';
let hudMessageExpiresAtMs = 0;
let hudMessageActivatedAtMs = 0;
let hudMessageCharRevealMs = 0;
let g_fullscreenResizeTimeoutId = null;
let g_hasFullscreenCanvasResizeTriggered = false;
let g_canvasTransitionWhiteMaskTimeoutId = null;
let g_canvasTransitionBlackMaskTimeoutId = null;
let g_liminalMarkerWindowWhiteOverlaysAdded = false;
let g_htmlOverlayVisible = false;
let g_htmlOverlayToggleInitialized = false;
let g_dreadPathRampActive = false;
let g_dreadPathRampDarkAmbienceTimeoutId = null;
let g_dreadPathRampDarkAmbienceStarted = false;
let g_dreadPathRampFogBaseline = null;
let g_wallCreptCloserSecondLineTimeoutId = null;
let g_wallCreptCloserFinalLineTimeoutId = null;
let g_pathStoppedSecondLineTimeoutId = null;
let g_pathStoppedFinalLineTimeoutId = null;
let g_endPathWhiteFadeCompleteTimeoutId = null;
let g_endPathWhiteFadeCleanupTimeoutId = null;
let g_endPathWhiteRoomSequenceStarted = false;
let g_dancingDogSprite = null;
let g_dancingDogAnimTime = 0;
let g_liminalWaterGroundOverlay = null;
let g_dogTalkPromptVisible = false;
let g_dogEndingSequenceStarted = false;
let g_dogEndBlackFadeCompleteTimeoutId = null;
let hudMessageCentered = false;
let g_startIntroOverlayActive = true;
let g_startIntroOverlayKeyListenerInitialized = false;

let g_lastTime = 0;
const WORLD_DATA_PATHS = [
  '../maps/world_data.json',
  '../maps/maps/world_data.json',
];
let g_fogFarMin = 20.0;
let g_fogFarMax = 140.0;
const INITIAL_CANVAS_SIZE = 400;
const FULLSCREEN_DELAY_MS = 20000;
const OLD_CANVAS_MASK_ID = 'old-canvas-mask';
const CANVAS_WHITE_MASK_ID = 'canvas-transition-white-mask';
const END_PATH_WHITE_FADE_MASK_ID = 'end-path-white-fade-mask';
const START_INTRO_OVERLAY_ID = 'start-intro-overlay';
const CANVAS_WHITE_MASK_DURATION_MS = 3000;
const CANVAS_BLACK_MASK_DURATION_MS = 8000;
const END_PATH_WHITE_FADE_DURATION_MS = 10000;
const END_PATH_WHITE_FADE_OUT_DURATION_MS = 900;
const ENABLE_TIMED_CANVAS_RESIZE = false;
const HTML_OVERLAY_TOGGLE_KEY = 'KeyJ';
const START_INTRO_CONTINUE_KEY = 'KeyF';
const HUD_MESSAGE_DEFAULT_DURATION_MS = 2500;
const HUD_SUBTITLE_CHAR_REVEAL_MS = 40;
const HUD_SUBTITLE_BOTTOM_MARGIN = 16;
const HUD_TEXT_COLOR = '#e8ff00';
const DREAD_CAMERA_ARTIFACTS_ENABLED = true;
const DREAD_CAMERA_ARTIFACTS_PROGRESS_EXPONENT = 1.15;
const WHITE_CONCRETE_COLOR = [1.0, 1.0, 1.0, 1.0];
const WHITE_ROOM_HOLE_BLOCKS = [
  { x: 130, y: 5, z: 96 },
  { x: 130, y: 6, z: 96 },
];
const WHITE_ROOM_WINDOW_BLOCKS = [
  { x: 130, y: 5, z: 97 },
  { x: 130, y: 6, z: 97 },
];
const LIMINAL_MARKER_WINDOW_FRAME_BLOCKS = [
  { x: 129, y: 4, z: 97 },
  { x: 130, y: 4, z: 97 },
  { x: 131, y: 4, z: 97 },
  { x: 129, y: 5, z: 97 },
  { x: 131, y: 5, z: 97 },
  { x: 129, y: 6, z: 97 },
  { x: 131, y: 6, z: 97 },
  { x: 129, y: 7, z: 97 },
  { x: 130, y: 7, z: 97 },
  { x: 131, y: 7, z: 97 },
];
const WHITE_ROOM_TELEPORT_TARGET = {
  x: 130.5,
  y: 5.0,
  z: 88.5,
  yaw: 180.0,
  pitch: 0.0,
};
const WHITE_ROOM_SECOND_INFECTION_SEED = { x: 136, y: 8, z: 96 };
const WHITE_ROOM_INFECTION_SPEED_MULTIPLIER = 10.0;
const WHITE_ROOM_INFECTION_BOUNDS = {
  minX: 124,
  maxX: 136,
  minY: 4,
  maxY: 9,
  minZ: 81,
  maxZ: 96,
};
const DREAD_PATH_RAMP_START_X = 160;
const DREAD_PATH_RAMP_END_X = 253;
const DREAD_PATH_RAMP_Y = 4;
const DREAD_PATH_TRIGGER_Y_LEEWAY = 2;
const DREAD_PATH_RAMP_Z_MIN = 30;
const DREAD_PATH_RAMP_Z_MAX = 65;
const DREAD_PATH_FOG_NEAR_RAMP_DELTA = 4.0;
const DREAD_PATH_FOG_FAR_RAMP_DELTA = 8.0;
const DREAD_PATH_VISUAL_RAMP_EXPONENT = 0.28;
const ENABLE_DREAD_WHITE_NOISE = false;
const DREAD_WHITE_NOISE_LOOP_KEY = 'dread-white-noise';
const DREAD_WHITE_NOISE_MIN_VOLUME = 0.002;
const DREAD_WHITE_NOISE_MAX_VOLUME = 0.22;
const DREAD_WHITE_NOISE_RAMP_EXPONENT = 1.35;
const DREAD_WIND_LOOP_KEY = 'dread-wind-howl';
const DREAD_WIND_MIN_VOLUME = 0.006;
const DREAD_WIND_MAX_VOLUME = 0.2;
const DREAD_WIND_RAMP_EXPONENT = 1.2;
const DREAD_DARK_AMBIENCE_DELAY_MS = 4000;
const DREAD_DARK_AMBIENCE_VOLUME = 0.28;
const DREAD_DARK_AMBIENCE_LOOP_KEY = 'dark-ambience-ost';
const WHITE_ROOM_LIMINAL_AMBIENCE_LOOP_KEY = 'white-room-liminal-ost';
const WHITE_ROOM_LIMINAL_AMBIENCE_VOLUME = 0.24;
const WHITE_ROOM_LIMINAL_AMBIENCE_FADE_IN_MS = 5000;
const WHITE_ROOM_LIMINAL_AMBIENCE_START_DELAY_MS = 2000;
const DANCING_DOG_TEXTURE_START = 200;
const DANCING_DOG_FRAME_COUNT = 8;
const DANCING_DOG_FRAME_DURATION_MS = 100;
const LIMINAL_WATER_TEXTURE_NUM = DANCING_DOG_TEXTURE_START + DANCING_DOG_FRAME_COUNT;
const DANCING_DOG_SPRITE_POSITION = { x: 129, y: -12, z: 114 };
const DANCING_DOG_SPRITE_SIZE = { width: 4.0, height: 4.0, thickness: 0.05 };
const DANCING_DOG_Y_OFFSET = 0.5;
const LIMINAL_WATER_GROUND_OVERLAY_RECT = {
  minX: 91,
  maxX: 159,
  minZ: 98,
  maxZ: 119,
  floorY: -12,
};
const LIMINAL_WATER_GROUND_OVERLAY_HEIGHT_ABOVE_FLOOR = 0.2;
const LIMINAL_WATER_GROUND_OVERLAY_THICKNESS = 0.02;
const LIMINAL_WATER_GROUND_OVERLAY_ALPHA = 0.62;
const DOG_TALK_INTERACT_RANGE = 3.0;
const DOG_TALK_PROMPT_TEXT = 'press f to talk to dog';
const DOG_END_BLACK_FADE_MASK_ID = 'dog-end-black-fade-mask';
const DOG_END_BLACK_FADE_DURATION_MS = 3000;
const DOG_END_MESSAGE_TEXT = 'to be continued.\nthank you for playing :)';
const START_INTRO_MESSAGE_TEXT = "my project makes use of sound so please enable it. also, do not resize web page using the browser's zoom functionality as it will break some of the things in the project. thank you! you can move using wasd and look around using the mouse.\n\npress f to continue";
const ENABLE_LIMINAL_SEQUENCE_EVENT = false;
const LIMINAL_MARKER_WINDOW_OVERLAY_THICKNESS = 0.02;
const LIMINAL_MARKER_WINDOW_OVERLAY_FRONT_OFFSET = 0.01;
const SOUND_ASSET_PATHS = {
  stone1: '../resources/sound/sound effects/stone1.ogg',
  fallsmall: '../resources/sound/sound effects/Fallsmall.ogg',
  falling: '../resources/sound/sound effects/falling.ogg',
  white_noise: '../resources/sound/ambience/static.ogg',
  wind_howling: '../resources/sound/ambience/wind-howling.ogg',
  dark_ambience: '../resources/sound/ost/dark_ambience.ogg',
  liminal: '../resources/sound/ost/liminal.ogg',
  grass1: '../resources/sound/sound effects/grass_step/grass1.ogg',
  grass2: '../resources/sound/sound effects/grass_step/grass2.ogg',
  grass3: '../resources/sound/sound effects/grass_step/grass3.ogg',
  grass4: '../resources/sound/sound effects/grass_step/grass4.ogg',
  echo_step_1: '../resources/sound/sound effects/echo_step/echo_step_1.ogg',
  echo_step_2: '../resources/sound/sound effects/echo_step/echo_step_2.ogg',
  echo_step_3: '../resources/sound/sound effects/echo_step/echo_step_3.ogg',
  echo_step_4: '../resources/sound/sound effects/echo_step/echo_step_4.ogg',
  cicada: '../resources/sound/ambience/cicada.ogg',
};

const DANCING_DOG_TEXTURE_PATHS = {
  [DANCING_DOG_TEXTURE_START + 0]: '../resources/dog/dance_1.png',
  [DANCING_DOG_TEXTURE_START + 1]: '../resources/dog/dance_2.png',
  [DANCING_DOG_TEXTURE_START + 2]: '../resources/dog/dance_3.png',
  [DANCING_DOG_TEXTURE_START + 3]: '../resources/dog/dance_4.png',
  [DANCING_DOG_TEXTURE_START + 4]: '../resources/dog/dance_5.png',
  [DANCING_DOG_TEXTURE_START + 5]: '../resources/dog/dance_6.png',
  [DANCING_DOG_TEXTURE_START + 6]: '../resources/dog/dance_7.png',
  [DANCING_DOG_TEXTURE_START + 7]: '../resources/dog/dance_8.png',
};

const LIMINAL_WATER_TEXTURE_PATHS = {
  [LIMINAL_WATER_TEXTURE_NUM]: '../resources/water.png',
};

function SetCanvasSize(width, height) {
  if (!canvas) return;
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));

  canvas.width = safeWidth;
  canvas.height = safeHeight;
  canvas.style.width = `${safeWidth}px`;
  canvas.style.height = `${safeHeight}px`;

  if (gl) {
    gl.viewport(0, 0, safeWidth, safeHeight);
  }

  SyncHudOverlayCanvasToGameCanvas();
  SyncStartIntroOverlayToCanvas();
}

function ResizeCanvasToWindow() {
  SetCanvasSize(window.innerWidth, window.innerHeight);
}

function ClearWallCreptCloserDialogueTimeouts() {
  if (g_wallCreptCloserSecondLineTimeoutId != null) {
    window.clearTimeout(g_wallCreptCloserSecondLineTimeoutId);
    g_wallCreptCloserSecondLineTimeoutId = null;
  }
  if (g_wallCreptCloserFinalLineTimeoutId != null) {
    window.clearTimeout(g_wallCreptCloserFinalLineTimeoutId);
    g_wallCreptCloserFinalLineTimeoutId = null;
  }
}

function ClearPathStoppedAbruptlyDialogueTimeouts() {
  if (g_pathStoppedSecondLineTimeoutId != null) {
    window.clearTimeout(g_pathStoppedSecondLineTimeoutId);
    g_pathStoppedSecondLineTimeoutId = null;
  }
  if (g_pathStoppedFinalLineTimeoutId != null) {
    window.clearTimeout(g_pathStoppedFinalLineTimeoutId);
    g_pathStoppedFinalLineTimeoutId = null;
  }
}

function ClearDancingDogSprite() {
  g_dancingDogSprite = null;
  g_dancingDogAnimTime = 0;
}

function ClearLiminalWaterGroundOverlay() {
  g_liminalWaterGroundOverlay = null;
}

function EnsureDancingDogSprite(worldInstance, rendererInstance) {
  if (!worldInstance || typeof worldInstance.addEntity !== 'function') return null;
  if (g_dancingDogSprite?.entity) return g_dancingDogSprite;

  rendererInstance?.initTextures?.(DANCING_DOG_TEXTURE_PATHS);

  const size = DANCING_DOG_SPRITE_SIZE;
  const base = DANCING_DOG_SPRITE_POSITION;
  const centerX = base.x + 0.5;
  const centerY = base.y + DANCING_DOG_Y_OFFSET + size.height * 0.5;
  const centerZ = base.z + 0.5;

  const transform = new Transform();
  transform.setScale(size.width, size.height, size.thickness);
  // Initial translation is corrected each frame in UpdateDancingDogSprite().
  transform.setPosition(
    centerX - size.width * 0.5,
    centerY - size.height * 0.5,
    centerZ - size.thickness * 0.5
  );
  transform.setRotation(0, 0, 0);

  const entity = createEntity('entity', {
    renderShape: 'cube',
    transform,
    textureNum: DANCING_DOG_TEXTURE_START,
    color: [1.0, 1.0, 1.0, 1.0],
    useFaceShading: false,
    faceVisibility: {
      front: true,
      right: false,
      back: false,
      left: false,
      top: false,
      bottom: false,
    },
    frontFaceOnly: true,
  });

  worldInstance.addEntity(entity);
  g_dancingDogSprite = {
    entity,
    transform,
    centerX,
    centerY,
    centerZ,
    width: size.width,
    height: size.height,
    thickness: size.thickness,
  };
  g_dancingDogAnimTime = 0;
  return g_dancingDogSprite;
}

function EnsureLiminalWaterGroundOverlay(worldInstance, rendererInstance) {
  if (!worldInstance || typeof worldInstance.addEntity !== 'function') return null;
  if (g_liminalWaterGroundOverlay?.entity) return g_liminalWaterGroundOverlay;

  rendererInstance?.initTextures?.(LIMINAL_WATER_TEXTURE_PATHS);

  const rect = LIMINAL_WATER_GROUND_OVERLAY_RECT;
  const width = (rect.maxX - rect.minX) + 1;
  const depth = (rect.maxZ - rect.minZ) + 1;
  const thickness = LIMINAL_WATER_GROUND_OVERLAY_THICKNESS;
  const topY = rect.floorY + 1.0 + LIMINAL_WATER_GROUND_OVERLAY_HEIGHT_ABOVE_FLOOR;

  const transform = new Transform();
  transform.setScale(width, thickness, depth);
  transform.setPosition(rect.minX, topY - thickness, rect.minZ);
  transform.setRotation(0, 0, 0);

  const entity = createEntity('entity', {
    renderShape: 'cube',
    transform,
    textureNum: LIMINAL_WATER_TEXTURE_NUM,
    color: [1.0, 1.0, 1.0, LIMINAL_WATER_GROUND_OVERLAY_ALPHA],
    useFaceShading: false,
    faceVisibility: {
      front: false,
      right: false,
      back: false,
      left: false,
      top: true,
      bottom: false,
    },
    frontFaceOnly: true,
  });

  worldInstance.addEntity(entity);
  g_liminalWaterGroundOverlay = { entity, transform };
  return g_liminalWaterGroundOverlay;
}

function UpdateDancingDogSprite(worldInstance, dt = 0) {
  const dog = g_dancingDogSprite;
  if (!dog?.entity || !dog.transform) return;

  if (Number.isFinite(dt) && dt > 0) {
    g_dancingDogAnimTime += dt;
  }

  const frameDurationSec = Math.max(0.01, (DANCING_DOG_FRAME_DURATION_MS || 100) / 1000);
  const frameIndex = Math.floor(g_dancingDogAnimTime / frameDurationSec) % DANCING_DOG_FRAME_COUNT;
  dog.entity.textureNum = DANCING_DOG_TEXTURE_START + Math.max(0, frameIndex);

  const playerPos = worldInstance?.player?.transform?.position?.elements;
  if (!playerPos || playerPos.length < 3) return;

  const dx = Number(playerPos[0]) - dog.centerX;
  const dz = Number(playerPos[2]) - dog.centerZ;
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) return;

  // Cube "front" face normal points toward local -Z, so rotate that vector toward the player.
  const yawDeg = Math.atan2(-dx, -dz) * 180 / Math.PI;
  dog.transform.setRotation(0, yawDeg, 0);

  const yawRad = yawDeg * Math.PI / 180;
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);
  const ox = dog.width * 0.5;
  const oy = dog.height * 0.5;
  const oz = dog.thickness * 0.5;
  const rx = cosY * ox + sinY * oz;
  const rz = -sinY * ox + cosY * oz;

  dog.transform.setPosition(
    dog.centerX - rx,
    dog.centerY - oy,
    dog.centerZ - rz
  );
}

function GetDancingDogWorldCenter() {
  if (g_dancingDogSprite) {
    return {
      x: Number(g_dancingDogSprite.centerX),
      y: Number(g_dancingDogSprite.centerY),
      z: Number(g_dancingDogSprite.centerZ),
    };
  }
  const size = DANCING_DOG_SPRITE_SIZE;
  return {
    x: DANCING_DOG_SPRITE_POSITION.x + 0.5,
    y: DANCING_DOG_SPRITE_POSITION.y + DANCING_DOG_Y_OFFSET + size.height * 0.5,
    z: DANCING_DOG_SPRITE_POSITION.z + 0.5,
  };
}

function IsPlayerWithinDogTalkRange(worldInstance, range = DOG_TALK_INTERACT_RANGE) {
  const playerPos = worldInstance?.player?.transform?.position?.elements;
  if (!playerPos || playerPos.length < 3) return false;
  const dog = GetDancingDogWorldCenter();
  const dx = Number(playerPos[0]) - dog.x;
  const dz = Number(playerPos[2]) - dog.z;
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) return false;
  const horizontalDistance = Math.hypot(dx, dz);
  return horizontalDistance <= Math.max(0, Number(range) || 0);
}

function GetOrCreateDogEndBlackFadeMask() {
  let mask = document.getElementById(DOG_END_BLACK_FADE_MASK_ID);
  if (!mask) {
    mask = document.createElement('div');
    mask.id = DOG_END_BLACK_FADE_MASK_ID;
    mask.style.position = 'fixed';
    mask.style.left = '0';
    mask.style.top = '0';
    mask.style.width = '100vw';
    mask.style.height = '100vh';
    mask.style.backgroundColor = '#000';
    mask.style.pointerEvents = 'none';
    mask.style.zIndex = '1';
    mask.style.opacity = '0';
    document.body.appendChild(mask);
  }
  return mask;
}

function RemoveDogEndBlackFadeMask() {
  if (g_dogEndBlackFadeCompleteTimeoutId != null) {
    window.clearTimeout(g_dogEndBlackFadeCompleteTimeoutId);
    g_dogEndBlackFadeCompleteTimeoutId = null;
  }
  document.getElementById(DOG_END_BLACK_FADE_MASK_ID)?.remove();
}

function StartDogEndBlackFade(onComplete, durationMs = DOG_END_BLACK_FADE_DURATION_MS) {
  RemoveDogEndBlackFadeMask();
  const mask = GetOrCreateDogEndBlackFadeMask();
  if (!mask) return false;

  const safeDurationMs = Math.max(0, Math.floor(Number(durationMs) || 0));
  mask.style.transition = 'none';
  mask.style.opacity = '0';
  void mask.offsetWidth;

  window.requestAnimationFrame(() => {
    const currentMask = document.getElementById(DOG_END_BLACK_FADE_MASK_ID);
    if (!currentMask) return;
    currentMask.style.transition = `opacity ${safeDurationMs}ms linear`;
    currentMask.style.opacity = '1';
  });

  g_dogEndBlackFadeCompleteTimeoutId = window.setTimeout(() => {
    g_dogEndBlackFadeCompleteTimeoutId = null;
    onComplete?.();
  }, safeDurationMs);
  return true;
}

function UpdateDogTalkPrompt(worldInstance) {
  if (!worldInstance) return;
  if (g_dogEndingSequenceStarted) {
    g_dogTalkPromptVisible = false;
    return;
  }

  const isNearDog = IsPlayerWithinDogTalkRange(worldInstance);
  if (isNearDog && !g_dogTalkPromptVisible) {
    const activeMessage = GetActiveHudMessage(performance.now());
    if (activeMessage && activeMessage !== DOG_TALK_PROMPT_TEXT) {
      return;
    }
    worldInstance.showHudMessage?.(DOG_TALK_PROMPT_TEXT, 0);
    g_dogTalkPromptVisible = true;
    return;
  }

  if (!isNearDog && g_dogTalkPromptVisible) {
    if (hudMessageText === DOG_TALK_PROMPT_TEXT) {
      worldInstance.clearHudMessage?.();
    }
    g_dogTalkPromptVisible = false;
  }
}

function TryTriggerDogEndingSequence(worldInstance) {
  if (!worldInstance || g_dogEndingSequenceStarted) return false;
  if (!IsPlayerWithinDogTalkRange(worldInstance)) return false;

  g_dogEndingSequenceStarted = true;
  g_dogTalkPromptVisible = false;

  ClearHudMessage();
  input?.setMouseLookLocked?.(true);
  if (typeof worldInstance.player?.setMoveDir === 'function') {
    worldInstance.player.setMoveDir(0, 0);
  }
  if (typeof worldInstance.player?.setTurnDir === 'function') {
    worldInstance.player.setTurnDir(0);
  }
  if (typeof worldInstance.player?.setJumpPressed === 'function') {
    worldInstance.player.setJumpPressed(false);
  }

  worldInstance.sound?.stopLoop?.(DREAD_DARK_AMBIENCE_LOOP_KEY, 300);
  worldInstance.sound?.stopLoop?.(WHITE_ROOM_LIMINAL_AMBIENCE_LOOP_KEY, 300);
  worldInstance.sound?.stopLoop?.(DREAD_WIND_LOOP_KEY, 300);
  worldInstance.sound?.stopLoop?.(DREAD_WHITE_NOISE_LOOP_KEY, 300);
  worldInstance.stopCicadaAmbienceAbrupt?.();

  StartDogEndBlackFade(() => {
    worldInstance.showHudMessage?.(DOG_END_MESSAGE_TEXT, 0, {
      centered: true,
      charRevealMs: HUD_SUBTITLE_CHAR_REVEAL_MS,
    });
  }, DOG_END_BLACK_FADE_DURATION_MS);

  return true;
}

function SetupHudOverlay() {
  hudOverlayCanvas = document.getElementById('hudOverlay');
  if (!hudOverlayCanvas) return;

  hudOverlayCtx = hudOverlayCanvas.getContext('2d');
  if (!hudOverlayCtx) {
    console.log('Failed to get 2D context for HUD overlay');
    return;
  }

  hudOverlayCanvas.style.position = 'fixed';
  hudOverlayCanvas.style.pointerEvents = 'none';
  hudOverlayCanvas.style.zIndex = '2';
  SyncHudOverlayCanvasToGameCanvas();
}

function SyncHudOverlayCanvasToGameCanvas() {
  if (!canvas || !hudOverlayCanvas) return;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || canvas.width || INITIAL_CANVAS_SIZE));
  const height = Math.max(1, Math.round(rect.height || canvas.height || INITIAL_CANVAS_SIZE));
  hudOverlayCanvas.style.left = `${Math.round(rect.left)}px`;
  hudOverlayCanvas.style.top = `${Math.round(rect.top)}px`;
  hudOverlayCanvas.style.width = `${width}px`;
  hudOverlayCanvas.style.height = `${height}px`;

  if (hudOverlayCanvas.width !== width) {
    hudOverlayCanvas.width = width;
  }
  if (hudOverlayCanvas.height !== height) {
    hudOverlayCanvas.height = height;
  }
}

function SyncStartIntroOverlayToCanvas() {
  const overlay = document.getElementById(START_INTRO_OVERLAY_ID);
  if (!overlay || !canvas) return;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || canvas.width || INITIAL_CANVAS_SIZE));
  const height = Math.max(1, Math.round(rect.height || canvas.height || INITIAL_CANVAS_SIZE));
  overlay.style.left = `${Math.round(rect.left)}px`;
  overlay.style.top = `${Math.round(rect.top)}px`;
  overlay.style.width = `${width}px`;
  overlay.style.height = `${height}px`;
}

function ClearHudMessage() {
  hudMessageText = '';
  hudMessageExpiresAtMs = 0;
  hudMessageActivatedAtMs = 0;
  hudMessageCharRevealMs = 0;
  hudMessageCentered = false;
}

function CreateHudMessageEntry(text, durationMs = HUD_MESSAGE_DEFAULT_DURATION_MS, options = {}) {
  const normalizedText = String(text ?? '').trim();
  if (!normalizedText) return null;

  const duration = Number(durationMs);
  const customRevealMs = Number(options?.charRevealMs);
  return {
    text: normalizedText,
    durationMs: (!Number.isFinite(duration) || duration <= 0) ? Infinity : duration,
    charRevealMs: (Number.isFinite(customRevealMs) && customRevealMs > 0) ? customRevealMs : null,
    centered: options?.centered === true,
  };
}

function ActivateHudMessage(entry, nowMs = performance.now()) {
  if (!entry || !entry.text) {
    ClearHudMessage();
    return;
  }

  hudMessageText = entry.text;
  hudMessageActivatedAtMs = nowMs;
  hudMessageCharRevealMs = entry.charRevealMs ?? 0;
  hudMessageCentered = entry.centered === true;
  if (!Number.isFinite(entry.durationMs)) {
    hudMessageExpiresAtMs = Infinity;
  } else {
    hudMessageExpiresAtMs = nowMs + entry.durationMs;
  }
}

function ShowHudMessage(text, durationMs = HUD_MESSAGE_DEFAULT_DURATION_MS, options = {}) {
  const nextEntry = CreateHudMessageEntry(text, durationMs, options);
  if (!nextEntry) {
    ClearHudMessage();
    return;
  }
  ActivateHudMessage(nextEntry, performance.now());
}

function GetActiveHudMessage(nowMs) {
  if (!hudMessageText) return '';
  if (Number.isFinite(hudMessageExpiresAtMs) && nowMs > hudMessageExpiresAtMs) {
    ClearHudMessage();
    return '';
  }
  return hudMessageText;
}

function SplitHudLineIntoLogicalSegments(rawLine) {
  const text = String(rawLine ?? '').trim();
  if (!text) return [];

  const segments = [];
  const words = text.split(/\s+/).filter(Boolean);
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) segments.push(trimmed);
    current = '';
  };

  const endsSentence = (token) => /[.!?]["')\]]*$/.test(token);
  const endsEmoticon = (token) => /(:\)\)|:\)|:\(|:D|:d)["')\]]*$/.test(token);
  const endsLogicalComma = (token, currentText) => /,$/.test(token) && currentText.length >= 20;
  const endsLogicalSeparator = (token, currentText) => /[;:]$/.test(token) && currentText.length >= 16;

  for (const word of words) {
    current = current ? `${current} ${word}` : word;
    if (
      endsSentence(word) ||
      endsEmoticon(word) ||
      endsLogicalComma(word, current) ||
      endsLogicalSeparator(word, current)
    ) {
      flush();
    }
  }

  flush();
  return segments;
}

function PushWrappedHudLine(ctx, wrapped, lineText, maxWidth) {
  const trimmed = String(lineText ?? '').trim();
  if (!trimmed) return;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return;

  let currentLine = '';
  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      wrapped.push(currentLine);
      currentLine = '';
    }

    if (ctx.measureText(word).width <= maxWidth) {
      currentLine = word;
      continue;
    }

    // Fallback: hard-wrap very long words.
    let chunk = '';
    for (const ch of word) {
      const nextChunk = chunk + ch;
      if (chunk && ctx.measureText(nextChunk).width > maxWidth) {
        wrapped.push(chunk);
        chunk = ch;
      } else {
        chunk = nextChunk;
      }
    }
    currentLine = chunk;
  }

  if (currentLine) {
    wrapped.push(currentLine);
  }
}

function WrapHudTextLines(ctx, message, maxWidth) {
  if (!ctx) return [];
  const safeMaxWidth = Math.max(40, Number(maxWidth) || 40);
  const wrapped = [];
  const rawLines = String(message ?? '').split('\n');

  for (const rawLine of rawLines) {
    const segments = SplitHudLineIntoLogicalSegments(rawLine);
    if (segments.length === 0) continue;
    for (const segment of segments) {
      PushWrappedHudLine(ctx, wrapped, segment, safeMaxWidth);
    }
  }

  return wrapped;
}

function DrawHudOverlay(nowMs = performance.now()) {
  if (!hudOverlayCanvas || !hudOverlayCtx) return;
  SyncHudOverlayCanvasToGameCanvas();

  const width = hudOverlayCanvas.width;
  const height = hudOverlayCanvas.height;
  hudOverlayCtx.clearRect(0, 0, width, height);

  const artifactAmount = GetDreadCameraArtifactAmount();
  if (artifactAmount > 0) {
    DrawDarkCameraArtifactsOverlay(hudOverlayCtx, width, height, nowMs, artifactAmount);
  }

  const message = GetActiveHudMessage(nowMs);
  if (!message) return;

  const ctx = hudOverlayCtx;
  ctx.save();
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const outerMargin = 14;
  const maxTextWrapWidth = Math.max(40, width - outerMargin * 2 - 28);
  const lines = WrapHudTextLines(ctx, message, maxTextWrapWidth);
  if (lines.length === 0) {
    ctx.restore();
    return;
  }

  let visibleLines = lines;
  const revealStepMs = Math.max(
    0,
    Number(hudMessageCharRevealMs) || Number(HUD_SUBTITLE_CHAR_REVEAL_MS) || 0
  );
  if (revealStepMs > 0 && Number.isFinite(hudMessageActivatedAtMs) && hudMessageActivatedAtMs > 0) {
    const elapsedMs = Math.max(0, nowMs - hudMessageActivatedAtMs);
    let remainingChars = Math.max(1, 1 + Math.floor(elapsedMs / revealStepMs));
    const nextVisibleLines = [];
    const virtualNewlineCost = 2; // tiny pause before the next subtitle line starts typing

    for (const line of lines) {
      if (remainingChars <= 0) break;

      const charsToTake = Math.min(line.length, remainingChars);
      if (charsToTake > 0) {
        nextVisibleLines.push(line.slice(0, charsToTake));
        remainingChars -= charsToTake;
      }

      if (charsToTake >= line.length && remainingChars > 0) {
        remainingChars = Math.max(0, remainingChars - virtualNewlineCost);
      } else {
        break;
      }
    }

    visibleLines = (nextVisibleLines.length > 0) ? nextVisibleLines : [lines[0].slice(0, 1)];
  }

  const lineHeight = 22;
  const blockHeight = visibleLines.length * lineHeight;
  const textTopY = (hudMessageCentered === true)
    ? Math.max(14, Math.round((height - blockHeight) * 0.5))
    : Math.max(14, height - HUD_SUBTITLE_BOTTOM_MARGIN - blockHeight);

  ctx.fillStyle = HUD_TEXT_COLOR;
  const textX = Math.round(width * 0.5);
  let textY = textTopY;
  for (const line of visibleLines) {
    ctx.fillText(line, textX, textY);
    textY += lineHeight;
  }

  ctx.restore();
}

function AttachHudHelpersToWorld(worldInstance) {
  if (!worldInstance) return;
  worldInstance.showHudMessage = ShowHudMessage;
  worldInstance.clearHudMessage = ClearHudMessage;
}

function AttachRendererHelpersToWorld(worldInstance, rendererInstance) {
  if (!worldInstance || !rendererInstance) return;
  worldInstance.setFogEnabled = (enabled) => rendererInstance.setFogEnabled(enabled);
  worldInstance.setNightCycleEnabled = (enabled) => rendererInstance.setNightCycleEnabled(enabled);
  worldInstance.setNightCycleProgressOverride = (progress) => {
    if (typeof rendererInstance.setNightCycleProgressOverride !== 'function') return null;
    return rendererInstance.setNightCycleProgressOverride(progress);
  };
  worldInstance.setHauntFxEnabled = (enabled) => {
    if (typeof rendererInstance.setHauntFxEnabled !== 'function') return false;
    return rendererInstance.setHauntFxEnabled(enabled);
  };
  worldInstance.setHauntFxAmount = (amount) => {
    if (typeof rendererInstance.setHauntFxAmount !== 'function') return null;
    return rendererInstance.setHauntFxAmount(amount);
  };
  worldInstance.isFogEnabled = () => !!rendererInstance.fogEnabled;
  worldInstance.isNightCycleEnabled = () => !!rendererInstance.nightCycleEnabled;
  worldInstance.isHauntFxEnabled = () => !!rendererInstance.hauntFxEnabled;
}

function AttachSoundHelpersToWorld(worldInstance, soundInstance) {
  if (!worldInstance) return;
  worldInstance.sound = soundInstance || null;
  worldInstance.playSound = (name, options = {}) => worldInstance.sound?.play?.(name, options) || null;
  worldInstance.setCicadaAmbienceEnabled = (enabled) => {
    return worldInstance.sound?.setCicadaEnabled?.(enabled) ?? false;
  };
  worldInstance.stopCicadaAmbienceAbrupt = () => {
    return worldInstance.sound?.stopCicadaAbrupt?.() ?? false;
  };
}

function NormalizeTriggerLeewayAxis(leewayValue) {
  if (Number.isFinite(leewayValue)) {
    const amount = Math.max(0, Math.floor(Number(leewayValue)));
    return { minus: amount, plus: amount };
  }

  if (Array.isArray(leewayValue)) {
    const minus = Math.max(0, Math.floor(Number(leewayValue[0]) || 0));
    const plus = Math.max(0, Math.floor(Number(leewayValue[1]) || 0));
    return { minus, plus };
  }

  if (leewayValue && typeof leewayValue === 'object') {
    const minus = Math.max(
      0,
      Math.floor(Number(
        leewayValue.minus ??
        leewayValue.min ??
        leewayValue.before ??
        leewayValue.neg ??
        0
      ) || 0)
    );
    const plus = Math.max(
      0,
      Math.floor(Number(
        leewayValue.plus ??
        leewayValue.max ??
        leewayValue.after ??
        leewayValue.pos ??
        0
      ) || 0)
    );
    return { minus, plus };
  }

  return { minus: 0, plus: 0 };
}

function BuildTriggerBoundsFromPoint(point, leeway = 0) {
  if (!point) return null;

  const x = Math.floor(Number(point.x));
  const y = Math.floor(Number(point.y));
  const z = Math.floor(Number(point.z));
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;

  const axisLeeway = (Number.isFinite(leeway) || Array.isArray(leeway))
    ? { x: leeway, y: leeway, z: leeway }
    : (leeway && typeof leeway === 'object' ? leeway : {});

  const lx = NormalizeTriggerLeewayAxis(axisLeeway.x ?? 0);
  const ly = NormalizeTriggerLeewayAxis(axisLeeway.y ?? 0);
  const lz = NormalizeTriggerLeewayAxis(axisLeeway.z ?? 0);

  return {
    minX: x - lx.minus,
    maxX: x + lx.plus,
    minY: y - ly.minus,
    maxY: y + ly.plus,
    minZ: z - lz.minus,
    maxZ: z + lz.plus,
  };
}

function ShowOldCanvasMask(rect) {
  if (!rect) return;

  input?.setMouseLookLocked?.(true);

  let whiteMask = document.getElementById(CANVAS_WHITE_MASK_ID);
  if (!whiteMask) {
    whiteMask = document.createElement('div');
    whiteMask.id = CANVAS_WHITE_MASK_ID;
    whiteMask.style.position = 'fixed';
    whiteMask.style.left = '0';
    whiteMask.style.top = '0';
    whiteMask.style.width = '100vw';
    whiteMask.style.height = '100vh';
    whiteMask.style.backgroundColor = '#fff';
    whiteMask.style.pointerEvents = 'none';
    whiteMask.style.zIndex = '9';
    document.body.appendChild(whiteMask);
  }

  let mask = document.getElementById(OLD_CANVAS_MASK_ID);
  if (!mask) {
    mask = document.createElement('div');
    mask.id = OLD_CANVAS_MASK_ID;
    mask.style.position = 'fixed';
    mask.style.backgroundColor = '#000';
    mask.style.pointerEvents = 'none';
    mask.style.zIndex = '10';
    document.body.appendChild(mask);
  }

  mask.style.left = `${Math.round(rect.left)}px`;
  mask.style.top = `${Math.round(rect.top)}px`;
  mask.style.width = `${Math.round(rect.width)}px`;
  mask.style.height = `${Math.round(rect.height)}px`;

  if (g_canvasTransitionWhiteMaskTimeoutId != null) {
    window.clearTimeout(g_canvasTransitionWhiteMaskTimeoutId);
    g_canvasTransitionWhiteMaskTimeoutId = null;
  }
  if (g_canvasTransitionBlackMaskTimeoutId != null) {
    window.clearTimeout(g_canvasTransitionBlackMaskTimeoutId);
    g_canvasTransitionBlackMaskTimeoutId = null;
  }

  g_canvasTransitionWhiteMaskTimeoutId = window.setTimeout(() => {
    document.getElementById(CANVAS_WHITE_MASK_ID)?.remove();
    g_canvasTransitionWhiteMaskTimeoutId = null;
  }, CANVAS_WHITE_MASK_DURATION_MS);

  g_canvasTransitionBlackMaskTimeoutId = window.setTimeout(() => {
    document.getElementById(OLD_CANVAS_MASK_ID)?.remove();
    input?.setMouseLookLocked?.(false);
    g_canvasTransitionBlackMaskTimeoutId = null;
  }, CANVAS_BLACK_MASK_DURATION_MS);
}

function ClearCanvasTransitionMasks() {
  if (g_canvasTransitionWhiteMaskTimeoutId != null) {
    window.clearTimeout(g_canvasTransitionWhiteMaskTimeoutId);
    g_canvasTransitionWhiteMaskTimeoutId = null;
  }
  if (g_canvasTransitionBlackMaskTimeoutId != null) {
    window.clearTimeout(g_canvasTransitionBlackMaskTimeoutId);
    g_canvasTransitionBlackMaskTimeoutId = null;
  }
  document.getElementById(CANVAS_WHITE_MASK_ID)?.remove();
  document.getElementById(OLD_CANVAS_MASK_ID)?.remove();
  input?.setMouseLookLocked?.(false);
}

function GetOrCreateEndPathWhiteFadeMask() {
  let mask = document.getElementById(END_PATH_WHITE_FADE_MASK_ID);
  if (!mask) {
    mask = document.createElement('div');
    mask.id = END_PATH_WHITE_FADE_MASK_ID;
    mask.style.position = 'fixed';
    mask.style.left = '0';
    mask.style.top = '0';
    mask.style.width = '100vw';
    mask.style.height = '100vh';
    mask.style.backgroundColor = '#fff';
    mask.style.pointerEvents = 'none';
    mask.style.zIndex = '20';
    mask.style.opacity = '0';
    document.body.appendChild(mask);
  }
  return mask;
}

function RemoveEndPathWhiteFadeMask() {
  if (g_endPathWhiteFadeCompleteTimeoutId != null) {
    window.clearTimeout(g_endPathWhiteFadeCompleteTimeoutId);
    g_endPathWhiteFadeCompleteTimeoutId = null;
  }
  if (g_endPathWhiteFadeCleanupTimeoutId != null) {
    window.clearTimeout(g_endPathWhiteFadeCleanupTimeoutId);
    g_endPathWhiteFadeCleanupTimeoutId = null;
  }
  document.getElementById(END_PATH_WHITE_FADE_MASK_ID)?.remove();
}

function StartEndPathWhiteFade(onComplete, durationMs = END_PATH_WHITE_FADE_DURATION_MS) {
  const mask = GetOrCreateEndPathWhiteFadeMask();
  if (!mask) return false;

  RemoveEndPathWhiteFadeMask();
  const activeMask = GetOrCreateEndPathWhiteFadeMask();
  if (!activeMask) return false;

  const safeDurationMs = Math.max(0, Math.floor(Number(durationMs) || 0));
  activeMask.style.transition = 'none';
  activeMask.style.opacity = '0';
  void activeMask.offsetWidth;

  window.requestAnimationFrame(() => {
    const currentMask = document.getElementById(END_PATH_WHITE_FADE_MASK_ID);
    if (!currentMask) return;
    currentMask.style.transition = `opacity ${safeDurationMs}ms linear`;
    currentMask.style.opacity = '1';
  });

  g_endPathWhiteFadeCompleteTimeoutId = window.setTimeout(() => {
    g_endPathWhiteFadeCompleteTimeoutId = null;
    onComplete?.();
  }, safeDurationMs);
  return true;
}

function FadeOutEndPathWhiteFadeMask(durationMs = END_PATH_WHITE_FADE_OUT_DURATION_MS) {
  const mask = document.getElementById(END_PATH_WHITE_FADE_MASK_ID);
  if (!mask) return false;

  if (g_endPathWhiteFadeCleanupTimeoutId != null) {
    window.clearTimeout(g_endPathWhiteFadeCleanupTimeoutId);
    g_endPathWhiteFadeCleanupTimeoutId = null;
  }

  const safeDurationMs = Math.max(0, Math.floor(Number(durationMs) || 0));
  mask.style.transition = `opacity ${safeDurationMs}ms linear`;
  mask.style.opacity = '0';
  g_endPathWhiteFadeCleanupTimeoutId = window.setTimeout(() => {
    g_endPathWhiteFadeCleanupTimeoutId = null;
    document.getElementById(END_PATH_WHITE_FADE_MASK_ID)?.remove();
  }, safeDurationMs + 30);
  return true;
}

function StopDreadDarkAmbienceMusic(worldInstance, fadeOutMs = 350) {
  if (g_dreadPathRampDarkAmbienceTimeoutId != null) {
    window.clearTimeout(g_dreadPathRampDarkAmbienceTimeoutId);
    g_dreadPathRampDarkAmbienceTimeoutId = null;
  }
  worldInstance?.sound?.stopLoop?.(DREAD_DARK_AMBIENCE_LOOP_KEY, fadeOutMs);
}

function StartWhiteRoomLiminalAmbienceFadeIn(worldInstance) {
  const sound = worldInstance?.sound;
  if (!sound) return false;

  const startLoopAndFade = () => {
    sound.stopLoop?.(WHITE_ROOM_LIMINAL_AMBIENCE_LOOP_KEY, 0);
    const entry = sound.startLoop?.('liminal', WHITE_ROOM_LIMINAL_AMBIENCE_LOOP_KEY, {
      bus: 'ambience',
      volume: 0.0,
    });
    if (!entry) return false;
    sound.setLoopVolume?.(
      WHITE_ROOM_LIMINAL_AMBIENCE_LOOP_KEY,
      WHITE_ROOM_LIMINAL_AMBIENCE_VOLUME,
      WHITE_ROOM_LIMINAL_AMBIENCE_FADE_IN_MS
    );
    return true;
  };

  if (startLoopAndFade()) return true;

  // Fallback: if the buffer was not loaded yet (or the file was added after the page loaded),
  // lazy-load and retry once.
  sound.resume?.();
  const liminalPath = SOUND_ASSET_PATHS?.liminal;
  if (!liminalPath || typeof sound.loadSound !== 'function') {
    console.warn('Liminal ambience could not start (missing sound asset path or loadSound).');
    return false;
  }

  sound.loadSound('liminal', liminalPath)
    .then(() => {
      startLoopAndFade();
    })
    .catch((error) => {
      console.warn('Failed to load liminal ambience:', error);
    });
  return false;
}

function TriggerFullscreenCanvasResizeNow(options = {}) {
  if (!canvas || g_hasFullscreenCanvasResizeTriggered) return false;

  const showMasks = options.showMasks !== false;
  g_hasFullscreenCanvasResizeTriggered = true;
  const oldCanvasRect = canvas.getBoundingClientRect();
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.margin = '0';
  canvas.style.zIndex = '0';
  ResizeCanvasToWindow();
  if (showMasks) {
    ShowOldCanvasMask(oldCanvasRect);
  } else {
    ClearCanvasTransitionMasks();
  }
  window.addEventListener('resize', ResizeCanvasToWindow);
  return true;
}

function ScheduleFullscreenCanvasResize(delayMs = FULLSCREEN_DELAY_MS) {
  if (g_hasFullscreenCanvasResizeTriggered || g_fullscreenResizeTimeoutId != null) return false;

  const safeDelayMs = Math.max(0, Math.floor(Number(delayMs) || 0));
  g_fullscreenResizeTimeoutId = window.setTimeout(() => {
    g_fullscreenResizeTimeoutId = null;
    TriggerFullscreenCanvasResizeNow();
  }, safeDelayMs);
  return true;
}

function setupWebGL() {
  canvas = document.getElementById('webgl');

  gl = canvas.getContext("webgl");
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  SetCanvasSize(INITIAL_CANVAS_SIZE, INITIAL_CANVAS_SIZE);
}

function AddActionsForHTMLUI() {
  playerCoordsElement = document.getElementById('playerCoords');
  fpsCounterElement = document.getElementById('fpsCounter');
  mouseSensitivitySliderElement = document.getElementById('mouseSensitivitySlider');
  mouseSensitivityValueElement = document.getElementById('mouseSensitivityValue');
  fogAmountSliderElement = document.getElementById('fogAmountSlider');
  fogAmountValueElement = document.getElementById('fogAmountValue');
  fogFarMinSliderElement = document.getElementById('fogFarMinSlider');
  fogFarMinValueElement = document.getElementById('fogFarMinValue');
  fogFarMaxSliderElement = document.getElementById('fogFarMaxSlider');
  fogFarMaxValueElement = document.getElementById('fogFarMaxValue');
  startObjectiveElement = document.getElementById('startObjective');
}

function InitStartObjectiveUI() {
  if (!startObjectiveElement) return;

  startObjectiveElement.classList.remove('hidden');
  startObjectiveElement.style.display = 'block';
}

function GetHtmlOverlayUiElements() {
  const elements = [];
  if (startObjectiveElement) elements.push(startObjectiveElement);
  if (playerCoordsElement) elements.push(playerCoordsElement);
  if (fpsCounterElement) elements.push(fpsCounterElement);

  const controls = document.querySelectorAll('#app .controls');
  for (const control of controls) {
    if (control) elements.push(control);
  }

  return elements;
}

function SetHtmlOverlayVisible(visible) {
  g_htmlOverlayVisible = !!visible;

  for (const element of GetHtmlOverlayUiElements()) {
    element.style.visibility = g_htmlOverlayVisible ? '' : 'hidden';
    element.style.pointerEvents = g_htmlOverlayVisible ? '' : 'none';
  }

  SyncHudOverlayCanvasToGameCanvas();
}

function ToggleHtmlOverlayVisible() {
  SetHtmlOverlayVisible(!g_htmlOverlayVisible);
  return g_htmlOverlayVisible;
}

function InitHtmlOverlayToggleUI() {
  if (g_htmlOverlayToggleInitialized) {
    SetHtmlOverlayVisible(g_htmlOverlayVisible);
    return;
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.code !== HTML_OVERLAY_TOGGLE_KEY || ev.repeat) return;
    ToggleHtmlOverlayVisible();
    ev.preventDefault();
  });

  g_htmlOverlayToggleInitialized = true;
  SetHtmlOverlayVisible(false);
}

function GetOrCreateStartIntroOverlay() {
  let overlay = document.getElementById(START_INTRO_OVERLAY_ID);
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = START_INTRO_OVERLAY_ID;
  overlay.style.position = 'fixed';
  overlay.style.backgroundColor = '#000';
  overlay.style.color = '#fff';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.padding = '14px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.zIndex = '2000';
  overlay.style.pointerEvents = 'auto';
  overlay.style.overflow = 'hidden';

  const text = document.createElement('div');
  text.textContent = START_INTRO_MESSAGE_TEXT;
  text.style.maxWidth = '100%';
  text.style.whiteSpace = 'pre-wrap';
  text.style.textAlign = 'center';
  text.style.fontFamily = 'monospace';
  text.style.fontSize = '13px';
  text.style.lineHeight = '1.35';
  overlay.appendChild(text);

  document.body.appendChild(overlay);
  SyncStartIntroOverlayToCanvas();
  return overlay;
}

function SetStartIntroOverlayActive(active) {
  g_startIntroOverlayActive = !!active;

  if (g_startIntroOverlayActive) {
    GetOrCreateStartIntroOverlay();
    input?.setMouseLookLocked?.(true);
    return true;
  }

  document.getElementById(START_INTRO_OVERLAY_ID)?.remove();
  input?.setMouseLookLocked?.(false);
  if (input && typeof input.keysDown === 'object') {
    input.keysDown = Object.create(null);
  }
  g_lastTime = 0;
  return false;
}

function InitStartIntroOverlayContinueGate() {
  if (g_startIntroOverlayKeyListenerInitialized) {
    SetStartIntroOverlayActive(g_startIntroOverlayActive);
    return;
  }

  window.addEventListener('keydown', (ev) => {
    if (!g_startIntroOverlayActive) return;
    if (ev.code !== START_INTRO_CONTINUE_KEY || ev.repeat) {
      ev.preventDefault();
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();
    soundManager?.resume?.();
    SetStartIntroOverlayActive(false);
    soundManager?.setCicadaEnabled?.(true);
  }, true);

  g_startIntroOverlayKeyListenerInitialized = true;
  SetStartIntroOverlayActive(true);
}

function InitMouseSensitivityUI() {
  if (!input || !mouseSensitivitySliderElement || !mouseSensitivityValueElement) return;

  mouseSensitivitySliderElement.value = input.mouseSensitivity.toFixed(2);
  mouseSensitivityValueElement.textContent = input.mouseSensitivity.toFixed(2);

  mouseSensitivitySliderElement.addEventListener('input', (ev) => {
    const nextSensitivity = Number(ev.target.value);
    if (Number.isNaN(nextSensitivity)) return;
    input.mouseSensitivity = nextSensitivity;
    mouseSensitivityValueElement.textContent = nextSensitivity.toFixed(2);
  });
}

function Clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function GetDreadCameraArtifactAmount() {
  if (!DREAD_CAMERA_ARTIFACTS_ENABLED) return 0;
  if (!g_dreadPathRampActive || !world) return 0;
  const progress = GetDreadPathRampProgress(world);
  if (!Number.isFinite(progress) || progress <= 0) return 0;
  return Clamp01(Math.pow(progress, DREAD_CAMERA_ARTIFACTS_PROGRESS_EXPONENT));
}

function DrawDarkCameraArtifactsOverlay(ctx, width, height, nowMs, amount) {
  if (!ctx || amount <= 0.001 || width <= 0 || height <= 0) return;

  const t = nowMs * 0.001;
  const flicker = 0.96 + 0.025 * Math.sin(t * 1.9) + 0.015 * Math.sin(t * 7.3);
  const grainCount = Math.floor(40 + amount * 220);
  const macroBlockCount = Math.floor(6 + amount * 28);
  const bandCount = Math.floor(1 + amount * 4);
  const blockSize = Math.max(8, Math.floor(20 - amount * 8));

  ctx.save();

  ctx.fillStyle = `rgba(6, 8, 7, ${Math.min(0.35, (0.04 + amount * 0.12) * (2.0 - flicker))})`;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < macroBlockCount; i += 1) {
    const bx = Math.floor((Math.random() * width) / blockSize) * blockSize;
    const by = Math.floor((Math.random() * height) / blockSize) * blockSize;
    const bw = blockSize * (1 + Math.floor(Math.random() * 3));
    const bh = blockSize * (1 + Math.floor(Math.random() * 2));
    const tone = Math.floor(12 + Math.random() * 26);
    const greenBias = Math.floor(tone + 2 + Math.random() * 10);
    const blueBias = Math.floor(tone + Math.random() * 5);
    const alpha = 0.015 + Math.random() * (0.05 * amount);
    ctx.fillStyle = `rgba(${tone}, ${greenBias}, ${blueBias}, ${alpha})`;
    ctx.fillRect(bx, by, Math.min(bw, width - bx), Math.min(bh, height - by));

    if (Math.random() < 0.2 + amount * 0.25) {
      ctx.fillStyle = `rgba(${Math.min(255, tone + 25)}, ${Math.min(255, greenBias + 18)}, ${blueBias}, ${alpha * 0.8})`;
      ctx.fillRect(bx, by, Math.min(bw, width - bx), 1);
    }
  }

  for (let i = 0; i < bandCount; i += 1) {
    const bandY = Math.floor(Math.random() * height);
    const bandH = 1 + Math.floor(Math.random() * 3);
    const bandAlpha = 0.018 + Math.random() * (0.04 * amount);
    ctx.fillStyle = `rgba(18, 24, 20, ${bandAlpha})`;
    ctx.fillRect(0, bandY, width, bandH);
    if (Math.random() < 0.55) {
      ctx.fillStyle = `rgba(60, 70, 65, ${bandAlpha * 0.35})`;
      ctx.fillRect(0, Math.max(0, bandY - 1), width, 1);
    }
  }

  for (let i = 0; i < grainCount; i += 1) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const size = Math.random() < 0.85 ? 1 : 2;
    const v = Math.floor(15 + Math.random() * 55);
    const g = Math.min(255, v + Math.floor(Math.random() * 14));
    const alpha = 0.025 + Math.random() * (0.08 * amount);
    ctx.fillStyle = `rgba(${v}, ${g}, ${v}, ${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  if (amount > 0.2) {
    const edgeStripeCount = Math.floor(2 + amount * 5);
    for (let i = 0; i < edgeStripeCount; i += 1) {
      const y = Math.floor(Math.random() * height);
      const h = 1 + Math.floor(Math.random() * 2);
      const inset = Math.floor(Math.random() * Math.max(1, width * 0.08));
      ctx.fillStyle = `rgba(90, 20, 24, ${0.012 + amount * 0.03})`;
      ctx.fillRect(inset, y, Math.floor(width * 0.35), h);
      ctx.fillStyle = `rgba(16, 34, 90, ${0.01 + amount * 0.028})`;
      ctx.fillRect(
        Math.max(0, width - inset - Math.floor(width * 0.35)),
        y + (Math.random() < 0.5 ? 0 : 1),
        Math.floor(width * 0.35),
        h
      );
    }
  }

  const vignette = ctx.createRadialGradient(
    width * 0.5, height * 0.52, Math.min(width, height) * 0.08,
    width * 0.5, height * 0.52, Math.max(width, height) * 0.78
  );
  vignette.addColorStop(0.0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.62, `rgba(0,0,0,${0.04 + amount * 0.07})`);
  vignette.addColorStop(1.0, `rgba(0,0,0,${0.16 + amount * 0.22})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

function GetDreadPathRampProgress(worldInstance) {
  const playerPos = worldInstance?.player?.transform?.position?.elements;
  if (!playerPos || playerPos.length < 3) return 0;

  const x = Number(playerPos[0]);
  if (!Number.isFinite(x)) return 0;

  const span = Math.max(1, DREAD_PATH_RAMP_END_X - DREAD_PATH_RAMP_START_X);
  return Clamp01((x - DREAD_PATH_RAMP_START_X) / span);
}

function StopDreadPathRampEffects(worldInstance, options = {}) {
  g_dreadPathRampActive = false;
  if (g_dreadPathRampDarkAmbienceTimeoutId != null) {
    window.clearTimeout(g_dreadPathRampDarkAmbienceTimeoutId);
    g_dreadPathRampDarkAmbienceTimeoutId = null;
  }

  if (options.stopWhiteNoise === true) {
    worldInstance?.sound?.stopLoop?.(DREAD_WHITE_NOISE_LOOP_KEY, 400);
  }
  worldInstance?.sound?.stopLoop?.(DREAD_DARK_AMBIENCE_LOOP_KEY, 400);
  g_dreadPathRampDarkAmbienceStarted = false;
  worldInstance?.sound?.stopLoop?.(DREAD_WIND_LOOP_KEY, 600);
  worldInstance?.setDreadChaseInfectionEnabled?.(false, { clear: true });
  worldInstance?.setWindLeafParticlesEnabled?.(false);

  if (renderer && g_dreadPathRampFogBaseline) {
    const baseNear = Number(g_dreadPathRampFogBaseline.fogNear);
    const baseFar = Number(g_dreadPathRampFogBaseline.fogFar);
    if (Number.isFinite(baseNear)) {
      renderer.fogNear = Math.max(0.01, baseNear);
    }
    if (Number.isFinite(baseFar)) {
      const minAllowedFar = Math.max(0.02, Number(renderer.fogNear) + 0.01);
      renderer.fogFar = Math.max(minAllowedFar, baseFar);
      SyncFogAmountUIToRenderer();
    }
  }
  g_dreadPathRampFogBaseline = null;

  worldInstance?.setNightCycleProgressOverride?.(null);
  worldInstance?.setNightCycleEnabled?.(false);
}

function UpdateDreadPathRampEffects(worldInstance) {
  if (!g_dreadPathRampActive || !worldInstance) return;

  const progress = GetDreadPathRampProgress(worldInstance);
  const visualProgress = Math.pow(progress, DREAD_PATH_VISUAL_RAMP_EXPONENT);
  worldInstance.setDreadChaseInfectionEnabled?.(true);
  worldInstance.setDreadChaseInfectionProgress?.(progress);
  if (ENABLE_DREAD_WHITE_NOISE) {
    const eased = Math.pow(progress, DREAD_WHITE_NOISE_RAMP_EXPONENT);
    const whiteNoiseVolume = DREAD_WHITE_NOISE_MIN_VOLUME +
      (DREAD_WHITE_NOISE_MAX_VOLUME - DREAD_WHITE_NOISE_MIN_VOLUME) * eased;

    worldInstance.sound?.startLoop?.('white_noise', DREAD_WHITE_NOISE_LOOP_KEY, {
      bus: 'ambience',
      volume: DREAD_WHITE_NOISE_MIN_VOLUME,
    });
    worldInstance.sound?.setLoopVolume?.(DREAD_WHITE_NOISE_LOOP_KEY, whiteNoiseVolume, 50);
  }

  const windEased = Math.pow(progress, DREAD_WIND_RAMP_EXPONENT);
  const windVolume = DREAD_WIND_MIN_VOLUME +
    (DREAD_WIND_MAX_VOLUME - DREAD_WIND_MIN_VOLUME) * windEased;
  worldInstance.sound?.startLoop?.('wind_howling', DREAD_WIND_LOOP_KEY, {
    bus: 'ambience',
    volume: DREAD_WIND_MIN_VOLUME,
  });
  worldInstance.sound?.setLoopVolume?.(DREAD_WIND_LOOP_KEY, windVolume, 80);

  if (renderer && g_dreadPathRampFogBaseline) {
    const baseNear = Number(g_dreadPathRampFogBaseline.fogNear);
    const baseFar = Number(g_dreadPathRampFogBaseline.fogFar);
    if (Number.isFinite(baseNear) && Number.isFinite(baseFar)) {
      const nextFogNear = Math.max(0.01, baseNear + DREAD_PATH_FOG_NEAR_RAMP_DELTA * visualProgress);
      const desiredFogFar = baseFar - DREAD_PATH_FOG_FAR_RAMP_DELTA * visualProgress;
      const minFogFar = nextFogNear + 0.01;
      renderer.fogNear = nextFogNear;
      renderer.fogFar = Math.max(minFogFar, desiredFogFar);
      SyncFogAmountUIToRenderer();
    }
  }

  worldInstance.setNightCycleEnabled?.(true);
  worldInstance.setNightCycleProgressOverride?.(visualProgress);
}

function StartDreadPathRampSequence(worldInstance) {
  if (!worldInstance || g_dreadPathRampActive) return;

  g_dreadPathRampActive = true;
  if (renderer) {
    g_dreadPathRampFogBaseline = {
      fogNear: Number(renderer.fogNear),
      fogFar: Number(renderer.fogFar),
    };
  } else {
    g_dreadPathRampFogBaseline = null;
  }

  worldInstance.stopCicadaAmbienceAbrupt?.();
  worldInstance.showHudMessage?.('the wind began to pick up.', 4300);
  window.setTimeout(() => {
    worldInstance.showHudMessage?.(
      'what at first started as a light breeze became a low, restless rush.',
      6500
    );
  }, 3500);

  if (ENABLE_DREAD_WHITE_NOISE) {
    worldInstance.sound?.startLoop?.('white_noise', DREAD_WHITE_NOISE_LOOP_KEY, {
      bus: 'ambience',
      volume: DREAD_WHITE_NOISE_MIN_VOLUME,
    });
  } else {
    worldInstance.sound?.stopLoop?.(DREAD_WHITE_NOISE_LOOP_KEY, 0);
  }
  worldInstance.sound?.startLoop?.('wind_howling', DREAD_WIND_LOOP_KEY, {
    bus: 'ambience',
    volume: DREAD_WIND_MIN_VOLUME,
  });
  worldInstance.setDreadChaseInfectionEnabled?.(true);
  worldInstance.setDreadChaseInfectionProgress?.(0);
  worldInstance.setWindLeafParticlesEnabled?.(true);
  worldInstance.setFogEnabled?.(true);
  worldInstance.setNightCycleEnabled?.(true);
  worldInstance.setNightCycleProgressOverride?.(0);
}

function FogAmountFromFar(fogFar) {
  const span = g_fogFarMax - g_fogFarMin;
  if (span <= 0) return 0;
  return Clamp01((g_fogFarMax - fogFar) / span);
}

function SetFogAmount(amount) {
  if (!renderer) return;
  const clamped = Clamp01(amount);
  renderer.fogFar = g_fogFarMax - clamped * (g_fogFarMax - g_fogFarMin);
}

function SyncFogAmountUIToRenderer() {
  if (!renderer || !fogAmountSliderElement || !fogAmountValueElement) return;
  const amount = FogAmountFromFar(renderer.fogFar);
  fogAmountSliderElement.value = amount.toFixed(2);
  fogAmountValueElement.textContent = amount.toFixed(2);
}

function SetRendererFogColor(color = WHITE_CONCRETE_COLOR) {
  if (!renderer || !Array.isArray(color) || color.length < 3) return;
  const r = Number(color[0]);
  const g = Number(color[1]);
  const b = Number(color[2]);
  const a = Number.isFinite(color[3]) ? Number(color[3]) : 1.0;
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b) || !Number.isFinite(a)) return;

  renderer.fogColor = [r, g, b, a];
  renderer.dayFogColor = [r, g, b, a];
}

function AdjustRendererFogFar(delta) {
  if (!renderer) return;
  const nextFogFar = Number(renderer.fogFar) + Number(delta);
  if (!Number.isFinite(nextFogFar)) return;
  renderer.fogFar = Math.min(g_fogFarMax, Math.max(g_fogFarMin, nextFogFar));
  SyncFogAmountUIToRenderer();
}

function AdjustRendererFogNear(delta) {
  if (!renderer) return;
  const nextFogNear = Number(renderer.fogNear) + Number(delta);
  if (!Number.isFinite(nextFogNear)) return;
  const maxFogNear = Math.max(0.01, Number(renderer.fogFar) - 0.01);
  renderer.fogNear = Math.min(maxFogNear, Math.max(0.01, nextFogNear));
}

function SetWhiteRoomWallHoleFilled(worldInstance, filled) {
  if (!worldInstance) return;
  for (const block of WHITE_ROOM_HOLE_BLOCKS) {
    if (filled) {
      worldInstance.placeBlock?.(block.x, block.y, block.z, { blockId: 'white_concrete' });
    } else {
      worldInstance.removeBlock?.(block.x, block.y, block.z);
    }
  }
}

function SetWhiteRoomWindowOpeningFilled(worldInstance, filled) {
  if (!worldInstance) return;
  for (const block of WHITE_ROOM_WINDOW_BLOCKS) {
    if (filled) {
      worldInstance.placeBlock?.(block.x, block.y, block.z, { blockId: 'white_concrete' });
    } else {
      worldInstance.removeBlock?.(block.x, block.y, block.z);
    }
  }
}

function SetLiminalMarkerWindowFrameWhiteConcrete(worldInstance) {
  if (!worldInstance) return;
  for (const block of LIMINAL_MARKER_WINDOW_FRAME_BLOCKS) {
    worldInstance.placeBlock?.(block.x, block.y, block.z, { blockId: 'white_concrete' });
  }
}

function AddLiminalMarkerWindowFrameWhiteOverlays(worldInstance) {
  if (!worldInstance || g_liminalMarkerWindowWhiteOverlaysAdded) return;
  if (typeof worldInstance.addEntity !== 'function') return;

  const openingKeySet = new Set(
    WHITE_ROOM_WINDOW_BLOCKS.map((block) => `${block.x},${block.y},${block.z}`)
  );
  const neighborFaces = [
    { dx: -1, dy: 0, dz: 0, face: 'left' },
    { dx: 1, dy: 0, dz: 0, face: 'right' },
    { dx: 0, dy: -1, dz: 0, face: 'bottom' },
    { dx: 0, dy: 1, dz: 0, face: 'top' },
    { dx: 0, dy: 0, dz: -1, face: 'front' },
    { dx: 0, dy: 0, dz: 1, face: 'back' },
  ];

  const addFaceOverlay = (block, face) => {
    const t = LIMINAL_MARKER_WINDOW_OVERLAY_THICKNESS;
    const o = LIMINAL_MARKER_WINDOW_OVERLAY_FRONT_OFFSET;
    const transform = new Transform();
    let faceVisibility = null;

    if (face === 'front') {
      transform.setPosition(block.x, block.y, block.z - o);
      transform.setScale(1.0, 1.0, t);
      faceVisibility = { front: true, right: false, back: false, left: false, top: false, bottom: false };
    } else if (face === 'back') {
      transform.setPosition(block.x, block.y, block.z + 1.0 - t + o);
      transform.setScale(1.0, 1.0, t);
      faceVisibility = { front: false, right: false, back: true, left: false, top: false, bottom: false };
    } else if (face === 'left') {
      transform.setPosition(block.x - o, block.y, block.z);
      transform.setScale(t, 1.0, 1.0);
      faceVisibility = { front: false, right: false, back: false, left: true, top: false, bottom: false };
    } else if (face === 'right') {
      transform.setPosition(block.x + 1.0 - t + o, block.y, block.z);
      transform.setScale(t, 1.0, 1.0);
      faceVisibility = { front: false, right: true, back: false, left: false, top: false, bottom: false };
    } else if (face === 'top') {
      transform.setPosition(block.x, block.y + 1.0 - t + o, block.z);
      transform.setScale(1.0, t, 1.0);
      faceVisibility = { front: false, right: false, back: false, left: false, top: true, bottom: false };
    } else if (face === 'bottom') {
      transform.setPosition(block.x, block.y - o, block.z);
      transform.setScale(1.0, t, 1.0);
      faceVisibility = { front: false, right: false, back: false, left: false, top: false, bottom: true };
    } else {
      return;
    }

    worldInstance.addEntity(createEntity('entity', {
      renderShape: 'cube',
      transform,
      textureNum: -2,
      color: [...WHITE_CONCRETE_COLOR],
      useFaceShading: false,
      frontFaceOnly: true,
      faceVisibility,
    }));
  };

  for (const block of LIMINAL_MARKER_WINDOW_FRAME_BLOCKS) {
    for (const neighbor of neighborFaces) {
      const key = `${block.x + neighbor.dx},${block.y + neighbor.dy},${block.z + neighbor.dz}`;
      if (!openingKeySet.has(key)) continue;
      addFaceOverlay(block, neighbor.face);
    }
  }

  g_liminalMarkerWindowWhiteOverlaysAdded = true;
}

function TeleportPlayerToWhiteRoomCenter(worldInstance) {
  if (!worldInstance?.player || typeof worldInstance.player.setPosition !== 'function') return false;

  const target = WHITE_ROOM_TELEPORT_TARGET;
  const safeTarget = (typeof worldInstance.resolveSafeSpawn === 'function')
    ? worldInstance.resolveSafeSpawn(target)
    : target;

  worldInstance.player.setPosition(safeTarget.x, safeTarget.y, safeTarget.z, true);
  const rotation = worldInstance.player.transform?.rotation?.elements;
  if (rotation) {
    rotation[0] = Number.isFinite(target.pitch) ? target.pitch : rotation[0];
    rotation[1] = Number.isFinite(target.yaw) ? target.yaw : rotation[1];
    if (typeof worldInstance.player.updateVectors === 'function') {
      worldInstance.player.updateVectors();
    }
  }

  if (typeof worldInstance.updateSkyboxTransform === 'function') {
    worldInstance.updateSkyboxTransform();
  }
  try {
    StopDreadPathRampEffects(worldInstance);
  } catch (error) {
    console.log('Failed to stop dread-path ramp effects during white-room teleport:', error);
  }
  worldInstance.sound?.setCicadaEnabled?.(false);
  worldInstance.sound?.setFootstepSoundSet?.('echo');
  worldInstance.setHauntFxEnabled?.(false);
  window.setTimeout(() => {
    StartWhiteRoomLiminalAmbienceFadeIn(worldInstance);
  }, WHITE_ROOM_LIMINAL_AMBIENCE_START_DELAY_MS);
  return true;
}

function StartEndOfPathWhiteRoomTeleportSequence(worldInstance) {
  if (!worldInstance || g_endPathWhiteRoomSequenceStarted) return false;
  g_endPathWhiteRoomSequenceStarted = true;

  ClearWallCreptCloserDialogueTimeouts();
  ClearPathStoppedAbruptlyDialogueTimeouts();
  StopDreadDarkAmbienceMusic(worldInstance, 250);
  worldInstance.sound?.play?.('falling', {
    bus: 'sfx',
    volume: 0.42,
    cooldownMs: 100,
    maxVoices: 2,
  });

  StartEndPathWhiteFade(() => {
    TriggerFullscreenCanvasResizeNow({ showMasks: false });

    TeleportPlayerToWhiteRoomCenter(worldInstance);
    worldInstance.setFogEnabled?.(true);
    SetRendererFogColor(WHITE_CONCRETE_COLOR);
    AdjustRendererFogFar(12.0);
    AdjustRendererFogNear(4.0);
    AddLiminalMarkerWindowFrameWhiteOverlays(worldInstance);

    window.setTimeout(() => {
      FadeOutEndPathWhiteFadeMask();
    }, 120);
  }, END_PATH_WHITE_FADE_DURATION_MS);

  return true;
}

function SyncFogFarRangeUIValues() {
  if (fogFarMinValueElement) {
    fogFarMinValueElement.textContent = g_fogFarMin.toFixed(0);
  }
  if (fogFarMaxValueElement) {
    fogFarMaxValueElement.textContent = g_fogFarMax.toFixed(0);
  }
  if (fogFarMinSliderElement) {
    fogFarMinSliderElement.value = g_fogFarMin.toFixed(0);
  }
  if (fogFarMaxSliderElement) {
    fogFarMaxSliderElement.value = g_fogFarMax.toFixed(0);
  }
}

function ApplyFogFarRange(nextMin, nextMax) {
  const parsedMin = Number(nextMin);
  const parsedMax = Number(nextMax);
  if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) return;

  let clampedMin = Math.max(1, Math.floor(parsedMin));
  let clampedMax = Math.max(1, Math.floor(parsedMax));
  if (clampedMin > clampedMax) {
    const temp = clampedMin;
    clampedMin = clampedMax;
    clampedMax = temp;
  }

  g_fogFarMin = clampedMin;
  g_fogFarMax = clampedMax;

  if (renderer) {
    renderer.fogFar = Math.min(g_fogFarMax, Math.max(g_fogFarMin, renderer.fogFar));
  }

  SyncFogFarRangeUIValues();

  if (renderer && fogAmountSliderElement && fogAmountValueElement) {
    const amount = FogAmountFromFar(renderer.fogFar);
    fogAmountSliderElement.value = amount.toFixed(2);
    fogAmountValueElement.textContent = amount.toFixed(2);
  }
}

function InitFogRangeUI() {
  if (!fogFarMinSliderElement || !fogFarMaxSliderElement) return;

  ApplyFogFarRange(g_fogFarMin, g_fogFarMax);

  fogFarMinSliderElement.addEventListener('input', (ev) => {
    const nextMin = Number(ev.target.value);
    ApplyFogFarRange(nextMin, g_fogFarMax);
  });

  fogFarMaxSliderElement.addEventListener('input', (ev) => {
    const nextMax = Number(ev.target.value);
    ApplyFogFarRange(g_fogFarMin, nextMax);
  });
}

function InitFogAmountUI() {
  if (!renderer || !fogAmountSliderElement || !fogAmountValueElement) return;

  const initialAmount = FogAmountFromFar(renderer.fogFar);
  fogAmountSliderElement.value = initialAmount.toFixed(2);
  fogAmountValueElement.textContent = initialAmount.toFixed(2);
  SetFogAmount(initialAmount);

  fogAmountSliderElement.addEventListener('input', (ev) => {
    const amount = Number(ev.target.value);
    if (Number.isNaN(amount)) return;
    SetFogAmount(amount);
    fogAmountValueElement.textContent = amount.toFixed(2);
  });
}

function CalculateFPS(dt) {
  if (!fpsCounterElement || dt <= 0) return;
  const currentFps = 1 / dt;
  fpsCounterElement.textContent = `FPS: ${currentFps.toFixed(1)}`;
}

async function TryLoadWorldMap(worldInstance, paths = WORLD_DATA_PATHS) {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) continue;

      const worldData = await response.json();
      const placedCount = worldInstance.loadFromWorldData(worldData);
      console.log(`Loaded world map from ${path}. Placed ${placedCount} blocks.`);
      return true;
    } catch (err) {
      console.log(`Failed to load world map from ${path}:`, err);
    }
  }

  console.log('No world_data.json found. Using default test blocks.');
  return false;
}

function RegisterWorldTriggers(worldInstance) {
  if (!worldInstance || typeof worldInstance.addPlayerTrigger !== 'function') return;

  const spawnCoords = worldInstance.player?.coords || worldInstance.spawn;
  if (spawnCoords && Number.isFinite(spawnCoords.x) && Number.isFinite(spawnCoords.y) && Number.isFinite(spawnCoords.z)) {
    worldInstance.addPlayerTrigger({
      id: 'spawn-welcome',
      bounds: BuildTriggerBoundsFromPoint(spawnCoords, 0),
      once: true,
      onTrigger: ({ world }) => {
        world.showHudMessage?.(
          'my goal was simple.\nfollow the path and make it home in time for my online class.', 
          14000
        );
      },
    });
  }

  worldInstance.addPlayerTrigger({
    id: 'online-class-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 8, y: 5, z: 4 },
      {
        x: 0,
        y: 0,
        z: { minus: 0, plus: 1 }, // allows z = 4..5
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.(
        '',
        9000
      );
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'break-wall-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 19, y: 5, z: 10 },
      {
        x: 0,
        y: 0,
        z: { minus: 9, plus: 10 }, // allows z = 1..20
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.(
        'i broke the stone by clicking it.',
        9000
      );
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'build-bridge-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 31, y: 5, z: 10 },
      {
        x: 0,
        y: 0,
        z: { minus: 9, plus: 10 }, // allows z = 1..20
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.(
        'i filled the gap with stone by right clicking.',
        14000
      );
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'house-nearby-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 37, y: 5, z: 10 },
      {
        x: 0,
        y: 0,
        z: { minus: 9, plus: 10 }, // allows z = 1..20
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.(
        'i saw the house in the distance. ' +
        'i would make it to class on time.',
        9000
      );
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'softlock-meta-joke',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 36, y: 3, z: 10 },
      {
        x: 0,
        y: 0,
        z: { minus: 9, plus: 10 }, // allows z = 1..20
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.(
        'i softlocked myself and had to refresh the page.',
        7000
      );
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'hole-teleport',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 50, y: 0, z: 10 },
      {
        x: { minus: 0, plus: 1 }, // allows x = 50..51
        y: 0,
        z: { minus: 9, plus: 10 }, // allows z = 1..20
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      if (!world?.player || typeof world.player.setPosition !== 'function') return;

      const teleportTarget = { x: 52, y: 1, z: 51 };
      const safeTeleportTarget = (typeof world.resolveSafeSpawn === 'function')
        ? world.resolveSafeSpawn(teleportTarget)
        : teleportTarget;
      world.player.setPosition(safeTeleportTarget.x, safeTeleportTarget.y, safeTeleportTarget.z, true);
      world.sound?.play?.('fallsmall', {
        bus: 'sfx',
        volume: 0.42,
        cooldownMs: 100,
        maxVoices: 2,
      });
      if (typeof world.player.setJumpEnabled === 'function') {
        world.player.setJumpEnabled(true);
      }
      if (typeof world.updateSkyboxTransform === 'function') {
        world.updateSkyboxTransform();
      }
      world.setFogEnabled?.(true);
      SetFogAmount(1.0);
      if (fogAmountSliderElement && fogAmountValueElement) {
        fogAmountSliderElement.value = '1.00';
        fogAmountValueElement.textContent = '1.00';
      }

      window.setTimeout(() => {
        world.showHudMessage?.(
          'weird...',
          1600
        );
        window.setTimeout(() => {
          world.showHudMessage?.(
            "i didn't see that hole there before.",
            4600
          );
          window.setTimeout(() => {
            world.showHudMessage?.(
              'i jumped out by pressing space.',
              8000
            );
          }, 4000);
        }, 1000);
      }, 2000);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'foggy-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 57, y: 4, z: 47 },
      {
        x: 0,
        y: DREAD_PATH_TRIGGER_Y_LEEWAY,
        z: { minus: 13, plus: 13 }, // allows z = 34..60
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.('was it always this foggy?', 7000);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'trees-question-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 88, y: 4, z: 47 },
      {
        x: 0,
        y: DREAD_PATH_TRIGGER_Y_LEEWAY,
        z: { minus: 13, plus: 13 }, // same lenient forest-path range (z = 34..60)
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.('trees...?', 2600);
      window.setTimeout(() => {
        world.showHudMessage?.("i didn't remember seeing any trees.", 5100);
        window.setTimeout(() => {
          world.showHudMessage?.("still, i continued down the path. i mustn't be late for class.", 7000);
        }, 4500);
      }, 2000);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'forest-empty-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 113, y: 4, z: 47 },
      {
        x: 0,
        y: DREAD_PATH_TRIGGER_Y_LEEWAY,
        z: { minus: 13, plus: 13 }, // same lenient forest-path range (z = 34..60)
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.sound?.fadeOutCicada?.(10500);
      world.showHudMessage?.('the forest was oddly empty.', 3600);
      window.setTimeout(() => {
        world.showHudMessage?.('no animals, no insects.', 3600);
        window.setTimeout(() => {
          world.showHudMessage?.('and the cicada chirps that once filled the air...', 5200);
          window.setTimeout(() => {
            world.showHudMessage?.('were gone.', 7000);
            if (g_dreadPathRampDarkAmbienceTimeoutId != null) {
              window.clearTimeout(g_dreadPathRampDarkAmbienceTimeoutId);
              g_dreadPathRampDarkAmbienceTimeoutId = null;
            }
            if (!g_dreadPathRampDarkAmbienceStarted) {
              g_dreadPathRampDarkAmbienceTimeoutId = window.setTimeout(() => {
                g_dreadPathRampDarkAmbienceTimeoutId = null;
                if (g_dreadPathRampDarkAmbienceStarted) return;
                g_dreadPathRampDarkAmbienceStarted = true;
                world.sound?.startLoop?.('dark_ambience', DREAD_DARK_AMBIENCE_LOOP_KEY, {
                  bus: 'ambience',
                  volume: DREAD_DARK_AMBIENCE_VOLUME,
                });
              }, DREAD_DARK_AMBIENCE_DELAY_MS);
            }
          }, 4500);
        }, 3000);
      }, 3000);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'dread-ramp-start',
    bounds: BuildTriggerBoundsFromPoint(
      { x: DREAD_PATH_RAMP_START_X, y: DREAD_PATH_RAMP_Y, z: 50 },
      {
        x: 0,
        y: DREAD_PATH_TRIGGER_Y_LEEWAY,
        z: { minus: 20, plus: 15 }, // allows z = 30..65
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      StartDreadPathRampSequence(world);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'growing-dark-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 195, y: 4, z: 47 },
      {
        x: 0,
        y: DREAD_PATH_TRIGGER_Y_LEEWAY,
        z: { minus: 13, plus: 13 }, // same lenient forest-path range (z = 34..60)
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.('it was growing dark.', 6000);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'forest-vanished-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 200, y: 4, z: 47 },
      {
        x: 0,
        y: DREAD_PATH_TRIGGER_Y_LEEWAY,
        z: { minus: 13, plus: 13 }, // same lenient forest-path range (z = 34..60)
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      world.showHudMessage?.('too dark...', 4300);
      window.setTimeout(() => {
        world.showHudMessage?.('when i looked back, the forest was gone.', 5200);
        window.setTimeout(() => {
          world.showHudMessage?.('the surrounding night was a solid, black wall.', 8000);
        }, 4000);
      }, 3500);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'wall-crept-closer-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 228, y: 4, z: 47 },
      {
        x: 0,
        y: DREAD_PATH_TRIGGER_Y_LEEWAY,
        z: { minus: 13, plus: 13 }, // same lenient forest-path range (z = 34..60)
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      ClearWallCreptCloserDialogueTimeouts();
      world.showHudMessage?.('the wall crept closer.', 4300);
      g_wallCreptCloserSecondLineTimeoutId = window.setTimeout(() => {
        g_wallCreptCloserSecondLineTimeoutId = null;
        world.showHudMessage?.(
          'i kept walking along the path. it was the only thing that kept me moving forward.',
          6500
        );
        g_wallCreptCloserFinalLineTimeoutId = window.setTimeout(() => {
          g_wallCreptCloserFinalLineTimeoutId = null;
          world.showHudMessage?.(
            'i knew that at the end of it, my house lay waiting.',
            9000,
            { charRevealMs: HUD_SUBTITLE_CHAR_REVEAL_MS * 2 }
          );
        }, 4200);
      }, 3500);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'path-stopped-abruptly-hint',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 248, y: 4, z: 47 },
      {
        x: 0,
        y: DREAD_PATH_TRIGGER_Y_LEEWAY,
        z: { minus: 13, plus: 13 }, // same lenient forest-path range (z = 34..60)
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      ClearWallCreptCloserDialogueTimeouts();
      ClearPathStoppedAbruptlyDialogueTimeouts();
      world.showHudMessage?.(
        'the path stopped.\nno, the entire forest stopped.',
        5200,
        { charRevealMs: HUD_SUBTITLE_CHAR_REVEAL_MS * 2 }
      );
      g_pathStoppedSecondLineTimeoutId = window.setTimeout(() => {
        g_pathStoppedSecondLineTimeoutId = null;
        world.showHudMessage?.(
          'i looked back again. the walls were still creeping closer.',
          6200,
          { charRevealMs: HUD_SUBTITLE_CHAR_REVEAL_MS * 2 }
        );
        g_pathStoppedFinalLineTimeoutId = window.setTimeout(() => {
          g_pathStoppedFinalLineTimeoutId = null;
          world.showHudMessage?.(
            'knowing there was only one thing to do, i stepped off the path.',
            9000,
            { charRevealMs: HUD_SUBTITLE_CHAR_REVEAL_MS * 2 }
          );
        }, 6200);
      }, 5200);
    },
  });

  worldInstance.addPlayerTrigger({
    id: 'end-of-path-fall-white-room-sequence',
    bounds: BuildTriggerBoundsFromPoint(
      { x: 257, y: 3, z: 47 },
      {
        x: { minus: 0, plus: 8 },   // trigger only after the path edge (x >= 257)
        y: { minus: 48, plus: 0 },  // require the player to have started falling (y <= 3)
        z: { minus: 13, plus: 13 }, // same lenient forest-path range (z = 34..60)
      }
    ),
    once: true,
    onTrigger: ({ world }) => {
      StartEndOfPathWhiteRoomTeleportSequence(world);
    },
  });

  if (ENABLE_LIMINAL_SEQUENCE_EVENT) {
    worldInstance.addPlayerTrigger({
      id: 'liminal-sequence-start',
      bounds: BuildTriggerBoundsFromPoint(
        { x: DREAD_PATH_RAMP_END_X, y: DREAD_PATH_RAMP_Y, z: 50 },
        {
          x: 0,
          y: DREAD_PATH_TRIGGER_Y_LEEWAY,
          z: { minus: 20, plus: 15 }, // allows z = 30..65
        }
      ),
      once: true,
      onTrigger: ({ world, playerCoords }) => {
        if (!world) return;

        if (typeof world.setInfectionExcludedCoords === 'function') {
          world.setInfectionExcludedCoords([
            ...WHITE_ROOM_HOLE_BLOCKS,
            ...WHITE_ROOM_WINDOW_BLOCKS,
          ]);
        }

        // Close the room exit before the scripted sequence starts.
        SetWhiteRoomWallHoleFilled(world, true);
        AddLiminalMarkerWindowFrameWhiteOverlays(world);

        // Start infection at the tile the player used to trigger this sequence.
        const firstSeed = playerCoords || { x: DREAD_PATH_RAMP_END_X, y: DREAD_PATH_RAMP_Y, z: 50 };
        if (typeof world.setInfectionEnabled === 'function') {
          world.setInfectionEnabled(true);
        }
        if (typeof world.startInfectionAt === 'function') {
          let seedY = firstSeed.y;
          if (typeof world.isSolidBlockAtGrid === 'function') {
            const hasSolidAtTrigger = world.isSolidBlockAtGrid(firstSeed.x, firstSeed.y, firstSeed.z);
            const hasSolidBelow = world.isSolidBlockAtGrid(firstSeed.x, firstSeed.y - 1, firstSeed.z);
            if (!hasSolidAtTrigger && hasSolidBelow) {
              seedY = firstSeed.y - 1;
            }
          }
          world.startInfectionAt(firstSeed.x, seedY, firstSeed.z);
        }

        // Start the existing black-mask fullscreen canvas transition 1s before teleport.
        ScheduleFullscreenCanvasResize(9000);

        // Teleport the player into the white room after 10s, then kick off the second infection.
        window.setTimeout(() => {
          TeleportPlayerToWhiteRoomCenter(world);

          world.setFogEnabled?.(true);
          SetRendererFogColor(WHITE_CONCRETE_COLOR);
          AdjustRendererFogFar(12.0); // restore previous white-room fog distance tweak
          AdjustRendererFogNear(4.0); // push fog start a little farther out so room interior stays clearer
          if (Number.isFinite(world.infectionSpreadInterval) && world.infectionSpreadInterval > 0) {
            world.infectionSpreadInterval = Math.max(
              0.01,
              world.infectionSpreadInterval / WHITE_ROOM_INFECTION_SPEED_MULTIPLIER
            );
          }

          let startedSecondInfection = false;
          if (typeof world.setInfectionEnabled === 'function') {
            world.setInfectionEnabled(true);
          }
          if (typeof world.setInfectionSpreadBounds === 'function') {
            world.setInfectionSpreadBounds(WHITE_ROOM_INFECTION_BOUNDS);
          }
          if (typeof world.startInfectionAt === 'function') {
            const seed = WHITE_ROOM_SECOND_INFECTION_SEED;
            startedSecondInfection = !!world.startInfectionAt(seed.x, seed.y, seed.z);
          }

          if (startedSecondInfection) {
            window.setTimeout(() => {
              SetWhiteRoomWallHoleFilled(world, false);
            }, 5000);
          }
        }, 10000);
      },
    });
  }

  // Example:
  // worldInstance.addPlayerTrigger({
  //   id: 'reach-house',
  //   bounds: { minX: 95, maxX: 110, minY: 0, maxY: 12, minZ: 90, maxZ: 110 },
  //   timeWindow: { start: 0, end: 120 },
  //   once: true,
  //   onTrigger: ({ world, time, playerCoords }) => {
  //     world.showHudMessage?.(`Reached house at ${time.toFixed(1)}s`, 2500);
  //     console.log(`Reached house at ${time.toFixed(2)}s`, playerCoords);
  //   },
  // });
}

async function main() {
  setupWebGL();
  if (!gl) return;
  SetupHudOverlay();
  if (ENABLE_TIMED_CANVAS_RESIZE) {
    ScheduleFullscreenCanvasResize();
  }

  renderer = new Renderer(canvas, gl);
  if (!renderer.connectVariablesToGLSL()) return;
  renderer.initTextures(TEXTURE_PATHS);
  renderer.initTextures(DANCING_DOG_TEXTURE_PATHS);
  renderer.initTextures(LIMINAL_WATER_TEXTURE_PATHS);
  renderer.setNightCycleEnabled(false);
  renderer.setFogEnabled(false);

  if (typeof SoundManager === 'function') {
    soundManager = new SoundManager();
  } else {
    soundManager = null;
    console.warn('SoundManager is unavailable; sound will be disabled.');
  }
  const soundLoadPromise = soundManager?.loadAll?.(SOUND_ASSET_PATHS) || Promise.resolve();

  world = new World();
  await TryLoadWorldMap(world);
  g_dogTalkPromptVisible = false;
  g_dogEndingSequenceStarted = false;
  RemoveDogEndBlackFadeMask();
  ClearDancingDogSprite();
  ClearLiminalWaterGroundOverlay();
  EnsureDancingDogSprite(world, renderer);
  EnsureLiminalWaterGroundOverlay(world, renderer);
  await soundLoadPromise;
  if (typeof world.player?.setJumpEnabled === 'function') {
    world.player.setJumpEnabled(false);
  }
  AttachHudHelpersToWorld(world);
  AttachRendererHelpersToWorld(world, renderer);
  AttachSoundHelpersToWorld(world, soundManager);
  world.handleInteractAction = () => TryTriggerDogEndingSequence(world);
  soundManager?.setCicadaEnabled?.(false);
  RegisterWorldTriggers(world);
  AddActionsForHTMLUI();
  InitStartObjectiveUI();

  input = new InputHandler(canvas, world);
  input.init();
  InitMouseSensitivityUI();
  InitFogRangeUI();
  InitFogAmountUI();
  InitHtmlOverlayToggleUI();
  InitStartIntroOverlayContinueGate();

  gl.clearColor(0.08, 0.08, 0.1, 1.0);

  function tick(nowMs) {
    if (g_startIntroOverlayActive) {
      g_lastTime = 0;
      renderer.render(world);
      DrawHudOverlay(nowMs);
      requestAnimationFrame(tick);
      return;
    }

    const now = nowMs * 0.001;
    const dt = g_lastTime ? now - g_lastTime : 0;
    g_lastTime = now;

    input.update(dt);
    world.update(dt);
    UpdateDancingDogSprite(world, dt);
    soundManager?.update?.(world, dt);
    UpdateDreadPathRampEffects(world);
    UpdateDogTalkPrompt(world);
    if (playerCoordsElement) {
      const c = world.player.coords;
      playerCoordsElement.textContent = `Player Coords: (${c.x}, ${c.y}, ${c.z})`;
    }
    CalculateFPS(dt);
    renderer.render(world);
    DrawHudOverlay(nowMs);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

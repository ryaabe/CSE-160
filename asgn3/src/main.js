let canvas;
let gl;

let renderer;
let world;
let input;

// ui elements
let playerCoordsElement;
let fpsCounterElement;
let mouseSensitivitySliderElement;
let mouseSensitivityValueElement;
let fogAmountSliderElement;
let fogAmountValueElement;
let startObjectiveElement;

let g_lastTime = 0;
const WORLD_DATA_PATHS = [
  '../maps/world_data.json',
  '../maps/maps/world_data.json',
];
const FOG_FAR_MIN = 20.0;
const FOG_FAR_MAX = 140.0;

function setupWebGL() {
  canvas = document.getElementById('webgl');

  gl = canvas.getContext("webgl");
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function AddActionsForHTMLUI() {
  playerCoordsElement = document.getElementById('playerCoords');
  fpsCounterElement = document.getElementById('fpsCounter');
  mouseSensitivitySliderElement = document.getElementById('mouseSensitivitySlider');
  mouseSensitivityValueElement = document.getElementById('mouseSensitivityValue');
  fogAmountSliderElement = document.getElementById('fogAmountSlider');
  fogAmountValueElement = document.getElementById('fogAmountValue');
  startObjectiveElement = document.getElementById('startObjective');
}

function InitStartObjectiveUI() {
  if (!startObjectiveElement) return;

  startObjectiveElement.classList.remove('hidden');
  startObjectiveElement.style.display = 'block';
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

function FogAmountFromFar(fogFar) {
  const span = FOG_FAR_MAX - FOG_FAR_MIN;
  if (span <= 0) return 0;
  return Clamp01((FOG_FAR_MAX - fogFar) / span);
}

function SetFogAmount(amount) {
  if (!renderer) return;
  const clamped = Clamp01(amount);
  renderer.fogFar = FOG_FAR_MAX - clamped * (FOG_FAR_MAX - FOG_FAR_MIN);
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

async function main() {
  setupWebGL();
  if (!gl) return;

  renderer = new Renderer(canvas, gl);
  if (!renderer.connectVariablesToGLSL()) return;
  renderer.initTextures(TEXTURE_PATHS);

  world = new World();
  await TryLoadWorldMap(world);
  AddActionsForHTMLUI();
  InitStartObjectiveUI();

  input = new InputHandler(canvas, world);
  input.init();
  InitMouseSensitivityUI();
  InitFogAmountUI();

  gl.clearColor(0.08, 0.08, 0.1, 1.0);

  function tick(nowMs) {
    const now = nowMs * 0.001;
    const dt = g_lastTime ? now - g_lastTime : 0;
    g_lastTime = now;

    input.update(dt);
    world.update(dt);
    if (playerCoordsElement) {
      const c = world.player.coords;
      playerCoordsElement.textContent = `Player Coords: (${c.x}, ${c.y}, ${c.z})`;
    }
    CalculateFPS(dt);
    renderer.render(world);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

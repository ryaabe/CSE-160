// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec3 a_Normal;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_GlobalRotateMatrix;\n' + 
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform vec3 u_LightPos;\n' +
  'uniform vec3 u_SpotPos;\n' +
  'uniform vec3 u_SpotDirection;\n' +
  'uniform vec3 u_CameraPos;\n' +
  'varying vec3 v_NormalDir;\n' +
  'varying vec3 v_PointLightDir;\n' +
  'varying vec3 v_SpotLightDir;\n' +
  'varying vec3 v_SpotDir;\n' +
  'varying vec3 v_ViewDir;\n' +
  'void main() {\n' +
  '  mat4 worldMatrix = u_GlobalRotateMatrix * u_ModelMatrix;\n' +
  '  vec4 worldPos = worldMatrix * a_Position;\n' +
  '  vec3 pointLightWorld = (u_GlobalRotateMatrix * vec4(u_LightPos, 1.0)).xyz;\n' +
  '  vec3 spotLightWorld = (u_GlobalRotateMatrix * vec4(u_SpotPos, 1.0)).xyz;\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * worldPos;\n' +
  '  v_NormalDir = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);\n' +
  '  v_PointLightDir = normalize(pointLightWorld - worldPos.xyz);\n' +
  '  v_SpotLightDir = normalize(spotLightWorld - worldPos.xyz);\n' +
  '  v_SpotDir = normalize((u_GlobalRotateMatrix * vec4(u_SpotDirection, 0.0)).xyz);\n' +
  '  v_ViewDir = normalize(u_CameraPos - worldPos.xyz);\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +  // uniform
  'uniform bool u_NormalVisualization;\n' +
  'uniform vec3 u_LightColor;\n' +
  'uniform vec3 u_SpotColor;\n' +
  'uniform float u_PointLightEnabled;\n' +
  'uniform float u_SpotLightEnabled;\n' +
  'uniform float u_SpotInnerLimit;\n' +
  'uniform float u_SpotOuterLimit;\n' +
  'varying vec3 v_NormalDir;\n' +
  'varying vec3 v_PointLightDir;\n' +
  'varying vec3 v_SpotLightDir;\n' +
  'varying vec3 v_SpotDir;\n' +
  'varying vec3 v_ViewDir;\n' +
  'void main() {\n' +
  '  vec3 N = normalize(v_NormalDir);\n' +
  '  if (u_NormalVisualization) {\n' +
  '    gl_FragColor = vec4(N * 0.5 + 0.5, 1.0);\n' +
  '  } else {\n' +
  '    vec3 pointL = normalize(v_PointLightDir);\n' +
  '    vec3 spotL = normalize(v_SpotLightDir);\n' +
  '    vec3 spotDir = normalize(v_SpotDir);\n' +
  '    vec3 V = normalize(v_ViewDir);\n' +
  '    float pointDiffuse = max(dot(N, pointL), 0.0) * u_PointLightEnabled;\n' +
  '    float spotCone = smoothstep(u_SpotOuterLimit, u_SpotInnerLimit, dot(spotL, -spotDir));\n' +
  '    float spotDiffuse = max(dot(N, spotL), 0.0) * spotCone * u_SpotLightEnabled;\n' +
  '    vec3 pointR = reflect(-pointL, N);\n' +
  '    vec3 spotR = reflect(-spotL, N);\n' +
  '    float pointSpec = 0.0;\n' +
  '    float spotSpec = 0.0;\n' +
  '    if (pointDiffuse > 0.0) {\n' +
  '      pointSpec = u_PointLightEnabled * pow(max(dot(V, pointR), 0.0), 32.0);\n' +
  '    }\n' +
  '    if (spotDiffuse > 0.0) {\n' +
  '      spotSpec = u_SpotLightEnabled * spotCone * pow(max(dot(V, spotR), 0.0), 32.0);\n' +
  '    }\n' +
  '    float ambientStrength = 0.2;\n' +
  '    float specStrength = 0.35;\n' +
  '    vec3 base = u_FragColor.rgb;\n' +
  '    vec3 ambient = ambientStrength * base;\n' +
  '    vec3 pointDiffuseColor = pointDiffuse * base * u_LightColor;\n' +
  '    vec3 spotDiffuseColor = spotDiffuse * base * u_SpotColor;\n' +
  '    vec3 pointSpecColor = specStrength * pointSpec * u_LightColor;\n' +
  '    vec3 spotSpecColor = specStrength * spotSpec * u_SpotColor;\n' +
  '    vec3 diffuse = pointDiffuseColor + spotDiffuseColor;\n' +
  '    vec3 specular = pointSpecColor + spotSpecColor;\n' +
  '    vec3 litColor = ambient + diffuse + specular;\n' +
  '    gl_FragColor = vec4(litColor, u_FragColor.a);\n' +
  '  }\n' +
  '}\n';

// Global Variables
let canvas;
let gl;
let a_Position;
let a_Normal;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ViewMatrix;
let u_ProjMatrix;
let u_NormalMatrix;
let u_LightPos;
let u_SpotPos;
let u_LightColor;
let u_SpotColor;
let u_PointLightEnabled;
let u_SpotLightEnabled;
let u_SpotDirection;
let u_SpotInnerLimit;
let u_SpotOuterLimit;
let u_CameraPos;
let u_NormalVisualization;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // Default framebuffer behavior is faster than preserveDrawingBuffer=true.
  gl = canvas.getContext("webgl");
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.viewport(0, 0, canvas.width, canvas.height);

}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if (!u_ProjMatrix) {
    console.log('Failed to get the storage location of u_ProjMatrix');
    return;
  }

  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return;
  }

  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  if (!u_LightPos) {
    console.log('Failed to get the storage location of u_LightPos');
    return;
  }

  u_SpotPos = gl.getUniformLocation(gl.program, 'u_SpotPos');
  if (!u_SpotPos) {
    console.log('Failed to get the storage location of u_SpotPos');
    return;
  }

  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  if (!u_LightColor) {
    console.log('Failed to get the storage location of u_LightColor');
    return;
  }

  u_SpotColor = gl.getUniformLocation(gl.program, 'u_SpotColor');
  if (!u_SpotColor) {
    console.log('Failed to get the storage location of u_SpotColor');
    return;
  }

  u_PointLightEnabled = gl.getUniformLocation(gl.program, 'u_PointLightEnabled');
  if (!u_PointLightEnabled) {
    console.log('Failed to get the storage location of u_PointLightEnabled');
    return;
  }

  u_SpotLightEnabled = gl.getUniformLocation(gl.program, 'u_SpotLightEnabled');
  if (!u_SpotLightEnabled) {
    console.log('Failed to get the storage location of u_SpotLightEnabled');
    return;
  }

  u_SpotDirection = gl.getUniformLocation(gl.program, 'u_SpotDirection');
  if (!u_SpotDirection) {
    console.log('Failed to get the storage location of u_SpotDirection');
    return;
  }

  u_SpotInnerLimit = gl.getUniformLocation(gl.program, 'u_SpotInnerLimit');
  if (!u_SpotInnerLimit) {
    console.log('Failed to get the storage location of u_SpotInnerLimit');
    return;
  }

  u_SpotOuterLimit = gl.getUniformLocation(gl.program, 'u_SpotOuterLimit');
  if (!u_SpotOuterLimit) {
    console.log('Failed to get the storage location of u_SpotOuterLimit');
    return;
  }

  u_CameraPos = gl.getUniformLocation(gl.program, 'u_CameraPos');
  if (!u_CameraPos) {
    console.log('Failed to get the storage location of u_CameraPos');
    return;
  }

  u_NormalVisualization = gl.getUniformLocation(gl.program, 'u_NormalVisualization');
  if (!u_NormalVisualization) {
    console.log('Failed to get the storage location of u_NormalVisualization');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, identityM.elements);
  gl.uniform3f(u_LightPos, 0.0, 0.8, 0.0);
  gl.uniform3f(u_SpotPos, 0.9, 1.2, 0.0);
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
  gl.uniform3f(u_SpotColor, 1.0, 1.0, 0.0);
  gl.uniform1f(u_PointLightEnabled, 1.0);
  gl.uniform1f(u_SpotLightEnabled, 1.0);
  gl.uniform3f(u_SpotDirection, 0.0, -1.0, 0.0);
  gl.uniform1f(u_SpotInnerLimit, Math.cos(12 * Math.PI / 180));
  gl.uniform1f(u_SpotOuterLimit, Math.cos(30 * Math.PI / 180));
  gl.uniform3f(u_CameraPos, g_cameraEye[0], g_cameraEye[1], g_cameraEye[2]);
  gl.uniform1i(u_NormalVisualization, 0);

}

function setMatrixUniformsForShape(modelMatrix) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  const worldMatrix = new Matrix4(g_globalRotateMatrix);
  worldMatrix.multiply(modelMatrix);

  const normalMatrix = new Matrix4();
  normalMatrix.setInverseOf(worldMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
}
// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Globals related to UI
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
// let g_size = 5;
// let g_segments = 10;
// let g_selectedType = POINT;
let g_drag = false;
let g_tail1Slide = -70;
let g_tail2Slide = -75;
let g_tail3Slide = -45;
let g_tail4Slide = -45;
let g_tail5Slide = 0;
let g_earRot = -45;
let g_earRot2 = -45;
let g_feetRot1 = 5;
let g_feetRot2 = -5;
let g_handRot1 = 0;
let g_handRot2 = 0;
let g_eyeRot = 0;
let g_eyeRot2 = 0;
let g_tailAnimation=false;
let g_normalVisualization = false;
let g_globalRotateMatrix = new Matrix4();

let g_viewMatrix = new Matrix4();
let g_projMatrix = new Matrix4();
let g_cameraEye = [0.0, 0.2, -3.2];
let g_cameraCenter = [0.0, 0.2, -2.2];
let g_cameraUp = [0.0, 1.0, 0.0];
let g_cameraWorldUp = [0.0, 1.0, 0.0];
let g_cameraForward = [0.0, 0.0, -1.0];
let g_cameraRight = [1.0, 0.0, 0.0];
let g_cameraYaw = 90.0;
let g_cameraPitch = 0.0;
let g_cameraMoveSpeed = 2.2;
let g_mouseSensitivity = 0.12;
let g_keyState = {};
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let g_lightPos = [0.0, 0.8, 0.0];
let g_lightBase = [0.0, 0.8, 0.0];
let g_lightColor = [1.0, 1.0, 1.0];
let g_lightAnimation = true;
let g_pointLightEnabled = true;
let g_spotPos = [0.9, 1.2, 0.0];
let g_spotTarget = [0.0, -0.2, 0.0];
let g_spotDirection = [0.0, -1.0, 0.0];
let g_spotColor = [1.0, 1.0, 0.0];
let g_spotInnerDeg = 12;
let g_spotOuterDeg = 30;
let g_spotLightEnabled = true;
let g_dragonModel = null;

function updateCameraUniforms() {
  const aspect = canvas.width / canvas.height;
  g_viewMatrix.setLookAt(
    g_cameraEye[0], g_cameraEye[1], g_cameraEye[2],
    g_cameraCenter[0], g_cameraCenter[1], g_cameraCenter[2],
    g_cameraUp[0], g_cameraUp[1], g_cameraUp[2]
  );
  g_projMatrix.setPerspective(60, aspect, 0.1, 100);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, g_projMatrix.elements);
  gl.uniform3f(u_CameraPos, g_cameraEye[0], g_cameraEye[1], g_cameraEye[2]);
}

function normalizeVec3(x, y, z) {
  const len = Math.hypot(x, y, z) || 1.0;
  return [x / len, y / len, z / len];
}

function crossVec3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function updateCameraVectors() {
  const yawRad = g_cameraYaw * Math.PI / 180.0;
  const pitchRad = g_cameraPitch * Math.PI / 180.0;

  const fx = Math.cos(pitchRad) * Math.cos(yawRad);
  const fy = Math.sin(pitchRad);
  const fz = Math.cos(pitchRad) * Math.sin(yawRad);
  g_cameraForward = normalizeVec3(fx, fy, fz);

  const right = crossVec3(g_cameraForward, g_cameraWorldUp);
  g_cameraRight = normalizeVec3(right[0], right[1], right[2]);

  const up = crossVec3(g_cameraRight, g_cameraForward);
  g_cameraUp = normalizeVec3(up[0], up[1], up[2]);

  g_cameraCenter = [
    g_cameraEye[0] + g_cameraForward[0],
    g_cameraEye[1] + g_cameraForward[1],
    g_cameraEye[2] + g_cameraForward[2]
  ];
}

function rotateCameraFromMouse(dx, dy) {
  g_cameraYaw += dx * g_mouseSensitivity;
  g_cameraPitch -= dy * g_mouseSensitivity;
  g_cameraPitch = Math.max(-89.0, Math.min(89.0, g_cameraPitch));
  updateCameraVectors();
}

function updateCameraMovement(deltaTime) {
  const frameSpeed = g_cameraMoveSpeed * deltaTime;

  if (g_keyState['KeyW']) {
    g_cameraEye[0] += g_cameraForward[0] * frameSpeed;
    g_cameraEye[1] += g_cameraForward[1] * frameSpeed;
    g_cameraEye[2] += g_cameraForward[2] * frameSpeed;
  }
  if (g_keyState['KeyS']) {
    g_cameraEye[0] -= g_cameraForward[0] * frameSpeed;
    g_cameraEye[1] -= g_cameraForward[1] * frameSpeed;
    g_cameraEye[2] -= g_cameraForward[2] * frameSpeed;
  }
  if (g_keyState['KeyA']) {
    g_cameraEye[0] -= g_cameraRight[0] * frameSpeed;
    g_cameraEye[2] -= g_cameraRight[2] * frameSpeed;
  }
  if (g_keyState['KeyD']) {
    g_cameraEye[0] += g_cameraRight[0] * frameSpeed;
    g_cameraEye[2] += g_cameraRight[2] * frameSpeed;
  }
  if (g_keyState['Space']) {
    g_cameraEye[1] += frameSpeed;
  }
  if (g_keyState['ShiftLeft'] || g_keyState['ShiftRight']) {
    g_cameraEye[1] -= frameSpeed;
  }

  updateCameraVectors();
}

let g_tonguePos = 0;
let g_poke = false;
let g_pokeStart = 0;
let g_pokeDuration = 0.2;

function triggerPoke() {
  g_poke = true;
  g_pokeStart = g_seconds;
}

function initCameraControls() {
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight']);

  window.addEventListener('keydown', function (ev) {
    g_keyState[ev.code] = true;
    if (movementKeys.has(ev.code)) {
      ev.preventDefault();
    }
  });

  window.addEventListener('keyup', function (ev) {
    g_keyState[ev.code] = false;
    if (movementKeys.has(ev.code)) {
      ev.preventDefault();
    }
  });

  canvas.addEventListener('mousedown', function (ev) {
    // Keep poke animation available on Alt+Click.
    if (ev.altKey) {
      triggerPoke();
      return;
    }

    g_drag = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    if (canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('mousemove', function (ev) {
    if (document.pointerLockElement === canvas) {
      rotateCameraFromMouse(ev.movementX || 0, ev.movementY || 0);
      return;
    }

    if (!g_drag) return;
    const dx = ev.clientX - g_lastMouseX;
    const dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    rotateCameraFromMouse(dx, dy);
  });

  window.addEventListener('mouseup', function () {
    g_drag = false;
  });

  canvas.addEventListener('mouseleave', function () {
    g_drag = false;
  });

  document.addEventListener('pointerlockchange', function () {
    if (document.pointerLockElement !== canvas) {
      g_drag = false;
    }
  });
}

function addActionsForHtmlUI() {
  // Button Events
  document.getElementById('animationTailOn').onclick = function () {g_tailAnimation=true;};
  document.getElementById('animationTailOFF').onclick = function () {g_tailAnimation=false;};
  document.getElementById('normalVisOn').onclick = function () {g_normalVisualization = true;};
  document.getElementById('normalVisOFF').onclick = function () {g_normalVisualization = false;};
  document.getElementById('lightAnimOn').onclick = function () {g_lightAnimation = true;};
  document.getElementById('lightAnimOff').onclick = function () {g_lightAnimation = false;};
  document.getElementById('pointLightOn').onclick = function () {g_pointLightEnabled = true;};
  document.getElementById('pointLightOff').onclick = function () {g_pointLightEnabled = false;};
  document.getElementById('spotLightOn').onclick = function () {g_spotLightEnabled = true;};
  document.getElementById('spotLightOff').onclick = function () {g_spotLightEnabled = false;};
  document.getElementById('pokeBtn').onclick = function () {triggerPoke();};

  // Joint slider
  document.getElementById('tail1Slide').addEventListener('input', function () {g_tail1Slide = Number(this.value);});
  document.getElementById('tail2Slide').addEventListener('input', function () {g_tail2Slide = Number(this.value);});
  document.getElementById('tail3Slide').addEventListener('input', function () {g_tail3Slide = Number(this.value);});
  document.getElementById('tail4Slide').addEventListener('input', function () {g_tail4Slide = Number(this.value);});
  document.getElementById('tail5Slide').addEventListener('input', function () {g_tail5Slide = Number(this.value);});

  document.getElementById('lightX').addEventListener('input', function () {g_lightBase[0] = Number(this.value);});
  document.getElementById('lightY').addEventListener('input', function () {g_lightBase[1] = Number(this.value);});
  document.getElementById('lightZ').addEventListener('input', function () {g_lightBase[2] = Number(this.value);});

  document.getElementById('lightR').addEventListener('input', function () {g_lightColor[0] = Number(this.value);});
  document.getElementById('lightG').addEventListener('input', function () {g_lightColor[1] = Number(this.value);});
  document.getElementById('lightB').addEventListener('input', function () {g_lightColor[2] = Number(this.value);});
  document.getElementById('spotR').addEventListener('input', function () {g_spotColor[0] = Number(this.value);});
  document.getElementById('spotG').addEventListener('input', function () {g_spotColor[1] = Number(this.value);});
  document.getElementById('spotB').addEventListener('input', function () {g_spotColor[2] = Number(this.value);});
  document.getElementById('spotX').addEventListener('input', function () {g_spotPos[0] = Number(this.value);});
  document.getElementById('spotY').addEventListener('input', function () {g_spotPos[1] = Number(this.value);});
  document.getElementById('spotZ').addEventListener('input', function () {g_spotPos[2] = Number(this.value);});
  document.getElementById('spotInner').addEventListener('input', function () {g_spotInnerDeg = Number(this.value);});
  document.getElementById('spotOuter').addEventListener('input', function () {g_spotOuterDeg = Number(this.value);});


}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initCameraControls();
  updateCameraVectors();
  addActionsForHtmlUI();
  g_dragonModel = new Model(gl, "../resources/dragon.obj");


  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  // gl.clear(gl.COLOR_BUFFER_BIT);

  renderScene();

  requestAnimationFrame(tick);
}

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = [];

var g_shapesList = [];

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return ([x, y]);
}

function click(ev) {
  let [x, y] = convertCoordinatesEventToGL(ev);
  // Store the coordinates to g_points array
  // g_points.push([x, y]);

  //g_colors.push(g_selectedColor.slice());
  // g_sizes.push(g_size);

  let point;
  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else {
    point = new Circle();
    point.segments = g_segments;
  }
  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_size;
  g_shapesList.push(point);

  renderScene();
}


function renderScene() {
  var startTime = performance.now();

  updateCameraUniforms();

  var globalMat = new Matrix4();
  globalMat.setIdentity();

  // move whole character up
  globalMat.translate(0, 0.5, 0);

  g_globalRotateMatrix = new Matrix4(globalMat);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalMat.elements);
  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_SpotPos, g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_SpotColor, g_spotColor[0], g_spotColor[1], g_spotColor[2]);
  gl.uniform1f(u_PointLightEnabled, g_pointLightEnabled ? 1.0 : 0.0);
  gl.uniform1f(u_SpotLightEnabled, g_spotLightEnabled ? 1.0 : 0.0);
  const spotDx = g_spotTarget[0] - g_spotPos[0];
  const spotDy = g_spotTarget[1] - g_spotPos[1];
  const spotDz = g_spotTarget[2] - g_spotPos[2];
  const spotLen = Math.hypot(spotDx, spotDy, spotDz) || 1.0;
  g_spotDirection[0] = spotDx / spotLen;
  g_spotDirection[1] = spotDy / spotLen;
  g_spotDirection[2] = spotDz / spotLen;
  gl.uniform3f(u_SpotDirection, g_spotDirection[0], g_spotDirection[1], g_spotDirection[2]);
  const innerDeg = g_spotInnerDeg;
  const outerDeg = Math.max(g_spotOuterDeg, innerDeg + 0.1);
  gl.uniform1f(u_SpotInnerLimit, Math.cos(innerDeg * Math.PI / 180));
  gl.uniform1f(u_SpotOuterLimit, Math.cos(outerDeg * Math.PI / 180));
  gl.uniform1i(u_NormalVisualization, g_normalVisualization ? 1 : 0);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let lightMarker = new Cube();
  lightMarker.matrix = new Matrix4();
  lightMarker.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  lightMarker.matrix.scale(0.06, 0.06, 0.06);
  lightMarker.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0];
  lightMarker.render();

  let spotMarker = new Cube();
  spotMarker.matrix = new Matrix4();
  spotMarker.matrix.translate(g_spotPos[0], g_spotPos[1], g_spotPos[2]);
  spotMarker.matrix.scale(0.06, 0.06, 0.06);
  spotMarker.color = [g_spotColor[0], g_spotColor[1], g_spotColor[2], 1.0];
  spotMarker.render();

  let root = new Matrix4();
  root.setTranslate(-.25, -.25, -.25);
  root.scale(0.5, 0.5, 0.5); 


  let head1 = new Cube();
  head1.matrix = new Matrix4(root);
  head1.matrix.scale(1, 0.75, 1); 
  head1.color = [0.960, 0.918, 0.883, 1];
  head1.render();

  let head2 = new Cube();
  head2.matrix = new Matrix4(root);
  head2.color = [0.960, 0.918, 0.883, 1];
  head2.matrix.translate(0.12, -.1, 0.1);
  head2.matrix.scale(0.75, 0.2, 0.8);
  head2.render();

  head2.matrix = new Matrix4(root);
  head2.color = [0.960, 0.918, 0.883, 1];
  head2.matrix.translate(0.17, -.2, 0.2);
  head2.matrix.scale(0.65, 0.2, 0.7);
  head2.render();
  
  let ear1 = new Cone()
  ear1.matrix = new Matrix4(root);
  ear1.color = [0.960, 0.918, 0.883, 1];
  ear1.matrix.translate(0.6, 0.7, 0.2);
  ear1.matrix.rotate(g_earRot, 0, 0, 1);
  ear1.matrix.scale(0.5, 0.5, 0.5);
  ear1.render();

  let ear2 = new Cone();
  ear2.matrix = new Matrix4(root);
  ear2.color = [0.960, 0.918, 0.883, 1];
  ear2.matrix.translate(0.4, 0.7, 0.2);
  ear2.matrix.scale(-0.5, 0.5, 0.5);
  ear2.matrix.rotate(g_earRot2, 0, 0, 1);
  ear2.render(); 

  let eye1 = new Cube();
  eye1.matrix = new Matrix4(root);
  eye1.color = [0, 0, 0, 1];
  eye1.matrix.translate(0.025, 0.1, -0.2);
  eye1.matrix.rotate(g_eyeRot, 0, 0, 1);
  eye1.matrix.scale(0.25, 0.25, 0.25);
  eye1.render();

  let eye2 = new Cube();
  eye2.matrix = new Matrix4(root);
  eye2.color = [0, 0, 0, 1];
  eye2.matrix.translate(0.725, 0.1, -0.2);
  eye2.matrix.rotate(g_eyeRot2, 0, 0, 1);
  eye2.matrix.scale(0.25, 0.25, 0.25);
  eye2.render();

  let mouth = new Cube();
  mouth.matrix = new Matrix4(root);
  mouth.color = [0, 0, 0, 1];
  mouth.matrix.translate(0.37, -0.09, 0.05);
  mouth.matrix.scale(0.25, 0.1, 0.25);
  mouth.render();

  let tongue = new Cube();
  tongue.matrix = new Matrix4(root);
  tongue.color = [0.890, 0.489, 0.489, 1];
  tongue.matrix.translate(0.42, -0.09, 0.4);
  tongue.matrix.translate(0, 0, g_tonguePos);
  tongue.matrix.scale(0.15, 0.05, -.25);
  tongue.render();

  let body1 = new Cube();
  body1.matrix = new Matrix4(root);
  body1.matrix.translate(0.08, -1.2, 0.12);
  body1.matrix.rotate(g_handRot2,0,0,1);
  body1.matrix.scale(0.8, 1, 0.8); 
  body1.color = [0.960, 0.918, 0.883, 1];
  body1.render();

  let body2 = new Cube();
  body2.matrix = new Matrix4(root);
  body2.matrix.translate(0.18, -1.19, 0.11);
  body2.matrix.rotate(g_handRot2,0,0,1);
  body2.matrix.scale(0.6, 0.8, 0.7); 
  body2.color = [1.0, 1.0, 1, 1];
  body2.render();
  
  let body3 = new Cube();
  body3.matrix = new Matrix4(root);
  body3.matrix.translate(0.28, -1.10, 0.11);
  body3.matrix.rotate(g_handRot2,0,0,1);
  body3.matrix.scale(0.4, 0.8, 0.7); 
  body3.color = [1.0, 1.0, 1, 1];
  body3.render();

  let backleg1 = new Cube();
  backleg1.matrix = new Matrix4(root);
  backleg1.color = [1, 1, 1, 1];
  backleg1.matrix.translate(0.6, -1.19, -.1);
  backleg1.matrix.rotate(g_feetRot1,0,1,0);
  backleg1.matrix.scale(0.3, 0.1, 0.4);
  backleg1.render();

  let backleg2 = new Cube();
  backleg2.matrix = new Matrix4(root);
  backleg2.color = [1, 1, 1, 1];
  backleg2.matrix.translate(0, -1.19, -.1);
  backleg2.matrix.rotate(g_feetRot2,0,1,0);
  backleg2.matrix.scale(0.3, 0.1, 0.4);
  backleg2.render();

  let frontleg1 = new Cube();
  frontleg1.matrix = new Matrix4(root);
  frontleg1.matrix.translate(0.15, -1.2, -.2);
  frontleg1.matrix.rotate(20,1,0,0);
  frontleg1.matrix.rotate(30,0,1,1);
  frontleg1.matrix.rotate(g_handRot1,0,0,1);
  frontleg1.matrix.scale(0.3, 1, 0.3); 
  frontleg1.color = [1.0, 1.0, 1, 1];
  frontleg1.render();

  
  let frontleg2 = new Cube();
  frontleg2.matrix = new Matrix4(root);
  frontleg2.matrix.translate(0.43, -1.05, -.3);
  frontleg2.matrix.rotate(20,1,0,0);
  frontleg2.matrix.rotate(-30,0,1,1);
  frontleg2.matrix.rotate(g_handRot2,0,0,1);
  frontleg2.matrix.scale(0.3, 1, 0.3); 
  frontleg2.color = [1.0, 1.0, 1, 1];
  frontleg2.render();
  
  let tail1 = new Cube();
  tail1.matrix = new Matrix4(root);
  tail1.matrix.translate(0.35, -1.2, 0.8);
  tail1.matrix.rotate(g_tail1Slide, 0, 1, 0);
  tail1.matrix.scale(0.2, 0.2, 0.6); 
  tail1.color = [0.960, 0.918, 0.883, 1];
  tail1.render();

  let tail2 = new Cube();
  tail2.matrix = new Matrix4(root);
  tail2.matrix.translate(0.35, -1.2, 0.8);
  tail2.matrix.rotate(g_tail1Slide, 0, 1, 0);
  tail2.matrix.translate(0, 0, .5);
  tail2.matrix.rotate(g_tail2Slide, 0, 1, 0);
  tail2.matrix.scale(0.2, 0.2, 0.6); 
  tail2.color = [0.960, 0.918, 0.883, 1];
  tail2.render();

  let tail3 = new Cube();
  tail3.matrix = new Matrix4(root);
  tail3.matrix.translate(0.35, -1.2, 0.8);
  tail3.matrix.rotate(g_tail1Slide, 0, 1, 0);
  tail3.matrix.translate(0, 0, .5);
  tail3.matrix.rotate(g_tail2Slide, 0, 1, 0);
  tail3.matrix.translate(0, 0, .5);
  tail3.matrix.rotate(g_tail3Slide, 0, 1, 0);
  tail3.matrix.scale(0.2, 0.2, 0.6); 
  tail3.color = [0.960, 0.918, 0.883, 1];
  tail3.render()

  let tail4 = new Cube();
  tail4.matrix = new Matrix4(root);
  tail4.matrix.translate(0.35, -1.2, 0.8);
  tail4.matrix.rotate(g_tail1Slide, 0, 1, 0);
  tail4.matrix.translate(0, 0, .5);
  tail4.matrix.rotate(g_tail2Slide, 0, 1, 0);
  tail4.matrix.translate(0, 0, .5);
  tail4.matrix.rotate(g_tail3Slide, 0, 1, 0);
  tail4.matrix.translate(0, 0, .5);
  tail4.matrix.rotate(g_tail4Slide, 0, 1, 0);
  tail4.matrix.scale(0.2, 0.2, 0.6); 
  tail4.color = [0.960, 0.918, 0.883, 1];
  tail4.render();

  let tail5 = new Cube();
  tail5.matrix = new Matrix4(root);
  tail5.matrix.translate(0.35, -1.2, 0.8);
  tail5.matrix.rotate(g_tail1Slide, 0, 1, 0);
  tail5.matrix.translate(0, 0, .5);
  tail5.matrix.rotate(g_tail2Slide, 0, 1, 0);
  tail5.matrix.translate(0, 0, .5);
  tail5.matrix.rotate(g_tail3Slide, 0, 1, 0);
  tail5.matrix.translate(0, 0, .5);
  tail5.matrix.rotate(g_tail4Slide, 0, 1, 0);
  tail5.matrix.translate(0, 0, .6);
  tail5.matrix.rotate(g_tail5Slide, 0, 1, 0);
  tail5.matrix.scale(0.2, 0.2, 0.3);
  tail5.color = [1, 1, 1, 1];
  tail5.render();

  let floor = new Cube();
  floor.matrix = new Matrix4(root);
  floor.matrix.translate(-3.5, -1.3, -3.5);
  floor.matrix.scale(8, 0.1, 8);
  floor.color = [0.755, 0.889, 0.910, 1];
  floor.render();

  let sphere = new Sphere();
  sphere.matrix = new Matrix4();
  sphere.matrix.translate(-0.9, -0.15, 0.0);
  sphere.matrix.scale(0.2, 0.2, 0.2);
  sphere.color = [0.960, 0.918, 0.883, 1];
  sphere.segments = 16;
  sphere.render();

  if (g_dragonModel) {
    g_dragonModel.matrix.setIdentity();
    g_dragonModel.matrix.translate(1.2, -0.55, -0.1);
    g_dragonModel.matrix.scale(0.14, 0.14, 0.14);
    g_dragonModel.color = [0.50, 0.84, 0.58, 1.0];
    g_dragonModel.render(gl, {
      a_Position,
      a_Normal,
      u_FragColor,
      u_ModelMatrix,
      u_NormalMatrix,
    });
  }

  // let tail = new Cube();
  // tail.matrix = new Matrix4(root);
  // tail.color = [1, 1, 1, 1];
  // tail.matrix.translate(0, -1.2, -.2);
  // tail.matrix.rotate(-20,0,1,0);
  // tail.matrix.scale(0.3, 0.3, 0.8);
  // tail.render();

  var endTime = performance.now();
  var duration = endTime - startTime;
  if (endTime - g_lastStatsTime >= g_statsUpdateIntervalMs) {
    sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration) / 10, "numdot");
    g_lastStatsTime = endTime;
  }

}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;
var g_prevSeconds = g_seconds;
var g_lastStatsTime = 0;
var g_statsUpdateIntervalMs = 250;

function tick() {
  g_seconds=performance.now()/1000.0-g_startTime;
  const deltaTime = Math.min(Math.max(g_seconds - g_prevSeconds, 0.0), 0.05);
  g_prevSeconds = g_seconds;
  updateCameraMovement(deltaTime);
  if (g_lightAnimation) {
    g_lightPos[0] = g_lightBase[0] + 0.9 * Math.cos(g_seconds);
    g_lightPos[1] = g_lightBase[1] + 0.25 * Math.sin(g_seconds * 1.6);
    g_lightPos[2] = g_lightBase[2] + 0.9 * Math.sin(g_seconds);
  } else {
    g_lightPos[0] = g_lightBase[0];
    g_lightPos[1] = g_lightBase[1];
    g_lightPos[2] = g_lightBase[2];
  }
  updateAnimationAngles();
  updatePoke();
  renderScene();

  requestAnimationFrame(tick);
}

let min = -60;
let max = -20;

function updatePoke() {
  if (!g_poke) {
    g_tonguePos = 0;
    return;
  }

  // time since poke started
  const t = g_seconds - g_pokeStart;
  const u = Math.min(t / g_pokeDuration, 1);   // 0 -> 1

  // for that oomfph
  const punch = Math.sin(Math.PI * u);

  g_tonguePos = -0.35 * punch;

  g_eyeRot  = 25 * punch;     
  g_eyeRot2 = -25 * punch;     
  g_earRot  = -45 - 25 * punch;
  g_earRot2 = -45 - 25 * punch;

  const wiggleSpeed = 18;                          
  const wiggle = Math.sin(g_seconds * wiggleSpeed);

  const base1 = -70, base2 = -75, base3 = -45, base4 = -45, base5 = 0;

  const a1 = 10, a2 = 16, a3 = 22, a4 = 28, a5 = 34;

  g_tail1Slide = base1 + a1 * wiggle * punch;
  g_tail2Slide = base2 + a2 * wiggle * punch;
  g_tail3Slide = base3 + a3 * wiggle * punch;
  g_tail4Slide = base4 + a4 * wiggle * punch;
  g_tail5Slide = base5 + a5 * wiggle * punch;


  // end poke
  if (u >= 1) {
    g_poke = false;
    g_tonguePos = 0;
    g_eyeRot = 0;
    g_eyeRot2 = 0;
    g_earRot = -45;
    g_earRot2 = -45;

    g_tail1Slide = base1;
    g_tail2Slide = base2;
    g_tail3Slide = base3;
    g_tail4Slide = base4;
    g_tail5Slide = base5;
  }
}

function updateAnimationAngles() {
  if (g_tailAnimation) {
    g_tail1Slide = (-70*Math.sin(g_seconds));
    g_tail2Slide = (-75*Math.sin(g_seconds));
    g_tail3Slide = (-45*Math.sin(g_seconds));
    g_tail4Slide = (-45*Math.sin(g_seconds));
    g_tail5Slide = (-45*Math.sin(g_seconds));
    g_earRot = min + (max - min) * (Math.sin(g_seconds) * 0.5 + 0.5);
    g_earRot2 = min + (max - min) * (Math.sin(g_seconds) * 0.5 + 0.5);
    g_feetRot1 = (5*Math.sin(g_seconds));
    g_feetRot2 = (-5*Math.sin(g_seconds));
    g_handRot1 = (5*Math.sin(g_seconds));
    g_handRot2 = (5*Math.sin(g_seconds));
    g_eyeRot = (5*Math.sin(g_seconds));
    g_eyeRot2 = (-5*Math.sin(g_seconds));
  }
}



function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;

}


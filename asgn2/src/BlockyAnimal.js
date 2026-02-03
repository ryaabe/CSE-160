// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_GlobalRotateMatrix;\n' + 
  'void main() {\n' +
  '  gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +  // uniform
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);

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

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

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
let g_globalAngle = 0;
let g_x = 0;   
let g_y = 0;   
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

let g_tonguePos = 0;
let g_poke = false;
let g_pokeStart = 0;
let g_pokeDuration = 0.2;

function updateRotationFromMouse(ev) {
  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const my = ev.clientY - rect.top;

  const nx = (mx / rect.width) * 2 - 1;
  const ny = (my / rect.height) * 2 - 1;

  const maxYaw = 180;
  const maxPitch = 90;

  g_y = nx * maxYaw;      
  g_x = -ny * maxPitch;
}

function initMouseRotateControls() {
  canvas.onmousedown = function (ev) {
    if (ev.shiftKey) {
      g_poke = true;
      g_pokeStart = g_seconds;     
      return; 
    }

    g_drag = true;
    updateRotationFromMouse(ev);
    renderScene();
  };

  canvas.onmousemove = function (ev) {
    if (!g_drag) return;
    updateRotationFromMouse(ev);
    renderScene();
  };

  canvas.onmouseup = function () {
    g_drag = false;
  };

  canvas.onmouseleave = function () {
    g_drag = false;
  };
}

function addActionsForHtmlUI() {
  // Button Events
  document.getElementById('animationTailOn').onclick = function () {g_tailAnimation=true;};
  document.getElementById('animationTailOFF').onclick = function () {g_tailAnimation=false;};

  // Joint slider
  document.getElementById('tail1Slide').addEventListener('mousemove', function () {g_tail1Slide = this.value; renderScene();});
  document.getElementById('tail2Slide').addEventListener('mousemove', function () {g_tail2Slide = this.value; renderScene();});
  document.getElementById('tail3Slide').addEventListener('mousemove', function () {g_tail3Slide = this.value; renderScene();});
  document.getElementById('tail4Slide').addEventListener('mousemove', function () {g_tail4Slide = this.value; renderScene();});
  document.getElementById('tail5Slide').addEventListener('mousemove', function () {g_tail5Slide = this.value; renderScene();});


}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initMouseRotateControls();
  addActionsForHtmlUI();


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

  var globalMat = new Matrix4();
  globalMat.setIdentity();

  // move whole character up and back
  globalMat.translate(0, 0.5, 0);

  // mouse
  globalMat.rotate(g_x, 1, 0, 0);  
  globalMat.rotate(g_y, 0, 1, 0);  

  // existing global rotation
  globalMat.rotate(g_globalAngle, 0, 1, 0);

  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalMat.elements);
  // var globalRotMat = new Matrix4().rotate(g_globalAngle,0,1,0);
  // globalMat.translate(0, 0.5, 0);
  //gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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
  floor.matrix.translate(-2, -1.3, -2);
  floor.matrix.scale(8, 0.1, 8);
  floor.color = [0.755, 0.889, 0.910, 1];
  floor.render();

  // let tail = new Cube();
  // tail.matrix = new Matrix4(root);
  // tail.color = [1, 1, 1, 1];
  // tail.matrix.translate(0, -1.2, -.2);
  // tail.matrix.rotate(-20,0,1,0);
  // tail.matrix.scale(0.3, 0.3, 0.8);
  // tail.render();

  var duration = performance.now() - startTime;
  sendTextToHTML(" ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration) / 10, "numdot")

}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;

function tick() {
  g_seconds=performance.now()/1000.0-g_startTime;
  console.log(performance.now());
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


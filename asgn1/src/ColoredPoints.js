// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_Size;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_Size;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +  // uniform変数
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

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

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }

}
// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;
const NOTE = 3;

// Globals related to UI
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_size = 5;
let g_segments = 10;
let g_selectedType = POINT;
let g_mikuEnabled = false;
let g_drumEnabled = false;
let g_step = 0;

let g_notesList = [];
let g_endSilenceCount = 0;
let g_lastTime = 0;
let g_notePhase = 0;

const LOOP_LEN = 64;
const END_SILENCE_CLICKS = 4;



function advanceAndPlayStep() {
  if (g_step < LOOP_LEN) {
    g_step += 1;
    MusicBox.playStep("music", g_step);
    if (g_mikuEnabled) MusicBox.playStep("miku", g_step);
    if (g_drumEnabled) MusicBox.playStep("drum", g_step);
    return;
  }

  g_endSilenceCount += 1;

  if (g_endSilenceCount >= END_SILENCE_CLICKS) {
    g_step = 0;
    g_endSilenceCount = 0;
  }
}

function addActionsForHtmlUI() {
  // Button Events
  document.getElementById('green').onclick = function () { g_selectedColor = [0.0, 1.0, 0.0, 1.0]; };
  document.getElementById('red').onclick = function () { g_selectedColor = [1.0, 0.0, 0.0, 1.0]; };
  document.getElementById('clearButton').onclick = function () { g_shapesList = []; g_notesList = []; renderAllShapes(); };

  document.getElementById('pointButton').onclick = function () { g_selectedType = POINT };
  document.getElementById('triButton').onclick = function () { g_selectedType = TRIANGLE };
  document.getElementById('circleButton').onclick = function () { g_selectedType = CIRCLE };

  document.getElementById('noteButton').onclick = function () { g_selectedType = NOTE };

  // Color Slider
  document.getElementById('redSlide').addEventListener('mouseup', function () { g_selectedColor[0] = this.value / 100; });
  document.getElementById('greenSlide').addEventListener('mouseup', function () { g_selectedColor[1] = this.value / 100; });
  document.getElementById('blueSlide').addEventListener('mouseup', function () { g_selectedColor[2] = this.value / 100; });

  // Size Slider
  document.getElementById('sizeSlide').addEventListener('mouseup', function () { g_size = this.value; });
  document.getElementById('segmentSlide').addEventListener('mouseup', function () { g_segments = this.value; });

  // miku drawing setup
  document.getElementById('mikuButton').onclick = function () {
    g_mikuEnabled = !g_mikuEnabled;
    if (g_mikuEnabled) {
      setupMikuWebGL();
      drawMiku();
    } else {
      if (mikuGL) {
        mikuGL.clearColor(1, 1, 1, 1);
        mikuGL.clear(mikuGL.COLOR_BUFFER_BIT);
      }
    }
  };


  document.getElementById('drumButton').onclick = function () {
    g_drumEnabled = !g_drumEnabled;
    if (g_drumEnabled) {
      setupDrumWebGL();
      drawDrum();
    } else {
      if (drumGL) {
        drumGL.clearColor(1, 1, 1, 1);
        drumGL.clear(drumGL.COLOR_BUFFER_BIT);
      }
    }
  };

  document.getElementById('playStep').onclick = function () {
    advanceAndPlayStep();
  };
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  addActionsForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = function (ev) { click(ev) };
  canvas.onmousemove = function (ev) { if (ev.buttons == 1) { click(ev) } };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  requestAnimationFrame(tick);

  // setupMikuWebGL();
  // drawMiku();
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

function renderAllShapes() {
  var startTime = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_shapesList.length;
  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  for (var j = 0; j < g_notesList.length; j++) {
    g_notesList[j].shape.render();
  }

  var duration = performance.now() - startTime;
  sendTextToHTML("numdot: " + (len + g_notesList.length) + " ms: " + Math.floor(duration) + " fps: " + Math.floor(10000 / duration) / 10, "numdot")
}


function click(ev) {
  if (g_selectedType === NOTE && ev.type === 'mousemove') return;

  let [x, y] = convertCoordinatesEventToGL(ev);
  // Store the coordinates to g_points array
  // g_points.push([x, y]);

  //g_colors.push(g_selectedColor.slice());
  // g_sizes.push(g_size);

  if (g_selectedType === NOTE) {
    const r = 0.06;
    const ang1 = Math.random() * Math.PI * 2;
    const rad1 = Math.random() * r;
    const ox1 = Math.cos(ang1) * rad1;
    const oy1 = Math.sin(ang1) * rad1;

    let noteShape = new Point();
    noteShape.position = [x + ox1, y + oy1];
    noteShape.color = g_selectedColor.slice();
    noteShape.size = g_size;
    noteShape.segments = 20;
    g_notesList.push({
      shape: noteShape,
      baseX: x + ox1,
      x: x + ox1,
      y: y + oy1,
      vy: 0.35,
      life: 1.8,
      amp: 0.08,
      w: 2.0 + Math.random() * 6.0,
      phase: Math.random() * Math.PI * 2
    });

    if (g_mikuEnabled) {
      const ang2 = Math.random() * Math.PI * 2;
      const rad2 = Math.random() * r;
      const ox2 = Math.cos(ang2) * rad2;
      const oy2 = Math.sin(ang2) * rad2;

      let noteShape2 = new Point();
      noteShape2.position = [x + ox2, y + oy2];
      noteShape2.color = HAIR.slice();
      noteShape2.size = g_size;
      noteShape2.segments = 20;
      g_notesList.push({
        shape: noteShape2,
        baseX: x + ox2,
        x: x + ox2,
        y: y + oy2,
        vy: 0.35,
        life: 1.8,
        amp: 0.08,
        w: 2.0 + Math.random() * 6.0,
        phase: Math.random() * Math.PI * 2
      });
    }

    if (g_drumEnabled) {
      const ang3 = Math.random() * Math.PI * 2;
      const rad3 = Math.random() * r;
      const ox3 = Math.cos(ang3) * rad3;
      const oy3 = Math.sin(ang3) * rad3;

      let noteShape3 = new Point();
      noteShape3.position = [x + ox3, y + oy3];
      noteShape3.color = RIM.slice();
      noteShape3.size = g_size;
      noteShape3.segments = 20;
      g_notesList.push({
        shape: noteShape3,
        baseX: x + ox3,
        x: x + ox3,
        y: y + oy3,
        vy: 0.35,
        life: 1.8,
        amp: 0.08,
        w: 2.0 + Math.random() * 6.0,
        phase: Math.random() * Math.PI * 2
      });
    }

    advanceAndPlayStep();
    return;
  }

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

  renderAllShapes();
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;

}


// drawing constants
let mikuCanvas;
let mikuGL;
let miku_a_Position;
let miku_u_FragColor;
let miku_u_Size;

function setupMikuWebGL() {
  mikuCanvas = document.getElementById('miku');
  mikuGL = mikuCanvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!mikuGL) {
    console.log("Failed to get WebGL context for miku canvas");
    return;
  }

  if (!initShaders(mikuGL, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to init shaders for miku canvas");
    return;
  }

  miku_a_Position = mikuGL.getAttribLocation(mikuGL.program, 'a_Position');
  if (miku_a_Position < 0) {
    console.log("Failed to get a_Position for miku");
    return;
  }

  miku_u_FragColor = mikuGL.getUniformLocation(mikuGL.program, 'u_FragColor');
  if (!miku_u_FragColor) {
    console.log("Failed to get u_FragColor for miku");
    return;
  }

  miku_u_Size = mikuGL.getUniformLocation(mikuGL.program, 'u_Size');
  if (!miku_u_Size) {
    console.log("Failed to get u_Size for miku");
    return;
  }

  mikuGL.clearColor(1.0, 1.0, 1.0, 1.0);
  mikuGL.clear(mikuGL.COLOR_BUFFER_BIT);
}

const MIKU_MAX_X = 16;
const MIKU_MAX_Y = 23;
function mikuGridToClip(vertices) {
  const out = new Float32Array(vertices.length);
  const S = Math.max(MIKU_MAX_X, MIKU_MAX_Y); // 23

  for (let i = 0; i < vertices.length; i += 2) {
    const x = vertices[i];
    const y = vertices[i + 1];

    // scale both axes the same
    out[i] = x / S;
    out[i + 1] = y / S;
  }
  return out;
}

function tick(now) {
  const t = now * 0.001;
  const dt = g_lastTime ? (t - g_lastTime) : 0;
  g_lastTime = t;

  g_notePhase += dt;

  for (let i = g_notesList.length - 1; i >= 0; i--) {
    const n = g_notesList[i];
    n.life -= dt;

    n.y += n.vy * dt;

    n.phase += n.w * dt;
    n.x = n.baseX + Math.sin(n.phase) * n.amp;

    n.shape.position[0] = n.x;
    n.shape.position[1] = n.y;

    if (n.life <= 0 || n.y > 1.2) {
      g_notesList.splice(i, 1);
    }
  }

  renderAllShapes();
  requestAnimationFrame(tick);
}

function drawTrianglesOnMiku(vertices, rgba) {
  const clipVerts = mikuGridToClip(vertices);

  const buffer = mikuGL.createBuffer();
  mikuGL.bindBuffer(mikuGL.ARRAY_BUFFER, buffer);
  mikuGL.bufferData(mikuGL.ARRAY_BUFFER, clipVerts, mikuGL.STATIC_DRAW);

  mikuGL.vertexAttribPointer(miku_a_Position, 2, mikuGL.FLOAT, false, 0, 0);
  mikuGL.enableVertexAttribArray(miku_a_Position);

  mikuGL.uniform4f(miku_u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  mikuGL.uniform1f(miku_u_Size, 1.0);

  const n = clipVerts.length / 2; // number of vertices
  mikuGL.drawArrays(mikuGL.TRIANGLES, 0, n);
}


function drawMiku() {
  if (!mikuGL) return;

  // Clear miku canvas each time we draw
  mikuGL.clear(mikuGL.COLOR_BUFFER_BIT);

  drawTrianglesOnMiku(hair_vertices, HAIR);
  drawTrianglesOnMiku(hairband_vertices, BAND);

  drawTrianglesOnMiku(face_vertices, SKIN);
  drawTrianglesOnMiku(mouth_vertices, MOUTH);
  drawTrianglesOnMiku(mouth_cover, SKIN);
  drawTrianglesOnMiku(arm_skin_vertices, SKIN);
  drawTrianglesOnMiku(arm_vertices, DRESS);

  drawTrianglesOnMiku(eyes_vertices, EYE);


  drawTrianglesOnMiku(shirt_vertices, SHIRT);
  drawTrianglesOnMiku(tie_vertices, TIE);
  drawTrianglesOnMiku(tie_top_vertices, TIE);
  drawTrianglesOnMiku(shirt_collar_vertices, COLLAR);
  drawTrianglesOnMiku(feet_vertices, SKIN);
  drawTrianglesOnMiku(dress_outline_vertices, HAIR);
  drawTrianglesOnMiku(dress_vertices, DRESS);
}


let drumCanvas;
let drumGL;
let drum_a_Position;
let drum_u_FragColor;
let drum_u_Size;

function setupDrumWebGL() {
  drumCanvas = document.getElementById('drum');
  drumGL = drumCanvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!drumGL) {
    console.log("Failed to get WebGL context for drum canvas");
    return;
  }

  if (!initShaders(drumGL, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to init shaders for drum canvas");
    return;
  }

  drum_a_Position = drumGL.getAttribLocation(drumGL.program, 'a_Position');
  if (drum_a_Position < 0) {
    console.log("Failed to get a_Position for drum");
    return;
  }

  drum_u_FragColor = drumGL.getUniformLocation(drumGL.program, 'u_FragColor');
  if (!drum_u_FragColor) {
    console.log("Failed to get u_FragColor for drum");
    return;
  }

  drum_u_Size = drumGL.getUniformLocation(drumGL.program, 'u_Size');
  if (!drum_u_Size) {
    console.log("Failed to get u_Size for drum");
    return;
  }

  drumGL.clearColor(1.0, 1.0, 1.0, 1.0);
  drumGL.clear(drumGL.COLOR_BUFFER_BIT);
}

const DRUM_MAX_X = 16;
const DRUM_MAX_Y = 23;

function drumGridToClip(vertices) {
  const out = new Float32Array(vertices.length);
  const S = Math.max(DRUM_MAX_X, DRUM_MAX_Y);
  for (let i = 0; i < vertices.length; i += 2) {
    out[i] = vertices[i] / S;
    out[i + 1] = vertices[i + 1] / S;
  }
  return out;
}

function drawTrianglesOnDrum(vertices, rgba) {
  const clipVerts = drumGridToClip(vertices);

  const buffer = drumGL.createBuffer();
  drumGL.bindBuffer(drumGL.ARRAY_BUFFER, buffer);
  drumGL.bufferData(drumGL.ARRAY_BUFFER, clipVerts, drumGL.STATIC_DRAW);

  drumGL.vertexAttribPointer(drum_a_Position, 2, drumGL.FLOAT, false, 0, 0);
  drumGL.enableVertexAttribArray(drum_a_Position);

  drumGL.uniform4f(drum_u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  drumGL.uniform1f(drum_u_Size, 1.0);

  const n = clipVerts.length / 2;
  drumGL.drawArrays(drumGL.TRIANGLES, 0, n);
}

function drawDrum() {
  if (!drumGL) return;

  drumGL.clear(drumGL.COLOR_BUFFER_BIT);

  drawTrianglesOnDrum(drum_pad_vertices, PAD);
  drawTrianglesOnDrum(drum_red_vertices, RED);
  drawTrianglesOnDrum(drum_blue_vertices, BLUE);
  drawTrianglesOnDrum(drum_rim_vertices, RIM);
  drawTrianglesOnDrum(drum_bottom_rim_vertices, RIM);
  drawTrianglesOnDrum(drum_A_vertices, LETTERS);
  drawTrianglesOnDrum(drum_R_vertices, LETTERS);
}
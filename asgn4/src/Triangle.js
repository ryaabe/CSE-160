class Triangle {
  // Constructor
  constructor(){
    this.type='triangle';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
  }
  
  // Render this shape
  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;

    // gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniform1f(u_Size, size);

    // Draw
    var delta = this.size/200.0;
    drawTriangle( [xy[0], xy[1], xy[0]+delta, xy[1], xy[0], xy[1]+delta] );
  }

}

let g_triangleBuffer2D = null;
let g_triangleBuffer3D = null;
let g_normalBuffer3D = null;
const g_defaultNormalCache = new Map();

function getOrCreateTriangleBuffer(dimensions) {
  if (dimensions === 2) {
    if (!g_triangleBuffer2D) {
      g_triangleBuffer2D = gl.createBuffer();
    }
    return g_triangleBuffer2D;
  }

  if (!g_triangleBuffer3D) {
    g_triangleBuffer3D = gl.createBuffer();
  }
  return g_triangleBuffer3D;
}

function getOrCreateNormalBuffer() {
  if (!g_normalBuffer3D) {
    g_normalBuffer3D = gl.createBuffer();
  }
  return g_normalBuffer3D;
}

function getDefaultNormals(vertexCount) {
  if (g_defaultNormalCache.has(vertexCount)) {
    return g_defaultNormalCache.get(vertexCount);
  }

  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const o = i * 3;
    normals[o] = 1.0;
    normals[o + 1] = 1.0;
    normals[o + 2] = 0.0;
  }
  g_defaultNormalCache.set(vertexCount, normals);
  return normals;
}

function toFloat32(vertices) {
  return vertices instanceof Float32Array ? vertices : new Float32Array(vertices);
}

function drawTriangle(vertices) {
  const vertexData = toFloat32(vertices);
  var n = vertexData.length / 2;

  // Reuse a shared buffer to avoid per-triangle buffer churn and GC stalls.
  var vertexBuffer = getOrCreateTriangleBuffer(2);
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

  // var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  // if (a_Position < 0) {
  //    console.log('Failed to get the storage location of a_Position');
  // return -1;
  // }
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  // 2D helper path uses a constant debug normal.
  gl.disableVertexAttribArray(a_Normal);
  gl.vertexAttrib3f(a_Normal, 1.0, 1.0, 0.0);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}


function drawTriangle3D(vertices, normals) {
  const vertexData = toFloat32(vertices);
  const n = vertexData.length / 3;
  const normalData = normals ? toFloat32(normals) : getDefaultNormals(n);

  // Reuse a shared buffer to avoid per-triangle buffer churn and GC stalls.
  var vertexBuffer = getOrCreateTriangleBuffer(3);
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

  // var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  // if (a_Position < 0) {
  //    console.log('Failed to get the storage location of a_Position');
  // return -1;
  // }
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  var normalBuffer = getOrCreateNormalBuffer();
  if (!normalBuffer) {
    console.log('Failed to create the normal buffer object');
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normalData, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

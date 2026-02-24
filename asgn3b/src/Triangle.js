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

function drawTriangle(vertices) {
  var n = 3; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  // if (a_Position < 0) {
  //    console.log('Failed to get the storage location of a_Position');
  // return -1;
  // }
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}


function drawTriangle3D(vertices) {
  var n = 3; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  // if (a_Position < 0) {
  //    console.log('Failed to get the storage location of a_Position');
  // return -1;
  // }
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function drawTriangle3DUV(vertices, uv) {
  const n = 3;

  const interleaved = new Float32Array([
    vertices[0], vertices[1], vertices[2], uv[0], uv[1],
    vertices[3], vertices[4], vertices[5], uv[2], uv[3],
    vertices[6], vertices[7], vertices[8], uv[4], uv[5],
  ]);

  const stride = 5 * 4;      
  const posOffset = 0;       
  const uvOffset = 3 * 4;    

  const buffer = gl.createBuffer();
  if (!buffer) {
    console.log("Failed to create the buffer object");
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.DYNAMIC_DRAW);

  // a_Position = vec3
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, posOffset);
  gl.enableVertexAttribArray(a_Position);

  // a_UV = vec2
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, uvOffset);
  gl.enableVertexAttribArray(a_UV);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

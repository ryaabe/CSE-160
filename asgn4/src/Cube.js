const CUBE_FACE_FRONT = new Float32Array([
  0, 0, 0, 1, 1, 0, 1, 0, 0,
  0, 0, 0, 0, 1, 0, 1, 1, 0
]);
const CUBE_NORMAL_FRONT = new Float32Array([
  0, 0, -1, 0, 0, -1, 0, 0, -1,
  0, 0, -1, 0, 0, -1, 0, 0, -1
]);

const CUBE_FACE_TOP = new Float32Array([
  0, 1, 0, 0, 1, 1, 1, 1, 1,
  0, 1, 0, 1, 1, 1, 1, 1, 0
]);
const CUBE_NORMAL_TOP = new Float32Array([
  0, 1, 0, 0, 1, 0, 0, 1, 0,
  0, 1, 0, 0, 1, 0, 0, 1, 0
]);

const CUBE_FACE_RIGHT = new Float32Array([
  1, 0, 0, 1, 1, 1, 1, 0, 1,
  1, 0, 0, 1, 1, 0, 1, 1, 1
]);
const CUBE_NORMAL_RIGHT = new Float32Array([
  1, 0, 0, 1, 0, 0, 1, 0, 0,
  1, 0, 0, 1, 0, 0, 1, 0, 0
]);

const CUBE_FACE_LEFT = new Float32Array([
  0, 0, 0, 0, 0, 1, 0, 1, 1,
  0, 0, 0, 0, 1, 1, 0, 1, 0
]);
const CUBE_NORMAL_LEFT = new Float32Array([
  -1, 0, 0, -1, 0, 0, -1, 0, 0,
  -1, 0, 0, -1, 0, 0, -1, 0, 0
]);

const CUBE_FACE_BOTTOM = new Float32Array([
  0, 0, 0, 1, 0, 1, 0, 0, 1,
  0, 0, 0, 1, 0, 0, 1, 0, 1
]);
const CUBE_NORMAL_BOTTOM = new Float32Array([
  0, -1, 0, 0, -1, 0, 0, -1, 0,
  0, -1, 0, 0, -1, 0, 0, -1, 0
]);

const CUBE_FACE_BACK = new Float32Array([
  0, 0, 1, 1, 0, 1, 1, 1, 1,
  0, 0, 1, 1, 1, 1, 0, 1, 1
]);
const CUBE_NORMAL_BACK = new Float32Array([
  0, 0, 1, 0, 0, 1, 0, 0, 1,
  0, 0, 1, 0, 0, 1, 0, 0, 1
]);

class Cube {
  // Constructor
  constructor(){
    this.type='cube';
    //this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    //this.size = 5.0;
    //this.segments = 10;
    this.matrix = new Matrix4();
  }
  
  // Render this shape
  render() {
    var rgba = this.color;

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    setMatrixUniformsForShape(this.matrix);

    // front of cube
    drawTriangle3D(CUBE_FACE_FRONT, CUBE_NORMAL_FRONT);

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);

    // top of cube
    drawTriangle3D(CUBE_FACE_TOP, CUBE_NORMAL_TOP);

    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);

    // right
    drawTriangle3D(CUBE_FACE_RIGHT, CUBE_NORMAL_RIGHT);

    gl.uniform4f(u_FragColor, rgba[0] * 0.7, rgba[1] * 0.7, rgba[2] * 0.7, rgba[3]);

    // left of cube
    drawTriangle3D(CUBE_FACE_LEFT, CUBE_NORMAL_LEFT);

    gl.uniform4f(u_FragColor, rgba[0] * 0.6, rgba[1] * 0.6, rgba[2] * 0.6, rgba[3]);

    // bottom of cube
    drawTriangle3D(CUBE_FACE_BOTTOM, CUBE_NORMAL_BOTTOM);

    gl.uniform4f(u_FragColor, rgba[0] * 0.5, rgba[1] * 0.5, rgba[2] * 0.5, rgba[3]);

    // back of cube 
    drawTriangle3D(CUBE_FACE_BACK, CUBE_NORMAL_BACK);
  }

}

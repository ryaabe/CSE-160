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
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // front of cube
    drawTriangle3D([0.0,0.0,0.0,  1.0,1.0,0.0,  1.0,0.0,0.0]);
    drawTriangle3D([0.0,0.0,0.0,  0.0,1.0,0.0,  1.0,1.0,0.0]);

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);

    // top of cube
    drawTriangle3D([0,1,0,  0,1,1,  1,1,1]);
    drawTriangle3D([0,1,0,  1,1,1,  1,1,0]);

    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);

    // right
    drawTriangle3D([1, 0, 0, 1, 1, 1, 1, 0, 1]);
    drawTriangle3D([1, 0, 0, 1, 1, 0, 1, 1, 1]);

    gl.uniform4f(u_FragColor, rgba[0] * 0.7, rgba[1] * 0.7, rgba[2] * 0.7, rgba[3]);

    // left of cube
    drawTriangle3D([0, 0, 0, 0, 0, 1, 0, 1, 1]);
    drawTriangle3D([0, 0, 0, 0, 1, 1, 0, 1, 0]);

    gl.uniform4f(u_FragColor, rgba[0] * 0.6, rgba[1] * 0.6, rgba[2] * 0.6, rgba[3]);

    // bottom of cube
    drawTriangle3D([0, 0, 0, 1, 0, 1, 0, 0, 1]);
    drawTriangle3D([0, 0, 0, 1, 0, 0, 1, 0, 1]);

    gl.uniform4f(u_FragColor, rgba[0] * 0.5, rgba[1] * 0.5, rgba[2] * 0.5, rgba[3]);

    // back of cube 
    drawTriangle3D([0, 0, 1, 1, 0, 1, 1, 1, 1]);
    drawTriangle3D([0, 0, 1, 1, 1, 1, 0, 1, 1]);
  }

}



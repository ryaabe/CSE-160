class Point {
  // Constructor
  constructor(){
    this.type='point';
    this.position = [0.0, 0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
  }
  
  // Render this shape
  render() {
    var xy = this.position;
    var rgba = this.color;
    var size = this.size;
    

    gl.disableVertexAttribArray(a_Position);
    gl.disableVertexAttribArray(a_Normal);

    gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);
    gl.vertexAttrib3f(a_Normal, 1.0, 1.0, 0.0);
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniform1f(u_Size, size);

    // Draw
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}


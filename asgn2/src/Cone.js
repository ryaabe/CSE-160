class Cone {
  constructor() {
    this.type = 'cone';
    this.color = [1, 1, 1, 1];
    this.segments = 20;        
    this.matrix = new Matrix4();
  }

  render() {
    const rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const center = [0.5, 0.0, 0.5];
    const apex  = [0.5, 1.0, 0.5];
    const r = 0.5;
    const step = 360 / this.segments;

    // ---- BASE (circle fan) ----
    for (let a = 0; a < 360; a += step) {
      let a1 = a * Math.PI / 180;
      let a2 = (a + step) * Math.PI / 180;

      let p1 = [
        center[0] + r * Math.cos(a1),
        0,
        center[2] + r * Math.sin(a1)
      ];
      let p2 = [
        center[0] + r * Math.cos(a2),
        0,
        center[2] + r * Math.sin(a2)
      ];

      drawTriangle3D([
        center[0], center[1], center[2],
        p1[0], p1[1], p1[2],
        p2[0], p2[1], p2[2]
      ]);
    }

    for (let a = 0; a < 360; a += step) {
      let a1 = a * Math.PI / 180;
      let a2 = (a + step) * Math.PI / 180;

      let p1 = [
        center[0] + r * Math.cos(a1),
        0,
        center[2] + r * Math.sin(a1)
      ];
      let p2 = [
        center[0] + r * Math.cos(a2),
        0,
        center[2] + r * Math.sin(a2)
      ];

      drawTriangle3D([
        apex[0], apex[1], apex[2],
        p2[0], p2[1], p2[2],
        p1[0], p1[1], p1[2]
      ]);
    }
  }
}
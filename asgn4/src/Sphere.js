const g_sphereMeshCache = new Map();

function spherePoint(theta, phi) {
  const sinTheta = Math.sin(theta);
  return [
    sinTheta * Math.cos(phi),
    Math.cos(theta),
    sinTheta * Math.sin(phi)
  ];
}

function appendTriangle(target, p1, p2, p3) {
  target.push(
    p1[0], p1[1], p1[2],
    p2[0], p2[1], p2[2],
    p3[0], p3[1], p3[2]
  );
}

function getSphereMesh(latSegments, lonSegments) {
  const key = latSegments + ":" + lonSegments;
  if (g_sphereMeshCache.has(key)) {
    return g_sphereMeshCache.get(key);
  }

  const vertices = [];

  for (let lat = 0; lat < latSegments; lat++) {
    const theta0 = (lat / latSegments) * Math.PI;
    const theta1 = ((lat + 1) / latSegments) * Math.PI;

    for (let lon = 0; lon < lonSegments; lon++) {
      const phi0 = (lon / lonSegments) * Math.PI * 2;
      const phi1 = ((lon + 1) / lonSegments) * Math.PI * 2;

      const p00 = spherePoint(theta0, phi0);
      const p10 = spherePoint(theta1, phi0);
      const p01 = spherePoint(theta0, phi1);
      const p11 = spherePoint(theta1, phi1);

      appendTriangle(vertices, p00, p10, p01);
      appendTriangle(vertices, p01, p10, p11);
    }
  }

  // Unit sphere centered at origin: normal equals position.
  const vertexData = new Float32Array(vertices);
  const normalData = new Float32Array(vertices);
  const mesh = { vertices: vertexData, normals: normalData };
  g_sphereMeshCache.set(key, mesh);
  return mesh;
}

class Sphere {
  constructor() {
    this.type = 'sphere';
    this.color = [1, 1, 1, 1];
    this.segments = 12;
    this.matrix = new Matrix4();
  }

  render() {
    const rgba = this.color;
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    setMatrixUniformsForShape(this.matrix);

    const latSegments = Math.max(3, Math.floor(this.segments));
    const lonSegments = latSegments * 2;
    const mesh = getSphereMesh(latSegments, lonSegments);
    drawTriangle3D(mesh.vertices, mesh.normals);
  }
}

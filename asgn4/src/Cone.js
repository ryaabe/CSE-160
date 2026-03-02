const g_coneMeshCache = new Map();

function getConeMesh(segments) {
  if (g_coneMeshCache.has(segments)) {
    return g_coneMeshCache.get(segments);
  }

  const centerX = 0.5;
  const centerY = 0.0;
  const centerZ = 0.5;
  const apexX = 0.5;
  const apexY = 1.0;
  const apexZ = 0.5;
  const r = 0.5;
  const step = (Math.PI * 2) / segments;

  const base = new Float32Array(segments * 9);
  const side = new Float32Array(segments * 9);
  const baseNormals = new Float32Array(segments * 9);
  const sideNormals = new Float32Array(segments * 9);

  for (let i = 0; i < segments; i++) {
    const a1 = i * step;
    const a2 = (i + 1) * step;

    const p1x = centerX + r * Math.cos(a1);
    const p1z = centerZ + r * Math.sin(a1);
    const p2x = centerX + r * Math.cos(a2);
    const p2z = centerZ + r * Math.sin(a2);

    const o = i * 9;

    // Base triangle: center -> p1 -> p2
    base[o] = centerX;
    base[o + 1] = centerY;
    base[o + 2] = centerZ;
    base[o + 3] = p1x;
    base[o + 4] = centerY;
    base[o + 5] = p1z;
    base[o + 6] = p2x;
    base[o + 7] = centerY;
    base[o + 8] = p2z;
    baseNormals[o] = 0;
    baseNormals[o + 1] = -1;
    baseNormals[o + 2] = 0;
    baseNormals[o + 3] = 0;
    baseNormals[o + 4] = -1;
    baseNormals[o + 5] = 0;
    baseNormals[o + 6] = 0;
    baseNormals[o + 7] = -1;
    baseNormals[o + 8] = 0;

    // Side triangle: apex -> p2 -> p1
    side[o] = apexX;
    side[o + 1] = apexY;
    side[o + 2] = apexZ;
    side[o + 3] = p2x;
    side[o + 4] = centerY;
    side[o + 5] = p2z;
    side[o + 6] = p1x;
    side[o + 7] = centerY;
    side[o + 8] = p1z;

    const e1x = p2x - apexX;
    const e1y = centerY - apexY;
    const e1z = p2z - apexZ;
    const e2x = p1x - apexX;
    const e2y = centerY - apexY;
    const e2z = p1z - apexZ;

    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz) || 1.0;
    nx /= len;
    ny /= len;
    nz /= len;

    sideNormals[o] = nx;
    sideNormals[o + 1] = ny;
    sideNormals[o + 2] = nz;
    sideNormals[o + 3] = nx;
    sideNormals[o + 4] = ny;
    sideNormals[o + 5] = nz;
    sideNormals[o + 6] = nx;
    sideNormals[o + 7] = ny;
    sideNormals[o + 8] = nz;
  }

  const mesh = { base, side, baseNormals, sideNormals };
  g_coneMeshCache.set(segments, mesh);
  return mesh;
}

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
    setMatrixUniformsForShape(this.matrix);

    const segments = Math.max(3, Math.floor(this.segments));
    const mesh = getConeMesh(segments);
    drawTriangle3D(mesh.base, mesh.baseNormals);
    drawTriangle3D(mesh.side, mesh.sideNormals);
  }
}

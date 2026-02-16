class Transform {
    constructor() {
        this.position = new Vector3([0, 0, 0]);

        this.rotation = new Vector3([0, 0, 0]);

        this.scale = new Vector3([1, 1, 1]);

        this.matrix = new Matrix4();
    }

    setPosition(x, y, z) {
        const p = this.position.elements;
        p[0] = x; p[1] = y; p[2] = z;
    }

    setRotation(pitchX, yawY, rollZ) {
        const r = this.rotation.elements;
        r[0] = pitchX; r[1] = yawY; r[2] = rollZ;
    }

    setScale(x, y, z) {
        const s = this.scale.elements;
        s[0] = x; s[1] = y; s[2] = z;
    }

    translate(dx, dy, dz) {
        const p = this.position.elements;
        p[0] += dx; p[1] += dy; p[2] += dz;
    }

    rotate(dpitchX, dyawY, drollZ) {
        const r = this.rotation.elements;
        r[0] += dpitchX; r[1] += dyawY; r[2] += drollZ;
    }

    scaleBy(sx, sy, sz) {
        const s = this.scale.elements;
        s[0] *= sx; s[1] *= sy; s[2] *= sz;
    }

    getMatrix() {
        const p = this.position.elements;
        const r = this.rotation.elements;
        const s = this.scale.elements;

        const m = this.matrix;
        m.setIdentity();

        m.translate(p[0], p[1], p[2]);

        m.rotate(r[2], 0, 0, 1); 
        m.rotate(r[1], 0, 1, 0); 
        m.rotate(r[0], 1, 0, 0); 

        m.scale(s[0], s[1], s[2]);

        return m;
    }
}

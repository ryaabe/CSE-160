class Cube {
  constructor() {
    this.type = "cube";
    this.faceBuffers = null;
  }

  render(renderer, modelMatrix, color, textureNum = -2, uvByFace = null, tintByFace = null) {
    const gl = renderer.gl;
    const rgba = color || [1.0, 1.0, 1.0, 1.0];
    const defaultRect = [0.0, 0.0, 1.0, 1.0];
    renderer.resetInstanceOffsetAttribute();
    this.initFaceBuffers(renderer);
    if (!this.faceBuffers || this.faceBuffers.length === 0) return;

    gl.uniform1i(renderer.u_whichTexture, textureNum);
    gl.uniformMatrix4fv(renderer.u_ModelMatrix, false, modelMatrix.elements);

    for (const face of this.faceBuffers) {
      const uvRect = uvByFace?.[face.name] || defaultRect;
      const tint = tintByFace?.[face.name] || null;
      gl.uniform4f(renderer.u_UVRect, uvRect[0], uvRect[1], uvRect[2], uvRect[3]);
      if (tint) {
        gl.uniform3f(renderer.u_TintColor, tint[0], tint[1], tint[2]);
        gl.uniform1f(renderer.u_UseTint, 1.0);
      } else {
        gl.uniform3f(renderer.u_TintColor, 1.0, 1.0, 1.0);
        gl.uniform1f(renderer.u_UseTint, 0.0);
      }
      gl.uniform4f(
        renderer.u_FragColor,
        rgba[0] * face.shade,
        rgba[1] * face.shade,
        rgba[2] * face.shade,
        rgba[3]
      );
      this.drawFace(renderer, face.buffer, face.vertexCount);
    }
  }

  renderInstanced(renderer, batch, textureNum = null) {
    const gl = renderer.gl;
    const ext = renderer.instancedExt;
    if (!ext || !batch || !batch.instanceBuffer || batch.instanceCount <= 0) return;

    this.initFaceBuffers(renderer);
    if (!this.faceBuffers || this.faceBuffers.length === 0) return;

    const rgba = batch.color || [1.0, 1.0, 1.0, 1.0];
    const defaultRect = [0.0, 0.0, 1.0, 1.0];
    const textureToUse = Number.isInteger(textureNum) ? textureNum : (batch.textureNum ?? -2);

    gl.uniform1i(renderer.u_whichTexture, textureToUse);
    gl.uniformMatrix4fv(renderer.u_ModelMatrix, false, renderer.identityModelMatrix.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, batch.instanceBuffer);
    gl.vertexAttribPointer(renderer.a_InstanceOffset, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(renderer.a_InstanceOffset);
    ext.vertexAttribDivisorANGLE(renderer.a_InstanceOffset, 1);

    for (const face of this.faceBuffers) {
      const uvRect = batch.uvByFace?.[face.name] || defaultRect;
      const tint = batch.tintByFace?.[face.name] || null;
      gl.uniform4f(renderer.u_UVRect, uvRect[0], uvRect[1], uvRect[2], uvRect[3]);
      if (tint) {
        gl.uniform3f(renderer.u_TintColor, tint[0], tint[1], tint[2]);
        gl.uniform1f(renderer.u_UseTint, 1.0);
      } else {
        gl.uniform3f(renderer.u_TintColor, 1.0, 1.0, 1.0);
        gl.uniform1f(renderer.u_UseTint, 0.0);
      }
      gl.uniform4f(
        renderer.u_FragColor,
        rgba[0] * face.shade,
        rgba[1] * face.shade,
        rgba[2] * face.shade,
        rgba[3]
      );
      this.drawFaceInstanced(renderer, face.buffer, face.vertexCount, batch.instanceCount);
    }

    ext.vertexAttribDivisorANGLE(renderer.a_InstanceOffset, 0);
  }

  initFaceBuffers(renderer) {
    if (this.faceBuffers) return;
    const gl = renderer.gl;

    const faces = [
      {
        name: "front",
        shade: 1.0, // front
        data: [
          0, 0, 0, 0, 0,
          1, 1, 0, 1, 1,
          1, 0, 0, 1, 0,
          0, 0, 0, 0, 0,
          0, 1, 0, 0, 1,
          1, 1, 0, 1, 1,
        ],
      },
      {
        name: "top",
        shade: 0.9, // top
        data: [
          0, 1, 0, 0, 0,
          0, 1, 1, 0, 1,
          1, 1, 1, 1, 1,
          0, 1, 0, 0, 0,
          1, 1, 1, 1, 1,
          1, 1, 0, 1, 0,
        ],
      },
      {
        name: "right",
        shade: 0.8, // right
        data: [
          1, 0, 0, 0, 0,
          1, 1, 1, 1, 1,
          1, 0, 1, 1, 0,
          1, 0, 0, 0, 0,
          1, 1, 0, 0, 1,
          1, 1, 1, 1, 1,
        ],
      },
      {
        name: "left",
        shade: 0.7, // left
        data: [
          0, 0, 0, 0, 0,
          0, 0, 1, 1, 0,
          0, 1, 1, 1, 1,
          0, 0, 0, 0, 0,
          0, 1, 1, 1, 1,
          0, 1, 0, 0, 1,
        ],
      },
      {
        name: "bottom",
        shade: 0.6, // bottom
        data: [
          0, 0, 0, 0, 0,
          1, 0, 1, 1, 1,
          0, 0, 1, 0, 1,
          0, 0, 0, 0, 0,
          1, 0, 0, 1, 0,
          1, 0, 1, 1, 1,
        ],
      },
      {
        name: "back",
        shade: 0.5, // back
        data: [
          0, 0, 1, 1, 0,
          1, 0, 1, 0, 0,
          1, 1, 1, 0, 1,
          0, 0, 1, 1, 0,
          1, 1, 1, 0, 1,
          0, 1, 1, 1, 1,
        ],
      },
    ];

    this.faceBuffers = [];
    for (const face of faces) {
      const buffer = gl.createBuffer();
      if (!buffer) {
        console.log("Failed to create the buffer object");
        this.faceBuffers = [];
        return;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(face.data), gl.STATIC_DRAW);
      this.faceBuffers.push({
        name: face.name,
        buffer,
        vertexCount: 6,
        shade: face.shade,
      });
    }
  }

  drawFace(renderer, buffer, vertexCount) {
    const gl = renderer.gl;
    const stride = 5 * 4;
    const posOffset = 0;
    const uvOffset = 3 * 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(renderer.a_Position, 3, gl.FLOAT, false, stride, posOffset);
    gl.enableVertexAttribArray(renderer.a_Position);
    gl.vertexAttribPointer(renderer.a_UV, 2, gl.FLOAT, false, stride, uvOffset);
    gl.enableVertexAttribArray(renderer.a_UV);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }

  drawFaceInstanced(renderer, buffer, vertexCount, instanceCount) {
    const gl = renderer.gl;
    const ext = renderer.instancedExt;
    const stride = 5 * 4;
    const posOffset = 0;
    const uvOffset = 3 * 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(renderer.a_Position, 3, gl.FLOAT, false, stride, posOffset);
    gl.enableVertexAttribArray(renderer.a_Position);
    gl.vertexAttribPointer(renderer.a_UV, 2, gl.FLOAT, false, stride, uvOffset);
    gl.enableVertexAttribArray(renderer.a_UV);
    ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, vertexCount, instanceCount);
  }
}

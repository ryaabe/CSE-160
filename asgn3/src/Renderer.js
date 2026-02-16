// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_InstanceOffset;
  varying vec2 v_UV;
  varying vec3 v_viewPosition;
  uniform vec4 u_UVRect;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix; 
  uniform mat4 u_ViewMatrix; 
  uniform mat4 u_ProjectionMatrix; 
  void main() {
    vec4 worldPosition = u_ModelMatrix * vec4(a_Position.xyz + a_InstanceOffset, 1.0);
    vec4 viewPosition = u_ViewMatrix * worldPosition;
    gl_Position = u_ProjectionMatrix * viewPosition;
    v_viewPosition = viewPosition.xyz;
    v_UV = vec2(
      mix(u_UVRect.x, u_UVRect.z, a_UV.x),
      mix(u_UVRect.y, u_UVRect.w, a_UV.y)
    );
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;  // uniform

  uniform vec4 u_fogColor;
  uniform float u_fogNear;
  uniform float u_fogFar;

  varying vec2 v_UV;
  varying vec3 v_viewPosition;

  uniform sampler2D u_Sampler0;  // uniform

  uniform int u_whichTexture;
  uniform vec3 u_TintColor;
  uniform float u_UseTint;

  void main() {
    vec4 color;
    if (u_whichTexture == -2) {
      color = u_FragColor;     // Use color

    } else if (u_whichTexture == -1) { 
      color = vec4(v_UV,1.0,1.0);    // Use UV debug color

    } else if (u_whichTexture >= 0) {       // use bound texture
      color = texture2D(u_Sampler0, v_UV);
      if (u_UseTint > 0.5) {
        color.rgb *= u_TintColor;
      }

    } else {
      color = vec4(1,.2,.2,1);
    }

    if (u_whichTexture >= 0 && color.a < 0.1) {
      discard;
    }

    // fog
    float fogDistance = length(v_viewPosition);
    float fogAmount = smoothstep(u_fogNear, u_fogFar, fogDistance);
    gl_FragColor = mix(color, u_fogColor, fogAmount);
  }`


class Renderer {

  constructor(canvas, gl) {
    this.canvas = canvas;
    this.gl = gl;
    this.cubeMesh = new Cube();
    this.instancedExt = null;
    this.useInstancedBlocks = false;
    this.textures = new Map();
    this.blockInstanceBatches = [];
    this.blockInstanceRevision = -1;
    this.blockInstanceCount = -1;
    this.fov = 70;
    this.projMatrix = new Matrix4();
    this.viewMatrix = new Matrix4();
    this.blockModelMatrix = new Matrix4();
    this.entityModelMatrix = new Matrix4();
    this.identityModelMatrix = new Matrix4();
    this.animalParts = null;
    this.fogColor = [0.7529, 0.8471, 1.0, 1.0];
    this.dayFogColor = [...this.fogColor];
    this.nightFogColor = [0.0, 0.0, 0.0, 1.0];
    this.nightTransitionDuration = 120.0;
    this.fogNear = 10.0;
    this.fogFar = 45.0;
  }

  connectVariablesToGLSL() {
    const gl = this.gl;

    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
      console.log('Failed to intialize shaders.');
      return false;
    }

    // Attributes
    this.a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (this.a_Position < 0) {
      console.log('Failed to get the storage location of a_Position');
      return false;
    }

    this.a_UV = gl.getAttribLocation(gl.program, 'a_UV');
    if (this.a_UV < 0) {
      console.log('Failed to get the storage location of a_UV');
      return false;
    }

    this.a_InstanceOffset = gl.getAttribLocation(gl.program, 'a_InstanceOffset');
    if (this.a_InstanceOffset < 0) {
      console.log('Failed to get the storage location of a_InstanceOffset');
      return false;
    }

    // Uniforms
    this.u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!this.u_FragColor) {
      console.log('Failed to get the storage location of u_FragColor');
      return false;
    }

    this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!this.u_ModelMatrix) {
      console.log('Failed to get the storage location of u_ModelMatrix');
      return false;
    }

    this.u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if (!this.u_ProjectionMatrix) {
      console.log('Failed to get the storage location of u_ProjectionMatrix');
      return false;
    }

    this.u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    if (!this.u_ViewMatrix) {
      console.log('Failed to get the storage location of u_ViewMatrix');
      return false;
    }

    this.u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    if (!this.u_Sampler0) {
      console.log('Failed to get the storage location of u_Sampler0');
      return false;
    }

    this.u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    if (!this.u_whichTexture) {
      console.log('Failed to get the storage location of u_whichTexture');
      return false;
    }

    this.u_TintColor = gl.getUniformLocation(gl.program, "u_TintColor");
    if (!this.u_TintColor) {
      console.log("Failed to get the storage location of u_TintColor");
      return false;
    }

    this.u_UseTint = gl.getUniformLocation(gl.program, "u_UseTint");
    if (!this.u_UseTint) {
      console.log("Failed to get the storage location of u_UseTint");
      return false;
    }

    this.u_UVRect = gl.getUniformLocation(gl.program, "u_UVRect");
    if (!this.u_UVRect) {
      console.log("Failed to get the storage location of u_UVRect");
      return false;
    }

    this.u_fogColor = gl.getUniformLocation(gl.program, "u_fogColor");
    if (!this.u_fogColor) {
      console.log("Failed to get the storage location of u_fogColor");
      return false;
    }

    this.u_fogNear = gl.getUniformLocation(gl.program, "u_fogNear");
    if (!this.u_fogNear) {
      console.log("Failed to get the storage location of u_fogNear");
      return false;
    }

    this.u_fogFar = gl.getUniformLocation(gl.program, "u_fogFar");
    if (!this.u_fogFar) {
      console.log("Failed to get the storage location of u_fogFar");
      return false;
    }

    // Default model matrix
    gl.uniformMatrix4fv(this.u_ModelMatrix, false, this.identityModelMatrix.elements);
    gl.uniform4f(this.u_UVRect, 0.0, 0.0, 1.0, 1.0);
    gl.uniform3f(this.u_TintColor, 1.0, 1.0, 1.0);
    gl.uniform1f(this.u_UseTint, 0.0);

    this.instancedExt = gl.getExtension("ANGLE_instanced_arrays");
    this.useInstancedBlocks = !!this.instancedExt;
    if (!this.useInstancedBlocks) {
      console.log("ANGLE_instanced_arrays unavailable; using per-block draw fallback.");
    }
    this.resetInstanceOffsetAttribute();

    return true;
  }

  resetInstanceOffsetAttribute() {
    const gl = this.gl;
    if (this.a_InstanceOffset < 0) return;
    if (this.instancedExt) {
      this.instancedExt.vertexAttribDivisorANGLE(this.a_InstanceOffset, 0);
    }
    gl.disableVertexAttribArray(this.a_InstanceOffset);
    gl.vertexAttrib3f(this.a_InstanceOffset, 0.0, 0.0, 0.0);
  }

  disposeBlockInstanceBatches() {
    const gl = this.gl;
    if (!this.blockInstanceBatches || this.blockInstanceBatches.length === 0) return;
    for (const batch of this.blockInstanceBatches) {
      if (batch && batch.instanceBuffer) {
        gl.deleteBuffer(batch.instanceBuffer);
      }
    }
    this.blockInstanceBatches = [];
  }

  serializeFaceValues(faceMap) {
    const faceOrder = ["front", "right", "back", "left", "top", "bottom"];
    if (!faceMap) return "";
    return faceOrder.map((face) => {
      const values = faceMap[face];
      return values ? values.join(",") : "";
    }).join("|");
  }

  buildBlockBatchKey(block) {
    const textureNum = Number.isInteger(block?.textureNum) ? block.textureNum : -2;
    const color = block?.color || [1.0, 1.0, 1.0, 1.0];
    return [
      textureNum,
      color.join(","),
      this.serializeFaceValues(block?.uvByFace || null),
      this.serializeFaceValues(block?.tintByFace || null),
    ].join("#");
  }

  buildBlockInstanceBatches(world) {
    const gl = this.gl;
    this.disposeBlockInstanceBatches();

    if (!world || !world.blocks || world.blocks.size === 0) {
      this.blockInstanceRevision = world?.blockRevision ?? -1;
      this.blockInstanceCount = 0;
      return;
    }

    const batchMap = new Map();
    for (const block of world.blocks.values()) {
      if (!block || !block.coords) continue;
      const key = this.buildBlockBatchKey(block);
      let batch = batchMap.get(key);
      if (!batch) {
        batch = {
          textureNum: Number.isInteger(block.textureNum) ? block.textureNum : -2,
          color: [...(block.color || [1.0, 1.0, 1.0, 1.0])],
          uvByFace: block.uvByFace || null,
          tintByFace: block.tintByFace || null,
          offsets: [],
          instanceBuffer: null,
          instanceCount: 0,
        };
        batchMap.set(key, batch);
      }

      batch.offsets.push(block.coords.x, block.coords.y, block.coords.z);
    }

    this.blockInstanceBatches = [];
    for (const batch of batchMap.values()) {
      if (batch.offsets.length === 0) continue;
      const offsetsData = new Float32Array(batch.offsets);
      const instanceBuffer = gl.createBuffer();
      if (!instanceBuffer) continue;

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, offsetsData, gl.STATIC_DRAW);

      batch.instanceBuffer = instanceBuffer;
      batch.instanceCount = offsetsData.length / 3;
      batch.offsets = null;
      this.blockInstanceBatches.push(batch);
    }

    this.blockInstanceRevision = world.blockRevision ?? world.blocks.size;
    this.blockInstanceCount = world.blocks.size;
  }

  ensureBlockInstanceBatches(world) {
    const currentRevision = world?.blockRevision ?? world?.blocks?.size ?? -1;
    const currentCount = world?.blocks?.size ?? 0;
    if (
      this.blockInstanceRevision !== currentRevision ||
      this.blockInstanceCount !== currentCount ||
      this.blockInstanceBatches.length === 0
    ) {
      this.buildBlockInstanceBatches(world);
    }
  }

  renderBlocksInstanced(world) {
    if (!this.useInstancedBlocks || !this.instancedExt) return false;

    this.ensureBlockInstanceBatches(world);
    if (this.blockInstanceBatches.length === 0) return true;

    for (const batch of this.blockInstanceBatches) {
      if (!batch || batch.instanceCount <= 0) continue;
      const safeTextureNum = this.bindTextureForDraw(batch.textureNum);
      this.cubeMesh.renderInstanced(this, batch, safeTextureNum);
    }
    this.resetInstanceOffsetAttribute();
    return true;
  }

  handleView(world) {
    const gl = this.gl;
    const canvas = this.canvas;

    this.projMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 100);
    gl.uniformMatrix4fv(this.u_ProjectionMatrix, false, this.projMatrix.elements);

    world.player.getViewMatrix(this.viewMatrix);
    gl.uniformMatrix4fv(this.u_ViewMatrix, false, this.viewMatrix.elements);
  }

  initTextures(textureTable = TEXTURE_PATHS) {
    const entries = Object.entries(textureTable || {});
    if (entries.length === 0) return true;

    for (const [rawTextureNum, src] of entries) {
      const textureNum = Number(rawTextureNum);
      if (!Number.isInteger(textureNum)) {
        console.log(`Skipping invalid texture index: ${rawTextureNum}`);
        continue;
      }
      this.loadTexture(textureNum, src);
    }
    return true;
  }

  loadTexture(textureNum, src) {
    const image = new Image();
    if (!image) {
      console.log("Failed to create the image object");
      return false;
    }

    image.onload = () => {
      this.sendImageToTexture(textureNum, image);
    };
    image.onerror = () => {
      console.log(`Failed to load texture image ${src}`);
    };
    image.src = src;
    return true;
  }

  sendImageToTexture(textureNum, image) {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) {
      console.log("Failed to create the texture object");
      return false;
    }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    this.textures.set(textureNum, texture);
    return true;
  }

  sendImageToTexture0(image) {
    return this.sendImageToTexture(0, image);
  }

  bindTextureForDraw(textureNum) {
    if (!Number.isInteger(textureNum) || textureNum < 0) return textureNum ?? -2;

    const texture = this.textures.get(textureNum);
    if (!texture) return -2;

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.u_Sampler0, 0);
    return textureNum;
  }

  updateFogColorForTime(elapsedTimeSeconds = 0) {
    const duration = Math.max(0.001, this.nightTransitionDuration);
    const clampedTime = Math.max(0, Number(elapsedTimeSeconds) || 0);
    const t = Math.min(1, clampedTime / duration);
    for (let i = 0; i < 4; i += 1) {
      const day = this.dayFogColor[i];
      const night = this.nightFogColor[i];
      this.fogColor[i] = day + (night - day) * t;
    }
  }

  initAnimalBuffers() {
    if (this.animalParts) return;

    const furColor = [0.96, 0.918, 0.883, 1.0];
    const whiteColor = [1.0, 1.0, 1.0, 1.0];
    const blackColor = [0.0, 0.0, 0.0, 1.0];
    const tongueColor = [0.89, 0.489, 0.489, 1.0];

    const tail1Rot = -70;
    const tail2Rot = -75;
    const tail3Rot = -45;
    const tail4Rot = -45;
    const tail5Rot = 0;
    const feetRot1 = 5;
    const feetRot2 = -5;

    const root = new Matrix4();
    root.setTranslate(-0.25, -0.25, -0.25);
    root.scale(0.5, 0.5, 0.5);

    const parts = [];
    const addPart = (color, buildMatrixFn) => {
      const localMatrix = new Matrix4(root);
      buildMatrixFn(localMatrix);
      parts.push({
        color: [...color],
        localMatrix,
      });
    };

    addPart(furColor, (m) => {
      m.scale(1, 0.75, 1);
    });

    addPart(furColor, (m) => {
      m.translate(0.12, -0.1, 0.1);
      m.scale(0.75, 0.2, 0.8);
    });

    addPart(furColor, (m) => {
      m.translate(0.17, -0.2, 0.2);
      m.scale(0.65, 0.2, 0.7);
    });

    addPart(furColor, (m) => {
      m.translate(0.58, 0.62, 0.2);
      m.rotate(-35, 0, 0, 1);
      m.scale(0.22, 0.5, 0.22);
    });

    addPart(furColor, (m) => {
      m.translate(0.42, 0.62, 0.2);
      m.rotate(35, 0, 0, 1);
      m.scale(0.22, 0.5, 0.22);
    });

    addPart(blackColor, (m) => {
      m.translate(0.025, 0.1, -0.2);
      m.scale(0.25, 0.25, 0.25);
    });

    addPart(blackColor, (m) => {
      m.translate(0.725, 0.1, -0.2);
      m.scale(0.25, 0.25, 0.25);
    });

    addPart(blackColor, (m) => {
      m.translate(0.37, -0.09, 0.05);
      m.scale(0.25, 0.1, 0.25);
    });

    addPart(tongueColor, (m) => {
      m.translate(0.42, -0.09, 0.4);
      m.scale(0.15, 0.05, -0.25);
    });

    addPart(furColor, (m) => {
      m.translate(0.08, -1.2, 0.12);
      m.scale(0.8, 1, 0.8);
    });

    addPart(whiteColor, (m) => {
      m.translate(0.18, -1.19, 0.11);
      m.scale(0.6, 0.8, 0.7);
    });

    addPart(whiteColor, (m) => {
      m.translate(0.28, -1.1, 0.11);
      m.scale(0.4, 0.8, 0.7);
    });

    addPart(whiteColor, (m) => {
      m.translate(0.6, -1.19, -0.1);
      m.rotate(feetRot1, 0, 1, 0);
      m.scale(0.3, 0.1, 0.4);
    });

    addPart(whiteColor, (m) => {
      m.translate(0, -1.19, -0.1);
      m.rotate(feetRot2, 0, 1, 0);
      m.scale(0.3, 0.1, 0.4);
    });

    addPart(whiteColor, (m) => {
      m.translate(0.15, -1.2, -0.2);
      m.rotate(20, 1, 0, 0);
      m.rotate(30, 0, 1, 1);
      m.scale(0.3, 1, 0.3);
    });

    addPart(whiteColor, (m) => {
      m.translate(0.43, -1.05, -0.3);
      m.rotate(20, 1, 0, 0);
      m.rotate(-30, 0, 1, 1);
      m.scale(0.3, 1, 0.3);
    });

    addPart(furColor, (m) => {
      m.translate(0.35, -1.2, 0.8);
      m.rotate(tail1Rot, 0, 1, 0);
      m.scale(0.2, 0.2, 0.6);
    });

    addPart(furColor, (m) => {
      m.translate(0.35, -1.2, 0.8);
      m.rotate(tail1Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail2Rot, 0, 1, 0);
      m.scale(0.2, 0.2, 0.6);
    });

    addPart(furColor, (m) => {
      m.translate(0.35, -1.2, 0.8);
      m.rotate(tail1Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail2Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail3Rot, 0, 1, 0);
      m.scale(0.2, 0.2, 0.6);
    });

    addPart(furColor, (m) => {
      m.translate(0.35, -1.2, 0.8);
      m.rotate(tail1Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail2Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail3Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail4Rot, 0, 1, 0);
      m.scale(0.2, 0.2, 0.6);
    });

    addPart(whiteColor, (m) => {
      m.translate(0.35, -1.2, 0.8);
      m.rotate(tail1Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail2Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail3Rot, 0, 1, 0);
      m.translate(0, 0, 0.5);
      m.rotate(tail4Rot, 0, 1, 0);
      m.translate(0, 0, 0.6);
      m.rotate(tail5Rot, 0, 1, 0);
      m.scale(0.2, 0.2, 0.3);
    });

    this.animalParts = parts;
  }

  renderAnimal(x, y, z, yaw = 0, scale = 1.0) {
    this.initAnimalBuffers();
    if (!this.animalParts || this.animalParts.length === 0) return;

    const worldMatrix = new Matrix4();
    const safeScale = Number.isFinite(scale) ? scale : 1.0;
    const modelLift = 0.9 * safeScale;
    worldMatrix.setTranslate(x, y + modelLift, z);
    worldMatrix.rotate(yaw, 0, 1, 0);
    worldMatrix.scale(safeScale, safeScale, safeScale);

    const modelMatrix = this.entityModelMatrix;
    for (const part of this.animalParts) {
      modelMatrix.set(worldMatrix);
      modelMatrix.concat(part.localMatrix);
      this.cubeMesh.render(
        this,
        modelMatrix,
        part.color,
        -2,
        null,
        null
      );
    }
  }

  render(world) {
    const gl = this.gl;

    this.updateFogColorForTime(world?.time ?? 0);
    this.handleView(world);
    gl.uniform4fv(this.u_fogColor, this.fogColor);
    gl.uniform1f(this.u_fogNear, this.fogNear);
    gl.uniform1f(this.u_fogFar, this.fogFar);
    gl.clearColor(this.fogColor[0], this.fogColor[1], this.fogColor[2], this.fogColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render skybox first with depth writes disabled so world geometry draws over it.
    gl.depthMask(false);
    for (const entity of world.entities) {
      if (entity && entity.type === "skybox") {
        this.renderEntity(entity);
      }
    }
    gl.depthMask(true);

    if (!this.renderBlocksInstanced(world)) {
      for (const block of world.blocks.values()) {
        this.renderBlock(block);
      }
    }

    // dont even know if i need this rn, but im minecraft pilled
    for (const entity of world.entities) {
      if (entity && entity.type === "skybox") continue;
      this.renderEntity(entity);
    }
  }

  renderBlock(block) {
    if (!block || !block.coords) return;

    const modelMatrix = this.blockModelMatrix;
    modelMatrix.setTranslate(block.coords.x, block.coords.y, block.coords.z);
    const textureNum = block.textureNum ?? -2;
    const safeTextureNum = this.bindTextureForDraw(textureNum);

    this.cubeMesh.render(
      this,
      modelMatrix,
      block.color || [1.0, 1.0, 1.0, 1.0],
      safeTextureNum,
      block.uvByFace || null,
      block.tintByFace || null
    );
  }

  renderEntity(entity) {
    if (!entity) return;

    if (entity.type === "block") {
      this.renderBlock(entity);
      return;
    }

    if (entity.renderShape === "cube") {
      const modelMatrix = this.entityModelMatrix;
      if (entity.transform) {
        modelMatrix.set(entity.transform.getMatrix());
      } else if (entity.coords) {
        modelMatrix.setTranslate(entity.coords.x, entity.coords.y, entity.coords.z);
      } else {
        return;
      }

      this.cubeMesh.render(
        this,
        modelMatrix,
        entity.color || [1.0, 1.0, 1.0, 1.0],
        this.bindTextureForDraw(entity.textureNum ?? -2),
        entity.uvByFace || null,
        entity.tintByFace || null
      );
      return;
    }

    if (entity.renderShape === "animal") {
      if (!entity.coords) return;
      this.renderAnimal(
        entity.coords.x,
        entity.coords.y,
        entity.coords.z,
        entity.yaw ?? 0,
        entity.scale ?? 1.0
      );
    }
  }
}

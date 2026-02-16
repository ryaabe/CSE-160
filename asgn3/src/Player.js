// used to be camera class
// inspired by source movement, used quake 3 code as a reference
class Player {
  // Constructor
  constructor() {
    this.transform = new Transform();

    // orientation
    this.transform.position = new Vector3([0, 0, 3]);
    this.transform.rotation = new Vector3([0, 0, 0]);
    this.coords = { x: 0, y: 0, z: 0 };
    this.syncCoords();

    // quake inspired movement
    this.wishDir = new Vector3([0, 0, 0]);
    this.playerVelocity = new Vector3([0, 0, 0]);

    // world up constant
    this.worldUp = new Vector3([0, 1, 0]);

    // calculated every frame
    this.forward = new Vector3([0, 0, -1]);
    this.right = new Vector3([1, 0, 0]);
    this.up = new Vector3([0, 1, 0]);
    this.viewMatrix = new Matrix4();
    this.tempWishDir = new Vector3([0, 0, 0]);
    this.cameraEyeHeight = 1.8;
    this.playerHeight = this.cameraEyeHeight;

    // constants
    this.sens = 1.0; // look around sensitivity
    this.moveSpeed = 6.0; // player move speed
    this.accelSpeed = 12.0; // acceleration toward wish speed
    this.airAccelSpeed = 4.0;
    this.friction = 10.0;
    this.turnSpeed = 120.0; // tank turn speed (degrees per second)
    this.turnDir = 0;

    // collision + jump settings
    this.colliderRadius = 0.3;
    this.colliderHeight = this.playerHeight;
    this.collisionStepSize = 0.2;
    this.collisionEpsilon = 0.0001;
    this.gravity = 24.0;
    this.jumpVelocity = 9.0;
    this.maxFallSpeed = 36.0;
    this.isGrounded = false;
    this.jumpPressed = false;
    this.wasJumpPressed = false;
  }

  setWishDir(x, z) {
    this.wishDir.elements[0] = x;
    this.wishDir.elements[2] = z;
  }

  setMoveDir(x, z) {
    this.setWishDir(x, z);
  }

  setTurnDir(turnAxis) {
    this.turnDir = turnAxis;
  }

  setJumpPressed(isPressed) {
    this.jumpPressed = !!isPressed;
  }

  handleMouseLook(deltaX, deltaY, sensitivity) {
    const rotation = this.transform.rotation.elements;

    // yaw
    rotation[1] += deltaX * sensitivity;

    // pitch (inverted mouse Y)
    rotation[0] -= deltaY * sensitivity;

    // clamp pitch so camera does not flip upside down
    if (rotation[0] > 89) rotation[0] = 89;
    if (rotation[0] < -89) rotation[0] = -89;
  }

  applyTurning(dt) {
    if (dt <= 0 || this.turnDir === 0) return;
    this.transform.rotation.elements[1] += this.turnDir * this.turnSpeed * dt;
  }

  // friction formula taken from Quake3
  applyFriction(dt) {
    const playerVelocity = this.playerVelocity.elements;
    const speed = Math.hypot(playerVelocity[0], playerVelocity[2]);
    if (speed <= 0) return;

    // reduce horizontal speed based on friction
    const drop = speed * this.friction * dt;
    const newSpeed = Math.max(0, speed - drop);
    const scale = newSpeed / speed;

    playerVelocity[0] *= scale;
    playerVelocity[2] *= scale;
  }

  // inspired by quake/source engine movement
  move(dt) {
    if (dt <= 0) return;

    // apply friction first, then accelerate toward input wish direction
    if (this.isGrounded) {
      this.applyFriction(dt);
    }

    const wishInputX = this.wishDir.elements[0];
    const wishInputZ = this.wishDir.elements[2];
    const wishInputMagnitude = Math.hypot(wishInputX, wishInputZ);
    if (wishInputMagnitude <= 0) return;

    // normalize wishdir so diagonals dont move faster
    const localWishX = wishInputX / wishInputMagnitude;
    const localWishZ = wishInputZ / wishInputMagnitude;

    // map wishdir to local player transform (camera-relative movement)
    const forward = this.forward.elements;
    const right = this.right.elements;
    const wishX = right[0] * localWishX + forward[0] * (-localWishZ);
    const wishZ = right[2] * localWishX + forward[2] * (-localWishZ);
    const wishLength = Math.hypot(wishX, wishZ);
    if (wishLength <= 0) return;
    const wishDirElements = this.tempWishDir.elements;
    wishDirElements[0] = wishX / wishLength;
    wishDirElements[1] = 0;
    wishDirElements[2] = wishZ / wishLength;
    const wishDir = this.tempWishDir;

    // derive the player's wish speed from wishdir
    const playerVelocity = this.playerVelocity;
    const wishSpeed = this.moveSpeed;

    // calculate current speed in direction of wishdir
    const currentSpeed = Vector3.dot(playerVelocity, wishDir);

    // speed needed to equal current speed of player
    const addSpeed = wishSpeed - currentSpeed;
    if (addSpeed <= 0) return;

    // clamp acceleration to speed added
    const accelBase = this.isGrounded ? this.accelSpeed : this.airAccelSpeed;
    let accelSpeed = accelBase * dt * wishSpeed;
    if (accelSpeed > addSpeed) accelSpeed = addSpeed;

    const velocityElements = this.playerVelocity.elements;
    velocityElements[0] += accelSpeed * wishDirElements[0];
    velocityElements[2] += accelSpeed * wishDirElements[2];
  }

  applyGravity(dt) {
    const velocityElements = this.playerVelocity.elements;
    velocityElements[1] -= this.gravity * dt;
    if (velocityElements[1] < -this.maxFallSpeed) {
      velocityElements[1] = -this.maxFallSpeed;
    }
  }

  tryJump() {
    const justPressed = this.jumpPressed && !this.wasJumpPressed;
    if (!justPressed || !this.isGrounded) return;

    const velocityElements = this.playerVelocity.elements;
    velocityElements[1] = this.jumpVelocity;
    this.isGrounded = false;
  }

  collidesWithWorld(world, x, y, z) {
    if (!world) return false;
    const isSolidAtGrid = (typeof world.isSolidForCollisionAtGrid === "function")
      ? world.isSolidForCollisionAtGrid.bind(world)
      : (typeof world.isSolidBlockAtGrid === "function" ? world.isSolidBlockAtGrid.bind(world) : null);
    if (!isSolidAtGrid) return false;

    const epsilon = this.collisionEpsilon;
    const minX = x - this.colliderRadius;
    const maxX = x + this.colliderRadius;
    const minY = y;
    const maxY = y + this.colliderHeight;
    const minZ = z - this.colliderRadius;
    const maxZ = z + this.colliderRadius;

    const startX = Math.floor(minX + epsilon);
    const endX = Math.floor(maxX - epsilon);
    const startY = Math.floor(minY + epsilon);
    const endY = Math.floor(maxY - epsilon);
    const startZ = Math.floor(minZ + epsilon);
    const endZ = Math.floor(maxZ - epsilon);

    for (let gx = startX; gx <= endX; gx += 1) {
      for (let gy = startY; gy <= endY; gy += 1) {
        for (let gz = startZ; gz <= endZ; gz += 1) {
          if (isSolidAtGrid(gx, gy, gz)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  moveAxisWithCollision(world, axisIndex, distance) {
    if (!world || distance === 0) return false;

    const position = this.transform.position.elements;
    let remaining = distance;
    let collided = false;

    while (Math.abs(remaining) > this.collisionEpsilon) {
      const direction = Math.sign(remaining);
      const stepSize = Math.min(Math.abs(remaining), this.collisionStepSize);
      let attempt = direction * stepSize;
      let moved = false;

      for (let i = 0; i < 8; i += 1) {
        position[axisIndex] += attempt;
        if (this.collidesWithWorld(world, position[0], position[1], position[2])) {
          position[axisIndex] -= attempt;
          attempt *= 0.5;
          if (Math.abs(attempt) <= this.collisionEpsilon) break;
          continue;
        }

        remaining -= attempt;
        moved = true;
        break;
      }

      if (!moved) {
        collided = true;
        break;
      }
    }

    return collided;
  }

  normalizeVector3Elements(elements) {
    const length = Math.hypot(elements[0], elements[1], elements[2]);
    if (length <= 0) return;
    elements[0] /= length;
    elements[1] /= length;
    elements[2] /= length;
  }

  updateVectors() {
    const rotation = this.transform.rotation.elements;
    const pitchDeg = rotation[0];
    const yawDeg = rotation[1];

    const pitch = (pitchDeg * Math.PI) / 180;
    const yaw = (yawDeg * Math.PI) / 180;

    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);

    const fx = sy * cp;
    const fy = sp;
    const fz = -cy * cp;

    const forward = this.forward.elements;
    forward[0] = fx;
    forward[1] = fy;
    forward[2] = fz;
    this.normalizeVector3Elements(forward);

    const right = this.right.elements;
    const worldUp = this.worldUp.elements;
    right[0] = forward[1] * worldUp[2] - forward[2] * worldUp[1];
    right[1] = forward[2] * worldUp[0] - forward[0] * worldUp[2];
    right[2] = forward[0] * worldUp[1] - forward[1] * worldUp[0];
    this.normalizeVector3Elements(right);

    const up = this.up.elements;
    up[0] = right[1] * forward[2] - right[2] * forward[1];
    up[1] = right[2] * forward[0] - right[0] * forward[2];
    up[2] = right[0] * forward[1] - right[1] * forward[0];
    this.normalizeVector3Elements(up);

    return this;
  }

  getViewMatrix(outMatrix = this.viewMatrix) {
    const p = this.transform.position.elements;
    const f = this.forward.elements;
    const u = this.up.elements;
    const eyeY = p[1] + this.cameraEyeHeight;

    const atX = p[0] + f[0];
    const atY = eyeY + f[1];
    const atZ = p[2] + f[2];

    outMatrix.setLookAt(p[0], eyeY, p[2], atX, atY, atZ, u[0], u[1], u[2]);
    return outMatrix;
  }

  syncCoords() {
    const p = this.transform.position.elements;
    this.coords.x = Math.floor(p[0]);
    this.coords.y = Math.floor(p[1]);
    this.coords.z = Math.floor(p[2]);
  }

  setPosition(x, y, z, resetVelocity = true) {
    const p = this.transform.position.elements;
    p[0] = x;
    p[1] = y;
    p[2] = z;

    if (resetVelocity) {
      const v = this.playerVelocity.elements;
      v[0] = 0;
      v[1] = 0;
      v[2] = 0;
    }

    this.isGrounded = false;
    this.syncCoords();
    this.updateVectors();
  }
  
  update(dt, world = null) {
    // apply tank turning before movement
    if (dt <= 0) {
      this.wasJumpPressed = this.jumpPressed;
      return;
    }
    const stepDt = Math.min(dt, 0.05);
    this.applyTurning(stepDt);

    // refresh view vectors before movement uses forward/right basis
    this.updateVectors();

    // vertical movement
    this.tryJump();
    this.applyGravity(stepDt);

    // calculate player velocity
    this.move(stepDt);

    const playerVelocity = this.playerVelocity.elements;

    if (world) {
      const hitX = this.moveAxisWithCollision(world, 0, playerVelocity[0] * stepDt);
      if (hitX) playerVelocity[0] = 0;

      const hitZ = this.moveAxisWithCollision(world, 2, playerVelocity[2] * stepDt);
      if (hitZ) playerVelocity[2] = 0;

      const movingDown = playerVelocity[1] < 0;
      const hitY = this.moveAxisWithCollision(world, 1, playerVelocity[1] * stepDt);
      if (hitY) {
        if (movingDown) this.isGrounded = true;
        playerVelocity[1] = 0;
      } else {
        this.isGrounded = false;
      }
    } else {
      this.transform.translate(
        playerVelocity[0] * stepDt,
        playerVelocity[1] * stepDt,
        playerVelocity[2] * stepDt
      );
      this.isGrounded = false;
    }

    this.syncCoords();
    this.wasJumpPressed = this.jumpPressed;
  }
}

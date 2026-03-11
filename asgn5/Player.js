import * as THREE from "three";
import { isKeyDown } from "./InputHandler.js";

export class Player {
  root = new THREE.Object3D(); // yaw & position
  camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
  collider = new THREE.Box3();

  pitch = new THREE.Object3D(); // pitch
  playerVelocity = new THREE.Vector3();
  wishDir = new THREE.Vector3(); // local input direction
  tempWishDir = new THREE.Vector3(); // world-space wish direction
  forward = new THREE.Vector3();
  right = new THREE.Vector3();
  worldUp = new THREE.Vector3(0, 1, 0);

  mouseSens = 1.0;
  lookSpeed = 0.002;
  maxPitch = Math.PI / 2 - 0.01;
  moveSpeed = 5.0;
  accelSpeed = 12.0;
  airAccelSpeed = 4.0;
  friction = 10.0;
  gravity = 22.0;
  maxFallSpeed = 45.0;
  jumpVelocity = 8.0;
  jumpEnabled = true;
  groundY = 0;
  lockElement;
  isGrounded = true;
  jumpPressed = false;
  wasJumpPressed = false;

  onMouseMove = (event) => {
    if (document.pointerLockElement !== this.lockElement) {
      return;
    }

    this.root.rotation.y -= event.movementX * this.lookSpeed * this.mouseSens;
    const nextPitch = this.pitch.rotation.x - event.movementY * this.lookSpeed * this.mouseSens;
    this.pitch.rotation.x = Math.max(-this.maxPitch, Math.min(this.maxPitch, nextPitch));
  };

  onLockClick = () => {
    this.lockElement.requestPointerLock();
  };

  constructor(scene, lockElement = document.body) {
    this.lockElement = lockElement;

    this.root.add(this.pitch);
    this.pitch.position.set(0, 1.6, 0);
    this.pitch.add(this.camera);
    this.camera.position.set(0, 0, 0);
    scene.add(this.root);

    this.lockElement.addEventListener("click", this.onLockClick);
    document.addEventListener("mousemove", this.onMouseMove);
  }

  update(dt) {
    if (dt <= 0) {
      return;
    }

    this.updateWishDirFromInput();

    if (this.isGrounded) {
      this.applyFriction(dt);
    }

    this.move(dt);
    this.jumpPressed = isKeyDown("Space");
    this.tryJump();
    this.applyGravity(dt);

    this.root.position.x += this.playerVelocity.x * dt;
    this.root.position.y += this.playerVelocity.y * dt;
    this.root.position.z += this.playerVelocity.z * dt;

    if (this.root.position.y <= this.groundY) {
      this.root.position.y = this.groundY;
      if (this.playerVelocity.y < 0) {
        this.playerVelocity.y = 0;
      }
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    this.wasJumpPressed = this.jumpPressed;
  }

  // friction formula adapted from Quake3 movement
  applyFriction(dt) {
    const speed = Math.hypot(this.playerVelocity.x, this.playerVelocity.z);
    if (speed <= 0) {
      return;
    }

    const drop = speed * this.friction * dt;
    const newSpeed = Math.max(0, speed - drop);
    const scale = newSpeed / speed;

    this.playerVelocity.x *= scale;
    this.playerVelocity.z *= scale;
  }

  // movement flow inspired by Quake/Source accel model
  move(dt) {
    if (dt <= 0) {
      return;
    }

    const wishInputX = this.wishDir.x;
    const wishInputZ = this.wishDir.z;
    const wishInputMagnitude = Math.hypot(wishInputX, wishInputZ);
    if (wishInputMagnitude <= 0) {
      return;
    }

    const localWishX = wishInputX / wishInputMagnitude;
    const localWishZ = wishInputZ / wishInputMagnitude;

    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() <= 0) {
      return;
    }
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.worldUp).normalize();

    const wishX = this.right.x * localWishX + this.forward.x * localWishZ;
    const wishZ = this.right.z * localWishX + this.forward.z * localWishZ;
    const wishLength = Math.hypot(wishX, wishZ);
    if (wishLength <= 0) {
      return;
    }

    this.tempWishDir.set(wishX / wishLength, 0, wishZ / wishLength);

    const wishSpeed = this.moveSpeed;
    const currentSpeed =
      this.playerVelocity.x * this.tempWishDir.x + this.playerVelocity.z * this.tempWishDir.z;
    const addSpeed = wishSpeed - currentSpeed;
    if (addSpeed <= 0) {
      return;
    }

    const accelBase = this.isGrounded ? this.accelSpeed : this.airAccelSpeed;
    let accelSpeed = accelBase * dt * wishSpeed;
    if (accelSpeed > addSpeed) {
      accelSpeed = addSpeed;
    }

    this.playerVelocity.x += accelSpeed * this.tempWishDir.x;
    this.playerVelocity.z += accelSpeed * this.tempWishDir.z;
  }

  applyGravity(dt) {
    this.playerVelocity.y -= this.gravity * dt;
    if (this.playerVelocity.y < -this.maxFallSpeed) {
      this.playerVelocity.y = -this.maxFallSpeed;
    }
  }

  tryJump() {
    if (!this.jumpEnabled) {
      return;
    }
    const justPressed = this.jumpPressed && !this.wasJumpPressed;
    if (!justPressed || !this.isGrounded) {
      return;
    }

    this.playerVelocity.y = this.jumpVelocity;
    this.isGrounded = false;
  }

  updateWishDirFromInput() {
    const inputX = Number(isKeyDown("KeyD")) - Number(isKeyDown("KeyA"));
    const inputZ = Number(isKeyDown("KeyW")) - Number(isKeyDown("KeyS"));
    this.wishDir.set(inputX, 0, inputZ);
  }

  getDebugState() {
    return {
      positionX: this.root.position.x,
      positionY: this.root.position.y,
      positionZ: this.root.position.z,
      velocityX: this.playerVelocity.x,
      velocityY: this.playerVelocity.y,
      velocityZ: this.playerVelocity.z,
      wishX: this.wishDir.x,
      wishZ: this.wishDir.z,
      speed: Math.hypot(this.playerVelocity.x, this.playerVelocity.z),
      grounded: this.isGrounded,
    };
  }

  dispose() {
    this.lockElement.removeEventListener("click", this.onLockClick);
    document.removeEventListener("mousemove", this.onMouseMove);
  }

  isMoving() {
    return Math.hypot(this.playerVelocity.x, this.playerVelocity.z) > 0.05;
  }
}

// this class handles input, converting html events to actions for world 
class InputHandler {
    constructor(canvas, world) {
        this.canvas = canvas;
        this.world = world;
        this.keysDown = Object.create(null);
        this.isPointerLocked = false;
        this.mouseSensitivity = 0.12;
        this.blockInteractionRange = 6.0;
        this.blockRayStep = 0.05;
    }

    init() {
        this.initMouseControls();
        this.initKeyboardControls();
    }

    initMouseControls() {
        this.canvas.addEventListener("click", () => {
            if (this.canvas.requestPointerLock) {
                this.canvas.requestPointerLock();
            }
        });
        this.canvas.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
        });
        this.canvas.addEventListener("mousedown", (ev) => {
            this.handleBlockInteraction(ev);
        });

        document.addEventListener("pointerlockchange", () => {
            this.isPointerLocked = (document.pointerLockElement === this.canvas);
        });

        document.addEventListener("mousemove", (ev) => {
            if (!this.isPointerLocked || !this.world || !this.world.player) return;
            this.world.player.handleMouseLook(
                ev.movementX,
                ev.movementY,
                this.mouseSensitivity
            );
        });
    }

    getBlockTarget() {
        if (!this.world || !this.world.player || typeof this.world.raycastBlock !== "function") return null;
        const player = this.world.player;
        player.updateVectors();

        const position = player.transform.position.elements;
        const forward = player.forward.elements;
        return this.world.raycastBlock(
            {
                x: position[0],
                y: position[1] + player.cameraEyeHeight,
                z: position[2],
            },
            {
                x: forward[0],
                y: forward[1],
                z: forward[2],
            },
            this.blockInteractionRange,
            this.blockRayStep
        );
    }

    handleBlockInteraction(ev) {
        if (!this.isPointerLocked || !this.world || !this.world.player) return;
        if (ev.button !== 0 && ev.button !== 2) return;

        ev.preventDefault();
        const target = this.getBlockTarget();
        if (!target || !target.block) return;

        if (ev.button === 0) {
            this.world.removeBlock(target.block.x, target.block.y, target.block.z);
            return;
        }

        if (ev.button === 2 && target.place && typeof this.world.placeStoneBlockAt === "function") {
            this.world.placeStoneBlockAt(target.place.x, target.place.y, target.place.z);
        }
    }

    initKeyboardControls() {
        window.addEventListener("keydown", (ev) => {
            this.keysDown[ev.code] = true;
            if (
                ev.code === "KeyW" ||
                ev.code === "KeyA" ||
                ev.code === "KeyS" ||
                ev.code === "KeyD" ||
                ev.code === "KeyQ" ||
                ev.code === "KeyE" ||
                ev.code === "Space"
            ) {
                ev.preventDefault();
            }
        });

        window.addEventListener("keyup", (ev) => {
            this.keysDown[ev.code] = false;
        });
    }

    update(dt) {
        this.handleKeyboardControls();
    }

    handleKeyboardControls() {
        if (!this.world || !this.world.player) return;

        const forward = (this.keysDown["KeyW"] ? 1 : 0);
        const back = (this.keysDown["KeyS"] ? 1 : 0);
        const left = (this.keysDown["KeyA"] ? 1 : 0);
        const right = (this.keysDown["KeyD"] ? 1 : 0);
        const turnLeft = (this.keysDown["KeyQ"] ? 1 : 0);
        const turnRight = (this.keysDown["KeyE"] ? 1 : 0);
        const jump = this.keysDown["Space"] ? 1 : 0;

        const xAxis = right - left;
        const zAxis = back - forward;
        const turnAxis = turnRight - turnLeft;
        this.world.player.setMoveDir(xAxis, zAxis);
        this.world.player.setTurnDir(turnAxis);
        this.world.player.setJumpPressed(jump === 1);
    }
}

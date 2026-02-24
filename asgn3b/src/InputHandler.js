// this class handles input, converting html events to actions for world 
class InputHandler {
    constructor(canvas, world) {
        this.canvas = canvas;
        this.world = world;
        this.keysDown = Object.create(null);
        this.isPointerLocked = false;
        this.isMouseLookLocked = false;
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
            this.world?.sound?.resume?.();
            if (this.canvas.requestPointerLock) {
                this.canvas.requestPointerLock();
            }
        });
        this.canvas.addEventListener("contextmenu", (ev) => {
            ev.preventDefault();
        });
        this.canvas.addEventListener("mousedown", (ev) => {
            this.world?.sound?.resume?.();
            this.handleBlockInteraction(ev);
        });

        document.addEventListener("pointerlockchange", () => {
            this.isPointerLocked = (document.pointerLockElement === this.canvas);
        });

        document.addEventListener("mousemove", (ev) => {
            if (!this.isPointerLocked || this.isMouseLookLocked || !this.world || !this.world.player) return;
            this.world.player.handleMouseLook(
                ev.movementX,
                ev.movementY,
                this.mouseSensitivity
            );
        });
    }

    setMouseLookLocked(locked) {
        this.isMouseLookLocked = !!locked;
        return this.isMouseLookLocked;
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
            const key = (typeof this.world.toGridKey === "function")
                ? this.world.toGridKey(target.block.x, target.block.y, target.block.z)
                : `${target.block.x},${target.block.y},${target.block.z}`;
            const targetBlock = this.world.blocks?.get?.(key) || null;
            if (targetBlock?.blockId === "stone") {
                const removed = this.world.removeBlock(target.block.x, target.block.y, target.block.z);
                if (removed) {
                    this.world?.sound?.play?.("stone1", {
                        bus: "sfx",
                        volume: 0.32,
                        cooldownMs: 25,
                        maxVoices: 4,
                        detuneCents: -120,
                    });
                }
            }
            return;
        }

        if (ev.button === 2 && target.place && typeof this.world.placeStoneBlockAt === "function") {
            const placed = this.world.placeStoneBlockAt(target.place.x, target.place.y, target.place.z);
            if (placed) {
                this.world?.sound?.play?.("stone1", {
                    bus: "sfx",
                    volume: 0.26,
                    cooldownMs: 25,
                    maxVoices: 4,
                    detuneCents: 70,
                });
            }
        }
    }

    initKeyboardControls() {
        window.addEventListener("keydown", (ev) => {
            this.world?.sound?.resume?.();
            this.keysDown[ev.code] = true;
            if (ev.code === "KeyI" && !ev.repeat && this.world && this.world.player) {
                const isEnabled = this.world.player.toggleFreeCam();
                console.log(`Free cam ${isEnabled ? "enabled" : "disabled"}`);
                ev.preventDefault();
            }
            if (ev.code === "KeyF" && !ev.repeat) {
                this.world?.handleInteractAction?.();
                ev.preventDefault();
            }
            if (
                ev.code === "KeyW" ||
                ev.code === "KeyA" ||
                ev.code === "KeyS" ||
                ev.code === "KeyD" ||
                ev.code === "KeyQ" ||
                ev.code === "KeyE" ||
                ev.code === "Space" ||
                ev.code === "ShiftLeft" ||
                ev.code === "ShiftRight" ||
                ev.code === "KeyI" ||
                ev.code === "KeyF"
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
        const descend = (this.keysDown["ShiftLeft"] || this.keysDown["ShiftRight"]) ? 1 : 0;

        const xAxis = right - left;
        const zAxis = back - forward;
        const turnAxis = turnRight - turnLeft;
        this.world.player.setMoveDir(xAxis, zAxis);
        this.world.player.setTurnDir(turnAxis);
        this.world.player.setJumpPressed(jump === 1 && !this.world.player.isFreeCam);
        this.world.player.setFreeCamVerticalAxis((jump ? 1 : 0) - descend);
    }
}

// ColoredPoint.js (c) 2012 matsuda
class World {
  constructor() {
    this.player = new Player();
    this.spawn = { x: 0, y: 0, z: 6 };
    // static block data keyed by integer grid coords
    this.blocks = new Map();
    this.blockRevision = 0;
    this.groundPaddingBlocks = 1; 
    this.groundCollisionBounds = null;

    // dynamic/non-block objects
    this.entities = [];
    this.time = 0;

    // test block
    this.placeBlock(0, 0, 0, {
      textureNum: -2,
      color: [0.35, 0.8, 0.95, 1.0],
    });
    this.placeBlock(1, 0, 0, { blockId: "sky" });

    // temp skybox
    this.skyboxSize = 120;
    this.skyboxTransform = new Transform();
    this.skyboxTransform.setScale(this.skyboxSize, this.skyboxSize, this.skyboxSize);
    this.skybox = this.addEntity(createEntity("skybox", {
      renderShape: "cube",
      transform: this.skyboxTransform,
      textureNum: -2,
      // fallback color used if texture 0 is missing/not loaded yet
      color: [0.7529, 0.8471, 1.0, 1.0],
    }));
    this.updateSkyboxTransform();

    // temp
    this.groundTransform = new Transform();
    this.groundTransform.setPosition(-16, -2, -16);
    this.groundTransform.setScale(32, 1, 32);
    this.ground = this.addEntity(createEntity("ground", {
      renderShape: "cube",
      transform: this.groundTransform,
      textureNum: -2,
      color: [0.28, 0.65, 0.3, 1.0],
    }));
    this.updateGroundCollisionBoundsFromTransform();

    this.animal = this.addEntity(createEntity("animal", {
      renderShape: "animal",
      coords: { x: this.spawn.x + 0.5, y: this.spawn.y, z: this.spawn.z + 0.5 },
      yaw: 180,
      scale: 1.2,
    }));
  }

  update(dt) {
    this.time += dt;
    this.player.update(dt, this);
    this.updateSkyboxTransform();
  }

  updateSkyboxTransform() {
    if (!this.skyboxTransform || !this.player) return;
    const p = this.player.transform.position.elements;
    const halfSize = this.skyboxSize * 0.5;
    this.skyboxTransform.setPosition(
      p[0] - halfSize,
      p[1] - halfSize,
      p[2] - halfSize
    );
  }

  isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  updateGroundCollisionBoundsFromTransform() {
    if (!this.groundTransform) return;

    const position = this.groundTransform.position.elements;
    const scale = this.groundTransform.scale.elements;
    const minX = Math.floor(position[0]);
    const minY = Math.floor(position[1]);
    const minZ = Math.floor(position[2]);
    const width = Math.max(1, Math.round(scale[0]));
    const depth = Math.max(1, Math.round(scale[2]));
    this.groundCollisionBounds = {
      minX,
      maxX: minX + width - 1,
      y: minY,
      minZ,
      maxZ: minZ + depth - 1,
    };
  }

  fitGroundPlaneToBounds(bounds, paddingBlocks = this.groundPaddingBlocks) {
    if (!this.groundTransform || !bounds) return;

    const padding = Math.max(0, Math.floor(paddingBlocks));
    const minX = Math.floor(bounds.minX);
    const minY = Math.floor(bounds.minY);
    const minZ = Math.floor(bounds.minZ);
    const maxX = Math.floor(bounds.maxX);
    const maxZ = Math.floor(bounds.maxZ);
    const width = Math.max(1, (maxX - minX + 1) + padding * 2);
    const depth = Math.max(1, (maxZ - minZ + 1) + padding * 2);
    const groundX = minX - padding;
    const groundY = minY - 21;
    const groundZ = minZ - padding;

    this.groundTransform.setPosition(groundX, groundY, groundZ);
    this.groundTransform.setScale(width, 1, depth);
    this.updateGroundCollisionBoundsFromTransform();
  }

  resolveAnimalPlacement(bounds = null) {
    const fallback = bounds
      ? {
          x: Math.floor((bounds.minX + bounds.maxX) * 0.5) + 0.5,
          y: bounds.maxY + 1,
          z: Math.floor((bounds.minZ + bounds.maxZ) * 0.5) + 0.5,
        }
      : {
          x: this.spawn.x + 0.5,
          y: this.spawn.y + 1,
          z: this.spawn.z + 0.5,
        };

    let glassCount = 0;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    for (const block of this.blocks.values()) {
      if (!block || !block.coords || block.blockId !== "glass") continue;
      glassCount += 1;
      sumX += block.coords.x;
      sumY += block.coords.y;
      sumZ += block.coords.z;
    }

    if (glassCount === 0) {
      return { ...fallback, yaw: 180, scale: 1.2 };
    }

    const centerX = Math.round(sumX / glassCount);
    const centerZ = Math.round(sumZ / glassCount);
    const avgGlassY = sumY / glassCount;
    const minSearchY = bounds ? Math.floor(bounds.minY) - 32 : -64;
    let floorY = null;
    for (let y = Math.floor(avgGlassY) - 1; y >= minSearchY; y -= 1) {
      if (this.isSolidBlockAtGrid(centerX, y, centerZ)) {
        floorY = y;
        break;
      }
    }

    if (!Number.isFinite(floorY)) {
      floorY = bounds ? Math.floor(bounds.minY) : 0;
    }

    return {
      x: centerX + 0.5,
      y: floorY + 1,
      z: centerZ + 0.5,
      yaw: 180,
      scale: 1.2,
    };
  }

  updateAnimalPlacement(bounds = null) {
    if (!this.animal) return;
    const placement = this.resolveAnimalPlacement(bounds);
    this.animal.coords = {
      x: placement.x,
      y: placement.y,
      z: placement.z,
    };
    this.animal.yaw = placement.yaw;
    this.animal.scale = placement.scale;
  }

  setSpawn(spawn, movePlayer = true) {
    if (!spawn || !this.isFiniteNumber(spawn.x) || !this.isFiniteNumber(spawn.y) || !this.isFiniteNumber(spawn.z)) {
      return false;
    }

    const safeSpawn = this.resolveSafeSpawn(spawn);
    this.spawn = { x: safeSpawn.x, y: safeSpawn.y, z: safeSpawn.z };
    if (movePlayer && this.player) {
      this.player.setPosition(safeSpawn.x, safeSpawn.y, safeSpawn.z, true);
      this.updateSkyboxTransform();
    }
    return true;
  }

  resolveSafeSpawn(spawn, maxLift = 64) {
    if (!this.player || typeof this.player.collidesWithWorld !== "function") {
      return { x: spawn.x, y: spawn.y, z: spawn.z };
    }

    if (!this.player.collidesWithWorld(this, spawn.x, spawn.y, spawn.z)) {
      return { x: spawn.x, y: spawn.y, z: spawn.z };
    }

    for (let lift = 1; lift <= maxLift; lift += 1) {
      const testY = spawn.y + lift;
      if (!this.player.collidesWithWorld(this, spawn.x, testY, spawn.z)) {
        return { x: spawn.x, y: testY, z: spawn.z };
      }
    }

    return { x: spawn.x, y: spawn.y, z: spawn.z };
  }

  resolveSpawnFromWorldData(worldData, offsetX, offsetY, offsetZ, bounds) {
    const fromTopLevel = worldData?.spawn;
    if (fromTopLevel && this.isFiniteNumber(fromTopLevel.x) && this.isFiniteNumber(fromTopLevel.y) && this.isFiniteNumber(fromTopLevel.z)) {
      return {
        x: fromTopLevel.x + offsetX,
        y: fromTopLevel.y + offsetY,
        z: fromTopLevel.z + offsetZ,
      };
    }

    const fromMeta = worldData?.meta?.spawn;
    if (fromMeta && this.isFiniteNumber(fromMeta.x) && this.isFiniteNumber(fromMeta.y) && this.isFiniteNumber(fromMeta.z)) {
      return {
        x: fromMeta.x + offsetX,
        y: fromMeta.y + offsetY,
        z: fromMeta.z + offsetZ,
      };
    }

    if (bounds && this.isFiniteNumber(bounds.minX) && this.isFiniteNumber(bounds.maxX) &&
        this.isFiniteNumber(bounds.maxY) && this.isFiniteNumber(bounds.minZ) && this.isFiniteNumber(bounds.maxZ)) {
      return {
        x: Math.floor((bounds.minX + bounds.maxX) * 0.5),
        y: bounds.maxY + 2,
        z: Math.floor((bounds.minZ + bounds.maxZ) * 0.5),
      };
    }

    return { ...this.spawn };
  }

  toGridKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  isSolidBlockAtGrid(x, y, z) {
    const key = this.toGridKey(x, y, z);
    return this.blocks.has(key);
  }

  isGroundPlaneSolidAtGrid(x, y, z) {
    const bounds = this.groundCollisionBounds;
    if (!bounds) return false;
    if (y !== bounds.y) return false;
    if (x < bounds.minX || x > bounds.maxX) return false;
    if (z < bounds.minZ || z > bounds.maxZ) return false;
    return true;
  }

  isSolidForCollisionAtGrid(x, y, z) {
    if (this.isSolidBlockAtGrid(x, y, z)) return true;
    return this.isGroundPlaneSolidAtGrid(x, y, z);
  }

  isSolidAtWorld(x, y, z) {
    return this.isSolidForCollisionAtGrid(
      Math.floor(x),
      Math.floor(y),
      Math.floor(z)
    );
  }

  raycastBlock(origin, direction, maxDistance = 6.0, step = 0.05) {
    if (!origin || !direction) return null;

    const dx = Number(direction.x);
    const dy = Number(direction.y);
    const dz = Number(direction.z);
    const length = Math.hypot(dx, dy, dz);
    if (length <= 0) return null;

    const invLength = 1 / length;
    const dirX = dx * invLength;
    const dirY = dy * invLength;
    const dirZ = dz * invLength;
    const safeStep = Math.max(0.01, step);

    let cellX = Math.floor(origin.x);
    let cellY = Math.floor(origin.y);
    let cellZ = Math.floor(origin.z);
    let lastEmpty = null;
    if (!this.isSolidBlockAtGrid(cellX, cellY, cellZ)) {
      lastEmpty = { x: cellX, y: cellY, z: cellZ };
    }

    for (let distance = safeStep; distance <= maxDistance; distance += safeStep) {
      const sampleX = origin.x + dirX * distance;
      const sampleY = origin.y + dirY * distance;
      const sampleZ = origin.z + dirZ * distance;
      const nextCellX = Math.floor(sampleX);
      const nextCellY = Math.floor(sampleY);
      const nextCellZ = Math.floor(sampleZ);

      if (nextCellX === cellX && nextCellY === cellY && nextCellZ === cellZ) {
        continue;
      }

      cellX = nextCellX;
      cellY = nextCellY;
      cellZ = nextCellZ;

      if (this.isSolidBlockAtGrid(cellX, cellY, cellZ)) {
        return {
          block: { x: cellX, y: cellY, z: cellZ },
          place: lastEmpty ? { ...lastEmpty } : null,
          distance,
        };
      }

      lastEmpty = { x: cellX, y: cellY, z: cellZ };
    }

    return null;
  }

  canPlaceBlockAt(x, y, z) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const gz = Math.floor(z);
    if (this.isSolidBlockAtGrid(gx, gy, gz)) return false;

    if (!this.player || typeof this.player.collidesWithWorld !== "function") {
      return true;
    }

    const key = this.toGridKey(gx, gy, gz);
    this.blocks.set(key, {
      type: "block",
      coords: { x: gx, y: gy, z: gz },
    });

    const playerPos = this.player.transform.position.elements;
    const wouldCollide = this.player.collidesWithWorld(
      this,
      playerPos[0],
      playerPos[1],
      playerPos[2]
    );

    this.blocks.delete(key);
    return !wouldCollide;
  }

  placeStoneBlockAt(x, y, z) {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    const gz = Math.floor(z);
    if (!this.canPlaceBlockAt(gx, gy, gz)) return false;
    this.placeBlock(gx, gy, gz, { blockId: "stone" });
    return true;
  }

  placeBlock(x, y, z, options = {}) {
    const block = createBlock(x, y, z, options);
    const key = this.toGridKey(block.coords.x, block.coords.y, block.coords.z);
    this.blocks.set(key, block);
    this.blockRevision += 1;
    return block;
  }

  addEntity(entity) {
    if (!entity) return null;

    if (entity.type === "block" && entity.coords) {
      const key = this.toGridKey(entity.coords.x, entity.coords.y, entity.coords.z);
      this.blocks.set(key, entity);
      this.blockRevision += 1;
      return entity;
    }

    this.entities.push(entity);
    return entity;
  }

  removeBlock(x, y, z) {
    const key = this.toGridKey(Math.floor(x), Math.floor(y), Math.floor(z));
    const removed = this.blocks.delete(key);
    if (removed) this.blockRevision += 1;
    return removed;
  }

  // Temporary compatibility names while call sites migrate.
  placeCube(x, y, z, options = {}) {
    return this.placeBlock(x, y, z, options);
  }

  removeCube(x, y, z) {
    return this.removeBlock(x, y, z);
  }

  placeEntity(def) {
    return this.addEntity(def);
  }

  clearBlocks() {
    if (this.blocks.size > 0) {
      this.blockRevision += 1;
    }
    this.blocks.clear();
  }

  loadFromWorldData(worldData, options = {}) {
    if (!worldData || !Array.isArray(worldData.palette) || !Array.isArray(worldData.blocks)) {
      console.log("Invalid world data format. Expected { palette: [], blocks: [] }");
      return 0;
    }

    const offset = options.offset || { x: 0, y: 0, z: 0 };
    const offsetX = Number.isFinite(offset.x) ? offset.x : 0;
    const offsetY = Number.isFinite(offset.y) ? offset.y : 0;
    const offsetZ = Number.isFinite(offset.z) ? offset.z : 0;

    this.clearBlocks();

    let placedCount = 0;
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (const entry of worldData.blocks) {
      if (!Array.isArray(entry) || entry.length < 4) continue;

      const x = Number(entry[0]);
      const y = Number(entry[1]);
      const z = Number(entry[2]);
      const paletteIndex = Number(entry[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      if (!Number.isInteger(paletteIndex)) continue;

      const blockId = worldData.palette[paletteIndex];
      if (typeof blockId !== "string" || blockId === "air") continue;

      const wx = x + offsetX;
      const wy = y + offsetY;
      const wz = z + offsetZ;
      this.placeBlock(wx, wy, wz, { blockId });
      if (wx < minX) minX = wx;
      if (wy < minY) minY = wy;
      if (wz < minZ) minZ = wz;
      if (wx > maxX) maxX = wx;
      if (wy > maxY) maxY = wy;
      if (wz > maxZ) maxZ = wz;
      placedCount += 1;
    }

    const hasBounds = placedCount > 0 && Number.isFinite(minX) && Number.isFinite(maxX);
    const worldBounds = hasBounds ? { minX, minY, minZ, maxX, maxY, maxZ } : null;
    if (hasBounds) {
      this.fitGroundPlaneToBounds(worldBounds);
    }
    this.updateAnimalPlacement(worldBounds);
    const nextSpawn = this.resolveSpawnFromWorldData(
      worldData,
      offsetX,
      offsetY,
      offsetZ,
      worldBounds
    );
    this.setSpawn(nextSpawn, true);

    return placedCount;
  }
}

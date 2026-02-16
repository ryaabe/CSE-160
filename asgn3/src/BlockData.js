const TEXTURE_PATHS = {
  0: "../resources/sky.jpg",
  1: "../resources/blocks/atlas.png",
};

const ATLAS = {
  textureNum: 1,
  cols: 16,
  rows: 16,
  pixelSize: 256,
  padPixels: 0.5,
};

function atlasTileToUVRect(tileX, tileY) {
  const tileWidth = 1 / ATLAS.cols;
  const tileHeight = 1 / ATLAS.rows;
  const padU = ATLAS.padPixels / ATLAS.pixelSize;
  const padV = ATLAS.padPixels / ATLAS.pixelSize;

  const u0 = tileX * tileWidth + padU;
  const u1 = (tileX + 1) * tileWidth - padU;
  const v1 = 1.0 - tileY * tileHeight - padV;
  const v0 = 1.0 - (tileY + 1) * tileHeight + padV;
  return [u0, v0, u1, v1];
}

function createFaceUV({ side, top = side, bottom = side }) {
  const sideRect = atlasTileToUVRect(side[0], side[1]);
  const topRect = atlasTileToUVRect(top[0], top[1]);
  const bottomRect = atlasTileToUVRect(bottom[0], bottom[1]);
  return {
    front: sideRect,
    right: sideRect,
    back: sideRect,
    left: sideRect,
    top: topRect,
    bottom: bottomRect,
  };
}

function createFaceTint({ side = null, top = side, bottom = side }) {
  return {
    front: side ? [...side] : null,
    right: side ? [...side] : null,
    back: side ? [...side] : null,
    left: side ? [...side] : null,
    top: top ? [...top] : null,
    bottom: bottom ? [...bottom] : null,
  };
}

const BLOCK_DATA = {
  default: {
    textureNum: -2,
    color: [1.0, 1.0, 1.0, 1.0],
  },
  sky: {
    textureNum: 0,
    color: [1.0, 1.0, 1.0, 1.0],
  },
  grass: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [0, 0],   // grass_block_side
      top: [1, 0],    // grass_block_top
      bottom: [6, 0], // dirt
    }),
    tintByFace: createFaceTint({
      top: [0.58, 0.78, 0.35], // grass colormap-style tint
    }),
  },
  wood: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [3, 0],   // oak_log
      top: [4, 0],    // oak_log_top
      bottom: [4, 0], // oak_log_top
    }),
  },
  leaf: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [2, 0], // oak_leaves
    }),
    tintByFace: createFaceTint({
      side: [0.45, 0.76, 0.38], // foliage colormap-style tint
    }),
  },
  stone: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [5, 0], // stone
    }),
  },
  dirt: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [6, 0], // dirt
    }),
  },
  polished_andesite: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [7, 0], // polished_andesite
    }),
  },
  sand: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [8, 0], // sand
    }),
  },
  obsidian: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [9, 0], // obsidian
    }),
  },
  acacia_planks: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [10, 0], // acacia_planks
    }),
  },
  glass: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [11, 0], // glass
    }),
  },
  gravel: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [12, 0], // gravel
    }),
  },
  grass_path: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [6, 0],    // dirt
      top: [13, 0],    // grass_path_top
      bottom: [6, 0],  // dirt
    }),
  },
};

function getBlockData(blockId = "default") {
  return BLOCK_DATA[blockId] || BLOCK_DATA.default;
}

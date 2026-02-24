const TEXTURE_PATHS = {
  0: "../resources/sky.jpg",
  1: "../resources/blocks/atlas.png",
  2: "../resources/blocks/liminal_atlas.png",
};

const ATLAS = {
  textureNum: 1,
  cols: 16,
  rows: 16,
  pixelSize: 256,
  padPixels: 0.5,
};

const LIMINAL_ATLAS = {
  textureNum: 2,
  cols: 16,
  rows: 16,
  pixelSize: 1024,
  padPixels: 0.5,
};

function atlasTileToUVRect(tileX, tileY, atlas = ATLAS) {
  const tileWidth = 1 / atlas.cols;
  const tileHeight = 1 / atlas.rows;
  const padU = atlas.padPixels / atlas.pixelSize;
  const padV = atlas.padPixels / atlas.pixelSize;

  const u0 = tileX * tileWidth + padU;
  const u1 = (tileX + 1) * tileWidth - padU;
  const v1 = 1.0 - tileY * tileHeight - padV;
  const v0 = 1.0 - (tileY + 1) * tileHeight + padV;
  return [u0, v0, u1, v1];
}

function createFaceUV({ side, top = side, bottom = side, atlas = ATLAS }) {
  const sideRect = atlasTileToUVRect(side[0], side[1], atlas);
  const topRect = atlasTileToUVRect(top[0], top[1], atlas);
  const bottomRect = atlasTileToUVRect(bottom[0], bottom[1], atlas);
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

function createFaceVisibility({ side = true, top = side, bottom = side }) {
  return {
    front: !!side,
    right: !!side,
    back: !!side,
    left: !!side,
    top: !!top,
    bottom: !!bottom,
  };
}

const BLOCK_DATA = {
  default: {
    textureNum: -2,
    color: [1.0, 1.0, 1.0, 1.0],
  },
  white_concrete: {
    textureNum: -2,
    color: [1.0, 1.0, 1.0, 1.0],
    useFaceShading: false,
  },
  void_block: {
    textureNum: -2,
    color: [0.0, 0.0, 0.0, 1.0],
    useFaceShading: false,
  },
  bricks: {
    textureNum: LIMINAL_ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    uvByFace: createFaceUV({
      side: [0, 0], // liminal concrete.png
      atlas: LIMINAL_ATLAS,
    }),
  },
  unlit_window_bottom: {
    textureNum: LIMINAL_ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    useFaceShading: false,
    uvByFace: createFaceUV({
      side: [1, 1],   // bottom half of unlit_window.png
      top: [0, 0],    // cap with concrete texture
      bottom: [0, 0], // cap with concrete texture
      atlas: LIMINAL_ATLAS,
    }),
  },
  unlit_window_top: {
    textureNum: LIMINAL_ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    useFaceShading: false,
    uvByFace: createFaceUV({
      side: [1, 0],   // top half of unlit_window.png
      top: [0, 0],    // cap with concrete texture
      bottom: [0, 0], // cap with concrete texture
      atlas: LIMINAL_ATLAS,
    }),
  },
  lit_window_bottom: {
    textureNum: LIMINAL_ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    useFaceShading: false,
    uvByFace: createFaceUV({
      side: [2, 1],   // bottom half of lit_window.png
      top: [0, 0],    // cap with concrete texture
      bottom: [0, 0], // cap with concrete texture
      atlas: LIMINAL_ATLAS,
    }),
  },
  lit_window_top: {
    textureNum: LIMINAL_ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    useFaceShading: false,
    uvByFace: createFaceUV({
      side: [2, 0],   // top half of lit_window.png
      top: [0, 0],    // cap with concrete texture
      bottom: [0, 0], // cap with concrete texture
      atlas: LIMINAL_ATLAS,
    }),
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
  trap_grass_top: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    collides: false,
    frontFaceOnly: true,
    faceVisibility: createFaceVisibility({ side: false, top: true, bottom: false }),
    uvByFace: createFaceUV({
      side: [0, 0],
      top: [1, 0],
      bottom: [6, 0],
    }),
    tintByFace: createFaceTint({
      top: [0.58, 0.78, 0.35],
    }),
  },
  trap_path_top: {
    textureNum: ATLAS.textureNum,
    color: [1.0, 1.0, 1.0, 1.0],
    collides: false,
    frontFaceOnly: true,
    faceVisibility: createFaceVisibility({ side: false, top: true, bottom: false }),
    uvByFace: createFaceUV({
      side: [6, 0],
      top: [13, 0],
      bottom: [6, 0],
    }),
  },
};

function getBlockData(blockId = "default") {
  return BLOCK_DATA[blockId] || BLOCK_DATA.default;
}

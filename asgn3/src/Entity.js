function createBlock(x, y, z, options = {}) {
  const blockId = options.blockId || "default";
  const blockData = getBlockData(blockId);
  const sourceUvByFace = options.uvByFace || blockData.uvByFace || null;
  const sourceTintByFace = options.tintByFace || blockData.tintByFace || null;
  const uvByFace = sourceUvByFace
    ? {
        front: [...(sourceUvByFace.front || [0, 0, 1, 1])],
        right: [...(sourceUvByFace.right || [0, 0, 1, 1])],
        back: [...(sourceUvByFace.back || [0, 0, 1, 1])],
        left: [...(sourceUvByFace.left || [0, 0, 1, 1])],
        top: [...(sourceUvByFace.top || [0, 0, 1, 1])],
        bottom: [...(sourceUvByFace.bottom || [0, 0, 1, 1])],
      }
    : null;
  const tintByFace = sourceTintByFace
    ? {
        front: sourceTintByFace.front ? [...sourceTintByFace.front] : null,
        right: sourceTintByFace.right ? [...sourceTintByFace.right] : null,
        back: sourceTintByFace.back ? [...sourceTintByFace.back] : null,
        left: sourceTintByFace.left ? [...sourceTintByFace.left] : null,
        top: sourceTintByFace.top ? [...sourceTintByFace.top] : null,
        bottom: sourceTintByFace.bottom ? [...sourceTintByFace.bottom] : null,
      }
    : null;

  return {
    type: "block",
    blockId,
    coords: {
      x: Math.floor(x),
      y: Math.floor(y),
      z: Math.floor(z),
    },
    textureNum: options.textureNum ?? options.textureId ?? blockData.textureNum,
    color: options.color || [...blockData.color],
    uvByFace,
    tintByFace,
  };
}

function createEntity(type = "entity", components = {}) {
  return {
    type,
    ...components,
  };
}

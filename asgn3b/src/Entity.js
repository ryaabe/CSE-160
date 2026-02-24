function createBlock(x, y, z, options = {}) {
  const blockId = options.blockId || "default";
  const blockData = getBlockData(blockId);
  const sourceUvByFace = options.uvByFace || blockData.uvByFace || null;
  const sourceTintByFace = options.tintByFace || blockData.tintByFace || null;
  const sourceFaceVisibility = options.faceVisibility || blockData.faceVisibility || null;
  const frontFaceOnly = options.frontFaceOnly ?? blockData.frontFaceOnly ?? false;
  const useFaceShading = options.useFaceShading ?? blockData.useFaceShading ?? true;
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
  const faceVisibility = sourceFaceVisibility
    ? {
        front: sourceFaceVisibility.front !== false,
        right: sourceFaceVisibility.right !== false,
        back: sourceFaceVisibility.back !== false,
        left: sourceFaceVisibility.left !== false,
        top: sourceFaceVisibility.top !== false,
        bottom: sourceFaceVisibility.bottom !== false,
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
    faceVisibility,
    frontFaceOnly: !!frontFaceOnly,
    useFaceShading: !!useFaceShading,
    collides: options.collides ?? blockData.collides ?? true,
  };
}

function createEntity(type = "entity", components = {}) {
  return {
    type,
    ...components,
  };
}

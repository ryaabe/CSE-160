import * as THREE from "three";
import { Player } from "./Player.js";
import { MeshGouraudMaterial } from "./MeshGouraudMaterial.js"; // from a previous version of three js (not in this one)
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BloomPass } from "three/addons/postprocessing/BloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const MAX_WALK_RIPPLES = 24;
const WALK_RIPPLE_LIFETIME = 0.9;
const WALK_RIPPLE_INTERVAL = 0.32;
const WALK_RIPPLE_INTERVAL_JITTER = 0.22;
const WALK_RIPPLE_POSITION_JITTER = 0.18;
const LANDING_RIPPLE_MIN_IMPACT = 2.0;
const LANDING_RIPPLE_MAX_IMPACT = 14.0;
const STUCCO_PLATFORM_HEIGHT = 0.15;
const COTTAGE_ASSET_PATH = "./resources/assets/cottage/";
const SKY_CUBEMAP_FACE_PATHS = [
  "./resources/assets/textures/right1.jpg",
  "./resources/assets/textures/left.jpg",
  "./resources/assets/textures/top.jpg",
  "./resources/assets/textures/bottom.jpg",
  "./resources/assets/textures/middle.jpg",
  "./resources/assets/textures/right2.jpg",
];

function applyCornerPanelStyle(element) {
  element.style.padding = "8px 10px";
  element.style.background = "rgba(255, 255, 255, 0.14)";
  element.style.color = "#111";
  element.style.border = "1px solid rgba(0, 0, 0, 0.2)";
  element.style.borderRadius = "4px";
  element.style.fontFamily = "monospace";
  element.style.fontSize = "12px";
  element.style.whiteSpace = "pre";
}

function createLoadingScreen() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "flex-start";
  overlay.style.justifyContent = "flex-start";
  overlay.style.padding = "8px";
  overlay.style.background = "rgba(245, 249, 252, 0.62)";
  overlay.style.backdropFilter = "blur(4px)";
  overlay.style.zIndex = "30";
  overlay.style.transition = "opacity 180ms ease";

  const panel = document.createElement("div");
  applyCornerPanelStyle(panel);
  panel.style.minWidth = "220px";

  const title = document.createElement("div");
  title.textContent = "Loading Scene";

  const status = document.createElement("div");
  status.style.marginTop = "4px";
  status.textContent = "Preparing assets...";

  const detail = document.createElement("div");
  detail.style.marginTop = "2px";
  detail.style.color = "rgba(0, 0, 0, 0.72)";
  detail.textContent = "0 / 0";

  panel.append(title, status, detail);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  return { overlay, title, status, detail };
}

function getLoadingItemLabel(url) {
  const cleanUrl = url.split("?")[0];
  const segments = cleanUrl.split("/");
  return segments[segments.length - 1] || cleanUrl;
}

function setLoadingScreenVisible(loadingScreen, visible) {
  loadingScreen.overlay.style.opacity = visible ? "1" : "0";
  loadingScreen.overlay.style.pointerEvents = visible ? "auto" : "none";
}

function attachLoadingScreen(loadingScreen) {
  const manager = THREE.DefaultLoadingManager;

  manager.onStart = (url, itemsLoaded, itemsTotal) => {
    loadingScreen.status.textContent = `Loading ${getLoadingItemLabel(url)}...`;
    loadingScreen.detail.textContent = `${itemsLoaded} / ${itemsTotal}`;
    setLoadingScreenVisible(loadingScreen, true);
  };

  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    loadingScreen.status.textContent = `Loading ${getLoadingItemLabel(url)}...`;
    loadingScreen.detail.textContent = `${itemsLoaded} / ${itemsTotal}`;
  };

  manager.onLoad = () => {
    loadingScreen.status.textContent = "Scene ready";
    loadingScreen.detail.textContent = "All assets loaded";
    window.setTimeout(() => setLoadingScreenVisible(loadingScreen, false), 180);
  };

  manager.onError = (url) => {
    loadingScreen.status.textContent = `Failed: ${getLoadingItemLabel(url)}`;
    loadingScreen.detail.textContent = "Check the console for asset errors";
  };
}

function createScene() {
  const scene = new THREE.Scene();
  const fogColor = new THREE.Color().setRGB(0.623, 0.734, 0.785);
  const fog = new THREE.Fog(fogColor, 4, 15);
  scene.userData.skyboxTexture = null;
  scene.userData.isFogEnabled = true;
  applySceneAtmosphere(scene, fog, fogColor, true);
  loadSkyCubemap(scene);
  return { scene, fog, fogColor };
}

function applySceneAtmosphere(scene, fog, fogColor, isFogEnabled) {
  scene.userData.isFogEnabled = isFogEnabled;
  scene.fog = isFogEnabled ? fog : null;
  scene.background = isFogEnabled ? fogColor : scene.userData.skyboxTexture ?? fogColor;
}

function loadSkyCubemap(scene) {
  const cubeTextureLoader = new THREE.CubeTextureLoader();
  const cubeTexture = cubeTextureLoader.load(
    SKY_CUBEMAP_FACE_PATHS,
    () => {
      scene.userData.skyboxTexture = cubeTexture;
      if (!scene.userData.isFogEnabled) {
        scene.background = cubeTexture;
      }
    },
    undefined,
    (error) => {
      console.error("Failed to load sky cubemap textures", error);
    },
  );
  cubeTexture.colorSpace = THREE.SRGBColorSpace;
}

function createRenderer() {
  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.autoClear = false;
  return renderer;
}

function createLights(scene) {
  const ambientLight = new THREE.AmbientLight(0x9fc3d9, 0.62);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(5, 8, 4);
  scene.add(directionalLight);
}

function createBaseplate(scene) {
  const baseplateGeometry = new THREE.BoxGeometry(200, 1, 200);
  const baseplateMaterial = new THREE.MeshBasicMaterial({ color: 0xd9d9d9 });
  const baseplate = new THREE.Mesh(baseplateGeometry, baseplateMaterial);
  baseplate.position.y = -0.5;
  scene.add(baseplate);
  return baseplate;
}

function createWaterLayerFromBaseplate(scene, baseplate, renderer) {
  const textureLoader = new THREE.TextureLoader();
  const waterTexture = textureLoader.load("./resources/assets/textures/water_texture.png");
  waterTexture.wrapS = THREE.MirroredRepeatWrapping;
  waterTexture.wrapT = THREE.MirroredRepeatWrapping;
  waterTexture.repeat.set(30, 30);
  waterTexture.center.set(0.5, 0.5);
  waterTexture.rotation = 0;
  waterTexture.minFilter = THREE.LinearMipmapLinearFilter;
  waterTexture.magFilter = THREE.LinearFilter;
  waterTexture.colorSpace = THREE.SRGBColorSpace;
  waterTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Detail layer with different scale/rotation to break visible tiling patterns.
  const waterDetailTexture = waterTexture.clone();
  waterDetailTexture.needsUpdate = true;
  waterDetailTexture.repeat.set(48, 48);
  waterDetailTexture.center.set(0.5, 0.5);
  waterDetailTexture.rotation = Math.PI * 0.25;

  const waterMaterial = new THREE.MeshPhongMaterial({
    map: waterTexture,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const waterDetailMaterial = new THREE.MeshPhongMaterial({
    map: waterDetailTexture,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const width = baseplate.geometry.parameters?.width ?? 200;
  const depth = baseplate.geometry.parameters?.depth ?? 200;
  const waterGeometry = new THREE.PlaneGeometry(width, depth, 1, 1);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterDetailGeometry = waterGeometry.clone();

  const waterLayer = new THREE.Mesh(waterGeometry, waterMaterial);
  const waterDetailLayer = new THREE.Mesh(waterDetailGeometry, waterDetailMaterial);

  const baseplateTopY = baseplate.position.y + 0.5 * baseplate.scale.y;
  // Lift water surfaces so wave troughs stay above the baseplate.
  waterLayer.position.y = baseplateTopY + 0.16;
  waterDetailLayer.position.y = waterLayer.position.y + 0.006;
  waterLayer.renderOrder = 1;
  waterDetailLayer.renderOrder = 2;

  scene.add(waterLayer);
  scene.add(waterDetailLayer);
  return { waterLayer, waterDetailLayer };
}

function createStuccoPlatform(scene, waterLayer, baseplate) {
  const platformWidth = 20;
  const platformDepth = 12;
  const platformHeight = STUCCO_PLATFORM_HEIGHT;

  const geometry = new THREE.BoxGeometry(platformWidth, platformHeight, platformDepth);

  const textureLoader = new THREE.TextureLoader();
  const stuccoTexture = textureLoader.load(
    "./resources/assets/textures/textured-stucco-7087-in-architextures.jpg",
  );
  stuccoTexture.wrapS = THREE.RepeatWrapping;
  stuccoTexture.wrapT = THREE.RepeatWrapping;
  stuccoTexture.repeat.set(8, 5);
  stuccoTexture.colorSpace = THREE.SRGBColorSpace;

  const platformMaterial = new THREE.MeshPhongMaterial({
    map: stuccoTexture,
    side: THREE.DoubleSide,
  });
  const platformMaterials = Array.from({ length: 6 }, () => platformMaterial.clone());

  const platform = new THREE.Mesh(geometry, platformMaterials);
  const baseY = baseplate.position.y + 0.5 * baseplate.scale.y;
  const waterY = waterLayer.position.y;
  const baseHeight = Math.max(baseY, waterY);
  platform.position.y = baseHeight + 0.03 + platformHeight * 0.5;
  platform.position.z = 4;
  platform.renderOrder = 1.5;
  scene.add(platform);

  return platform;
}

function createStuccoTexture() {
  const textureLoader = new THREE.TextureLoader();
  const stuccoTexture = textureLoader.load(
    "./resources/assets/textures/textured-stucco-7087-in-architextures.jpg",
  );
  stuccoTexture.wrapS = THREE.RepeatWrapping;
  stuccoTexture.wrapT = THREE.RepeatWrapping;
  stuccoTexture.colorSpace = THREE.SRGBColorSpace;
  return stuccoTexture;
}

function createStuccoWalls(scene, waterLayer, baseplate) {
  const wallLength = 220;
  const wallHeight = 52;
  const wallThickness = 2;
  const wallOffsetZ = 34;
  const baseY = Math.max(
    baseplate.position.y + 0.5 * baseplate.scale.y,
    waterLayer.position.y,
  );

  const textureLoader = new THREE.TextureLoader();
  const wallTexture = textureLoader.load("./resources/assets/textures/walls.png");
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.colorSpace = THREE.SRGBColorSpace;
  wallTexture.repeat.set(18, 3);

  const wallMaterials = Array.from({ length: 6 }, () =>
    new THREE.MeshPhongMaterial({
      map: wallTexture.clone(),
      side: THREE.FrontSide,
    }),
  );
  wallMaterials.forEach((material) => {
    material.map.repeat.copy(wallTexture.repeat);
    material.map.wrapS = THREE.RepeatWrapping;
    material.map.wrapT = THREE.RepeatWrapping;
    material.map.colorSpace = THREE.SRGBColorSpace;
  });

  const createWall = (z) => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(wallLength, wallHeight, wallThickness),
      wallMaterials.map((material) => material.clone()),
    );
    wall.position.set(0, baseY + wallHeight * 0.5, z);
    scene.add(wall);
    return wall;
  };

  return [createWall(-wallOffsetZ), createWall(wallOffsetZ)];
}

function createWallCaustics(targetMesh, waterLevel, color = 0xb8ffff) {
  const size = targetMesh.geometry.parameters;
  const plane = new THREE.PlaneGeometry(size.width, size.height);
  const causticsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 0.85 },
      uWaterLevel: { value: waterLevel },
      uWaterFalloff: { value: 2.0 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uWaterLevel;
      uniform float uWaterFalloff;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      float causticPattern(vec2 p) {
        float v = 0.0;
        v += sin(p.x + uTime * 1.2) * sin(p.y * 1.3 - uTime * 1.1);
        v += sin((p.x + p.y) * 1.7 + uTime * 0.8);
        v += cos(length(p * 1.05) - uTime * 1.6);
        v = v / 3.0;
        return smoothstep(0.42, 0.86, v * 0.5 + 0.5);
      }

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 toWater = normalize(vec3(0.0, uWaterLevel - vWorldPos.y, 0.0));
        float facingWater = smoothstep(0.05, 0.9, max(dot(n, toWater), 0.0));
        float waterDistanceFade = exp(-abs(vWorldPos.y - uWaterLevel) * uWaterFalloff);
        float mask = facingWater * waterDistanceFade;

        vec2 proj = vWorldPos.xy * 2.0;
        float c1 = causticPattern(proj + vec2(uTime * 0.2, -uTime * 0.13));
        float c2 = causticPattern(proj * 1.6 + vec2(-uTime * 0.16, uTime * 0.21));
        float caustics = max(c1 * 0.8 + c2 * 0.7 - 0.55, 0.0);
        caustics = pow(caustics, 1.45);

        float alpha = caustics * mask * 0.55 * uIntensity;
        vec3 outColor = uColor * (caustics * 1.2) * uIntensity * max(mask, 0.15);
        gl_FragColor = vec4(outColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });

  const causticsMesh = new THREE.Mesh(plane, causticsMaterial);
  causticsMesh.position.set(0, 0, 0);
  causticsMesh.renderOrder = (targetMesh.renderOrder || 0) + 10;

  if (targetMesh.position.z < 0) {
    causticsMesh.position.z = size.depth * 0.5 + 0.01;
  } else {
    causticsMesh.position.z = -size.depth * 0.5 - 0.01;
    causticsMesh.rotation.y = Math.PI;
  }

  targetMesh.add(causticsMesh);
  return causticsMaterial.uniforms;
}

function cloneLoadedMaterial(material, renderer) {
  const nextMaterial = material?.isMaterial ? material.clone() : new THREE.MeshPhongMaterial();
  nextMaterial.side = THREE.DoubleSide;

  if (nextMaterial.map) {
    nextMaterial.map.colorSpace = THREE.SRGBColorSpace;
    nextMaterial.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  if (nextMaterial.normalMap) {
    nextMaterial.normalMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  return nextMaterial;
}

function loadCottageModel(scene, renderer, platform, onLoaded = null) {
  const cottageRoot = new THREE.Group();
  cottageRoot.position.set(platform.position.x, 0, platform.position.z);
  scene.add(cottageRoot);

  const mtlLoader = new MTLLoader();
  mtlLoader.setPath(COTTAGE_ASSET_PATH);
  mtlLoader.setResourcePath(COTTAGE_ASSET_PATH);

  // This follows the manual's MTLLoader -> OBJLoader flow.
  mtlLoader.load(
    "cottage_obj.mtl",
    (materials) => {
      materials.preload();

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath(COTTAGE_ASSET_PATH);
      objLoader.load(
        "cottage_obj.obj",
        (object) => {
          const removableChildren = [];

          object.traverse((child) => {
            if (!child.isMesh) {
              return;
            }

            const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
            const shouldKeepMesh = sourceMaterials.some(
              (material) => material?.name === "cottage_texture",
            );

            if (!shouldKeepMesh) {
              removableChildren.push(child);
              return;
            }

            child.material = sourceMaterials.map((material) =>
              cloneLoadedMaterial(material, renderer),
            );
            if (child.material.length === 1) {
              [child.material] = child.material;
            }
          });

          removableChildren.forEach((child) => {
            child.parent?.remove(child);
          });

          const sourceBox = new THREE.Box3().setFromObject(object);
          const sourceSize = sourceBox.getSize(new THREE.Vector3());
          const targetWidth = 7.5;
          const uniformScale = sourceSize.x > 0 ? targetWidth / sourceSize.x : 1;
          object.scale.setScalar(uniformScale);
          object.rotation.y = Math.PI * 0.18;
          object.updateMatrixWorld(true);

          const fittedBox = new THREE.Box3().setFromObject(object);
          const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
          const platformTopY = platform.position.y + STUCCO_PLATFORM_HEIGHT * 0.5;

          object.position.set(-fittedCenter.x, platformTopY - fittedBox.min.y, -fittedCenter.z);
          cottageRoot.add(object);

          if (onLoaded) {
            const worldBounds = new THREE.Box3().setFromObject(cottageRoot);
            onLoaded(cottageRoot, worldBounds);
          }
        },
        undefined,
        (error) => {
          console.error("Failed to load cottage OBJ", error);
        },
      );
    },
    undefined,
    (error) => {
      console.error("Failed to load cottage MTL", error);
    },
  );

  return cottageRoot;
}

function positionCubeAboveCottage(cube, platform, cottageBounds = null) {
  const centerX = platform.position.x;
  const centerZ = platform.position.z;
  const fallbackTopY = platform.position.y + STUCCO_PLATFORM_HEIGHT * 0.5 + 4.8;
  const targetY = cottageBounds ? cottageBounds.max.y + 1.6 : fallbackTopY;
  cube.position.set(centerX, targetY, centerZ);
}

function createWalkRippleLayer(scene, baseplate, waterDetailLayer) {
  const width = baseplate.geometry.parameters?.width ?? 200;
  const depth = baseplate.geometry.parameters?.depth ?? 200;
  const geometry = new THREE.PlaneGeometry(width, depth, 1, 1);
  geometry.rotateX(-Math.PI / 2);

  const rippleUniforms = {
    uTime: { value: 0 },
    uRippleCount: { value: 0 },
    uRipples: {
      value: Array.from({ length: MAX_WALK_RIPPLES }, () => new THREE.Vector4(99999, 99999, -99999, 0)),
    },
    uRippleColor: { value: new THREE.Color(0x9ddcff) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: rippleUniforms,
    vertexShader: `
      varying vec3 vWorldPos;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      #define MAX_WALK_RIPPLES ${MAX_WALK_RIPPLES}
      uniform float uTime;
      uniform int uRippleCount;
      uniform vec4 uRipples[MAX_WALK_RIPPLES];
      uniform vec3 uRippleColor;
      varying vec3 vWorldPos;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float rippleRing(vec2 p, vec4 ripple) {
        float age = uTime - ripple.z;
        if (age <= 0.0 || age >= ${WALK_RIPPLE_LIFETIME.toFixed(1)}) return 0.0;

        float seedA = hash12(ripple.xy);
        float seedB = hash12(ripple.xy + ripple.z * 0.137);
        float speed = mix(1.4, 2.15, seedA);
        float ringWidth = mix(0.06, 0.11, seedB);
        float fadeCurve = mix(1.5, 2.4, seedA);

        float radius = age * speed;
        float dist = length(p - ripple.xy);
        float edge = abs(dist - radius);

        float primary = 1.0 - smoothstep(0.0, ringWidth, edge);
        float secondary = 1.0 - smoothstep(ringWidth * 0.7, ringWidth * 1.8, edge + ringWidth * 0.35);
        float lifeT = clamp(1.0 - age / ${WALK_RIPPLE_LIFETIME.toFixed(1)}, 0.0, 1.0);
        float fade = pow(lifeT, fadeCurve) * exp(-dist * 0.18);

        return (primary * 0.8 + secondary * 0.35) * fade * ripple.w;
      }

      void main() {
        vec2 worldXZ = vWorldPos.xz;
        float ripple = 0.0;

        for (int i = 0; i < MAX_WALK_RIPPLES; i++) {
          if (i >= uRippleCount) break;
          ripple += rippleRing(worldXZ, uRipples[i]);
        }

        ripple = clamp(ripple, 0.0, 1.0);
        float shimmer = 0.98 + 0.02 * sin((worldXZ.x + worldXZ.y) * 2.0 + uTime * 3.0);
        vec3 color = uRippleColor * ripple * shimmer;
        float alpha = ripple * 0.42;
        if (alpha < 0.001) discard;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const rippleLayer = new THREE.Mesh(geometry, material);
  rippleLayer.position.y = waterDetailLayer.position.y + 0.002;
  rippleLayer.renderOrder = waterDetailLayer.renderOrder + 1;
  scene.add(rippleLayer);

  return { rippleLayer, rippleUniforms };
}

function addWalkRipple(game, x, z, timeSeconds, strength) {
  game.walkRipples.push({ x, z, time: timeSeconds, strength });
  if (game.walkRipples.length > MAX_WALK_RIPPLES) {
    game.walkRipples.shift();
  }
}

function updateWalkRipples(game, time, landingImpactSpeed = 0) {
  const timeSeconds = time * 0.001;
  game.walkRipples = game.walkRipples.filter((ripple) => timeSeconds - ripple.time <= WALK_RIPPLE_LIFETIME);

  if (landingImpactSpeed > LANDING_RIPPLE_MIN_IMPACT) {
    const impactT = THREE.MathUtils.clamp(
      (landingImpactSpeed - LANDING_RIPPLE_MIN_IMPACT) /
        (LANDING_RIPPLE_MAX_IMPACT - LANDING_RIPPLE_MIN_IMPACT),
      0,
      1,
    );
    const landingStrength = THREE.MathUtils.lerp(0.95, 1.45, impactT) * (0.9 + Math.random() * 0.2);
    const landingJitter = WALK_RIPPLE_POSITION_JITTER * 0.35;
    addWalkRipple(
      game,
      game.player.root.position.x + (Math.random() - 0.5) * landingJitter,
      game.player.root.position.z + (Math.random() - 0.5) * landingJitter,
      timeSeconds,
      landingStrength,
    );
    game.nextWalkRippleSpawnTime = Math.max(game.nextWalkRippleSpawnTime, timeSeconds + 0.12);
  }

  if (game.player.isGrounded && game.player.isMoving()) {
    if (timeSeconds >= game.nextWalkRippleSpawnTime) {
      const speed = Math.hypot(game.player.playerVelocity.x, game.player.playerVelocity.z);
      const strengthJitter = 0.75 + Math.random() * 0.4;
      const strength = THREE.MathUtils.clamp((speed / game.player.moveSpeed) * strengthJitter, 0.35, 1.0);
      const jitterX = (Math.random() - 0.5) * WALK_RIPPLE_POSITION_JITTER;
      const jitterZ = (Math.random() - 0.5) * WALK_RIPPLE_POSITION_JITTER;

      addWalkRipple(game, game.player.root.position.x + jitterX, game.player.root.position.z + jitterZ, timeSeconds, strength);
      game.nextWalkRippleSpawnTime =
        timeSeconds + WALK_RIPPLE_INTERVAL + Math.random() * WALK_RIPPLE_INTERVAL_JITTER;
    }
  }

  const uniforms = game.walkRippleUniforms;
  uniforms.uTime.value = timeSeconds;
  uniforms.uRippleCount.value = game.walkRipples.length;

  for (let i = 0; i < MAX_WALK_RIPPLES; i += 1) {
    const data = uniforms.uRipples.value[i];
    const ripple = game.walkRipples[i];
    if (ripple) {
      data.set(ripple.x, ripple.z, ripple.time, ripple.strength);
    } else {
      data.set(99999, 99999, -99999, 0);
    }
  }

  game.walkRippleLayer.material.uniformsNeedUpdate = true;
}

function createCube(scene, platform) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xe6cf7a,
    emissive: 0x5d4b12,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.9,
    transmission: 0.82,
    thickness: 0.9,
    ior: 1.33,
    roughness: 0.08,
    metalness: 0.0,
    reflectivity: 0.6,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    fog: true,
  });
  const cube = new THREE.Mesh(geometry, material);
  const glowLight = new THREE.PointLight(0xf3d67c, 2.8, 26, 2);
  glowLight.position.set(0, 0, 0);
  cube.add(glowLight);
  cube.userData.glowLight = glowLight;
  positionCubeAboveCottage(cube, platform);
  scene.add(cube);
  return cube;
}

function createSphere(scene) {
  const geometry = new THREE.SphereGeometry(1.25, 32, 16);
  const material = new MeshGouraudMaterial({ color: 0x00ff00, fog: true });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(0, 1.5, -6);
  scene.add(sphere);
  return sphere;
}

function createCylinder(scene) {
  const geometry = new THREE.CylinderGeometry(0.45, 0.45, 1.5, 20);
  const material = new MeshGouraudMaterial({ color: 0x00ff00, fog: true });
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.set(-3, 0.75, -3);
  scene.add(cylinder);
  return cylinder;
}

function createBench(scene) {
  const bench = new THREE.Group();
  const woodMaterial = new THREE.MeshPhongMaterial({
    color: 0x7a5738,
  });

  const makePart = (width, height, depth, x, y, z) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), woodMaterial);
    part.position.set(x, y, z);
    bench.add(part);
    return part;
  };

  const benchWidth = 2.4;
  const seatSlatWidth = 2.22;
  const seatHeight = 0.5;
  const seatSlatThickness = 0.05;
  const seatSlatDepth = 0.16;
  const legThickness = 0.1;
  const legHeight = seatHeight - 0.02;
  const legInsetX = 0.96;
  const legFrontZ = 0.23;
  const legBackZ = -0.23;
  const backLean = -Math.PI * 0.08;

  makePart(legThickness, legHeight, legThickness, -legInsetX, legHeight * 0.5, legFrontZ);
  makePart(legThickness, legHeight, legThickness, legInsetX, legHeight * 0.5, legFrontZ);
  makePart(legThickness, legHeight, legThickness, -legInsetX, legHeight * 0.5, legBackZ);
  makePart(legThickness, legHeight, legThickness, legInsetX, legHeight * 0.5, legBackZ);

  makePart(benchWidth - 0.26, 0.08, 0.08, 0, 0.31, legFrontZ);
  makePart(benchWidth - 0.26, 0.08, 0.08, 0, 0.31, legBackZ);
  makePart(0.08, 0.08, 0.38, -legInsetX, 0.31, 0);
  makePart(0.08, 0.08, 0.38, legInsetX, 0.31, 0);
  makePart(benchWidth - 0.42, 0.06, 0.06, 0, 0.13, 0);

  makePart(seatSlatWidth, seatSlatThickness, seatSlatDepth, 0, seatHeight, -0.18);
  makePart(seatSlatWidth, seatSlatThickness, seatSlatDepth, 0, seatHeight, 0);
  makePart(seatSlatWidth, seatSlatThickness, seatSlatDepth, 0, seatHeight, 0.18);

  const backPostHeight = 0.95;
  makePart(0.09, backPostHeight, 0.09, -legInsetX, backPostHeight * 0.5, -0.28);
  makePart(0.09, backPostHeight, 0.09, legInsetX, backPostHeight * 0.5, -0.28);

  const backSlatLower = makePart(seatSlatWidth, 0.1, 0.06, 0, 0.74, -0.3);
  const backSlatUpper = makePart(seatSlatWidth, 0.1, 0.06, 0, 0.9, -0.31);
  backSlatLower.rotation.x = backLean;
  backSlatUpper.rotation.x = backLean;

  bench.position.set(6, 0.34, 2.57);
  scene.add(bench);
  return bench;
}

function createLamp(scene, bench) {
  const lamp = new THREE.Group();
  const metalMaterial = new THREE.MeshPhongMaterial({
    color: 0x4a5b6d,
    shininess: 70,
    specular: 0x1e2630,
  });
  const bulbMaterial = new THREE.MeshPhongMaterial({
    color: 0xf5ead0,
    emissive: 0xe3c98a,
    shininess: 110,
    specular: 0x444444,
  });

  const addCylinder = (radiusTop, radiusBottom, height, x, y, z, rotation = null, material = metalMaterial) => {
    const part = new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 20),
      material,
    );
    part.position.set(x, y, z);
    if (rotation) {
      part.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    lamp.add(part);
    return part;
  };

  const addBox = (width, height, depth, x, y, z, rotation = null, material = metalMaterial) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    part.position.set(x, y, z);
    if (rotation) {
      part.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    lamp.add(part);
    return part;
  };

  const addSphere = (radius, x, y, z, scale = null, rotation = null, material = metalMaterial) => {
    const part = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
    part.position.set(x, y, z);
    if (scale) {
      part.scale.copy(scale);
    }
    if (rotation) {
      part.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    lamp.add(part);
    return part;
  };

  addCylinder(0.24, 0.28, 0.14, 0, 0.07, 0);
  addCylinder(0.16, 0.2, 0.12, 0, 0.2, 0);
  addCylinder(0.085, 0.095, 2.85, 0, 1.685, 0);
  addSphere(0.11, 0, 3.11, 0);
  addBox(0.92, 0.1, 0.12, 0.46, 3.11, 0, new THREE.Euler(0, 0, -0.08));
  addCylinder(0.042, 0.042, 0.34, 0.86, 2.88, 0);

  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
    metalMaterial,
  );
  shade.position.set(0.86, 2.74, 0);
  shade.rotation.x = Math.PI;
  lamp.add(shade);

  addCylinder(0.06, 0.06, 0.14, 0.86, 2.77, 0);
  addSphere(0.12, 0.86, 2.51, 0, null, null, bulbMaterial);

  const lampLight = new THREE.PointLight(0xffefcf, 2.3, 24, 2);
  lampLight.position.set(0.86, 2.5, 0);
  lamp.add(lampLight);

  const benchSpotTarget = new THREE.Object3D();
  benchSpotTarget.position.set(0.86, 0.5, 0);
  lamp.add(benchSpotTarget);

  const benchSpotLight = new THREE.SpotLight(0xfff3dc, 8.5, 22, 0.52, 0.72, 2);
  benchSpotLight.position.set(0.86, 2.54, 0);
  benchSpotLight.target = benchSpotTarget;
  lamp.add(benchSpotLight);

  lamp.rotation.y = Math.PI;
  lamp.position.set(bench.position.x + 1.82, bench.position.y, bench.position.z + 0.08);
  scene.add(lamp);
  return lamp;
}

function createPhongSphere(scene) {
  const geometry = new THREE.SphereGeometry(1.25, 32, 16);
  const material = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    shininess: 80,
    specular: 0x333333,
    fog: true,
  });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(3, 1.5, -6);
  scene.add(sphere);
  return sphere;
}

function createSphereCaustics(targetMesh, waterLevel, color = 0xb8ffff) {
  const causticsMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 1.0 },
      uWaterLevel: { value: waterLevel },
      uWaterFalloff: { value: 2.4 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uWaterLevel;
      uniform float uWaterFalloff;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;

      float causticPattern(vec2 p) {
        float v = 0.0;
        v += sin(p.x + uTime * 1.2) * sin(p.y * 1.3 - uTime * 1.1);
        v += sin((p.x + p.y) * 1.7 + uTime * 0.8);
        v += cos(length(p * 1.05) - uTime * 1.6);
        v = v / 3.0;
        return smoothstep(0.42, 0.86, v * 0.5 + 0.5);
      }

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 toWater = normalize(vec3(0.0, uWaterLevel - vWorldPos.y, 0.0));
        float facingWater = smoothstep(0.05, 0.9, max(dot(n, toWater), 0.0));
        float waterDistanceFade = exp(-abs(vWorldPos.y - uWaterLevel) * uWaterFalloff);
        float mask = facingWater * waterDistanceFade;

        vec2 proj = vWorldPos.xz * 2.2 + n.xz * 0.55;
        float c1 = causticPattern(proj + vec2(uTime * 0.2, -uTime * 0.13));
        float c2 = causticPattern(proj * 1.6 + vec2(-uTime * 0.16, uTime * 0.21));
        float caustics = max(c1 * 0.8 + c2 * 0.7 - 0.55, 0.0);
        caustics = pow(caustics, 1.5);

        float alpha = caustics * mask * 0.65 * uIntensity;
        vec3 color = uColor * (caustics * 1.3) * uIntensity * max(mask, 0.2);
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });

  const causticsMesh = new THREE.Mesh(targetMesh.geometry.clone(), causticsMaterial);
  causticsMesh.scale.setScalar(1.01);
  causticsMesh.renderOrder = (targetMesh.renderOrder || 0) + 10;
  targetMesh.add(causticsMesh);

  return causticsMaterial.uniforms;
}

function createPlayer(scene, renderer) {
  const player = new Player(scene, renderer.domElement);
  player.root.position.set(0, 0, 8);
  return player;
}

function createDebugHud() {
  const debugHud = document.createElement("div");
  debugHud.style.position = "fixed";
  debugHud.style.top = "8px";
  debugHud.style.left = "8px";
  applyCornerPanelStyle(debugHud);
  debugHud.style.background = "transparent";
  debugHud.style.pointerEvents = "none";
  debugHud.style.zIndex = "10";
  document.body.appendChild(debugHud);
  return debugHud;
}

function updateDebugHud(debugHud, fpsSmoothed, debug) {
  debugHud.textContent =
    `FPS: ${fpsSmoothed.toFixed(1)}\n` +
    `Pos: (${debug.positionX.toFixed(2)}, ${debug.positionY.toFixed(2)}, ${debug.positionZ.toFixed(2)})\n` +
    `Vel: (${debug.velocityX.toFixed(2)}, ${debug.velocityY.toFixed(2)}, ${debug.velocityZ.toFixed(2)})\n` +
    `WishDir: (${debug.wishX.toFixed(2)}, ${debug.wishZ.toFixed(2)})\n` +
    `Speed: ${debug.speed.toFixed(2)}\n` +
    `Grounded: ${debug.grounded}`;
}

function createComposerAndPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new BloomPass(0.45);
  const fxaaPass = new ShaderPass(FXAAShader);
  const outputPass = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(fxaaPass);
  composer.addPass(outputPass);

  return { composer, fxaaPass };
}

function handleResize(game) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  game.renderer.setSize(width, height);
  game.player.camera.aspect = width / height;
  game.player.camera.updateProjectionMatrix();
  game.composer.setSize(width, height);
  updateFxaaResolution(game);
}

function updateFxaaResolution(game) {
  const pixelRatio = game.renderer.getPixelRatio();
  game.fxaaPass.material.uniforms.resolution.value.set(
    1 / (window.innerWidth * pixelRatio),
    1 / (window.innerHeight * pixelRatio),
  );
}

function attachFogToggleHotkey(game) {
  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.code !== "KeyI") {
      return;
    }

    game.isFogEnabled = !game.isFogEnabled;
    applySceneAtmosphere(game.scene, game.fog, game.fogColor, game.isFogEnabled);
  });
}

function createGame() {
  const sceneState = createScene();
  const scene = sceneState.scene;
  const renderer = createRenderer();
  createLights(scene);
  const baseplate = createBaseplate(scene);
  const water = createWaterLayerFromBaseplate(scene, baseplate, renderer);
  const waterLevel = water.waterLayer.position.y;
  const stuccoPlatform = createStuccoPlatform(scene, water.waterLayer, baseplate);
  const cube = createCube(scene, stuccoPlatform);
  const bench = createBench(scene);
  const lamp = createLamp(scene, bench);
  const stuccoWalls = createStuccoWalls(scene, water.waterLayer, baseplate);
  const cottage = loadCottageModel(scene, renderer, stuccoPlatform, (_, cottageBounds) => {
    positionCubeAboveCottage(cube, stuccoPlatform, cottageBounds);
  });
  const cubeCaustics = createSphereCaustics(cube, waterLevel, 0x9fe8ff);
  const player = createPlayer(scene, renderer);
  const walkRipple = createWalkRippleLayer(scene, baseplate, water.waterDetailLayer);
  const post = createComposerAndPostProcessing(renderer, scene, player.camera);
  const debugHud = createDebugHud();

  return {
    scene,
    renderer,
    fog: sceneState.fog,
    fogColor: sceneState.fogColor,
    isFogEnabled: true,
    baseplate,
    waterLayer: water.waterLayer,
    waterDetailLayer: water.waterDetailLayer,
    walkRippleLayer: walkRipple.rippleLayer,
    walkRippleUniforms: walkRipple.rippleUniforms,
    walkRipples: [],
    nextWalkRippleSpawnTime: 0,
    cube,
    bench,
    lamp,
    stuccoPlatform,
    stuccoWalls,
    cottage,
    causticsUniforms: [],
    player,
    composer: post.composer,
    fxaaPass: post.fxaaPass,
    debugHud,
    lastTime: 0,
    fpsSmoothed: 0,
  };
}

function animateFrame(game, time) {
  const rawDt = game.lastTime === 0 ? 0 : (time - game.lastTime) / 1000;
  const dt = Math.min(rawDt, 0.05);
  game.lastTime = time;

  const fpsInstant = dt > 0 ? 1 / dt : 0;
  game.fpsSmoothed = game.fpsSmoothed === 0 ? fpsInstant : game.fpsSmoothed * 0.9 + fpsInstant * 0.1;

  const wasGrounded = game.player.isGrounded;
  const verticalSpeedBeforeUpdate = game.player.playerVelocity.y;
  game.player.update(dt);
  const landingImpactSpeed =
    !wasGrounded && game.player.isGrounded && verticalSpeedBeforeUpdate < 0
      ? Math.abs(verticalSpeedBeforeUpdate)
      : 0;
  const debug = game.player.getDebugState();
  updateDebugHud(game.debugHud, game.fpsSmoothed, debug);

  const causticsTime = time * 0.001;
  for (const uniforms of game.causticsUniforms) {
    uniforms.uTime.value = causticsTime;
    uniforms.uWaterLevel.value = game.waterLayer.position.y;
  }

  updateWalkRipples(game, time, landingImpactSpeed);
  const waterMap = game.waterLayer.material.map;
  const detailMap = game.waterDetailLayer.material.map;
  const scroll = time * 0.00004;
  waterMap.offset.set((scroll * 0.8) % 1, (scroll * 0.35) % 1);
  detailMap.offset.set((-scroll * 0.45) % 1, (scroll * 0.6) % 1);
  waterMap.rotation = time * 0.000008;
  detailMap.rotation = Math.PI * 0.25 - time * 0.000012;

  game.cube.rotation.x = time / 2000;
  game.cube.rotation.y = time / 1000;
  game.renderer.clear();
  game.composer.render();
}

const loadingScreen = createLoadingScreen();
attachLoadingScreen(loadingScreen);

const game = createGame();
attachFogToggleHotkey(game);
updateFxaaResolution(game);
window.addEventListener("resize", () => handleResize(game));
game.renderer.setAnimationLoop((time) => animateFrame(game, time));

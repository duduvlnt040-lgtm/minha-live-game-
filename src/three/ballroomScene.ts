import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { CameraMode, RoachEntity, WeddingGameState } from '../game/types';
import { createRoachRig, type RoachRig, updateRoachRigAnimation } from './roachModel';
import {
  createCheckeredFloorTexture,
  createContactShadowTexture,
  createCurtainTexture,
  createFloorBumpTexture,
  createMarqueeSignTexture,
  createWallTexture,
  createWindowSkyTexture,
} from './textures';

export interface FloatingBadgeRefs {
  container: HTMLDivElement;
  avatarCircle: HTMLDivElement;
  initialSpan: HTMLSpanElement;
  barFill: HTMLDivElement;
  speechBox: HTMLDivElement;
}

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  life: number;
  maxLife: number;
  scale: number;
}

const MAX_BADGE_SLOTS = 34;
const MAX_CONFETTI = 130;

// Reusable module-scope scratch objects (zero GC in render loop)
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createWeddingCake(castShadow: boolean): THREE.Group {
  const cake = new THREE.Group();

  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x6b122a,
    roughness: 0.5,
    metalness: 0.1,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0xf9eff2,
    roughness: 0.65,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4bf42,
    roughness: 0.25,
    metalness: 0.8,
  });
  const frostingMat = new THREE.MeshStandardMaterial({
    color: 0xfff8f5,
    roughness: 0.38,
  });
  const berryMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.4,
  });

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 1.05, 18), tableMat);
  ped.position.y = 0.525;
  ped.castShadow = castShadow;
  ped.receiveShadow = true;

  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.15, 0.14, 20), clothMat);
  cloth.position.y = 1.08;

  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.86, 0.5, 20), frostingMat);
  tier1.position.y = 1.4;
  tier1.castShadow = castShadow;

  const trim1 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 8, 24), goldMat);
  trim1.rotation.x = Math.PI / 2;
  trim1.position.y = 1.18;

  const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.6, 0.44, 20), frostingMat);
  tier2.position.y = 1.87;
  tier2.castShadow = castShadow;

  const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.36, 18), frostingMat);
  tier3.position.y = 2.27;
  tier3.castShadow = castShadow;

  const topper = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), berryMat);
  topper.position.y = 2.58;

  cake.add(ped, cloth, tier1, trim1, tier2, tier3, topper);
  return cake;
}

export interface BallroomController {
  syncFromState: (state: WeddingGameState) => void;
  triggerConfettiBurst: (x: number, y: number, z: number, count?: number) => void;
  pickRoachAtClientPos: (clientX: number, clientY: number) => string | null;
  dispose: () => void;
}

export function mountBallroomScene(
  mountEl: HTMLDivElement,
  overlayEl: HTMLDivElement,
  getState: () => WeddingGameState,
  onStepFrame: (dt: number, elapsed: number) => void,
  onBadgePoolReady?: () => void,
): BallroomController {
  const isSoftwareGl = detectSoftwareGl();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const width = Math.max(mountEl.clientWidth, 320);
  const height = Math.max(mountEl.clientHeight, 480);
  renderer.setSize(width, height);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  mountEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3a0817);
  scene.fog = new THREE.FogExp2(0x3a0817, 0.0095);

  // Studio environment reflections (PMREM RoomEnvironment)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // Camera
  const camera = new THREE.PerspectiveCamera(46, width / height, 0.2, 120);
  camera.position.set(0, 21.5, 22.5);
  const currentLookAt = new THREE.Vector3(0, 0.6, -2.5);
  camera.lookAt(currentLookAt);

  // Warm / Cool Lighting Rig
  const hemiLight = new THREE.HemisphereLight(0xdce7ff, 0x5c1127, 0.85);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffe6c7, 1.55);
  keyLight.position.set(10, 22, 14);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 55;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xffb3c6, 0.65);
  rimLight.position.set(-12, 14, -14);
  scene.add(rimLight);

  // Warm center wedding spotlight
  const podiumSpot = new THREE.PointLight(0xffd78a, 3.2, 16, 1.4);
  podiumSpot.position.set(0, 5.2, 0.5);
  scene.add(podiumSpot);

  const stageLight = new THREE.PointLight(0xffc978, 2.4, 22, 1.3);
  stageLight.position.set(0, 6.2, -13.5);
  scene.add(stageLight);

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  // --- BALLROOM FLOOR & PODIUM ---
  const floorTex = createCheckeredFloorTexture(maxAnisotropy);
  const floorBump = createFloorBumpTexture(maxAnisotropy);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: floorTex,
    bumpMap: floorBump,
    bumpScale: 0.025,
    roughness: 0.34,
    metalness: 0.05,
  });
  const danceFloor = new THREE.Mesh(new THREE.CircleGeometry(18.5, 64), floorMat);
  danceFloor.rotation.x = -Math.PI / 2;
  danceFloor.receiveShadow = true;
  scene.add(danceFloor);

  // Outer burgundy & gold floor curb ring
  const curbRing = new THREE.Mesh(
    new THREE.RingGeometry(18.3, 21.4, 64),
    new THREE.MeshStandardMaterial({
      color: 0x5d0e23,
      roughness: 0.55,
      metalness: 0.1,
    }),
  );
  curbRing.rotation.x = -Math.PI / 2;
  curbRing.position.y = 0.02;
  scene.add(curbRing);

  const goldFloorTrim = new THREE.Mesh(
    new THREE.TorusGeometry(18.35, 0.14, 10, 72),
    new THREE.MeshStandardMaterial({
      color: 0xf0bc42,
      roughness: 0.25,
      metalness: 0.85,
    }),
  );
  goldFloorTrim.rotation.x = Math.PI / 2;
  goldFloorTrim.position.y = 0.08;
  scene.add(goldFloorTrim);

  // Central Glowing Wedding Podium (warm rose-pink center so white bride gown pops cleanly)
  const podiumBase = new THREE.Mesh(
    new THREE.CylinderGeometry(3.25, 3.35, 0.12, 48),
    new THREE.MeshStandardMaterial({
      color: 0xf6c9d6,
      emissive: 0xe688a4,
      emissiveIntensity: 0.28,
      roughness: 0.28,
      metalness: 0.06,
    }),
  );
  podiumBase.position.y = 0.04;
  podiumBase.receiveShadow = true;
  scene.add(podiumBase);

  const podiumInnerGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.45, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffe2eb,
      transparent: true,
      opacity: 0.65,
    }),
  );
  podiumInnerGlow.rotation.x = -Math.PI / 2;
  podiumInnerGlow.position.y = 0.108;
  scene.add(podiumInnerGlow);

  const podiumGoldRim = new THREE.Mesh(
    new THREE.TorusGeometry(3.28, 0.09, 10, 56),
    new THREE.MeshStandardMaterial({
      color: 0xf7c948,
      roughness: 0.22,
      metalness: 0.85,
      emissive: 0x6b4500,
      emissiveIntensity: 0.35,
    }),
  );
  podiumGoldRim.rotation.x = Math.PI / 2;
  podiumGoldRim.position.y = 0.09;
  scene.add(podiumGoldRim);

  // --- BALLROOM WALLS, ARCHED WINDOWS & STAGE ---
  const wallTex = createWallTexture(maxAnisotropy);
  const wallCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(21.0, 21.0, 14.0, 32, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: wallTex,
      roughness: 0.65,
      side: THREE.BackSide,
    }),
  );
  wallCyl.position.y = 7.0;
  scene.add(wallCyl);

  // Gold pilasters + arched windows around perimeter (excluding back stage zone)
  const windowSkyTex = createWindowSkyTexture();
  const windowMat = new THREE.MeshBasicMaterial({ map: windowSkyTex });
  const goldFrameMat = new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    roughness: 0.3,
    metalness: 0.78,
  });

  const panelCount = 12;
  for (let i = 0; i < panelCount; i++) {
    const angle = (i / panelCount) * Math.PI * 2;
    const px = Math.sin(angle) * 20.6;
    const pz = Math.cos(angle) * 20.6;

    // Keep the southern camera sightline completely clear of foreground columns
    if (Math.cos(angle) > 0.72) {
      continue;
    }

    // Gold column pilaster
    const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.45, 13.8, 0.45), goldFrameMat);
    pilaster.position.set(px, 6.9, pz);
    pilaster.rotation.y = angle;
    scene.add(pilaster);

    // Tall arched windows framing both sides of the stage and ballroom perimeter
    const isDirectlyBehindStage = Math.cos(angle) < -0.92;
    if (!isDirectlyBehindStage && i % 2 === 1) {
      const winGroup = new THREE.Group();
      const winR = 20.45;
      winGroup.position.set(Math.sin(angle) * winR, 6.4, Math.cos(angle) * winR);
      winGroup.rotation.y = angle + Math.PI;

      const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.2), windowMat);
      const archTop = new THREE.Mesh(
        new THREE.CircleGeometry(1.3, 20, 0, Math.PI),
        windowMat,
      );
      archTop.position.y = 2.6;

      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.3, 0.16), goldFrameMat);
      frameL.position.x = -1.35;
      const frameR = frameL.clone();
      frameR.position.x = 1.35;
      const sill = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 0.28), goldFrameMat);
      sill.position.y = -2.65;

      winGroup.add(pane, archTop, frameL, frameR, sill);
      scene.add(winGroup);
    }
  }

  // --- GRAND STAGE & MARQUEE SIGN AT NORTH (z = -17.4) ---
  const stageGroup = new THREE.Group();
  stageGroup.position.set(0, 0, -17.2);
  scene.add(stageGroup);

  const stageDeck = new THREE.Mesh(
    new THREE.BoxGeometry(15.2, 1.35, 4.4),
    new THREE.MeshStandardMaterial({
      color: 0x520b1f,
      roughness: 0.55,
    }),
  );
  stageDeck.position.y = 0.675;
  stageDeck.receiveShadow = true;
  stageGroup.add(stageDeck);

  const stageTrim = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.16, 4.55), goldFrameMat);
  stageTrim.position.y = 1.36;
  stageGroup.add(stageTrim);

  // Stage steps
  const stageStep = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.6, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x6b122b, roughness: 0.5 }),
  );
  stageStep.position.set(0, 0.3, 2.55);
  stageGroup.add(stageStep);

  // Red velvet curtains left & right + top valance
  const curtainTex = createCurtainTexture(maxAnisotropy);
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: curtainTex,
    roughness: 0.78,
  });
  const curtainL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 8.6, 0.8), curtainMat);
  curtainL.position.set(-6.4, 5.6, 0.9);
  const curtainR = curtainL.clone();
  curtainR.position.set(6.4, 5.6, 0.9);
  const valance = new THREE.Mesh(new THREE.BoxGeometry(15.6, 1.6, 1.0), curtainMat);
  valance.position.set(0, 9.6, 1.0);
  stageGroup.add(curtainL, curtainR, valance);

  // Marquee sign: CASAMENTO DAS BARATAS
  const marqueeTex = createMarqueeSignTexture(maxAnisotropy);
  const marqueeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: marqueeTex,
    emissive: 0xffe4b5,
    emissiveMap: marqueeTex,
    emissiveIntensity: 0.48,
    roughness: 0.35,
  });
  const marqueeBoard = new THREE.Mesh(new THREE.BoxGeometry(9.4, 2.95, 0.32), marqueeMat);
  marqueeBoard.position.set(0, 6.7, 0.8);
  stageGroup.add(marqueeBoard);

  // Two Wedding Cakes flanking the stage
  const leftCake = createWeddingCake(!isSoftwareGl);
  leftCake.position.set(-9.4, 0, -13.5);
  const rightCake = createWeddingCake(!isSoftwareGl);
  rightCake.position.set(9.4, 0, -13.5);
  scene.add(leftCake, rightCake);

  // Overhead festive string light globes (InstancedMesh)
  const bulbGeo = new THREE.SphereGeometry(0.16, 10, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8 });
  const bulbCount = 36;
  const stringBulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, bulbCount);
  for (let i = 0; i < bulbCount; i++) {
    const a = (i / bulbCount) * Math.PI * 2;
    const rad = i % 2 === 0 ? 15.5 : 10.5;
    _dummy.position.set(
      Math.cos(a) * rad,
      10.2 + Math.sin(i * 0.8) * 0.45,
      Math.sin(a) * rad,
    );
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    stringBulbs.setMatrixAt(i, _dummy.matrix);
  }
  stringBulbs.computeBoundingSphere();
  scene.add(stringBulbs);

  // --- POOLED CONFETTI / CELEBRATION PARTICLES (InstancedMesh) ---
  const confettiGeo = new THREE.BoxGeometry(0.18, 0.04, 0.18);
  const confettiMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const confettiMesh = new THREE.InstancedMesh(confettiGeo, confettiMat, MAX_CONFETTI);
  confettiMesh.frustumCulled = false;
  const confettiColors = [
    new THREE.Color(0xffd54f),
    new THREE.Color(0xff4d88),
    new THREE.Color(0x38bdf8),
    new THREE.Color(0x34d399),
    new THREE.Color(0xf97316),
    new THREE.Color(0xffffff),
  ];
  for (let i = 0; i < MAX_CONFETTI; i++) {
    confettiMesh.setColorAt(i, confettiColors[i % confettiColors.length]);
    _dummy.position.set(0, -50, 0);
    _dummy.scale.setScalar(0);
    _dummy.updateMatrix();
    confettiMesh.setMatrixAt(i, _dummy.matrix);
  }
  if (confettiMesh.instanceColor) confettiMesh.instanceColor.needsUpdate = true;
  scene.add(confettiMesh);

  const particles: ParticleSlot[] = Array.from({ length: MAX_CONFETTI }, () => ({
    active: false,
    x: 0,
    y: -50,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rx: 0,
    ry: 0,
    life: 0,
    maxLife: 2,
    scale: 1,
  }));
  let particleCursor = 0;

  function triggerConfettiBurst(x: number, y: number, z: number, count = 24) {
    for (let i = 0; i < count; i++) {
      const slot = particles[particleCursor];
      particleCursor = (particleCursor + 1) % MAX_CONFETTI;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6 + Math.random() * 4.5;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.8;
      slot.y = y + Math.random() * 0.6;
      slot.z = z + (Math.random() - 0.5) * 0.8;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = 3.2 + Math.random() * 4.2;
      slot.vz = Math.sin(angle) * speed;
      slot.rx = Math.random() * Math.PI;
      slot.ry = Math.random() * Math.PI;
      slot.life = 0;
      slot.maxLife = 1.8 + Math.random() * 1.1;
      slot.scale = 0.8 + Math.random() * 0.9;
    }
  }

  // --- COCKROACH RIGS POOL ---
  const contactShadowTex = createContactShadowTexture();
  const rigMap = new Map<string, RoachRig>();

  function syncFromState(state: WeddingGameState) {
    const activeIds = new Set<string>();
    for (const r of state.roaches) {
      activeIds.add(r.id);
      if (!rigMap.has(r.id)) {
        const rig = createRoachRig(r, contactShadowTex, !isSoftwareGl);
        rigMap.set(r.id, rig);
        scene.add(rig.root);
      }
    }
    for (const [id, rig] of rigMap.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(rig.root);
        rigMap.delete(id);
      }
    }
  }

  // --- FLOATING BADGE DOM POOL (Zero 60Hz React Re-renders) ---
  overlayEl.innerHTML = '';
  const badgePool: FloatingBadgeRefs[] = [];
  for (let i = 0; i < MAX_BADGE_SLOTS; i++) {
    const container = document.createElement('div');
    container.className =
      'absolute top-0 left-0 pointer-events-none flex flex-col items-center will-change-transform';
    container.style.display = 'none';

    const speechBox = document.createElement('div');
    speechBox.className =
      'mb-1 px-2 py-0.5 rounded-full bg-white text-[#1a0b10] text-[10px] font-bold leading-tight whitespace-nowrap speech-bubble-shadow relative';
    speechBox.style.display = 'none';

    const avatarCircle = document.createElement('div');
    avatarCircle.className =
      'w-7 h-7 rounded-full border-2 border-[#f6c244] bg-[#2a121b] flex items-center justify-center shadow-md';

    const initialSpan = document.createElement('span');
    initialSpan.className = 'text-[11px] font-extrabold text-white leading-none';
    avatarCircle.appendChild(initialSpan);

    const barTrack = document.createElement('div');
    barTrack.className = 'mt-0.5 w-8 h-1 rounded-full bg-black/65 overflow-hidden border border-white/20';
    const barFill = document.createElement('div');
    barFill.className = 'h-full bg-[#f6c244] rounded-full';
    barTrack.appendChild(barFill);

    container.appendChild(speechBox);
    container.appendChild(avatarCircle);
    container.appendChild(barTrack);
    overlayEl.appendChild(container);

    badgePool.push({
      container,
      avatarCircle,
      initialSpan,
      barFill,
      speechBox,
    });
  }
  onBadgePoolReady?.();

  // Initial sync & warm-up compile
  const initialState = getState();
  syncFromState(initialState);
  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // --- CAMERA CHOREOGRAPHY ---
  function computeCameraTarget(mode: CameraMode, state: WeddingGameState, elapsed: number) {
    const groom = state.roaches.find((r) => r.id === state.groomId);
    const bride = state.roaches.find((r) => r.id === state.brideId);
    const featured =
      state.roaches.find((r) => r.id === state.featuredRoachId) ??
      state.roaches[2] ??
      groom;

    if (mode === 'panoramic') {
      const swayX = Math.sin(elapsed * 0.22) * 0.9;
      _camTargetPos.set(swayX, 19.6, 29.4);
      _camTargetLook.set(0, 1.4, -3.2);
    } else if (mode === 'wedding') {
      const cx = ((groom?.x ?? -0.5) + (bride?.x ?? 0.5)) * 0.5;
      const cz = ((groom?.z ?? 0.1) + (bride?.z ?? 0.1)) * 0.5;
      const orbitAngle = Math.sin(elapsed * 0.42) * 0.24;
      _camTargetPos.set(
        cx + Math.sin(orbitAngle) * 3.95,
        1.78,
        cz + Math.cos(orbitAngle) * 3.95,
      );
      _camTargetLook.set(cx, 0.96, cz);
    } else if (mode === 'front' && featured) {
      // Eye-level hero shot looking outward from center toward the featured guest so the crowd & ballroom fill the backdrop
      const fx = featured.x;
      const fz = featured.z;
      const distR = Math.hypot(fx, fz) || 1;
      const inwardX = -fx / distR;
      const inwardZ = -fz / distR;
      _camTargetPos.set(fx + inwardX * 2.4, 1.14, fz + inwardZ * 2.4);
      _camTargetLook.set(fx, 0.92, fz);
    } else if (featured) {
      // 'follow' camera tracking featured / controlled cockroach
      const fx = featured.x;
      const fz = featured.z;
      const sideX = Math.cos(elapsed * 0.35) * 1.1;
      _camTargetPos.set(fx + sideX, 2.5, fz + 3.45);
      _camTargetLook.set(fx, 0.9, fz);
    }
  }

  // --- RAYCASTING PICKER ---
  function pickRoachAtClientPos(clientX: number, clientY: number): string | null {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_pointerNdc, camera);
    _raycaster.layers.set(1);

    const targets: THREE.Object3D[] = [];
    for (const rig of rigMap.values()) {
      targets.push(rig.hitProxy);
    }
    const hits = _raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      return (hits[0].object.userData.roachId as string) || null;
    }
    return null;
  }

  // --- RESIZE OBSERVER ---
  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const w = Math.max(entry.contentRect.width, 200);
    const h = Math.max(entry.contentRect.height, 280);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(mountEl);

  // --- ANIMATION LOOP (With Software WebGL afterDraw pacing) ---
  let disposed = false;
  let frameId = 0;
  let lastTime = performance.now();
  let elapsed = 0;
  let lastSeenBurstCount = initialState.celebrationBurstCount;

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function updateFloatingBadges(state: WeddingGameState, viewW: number, viewH: number) {
    // Prioritize Groom, Bride, featured/controlled, speech bubbles, then closest guests
    const prioritized: Array<{ roach: RoachEntity; priority: number }> = [];
    for (const r of state.roaches) {
      let score = 0;
      if (r.role === 'groom' || r.role === 'bride') score += 1000;
      if (r.speechText) score += 500;
      if (r.id === state.featuredRoachId || r.id === state.controlledRoachId) score += 350;
      if (r.id === state.selectedRoachId) score += 450;
      const distCam = camera.position.distanceTo(
        rigMap.get(r.id)?.headAnchorWorld ?? _projVec.set(r.x, 1.5, r.z),
      );
      score -= distCam * 2;
      prioritized.push({ roach: r, priority: score });
    }
    prioritized.sort((a, b) => b.priority - a.priority);

    const showLimit = state.cameraMode === 'panoramic' ? 28 : 16;

    for (let slotIdx = 0; slotIdx < MAX_BADGE_SLOTS; slotIdx++) {
      const slot = badgePool[slotIdx];
      const item = prioritized[slotIdx];
      if (!item || slotIdx >= showLimit) {
        slot.container.style.display = 'none';
        continue;
      }

      const r = item.roach;
      const rig = rigMap.get(r.id);
      if (!rig) {
        slot.container.style.display = 'none';
        continue;
      }

      _projVec.copy(rig.headAnchorWorld);
      _projVec.y += r.role === 'groom' || r.role === 'bride' ? 0.58 : 0.42;
      _projVec.project(camera);

      // Guard behind-camera projections
      if (_projVec.z < -1 || _projVec.z > 1) {
        slot.container.style.display = 'none';
        continue;
      }

      const px = (_projVec.x * 0.5 + 0.5) * viewW;
      const py = (-_projVec.y * 0.5 + 0.5) * viewH;

      if (px < 18 || px > viewW - 18 || py < 58 || py > viewH - 42) {
        slot.container.style.display = 'none';
        continue;
      }

      slot.container.style.display = 'flex';
      const scale = state.cameraMode === 'panoramic' ? 0.8 : 0.96;
      slot.container.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale})`;

      slot.initialSpan.textContent = r.initial;
      if (r.role === 'groom') {
        slot.avatarCircle.style.borderColor = '#ffd54f';
        slot.avatarCircle.style.backgroundColor = '#1e1b24';
        slot.barFill.style.backgroundColor = '#ffd54f';
      } else if (r.role === 'bride') {
        slot.avatarCircle.style.borderColor = '#ffd54f';
        slot.avatarCircle.style.backgroundColor = '#9d174d';
        slot.barFill.style.backgroundColor = '#fb7185';
      } else if (r.id === state.controlledRoachId) {
        slot.avatarCircle.style.borderColor = '#38bdf8';
        slot.avatarCircle.style.backgroundColor = '#0c4a6e';
        slot.barFill.style.backgroundColor = '#38bdf8';
      } else {
        slot.avatarCircle.style.borderColor = '#d4a345';
        slot.avatarCircle.style.backgroundColor = '#3b1522';
        slot.barFill.style.backgroundColor = '#f6c244';
      }

      slot.barFill.style.width = `${Math.max(12, Math.min(100, r.affinity))}%`;

      if (r.speechText) {
        slot.speechBox.style.display = 'block';
        slot.speechBox.textContent = r.speechText;
      } else {
        slot.speechBox.style.display = 'none';
      }
    }
  }

  function tick() {
    if (disposed) return;

    const now = performance.now();
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    elapsed += dt;

    onStepFrame(dt, elapsed);

    const state = getState();
    syncFromState(state);

    // Check for new confetti triggers or active celebration phase
    if (state.celebrationBurstCount > lastSeenBurstCount) {
      lastSeenBurstCount = state.celebrationBurstCount;
      triggerConfettiBurst(0, 1.8, 0.2, 26);
    }
    if ((state.phase === 'celebracao' || state.phase === 'cerimonia') && Math.random() < dt * 2.5) {
      triggerConfettiBurst((Math.random() - 0.5) * 4, 2.5, (Math.random() - 0.5) * 3, 8);
    }

    // Animate all cockroach rigs
    for (const r of state.roaches) {
      const rig = rigMap.get(r.id);
      if (rig) {
        updateRoachRigAnimation(rig, r, elapsed, state.phase, dt);
      }
    }

    // Update pooled confetti particles
    let confettiDirty = false;
    for (let i = 0; i < MAX_CONFETTI; i++) {
      const p = particles[i];
      if (!p.active) continue;
      confettiDirty = true;
      p.life += dt;
      if (p.life >= p.maxLife || p.y < 0.04) {
        p.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        confettiMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy -= 7.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rx += 4.5 * dt;
      p.ry += 3.2 * dt;
      const fade = 1 - p.life / p.maxLife;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.rx, p.ry, 0);
      _dummy.scale.setScalar(p.scale * (0.4 + fade * 0.6));
      _dummy.updateMatrix();
      confettiMesh.setMatrixAt(i, _dummy.matrix);
    }
    if (confettiDirty) {
      confettiMesh.instanceMatrix.needsUpdate = true;
    }

    // Smooth cinematic camera damping
    computeCameraTarget(state.cameraMode, state, elapsed);
    const camLambda = 1 - Math.exp(-5.2 * dt);
    camera.position.lerp(_camTargetPos, camLambda);
    currentLookAt.lerp(_camTargetLook, camLambda);
    camera.lookAt(currentLookAt);

    // Subtle party spotlight warmth variation
    podiumSpot.intensity = 3.0 + Math.sin(elapsed * 2.8) * 0.35;

    const viewW = mountEl.clientWidth || width;
    const viewH = mountEl.clientHeight || height;
    updateFloatingBadges(state, viewW, viewH);

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  // Kick off loop
  if (isSoftwareGl) {
    afterDraw(tick);
  } else {
    frameId = requestAnimationFrame(tick);
  }

  return {
    syncFromState,
    triggerConfettiBurst,
    pickRoachAtClientPos,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === mountEl) {
        mountEl.removeChild(renderer.domElement);
      }
    },
  };
}

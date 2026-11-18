import * as THREE from 'three';
import type { RoachEntity } from '../game/types';
import { createStripedShirtTexture } from './textures';

export interface RoachRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftAnt: THREE.Group;
  rightAnt: THREE.Group;
  auraRing: THREE.Mesh;
  hitProxy: THREE.Mesh;
  // Outfit groups toggled when role changes (e.g. Guest -> Bride)
  groomGroup: THREE.Group;
  brideGroup: THREE.Group;
  guestOutfitGroup: THREE.Group;
  guestTorsoMesh: THREE.Mesh;
  guestSkirtMesh: THREE.Mesh;
  guestPantsMesh: THREE.Mesh;
  heartGlassesGroup: THREE.Group;
  partyHatGroup: THREE.Group;
  bowGroup: THREE.Group;
  eyelashesGroup: THREE.Group;
  // Role tracking for live promotion
  currentRole: RoachEntity['role'];
  headAnchorWorld: THREE.Vector3;
}

// Shared geometries (allocated once)
const sharedGeo = {
  shadowDisc: new THREE.CircleGeometry(0.55, 20),
  auraRing: new THREE.RingGeometry(0.5, 0.64, 32),
  torsoSphere: new THREE.SphereGeometry(0.28, 16, 14),
  carapaceWing: new THREE.SphereGeometry(0.24, 14, 12),
  headSphere: new THREE.SphereGeometry(0.32, 20, 16),
  eyeSclera: new THREE.SphereGeometry(0.115, 14, 12),
  eyeIris: new THREE.SphereGeometry(0.072, 12, 10),
  eyePupil: new THREE.SphereGeometry(0.042, 10, 8),
  eyeHighlight: new THREE.SphereGeometry(0.018, 8, 8),
  cheekBlush: new THREE.SphereGeometry(0.055, 10, 8),
  mouthInterior: new THREE.SphereGeometry(0.11, 12, 10),
  buckTooth: new THREE.BoxGeometry(0.046, 0.052, 0.025),
  brow: new THREE.BoxGeometry(0.13, 0.026, 0.03),
  eyelash: new THREE.BoxGeometry(0.036, 0.014, 0.02),
  antennaSeg: new THREE.CylinderGeometry(0.014, 0.018, 0.42, 8),
  antennaTip: new THREE.SphereGeometry(0.032, 10, 8),
  armLimb: new THREE.CylinderGeometry(0.042, 0.038, 0.34, 8),
  glove: new THREE.SphereGeometry(0.072, 10, 8),
  legLimb: new THREE.CylinderGeometry(0.048, 0.042, 0.25, 8),
  shoe: new THREE.SphereGeometry(0.085, 10, 8),
  // Groom parts
  tuxChest: new THREE.CylinderGeometry(0.25, 0.27, 0.48, 16),
  tuxVFront: new THREE.ConeGeometry(0.13, 0.24, 4),
  bowTieWing: new THREE.ConeGeometry(0.055, 0.09, 4),
  topHatBrim: new THREE.CylinderGeometry(0.34, 0.34, 0.03, 18),
  topHatCrown: new THREE.CylinderGeometry(0.21, 0.23, 0.32, 18),
  topHatBand: new THREE.CylinderGeometry(0.222, 0.226, 0.06, 18),
  wandRod: new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8),
  wandStar: new THREE.OctahedronGeometry(0.075, 0),
  // Bride parts
  gownSkirt: new THREE.CylinderGeometry(0.2, 0.56, 0.68, 22, 1, false),
  gownBodice: new THREE.CylinderGeometry(0.21, 0.2, 0.32, 16),
  veilMesh: new THREE.ConeGeometry(0.42, 0.85, 18, 1, true),
  bouquetCone: new THREE.ConeGeometry(0.12, 0.18, 10),
  flowerBlob: new THREE.SphereGeometry(0.055, 8, 8),
  // Guest parts
  guestSkirt: new THREE.CylinderGeometry(0.22, 0.44, 0.44, 18),
  guestShorts: new THREE.CylinderGeometry(0.24, 0.26, 0.2, 14),
  suspenderStrap: new THREE.BoxGeometry(0.045, 0.36, 0.04),
  glassesRim: (() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.08);
    s.bezierCurveTo(0.08, -0.02, 0.13, 0.05, 0.09, 0.11);
    s.bezierCurveTo(0.05, 0.15, 0.01, 0.11, 0, 0.07);
    s.bezierCurveTo(-0.01, 0.11, -0.05, 0.15, -0.09, 0.11);
    s.bezierCurveTo(-0.13, 0.05, -0.08, -0.02, 0, -0.08);
    const hole = new THREE.Path();
    hole.moveTo(0, -0.045);
    hole.bezierCurveTo(0.05, -0.01, 0.085, 0.04, 0.06, 0.08);
    hole.bezierCurveTo(0.035, 0.105, 0.01, 0.08, 0, 0.05);
    hole.bezierCurveTo(-0.01, 0.08, -0.035, 0.105, -0.06, 0.08);
    hole.bezierCurveTo(-0.085, 0.04, -0.05, -0.01, 0, -0.045);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    });
    g.center();
    return g;
  })(),
  glassesBridge: new THREE.BoxGeometry(0.08, 0.02, 0.02),
  partyCone: new THREE.ConeGeometry(0.14, 0.34, 14),
  partyPom: new THREE.SphereGeometry(0.048, 10, 8),
  bowCenter: new THREE.SphereGeometry(0.04, 8, 8),
  hitProxy: new THREE.CylinderGeometry(0.55, 0.55, 1.55, 8),
};

// Shared materials
const sharedMat = {
  chitinHead: new THREE.MeshStandardMaterial({
    color: 0x6f3c1e,
    roughness: 0.28,
    metalness: 0.08,
  }),
  chitinShell: new THREE.MeshStandardMaterial({
    color: 0x4e2511,
    roughness: 0.32,
    metalness: 0.1,
  }),
  limbBrown: new THREE.MeshStandardMaterial({
    color: 0x8d522c,
    roughness: 0.42,
    metalness: 0.04,
  }),
  scleraWhite: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.16,
    metalness: 0.02,
  }),
  pupilBlack: new THREE.MeshStandardMaterial({
    color: 0x111116,
    roughness: 0.15,
    metalness: 0.05,
  }),
  blushPink: new THREE.MeshStandardMaterial({
    color: 0xf47292,
    roughness: 0.65,
    metalness: 0,
  }),
  mouthDark: new THREE.MeshStandardMaterial({
    color: 0x7a1730,
    roughness: 0.55,
  }),
  toothWhite: new THREE.MeshStandardMaterial({
    color: 0xfffdf7,
    roughness: 0.2,
  }),
  gloveWhite: new THREE.MeshStandardMaterial({
    color: 0xfcfcfc,
    roughness: 0.45,
  }),
  shoeDark: new THREE.MeshStandardMaterial({
    color: 0x26140d,
    roughness: 0.4,
  }),
  tuxBlack: new THREE.MeshStandardMaterial({
    color: 0x17171c,
    roughness: 0.52,
    metalness: 0.12,
  }),
  goldAccent: new THREE.MeshStandardMaterial({
    color: 0xf6c244,
    roughness: 0.22,
    metalness: 0.82,
    emissive: 0x4a2f00,
    emissiveIntensity: 0.35,
  }),
  brideWhite: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.32,
    metalness: 0.06,
    emissive: 0xffe8cc,
    emissiveIntensity: 0.22,
  }),
  veilTranslucent: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  }),
  auraGold: new THREE.MeshBasicMaterial({
    color: 0xffd54f,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
  }),
  auraHidden: new THREE.MeshBasicMaterial({
    color: 0xff80ab,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
  }),
  glassesPink: new THREE.MeshStandardMaterial({
    color: 0xf43f75,
    roughness: 0.25,
    metalness: 0.15,
  }),
  suspenderOrange: new THREE.MeshStandardMaterial({
    color: 0xe68432,
    roughness: 0.6,
  }),
  roseRed: new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.45,
  }),
  leafGreen: new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.55,
  }),
  hitProxyMat: new THREE.MeshBasicMaterial({
    visible: false,
  }),
};

const irisMatCache = new Map<string, THREE.MeshStandardMaterial>();
function getIrisMat(hex: string): THREE.MeshStandardMaterial {
  let mat = irisMatCache.get(hex);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex),
      roughness: 0.2,
      metalness: 0.05,
    });
    irisMatCache.set(hex, mat);
  }
  return mat;
}

const outfitMatCache = new Map<string, THREE.MeshStandardMaterial>();
function getOutfitMat(hex: string, secondary?: string, striped = false): THREE.MeshStandardMaterial {
  const key = `${hex}|${secondary ?? ''}|${striped}`;
  let mat = outfitMatCache.get(key);
  if (!mat) {
    if (striped && secondary) {
      const tex = createStripedShirtTexture(hex, secondary);
      mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: tex,
        roughness: 0.65,
        metalness: 0.02,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        roughness: 0.58,
        metalness: 0.04,
      });
    }
    outfitMatCache.set(key, mat);
  }
  return mat;
}

export function createRoachRig(
  entity: RoachEntity,
  shadowTexture: THREE.CanvasTexture,
  castShadow: boolean,
): RoachRig {
  const root = new THREE.Group();
  root.userData.roachId = entity.id;

  // Ground contact shadow disc (zero floating!)
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
  });
  const shadowDisc = new THREE.Mesh(sharedGeo.shadowDisc, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  // Golden/Highlight Aura Ring at feet
  const auraRing = new THREE.Mesh(
    sharedGeo.auraRing,
    entity.role === 'groom' || entity.role === 'bride'
      ? sharedMat.auraGold.clone()
      : sharedMat.auraHidden.clone(),
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.022;
  root.add(auraRing);

  // Raycast hit proxy (layer 1 for fast raycasting)
  const hitProxy = new THREE.Mesh(sharedGeo.hitProxy, sharedMat.hitProxyMat);
  hitProxy.position.y = 0.78;
  hitProxy.layers.set(1);
  hitProxy.userData.roachId = entity.id;
  root.add(hitProxy);

  // Body pivot centered at hip height (legs sit below y = 0.30 -> 0)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.3;
  root.add(bodyPivot);

  // Legs
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.13, 0, 0);
  const leftLegMesh = new THREE.Mesh(sharedGeo.legLimb, sharedMat.limbBrown);
  leftLegMesh.position.y = -0.12;
  const leftShoe = new THREE.Mesh(sharedGeo.shoe, sharedMat.shoeDark);
  leftShoe.scale.set(0.9, 0.65, 1.35);
  leftShoe.position.set(0, -0.25, 0.04);
  leftLeg.add(leftLegMesh, leftShoe);
  bodyPivot.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.13, 0, 0);
  const rightLegMesh = new THREE.Mesh(sharedGeo.legLimb, sharedMat.limbBrown);
  rightLegMesh.position.y = -0.12;
  const rightShoe = new THREE.Mesh(sharedGeo.shoe, sharedMat.shoeDark);
  rightShoe.scale.set(0.9, 0.65, 1.35);
  rightShoe.position.set(0, -0.25, 0.04);
  rightLeg.add(rightLegMesh, rightShoe);
  bodyPivot.add(rightLeg);

  // Back carapace wings (classic cockroach silhouette from behind)
  const leftWing = new THREE.Mesh(sharedGeo.carapaceWing, sharedMat.chitinShell);
  leftWing.scale.set(0.7, 1.35, 0.55);
  leftWing.position.set(-0.08, 0.25, -0.2);
  leftWing.rotation.z = 0.08;
  const rightWing = new THREE.Mesh(sharedGeo.carapaceWing, sharedMat.chitinShell);
  rightWing.scale.set(0.7, 1.35, 0.55);
  rightWing.position.set(0.08, 0.25, -0.2);
  rightWing.rotation.z = -0.08;
  bodyPivot.add(leftWing, rightWing);

  // Arms + White Gloves
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.27, 0.38, 0.02);
  const lArmMesh = new THREE.Mesh(sharedGeo.armLimb, sharedMat.limbBrown);
  lArmMesh.position.set(-0.08, -0.12, 0.04);
  lArmMesh.rotation.z = -0.4;
  const lGlove = new THREE.Mesh(sharedGeo.glove, sharedMat.gloveWhite);
  lGlove.position.set(-0.15, -0.26, 0.08);
  leftArm.add(lArmMesh, lGlove);
  bodyPivot.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.27, 0.38, 0.02);
  const rArmMesh = new THREE.Mesh(sharedGeo.armLimb, sharedMat.limbBrown);
  rArmMesh.position.set(0.08, -0.12, 0.04);
  rArmMesh.rotation.z = 0.4;
  const rGlove = new THREE.Mesh(sharedGeo.glove, sharedMat.gloveWhite);
  rGlove.position.set(0.15, -0.26, 0.08);
  rightArm.add(rArmMesh, rGlove);
  bodyPivot.add(rightArm);

  // --- OUTFIT 1: GROOM TUXEDO ---
  const groomGroup = new THREE.Group();
  const tuxChest = new THREE.Mesh(sharedGeo.tuxChest, sharedMat.tuxBlack);
  tuxChest.position.y = 0.24;
  tuxChest.castShadow = castShadow;
  const tuxShirt = new THREE.Mesh(sharedGeo.tuxVFront, sharedMat.gloveWhite);
  tuxShirt.rotation.x = Math.PI;
  tuxShirt.rotation.y = Math.PI / 4;
  tuxShirt.position.set(0, 0.34, 0.22);
  const bowL = new THREE.Mesh(sharedGeo.bowTieWing, sharedMat.tuxBlack);
  bowL.rotation.z = -Math.PI / 2;
  bowL.position.set(-0.05, 0.44, 0.26);
  const bowR = new THREE.Mesh(sharedGeo.bowTieWing, sharedMat.tuxBlack);
  bowR.rotation.z = Math.PI / 2;
  bowR.position.set(0.05, 0.44, 0.26);
  const lapelRose = new THREE.Mesh(sharedGeo.flowerBlob, sharedMat.roseRed);
  lapelRose.scale.set(0.7, 0.7, 0.7);
  lapelRose.position.set(0.13, 0.34, 0.24);
  const btn1 = new THREE.Mesh(sharedGeo.eyeHighlight, sharedMat.goldAccent);
  btn1.scale.set(1.5, 1.5, 1.5);
  btn1.position.set(0, 0.26, 0.27);
  const btn2 = btn1.clone();
  btn2.position.set(0, 0.16, 0.27);
  // Golden wand in right hand
  const wand = new THREE.Group();
  wand.position.set(0.15, -0.24, 0.14);
  const wandRod = new THREE.Mesh(sharedGeo.wandRod, sharedMat.goldAccent);
  wandRod.position.y = 0.16;
  const wandStar = new THREE.Mesh(sharedGeo.wandStar, sharedMat.goldAccent);
  wandStar.position.y = 0.36;
  wand.add(wandRod, wandStar);
  rightArm.add(wand);
  groomGroup.add(tuxChest, tuxShirt, bowL, bowR, lapelRose, btn1, btn2);
  bodyPivot.add(groomGroup);

  // --- OUTFIT 2: BRIDE WEDDING GOWN ---
  const brideGroup = new THREE.Group();
  const gownSkirt = new THREE.Mesh(sharedGeo.gownSkirt, sharedMat.brideWhite);
  gownSkirt.position.y = 0.08;
  gownSkirt.castShadow = castShadow;
  const gownBodice = new THREE.Mesh(sharedGeo.gownBodice, sharedMat.brideWhite);
  gownBodice.position.y = 0.38;
  const goldBelt = new THREE.Mesh(sharedGeo.topHatBand, sharedMat.goldAccent);
  goldBelt.scale.set(0.95, 0.7, 0.95);
  goldBelt.position.y = 0.32;
  // Bouquet in right hand
  const bouquet = new THREE.Group();
  bouquet.position.set(0.15, -0.2, 0.16);
  bouquet.rotation.x = 0.45;
  const bCone = new THREE.Mesh(sharedGeo.bouquetCone, sharedMat.leafGreen);
  const bFlower1 = new THREE.Mesh(sharedGeo.flowerBlob, sharedMat.roseRed);
  bFlower1.position.set(0, 0.11, 0.03);
  const bFlower2 = new THREE.Mesh(sharedGeo.flowerBlob, sharedMat.goldAccent);
  bFlower2.position.set(-0.06, 0.09, -0.02);
  const bFlower3 = new THREE.Mesh(sharedGeo.flowerBlob, sharedMat.glassesPink);
  bFlower3.position.set(0.06, 0.09, -0.02);
  bouquet.add(bCone, bFlower1, bFlower2, bFlower3);
  rightArm.add(bouquet);
  brideGroup.add(gownSkirt, gownBodice, goldBelt);
  bodyPivot.add(brideGroup);

  // --- OUTFIT 3: GUEST CLOTHES ---
  const guestOutfitGroup = new THREE.Group();
  const isMaleGuest = entity.role === 'guest_m';
  const torsoMat = getOutfitMat(entity.outfitColor, entity.secondaryColor, isMaleGuest);
  const guestTorsoMesh = new THREE.Mesh(sharedGeo.torsoSphere, torsoMat);
  guestTorsoMesh.scale.set(0.96, 1.15, 0.88);
  guestTorsoMesh.position.y = 0.27;
  guestTorsoMesh.castShadow = castShadow;
  guestOutfitGroup.add(guestTorsoMesh);

  const skirtMat = getOutfitMat(entity.outfitColor);
  const guestSkirtMesh = new THREE.Mesh(sharedGeo.guestSkirt, skirtMat);
  guestSkirtMesh.position.y = 0.06;
  guestOutfitGroup.add(guestSkirtMesh);

  const pantsMat = getOutfitMat(entity.secondaryColor);
  const guestPantsMesh = new THREE.Mesh(sharedGeo.guestShorts, pantsMat);
  guestPantsMesh.position.y = 0.06;
  const strapL = new THREE.Mesh(sharedGeo.suspenderStrap, sharedMat.suspenderOrange);
  strapL.position.set(-0.11, 0.25, 0.22);
  const strapR = strapL.clone();
  strapR.position.set(0.11, 0.25, 0.22);
  guestPantsMesh.add(strapL, strapR);
  guestOutfitGroup.add(guestPantsMesh);

  bodyPivot.add(guestOutfitGroup);

  // --- HEAD & EXPRESSIVE FACE ---
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.62;
  bodyPivot.add(headPivot);

  const headMesh = new THREE.Mesh(sharedGeo.headSphere, sharedMat.chitinHead);
  headMesh.scale.set(1.06, 0.96, 0.98);
  headMesh.position.y = 0.22;
  headMesh.castShadow = castShadow;
  headPivot.add(headMesh);

  // Big cartoon eyes
  const irisMat = getIrisMat(entity.irisColor);
  const makeEye = (side: -1 | 1) => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.125, 0.27, 0.255);

    const sclera = new THREE.Mesh(sharedGeo.eyeSclera, sharedMat.scleraWhite);
    sclera.scale.set(0.92, 1.15, 0.68);
    const iris = new THREE.Mesh(sharedGeo.eyeIris, irisMat);
    iris.scale.set(0.95, 1.1, 0.6);
    iris.position.set(-side * 0.01, 0, 0.048);
    const pupil = new THREE.Mesh(sharedGeo.eyePupil, sharedMat.pupilBlack);
    pupil.scale.set(0.95, 1.08, 0.6);
    pupil.position.set(-side * 0.01, 0, 0.072);
    const glint = new THREE.Mesh(sharedGeo.eyeHighlight, sharedMat.scleraWhite);
    glint.position.set(0.025, 0.032, 0.095);

    const brow = new THREE.Mesh(sharedGeo.brow, sharedMat.shoeDark);
    brow.position.set(0, 0.145, 0.03);
    brow.rotation.z = side * -0.18;

    eyeGroup.add(sclera, iris, pupil, glint, brow);
    return eyeGroup;
  };
  headPivot.add(makeEye(-1), makeEye(1));

  // Eyelashes for female roaches / bride
  const eyelashesGroup = new THREE.Group();
  for (const side of [-1, 1] as const) {
    for (let k = 0; k < 2; k++) {
      const lash = new THREE.Mesh(sharedGeo.eyelash, sharedMat.pupilBlack);
      lash.position.set(side * (0.21 + k * 0.018), 0.34 - k * 0.025, 0.29);
      lash.rotation.z = side * (0.35 - k * 0.2);
      eyelashesGroup.add(lash);
    }
  }
  headPivot.add(eyelashesGroup);

  // Rosy blush cheeks
  const cheekL = new THREE.Mesh(sharedGeo.cheekBlush, sharedMat.blushPink);
  cheekL.scale.set(1.2, 0.8, 0.45);
  cheekL.position.set(-0.22, 0.16, 0.24);
  const cheekR = cheekL.clone();
  cheekR.position.set(0.22, 0.16, 0.24);
  headPivot.add(cheekL, cheekR);

  // Wide smiling mouth + two cute white buck teeth!
  const mouth = new THREE.Mesh(sharedGeo.mouthInterior, sharedMat.mouthDark);
  mouth.scale.set(1.15, 0.52, 0.5);
  mouth.position.set(0, 0.09, 0.285);
  const toothL = new THREE.Mesh(sharedGeo.buckTooth, sharedMat.toothWhite);
  toothL.position.set(-0.028, 0.112, 0.335);
  const toothR = toothL.clone();
  toothR.position.set(0.028, 0.112, 0.335);
  headPivot.add(mouth, toothL, toothR);

  // Antennae
  const makeAntenna = (side: -1 | 1) => {
    const ant = new THREE.Group();
    ant.position.set(side * 0.11, 0.49, 0.06);
    ant.rotation.z = side * -0.28;
    ant.rotation.x = 0.22;
    const stem = new THREE.Mesh(sharedGeo.antennaSeg, sharedMat.chitinShell);
    stem.position.y = 0.21;
    const tip = new THREE.Mesh(sharedGeo.antennaTip, sharedMat.chitinHead);
    tip.position.y = 0.43;
    ant.add(stem, tip);
    return ant;
  };
  const leftAnt = makeAntenna(-1);
  const rightAnt = makeAntenna(1);
  headPivot.add(leftAnt, rightAnt);

  // Head Accessories:
  // 1) Groom Top Hat
  const topHat = new THREE.Group();
  topHat.position.set(0, 0.51, -0.02);
  const brim = new THREE.Mesh(sharedGeo.topHatBrim, sharedMat.tuxBlack);
  const crown = new THREE.Mesh(sharedGeo.topHatCrown, sharedMat.tuxBlack);
  crown.position.y = 0.16;
  const hatBand = new THREE.Mesh(sharedGeo.topHatBand, sharedMat.goldAccent);
  hatBand.position.y = 0.05;
  topHat.add(brim, crown, hatBand);
  groomGroup.userData.topHat = topHat;
  headPivot.add(topHat);

  // 2) Bride Bridal Veil
  const veilGroup = new THREE.Group();
  veilGroup.position.set(0, 0.46, -0.14);
  const veilCone = new THREE.Mesh(sharedGeo.veilMesh, sharedMat.veilTranslucent);
  veilCone.position.set(0, -0.34, -0.12);
  veilCone.rotation.x = -0.38;
  const tiara = new THREE.Mesh(sharedGeo.topHatBand, sharedMat.goldAccent);
  tiara.scale.set(0.9, 0.65, 0.9);
  tiara.position.set(0, 0.04, 0.12);
  veilGroup.add(veilCone, tiara);
  brideGroup.userData.veilGroup = veilGroup;
  headPivot.add(veilGroup);

  // 3) Guest Heart Glasses
  const heartGlassesGroup = new THREE.Group();
  heartGlassesGroup.position.set(0, 0.27, 0.32);
  const gLeft = new THREE.Mesh(sharedGeo.glassesRim, sharedMat.glassesPink);
  gLeft.position.x = -0.125;
  const gRight = new THREE.Mesh(sharedGeo.glassesRim, sharedMat.glassesPink);
  gRight.position.x = 0.125;
  const gBridge = new THREE.Mesh(sharedGeo.glassesBridge, sharedMat.glassesPink);
  heartGlassesGroup.add(gLeft, gRight, gBridge);
  headPivot.add(heartGlassesGroup);

  // 4) Guest Party Cone Hat
  const partyHatGroup = new THREE.Group();
  partyHatGroup.position.set(0, 0.51, -0.02);
  const coneMat = getOutfitMat(entity.secondaryColor, entity.outfitColor, true);
  const cone = new THREE.Mesh(sharedGeo.partyCone, coneMat);
  cone.position.y = 0.16;
  const pom = new THREE.Mesh(sharedGeo.partyPom, sharedMat.glassesPink);
  pom.position.y = 0.34;
  partyHatGroup.add(cone, pom);
  headPivot.add(partyHatGroup);

  // 5) Female Guest Bow
  const bowGroup = new THREE.Group();
  bowGroup.position.set(0.16, 0.48, 0.06);
  bowGroup.rotation.z = -0.35;
  const bMat = getOutfitMat(entity.secondaryColor);
  const bWingL = new THREE.Mesh(sharedGeo.bowTieWing, bMat);
  bWingL.rotation.z = -Math.PI / 2;
  bWingL.position.x = -0.05;
  const bWingR = new THREE.Mesh(sharedGeo.bowTieWing, bMat);
  bWingR.rotation.z = Math.PI / 2;
  bWingR.position.x = 0.05;
  const bCenter = new THREE.Mesh(sharedGeo.bowCenter, bMat);
  bowGroup.add(bWingL, bWingR, bCenter);
  headPivot.add(bowGroup);

  const rig: RoachRig = {
    root,
    bodyPivot,
    headPivot,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftAnt,
    rightAnt,
    auraRing,
    hitProxy,
    groomGroup,
    brideGroup,
    guestOutfitGroup,
    guestTorsoMesh,
    guestSkirtMesh,
    guestPantsMesh,
    heartGlassesGroup,
    partyHatGroup,
    bowGroup,
    eyelashesGroup,
    currentRole: entity.role,
    headAnchorWorld: new THREE.Vector3(),
  };

  syncRoachRigAppearance(rig, entity);
  return rig;
}

export function syncRoachRigAppearance(rig: RoachRig, entity: RoachEntity): void {
  rig.currentRole = entity.role;
  const isGroom = entity.role === 'groom';
  const isBride = entity.role === 'bride';
  const isGuest = !isGroom && !isBride;

  rig.groomGroup.visible = isGroom;
  (rig.groomGroup.userData.topHat as THREE.Object3D).visible = isGroom;

  rig.brideGroup.visible = isBride;
  (rig.brideGroup.userData.veilGroup as THREE.Object3D).visible = isBride;

  // Toggle wand / bouquet inside arms
  const rightArmKids = rig.rightArm.children;
  if (rightArmKids[2]) rightArmKids[2].visible = isGroom; // wand
  if (rightArmKids[3]) rightArmKids[3].visible = isBride; // bouquet

  rig.guestOutfitGroup.visible = isGuest;
  if (isGuest) {
    const isFemale = entity.role === 'guest_f';
    rig.guestSkirtMesh.visible = isFemale;
    rig.guestPantsMesh.visible = !isFemale;
    rig.guestTorsoMesh.material = getOutfitMat(
      entity.outfitColor,
      entity.secondaryColor,
      !isFemale,
    );
    rig.guestSkirtMesh.material = getOutfitMat(entity.outfitColor);
  }

  rig.eyelashesGroup.visible = isBride || entity.role === 'guest_f';
  rig.heartGlassesGroup.visible = isGuest && entity.accessory === 'heart_glasses';
  rig.partyHatGroup.visible = isGuest && entity.accessory === 'party_hat';
  rig.bowGroup.visible = isGuest && entity.accessory === 'bow';

  const auraMat = rig.auraRing.material as THREE.MeshBasicMaterial;
  if (isGroom || isBride) {
    auraMat.color.setHex(0xffd54f);
    auraMat.opacity = 0.9;
  } else if (entity.isPlayerControlled) {
    auraMat.color.setHex(0x38bdf8);
    auraMat.opacity = 0.75;
  } else {
    auraMat.opacity = 0;
  }

  rig.root.scale.setScalar(entity.scaleFactor);
}

export function updateRoachRigAnimation(
  rig: RoachRig,
  entity: RoachEntity,
  elapsed: number,
  phase: string,
  dt: number,
): void {
  if (rig.currentRole !== entity.role) {
    syncRoachRigAppearance(rig, entity);
  }

  // Smooth world position & heading interpolation
  rig.root.position.set(entity.x, 0, entity.z);

  // Shortest-angle heading damping
  const diff = Math.atan2(
    Math.sin(entity.heading - rig.root.rotation.y),
    Math.cos(entity.heading - rig.root.rotation.y),
  );
  rig.root.rotation.y += diff * Math.min(1, dt * 10);

  const t = elapsed * 6.5 + entity.animTimer * 2.1;

  // Reset base transforms smoothly
  let bobY = 0;
  let bodyTiltX = 0;
  let bodyTiltZ = 0;
  let headBobZ = 0;
  let headYaw = 0;
  let armLRotX = 0;
  let armLRotZ = 0;
  let armRRotX = 0;
  let armRRotZ = 0;
  let legLRotX = 0;
  let legRRotX = 0;

  switch (entity.animState) {
    case 'walk': {
      bobY = Math.abs(Math.sin(t * 1.4)) * 0.05;
      bodyTiltX = 0.08;
      legLRotX = Math.sin(t * 1.4) * 0.55;
      legRRotX = -Math.sin(t * 1.4) * 0.55;
      armLRotX = -legLRotX * 0.7;
      armRRotX = -legRRotX * 0.7;
      break;
    }
    case 'run': {
      bobY = Math.abs(Math.sin(t * 2.2)) * 0.09;
      bodyTiltX = 0.18;
      legLRotX = Math.sin(t * 2.2) * 0.85;
      legRRotX = -Math.sin(t * 2.2) * 0.85;
      armLRotX = -legLRotX * 0.85;
      armRRotX = -legRRotX * 0.85;
      break;
    }
    case 'dance': {
      bobY = Math.abs(Math.sin(t * 1.25)) * 0.075;
      bodyTiltZ = Math.sin(t * 0.62) * 0.14;
      headBobZ = -bodyTiltZ * 0.7;
      headYaw = Math.sin(t * 0.62) * 0.18;
      armLRotZ = 0.45 + Math.sin(t * 1.25) * 0.45;
      armRRotZ = -0.45 - Math.cos(t * 1.25) * 0.45;
      armLRotX = -0.35 + Math.sin(t * 1.25) * 0.25;
      armRRotX = -0.35 + Math.cos(t * 1.25) * 0.25;
      legLRotX = Math.sin(t * 1.25) * 0.25;
      legRRotX = -Math.sin(t * 1.25) * 0.25;
      break;
    }
    case 'celebrate': {
      bobY = Math.abs(Math.sin(t * 1.7)) * 0.22;
      bodyTiltZ = Math.sin(t * 1.1) * 0.1;
      armLRotZ = 1.65 + Math.sin(t * 2.0) * 0.3;
      armRRotZ = -1.65 - Math.sin(t * 2.0) * 0.3;
      legLRotX = Math.sin(t * 1.7) * 0.3;
      legRRotX = -Math.sin(t * 1.7) * 0.3;
      break;
    }
    case 'interact': {
      // Couple holding hands or guests greeting each other!
      bobY = Math.abs(Math.sin(t * 0.9)) * 0.04;
      bodyTiltX = phase === 'cerimonia' ? 0.12 : 0.06;
      armLRotX = -0.85;
      armRRotX = -0.85;
      armLRotZ = 0.25;
      armRRotZ = -0.25;
      headYaw = Math.sin(t * 0.8) * 0.12;
      break;
    }
    case 'react': {
      bobY = Math.abs(Math.sin(t * 1.8)) * 0.12;
      headBobZ = Math.sin(t * 2.2) * 0.18;
      armLRotZ = 0.95;
      armRRotZ = -0.95;
      break;
    }
    case 'idle':
    default: {
      bobY = Math.sin(t * 0.7) * 0.025 + 0.025;
      bodyTiltZ = Math.sin(t * 0.45) * 0.04;
      armLRotZ = 0.15 + Math.sin(t * 0.7) * 0.08;
      armRRotZ = -0.15 - Math.sin(t * 0.7) * 0.08;
      break;
    }
  }

  rig.bodyPivot.position.y = 0.3 + bobY;
  rig.bodyPivot.rotation.x = bodyTiltX;
  rig.bodyPivot.rotation.z = bodyTiltZ;

  rig.headPivot.rotation.z = headBobZ;
  rig.headPivot.rotation.y = headYaw;

  rig.leftArm.rotation.x = armLRotX;
  rig.leftArm.rotation.z = armLRotZ;
  rig.rightArm.rotation.x = armRRotX;
  rig.rightArm.rotation.z = armRRotZ;

  rig.leftLeg.rotation.x = legLRotX;
  rig.rightLeg.rotation.x = legRRotX;

  // Expressive antenna bounce
  rig.leftAnt.rotation.x = 0.22 + Math.sin(t * 1.5) * 0.16;
  rig.rightAnt.rotation.x = 0.22 + Math.cos(t * 1.5) * 0.16;

  // Update world-space head anchor for floating avatar & speech bubble projection
  rig.headAnchorWorld.set(entity.x, (1.58 + bobY) * entity.scaleFactor, entity.z);
}

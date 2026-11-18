import type {
  BrideAnnouncement,
  CameraMode,
  LiveEventInput,
  LiveEventRecord,
  PlayerMoveInput,
  ProximityInteraction,
  RoachAccessory,
  RoachEntity,
  WeddingGameState,
  WeddingPhase,
} from './types';

export const ARENA_RADIUS = 16.4;
export const PODIUM_RADIUS = 3.25;
export const ROACH_RADIUS = 0.56;
export const PROXIMITY_RADIUS = 1.48;

const SAMPLE_HANDLES = [
  '@aninhaj007',
  '@cardzzo',
  '@annyfernanda41',
  '@docindemorango',
  '@eu_sant0ss',
  '@elk_eajuju7',
  '@pedro_arrocha',
  '@marina_vip',
  '@lucas_baile',
  '@babi_dourada',
  '@thales_show',
  '@rafa_festa',
  '@gabi_noiva',
  '@caio_barata',
  '@lulu_brilho',
  '@jhon_swing',
  '@karol_amor',
  '@vitor_pista',
  '@mel_dancarina',
  '@dudu_palco',
  '@sofia_laura',
  '@mateus_brega',
  '@clara_rosa',
  '@bruno_gala',
  '@nina_festeira',
  '@igor_passinho',
  '@tati_glamour',
  '@felipe_ritmo',
  '@yasmin_luz',
  '@gu_estrela',
  '@ester_doce',
  '@leo_charme',
  '@julia_piseiro',
  '@enzo_realeza',
  '@camila_viva',
  '@andre_forro',
  '@bia_buque',
  '@thiago_ouro',
  '@amanda_cor',
  '@rodrigo_som',
  '@leticia_sol',
  '@diogo_balada',
  '@fernanda_lux',
  '@kauan_dance',
  '@priscila_mix',
  '@murilo_top',
  '@larissa_joy',
  '@otavio_play',
  '@isabela_art',
  '@renan_groove',
  '@helena_pop',
  '@samuka_flash',
  '@alice_beijo',
  '@daniel_valsa',
  '@nicole_fit',
  '@gustavo_hit',
  '@pietra_star',
  '@erick_live',
  '@manu_docinho',
  '@vinicius_vip',
  '@raissa_foco',
  '@fabricio_king',
  '@emily_pink',
  '@arthur_banda',
  '@giovanna_sol',
  '@cauam_festa',
  '@lorena_shine',
  '@breno_tux',
  '@valentina_rj',
  '@gabriel_sp',
  '@sophia_bh',
  '@henrique_ba',
];

const SPEECH_PHRASES = [
  'cadê eu',
  'MANO kkkkkkk',
  'arrocha casal',
  'Iruuu',
  'EITHA CASAL',
  'tô descendo até o chão',
  'ARROCHAAA',
  'meo deos',
  'todas querem eu',
  'ENTREI KKKK',
  'Amei virar baratinha',
  'VAI ARROCHA CASAL',
  'socorro kkkk',
  'eitaaa',
  'que casamento lindo!',
  'joga o buquê!',
];

const MALE_OUTFIT_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
];

const FEMALE_DRESS_COLORS = [
  '#c81e4b',
  '#148f6b',
  '#7c3aed',
  '#ec4899',
  '#e09f2d',
  '#2563eb',
  '#db2777',
];

const SECONDARY_COLORS = [
  '#84cc16',
  '#facc15',
  '#fb923c',
  '#38bdf8',
  '#f472b6',
  '#f8fafc',
];

const IRIS_COLORS = [
  '#22c55e',
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#14b8a6',
];

export interface RingSlot {
  x: number;
  z: number;
  ringIndex: number;
  angle: number;
}

export function generateConcentricSlots(count: number): RingSlot[] {
  const slots: RingSlot[] = [];
  const ringRadii = [5.1, 7.3, 9.6, 11.9, 14.2];
  const ringCapacities = [10, 14, 18, 22, 26];

  let remaining = count;
  for (let r = 0; r < ringRadii.length && remaining > 0; r++) {
    const radius = ringRadii[r];
    const cap = Math.min(ringCapacities[r], remaining);
    const angleOffset = (r % 2) * (Math.PI / cap);
    for (let i = 0; i < cap; i++) {
      const angle = (i / cap) * Math.PI * 2 + angleOffset;
      slots.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        ringIndex: r,
        angle,
      });
    }
    remaining -= cap;
  }

  // Fallback outer ring if more guests join dynamically
  let extraIdx = 0;
  while (remaining > 0) {
    const angle = (extraIdx / Math.max(remaining, 12)) * Math.PI * 2;
    slots.push({
      x: Math.cos(angle) * 15.1,
      z: Math.sin(angle) * 15.1,
      ringIndex: 5,
      angle,
    });
    remaining--;
    extraIdx++;
  }

  return slots;
}

export function extractInitial(handle: string): string {
  const cleaned = handle.replace(/^@+/, '').trim();
  return (cleaned[0] || 'B').toUpperCase();
}

export function normalizeHandle(user: string): string {
  const trimmed = user.trim();
  if (!trimmed) return '@convidado';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function createGuestRoach(
  id: string,
  handle: string,
  slot: RingSlot,
  index: number,
): RoachEntity {
  const isFemale = index % 2 === 1;
  const outfitPalette = isFemale ? FEMALE_DRESS_COLORS : MALE_OUTFIT_COLORS;
  const outfitColor = outfitPalette[index % outfitPalette.length];
  const secondaryColor = SECONDARY_COLORS[(index * 3) % SECONDARY_COLORS.length];
  const irisColor = IRIS_COLORS[index % IRIS_COLORS.length];

  let accessory: RoachAccessory = 'none';
  if (index % 5 === 0) accessory = 'heart_glasses';
  else if (index % 4 === 1) accessory = 'party_hat';
  else if (isFemale && index % 3 === 0) accessory = 'bow';

  const normalized = normalizeHandle(handle);

  return {
    id,
    handle: normalized,
    initial: extractInitial(normalized),
    role: isFemale ? 'guest_f' : 'guest_m',
    outfitColor,
    secondaryColor,
    irisColor,
    accessory,
    affinity: 25 + ((index * 17) % 55),
    energy: 65 + ((index * 13) % 35),
    x: slot.x,
    z: slot.z,
    targetX: slot.x,
    targetZ: slot.z,
    slotX: slot.x,
    slotZ: slot.z,
    ringIndex: slot.ringIndex,
    heading: Math.atan2(-slot.x, -slot.z), // facing center podium
    speed: 0,
    animState: index % 3 === 0 ? 'dance' : 'idle',
    animTimer: (index * 0.37) % 4,
    speechText: null,
    speechTimer: 0,
    interactionsCount: 0,
    isPlayerControlled: index === 0,
    scaleFactor: 0.94 + ((index % 5) * 0.03),
  };
}

export function createInitialGameState(guestCount = 68): WeddingGameState {
  const slots = generateConcentricSlots(guestCount);

  const groom: RoachEntity = {
    id: 'groom',
    handle: '@marcelo_noivo',
    initial: 'M',
    role: 'groom',
    outfitColor: '#18181b',
    secondaryColor: '#f5b82e',
    irisColor: '#22c55e',
    accessory: 'top_hat',
    affinity: 100,
    energy: 100,
    x: -0.92,
    z: 0.12,
    targetX: -0.92,
    targetZ: 0.12,
    slotX: -0.92,
    slotZ: 0.12,
    ringIndex: -1,
    heading: Math.PI / 2,
    speed: 0,
    animState: 'dance',
    animTimer: 0,
    speechText: 'todas querem eu',
    speechTimer: 4.5,
    interactionsCount: 0,
    isPlayerControlled: false,
    scaleFactor: 1.12,
  };

  const bride: RoachEntity = {
    id: 'bride',
    handle: '@eilooaa0',
    initial: 'E',
    role: 'bride',
    outfitColor: '#fffdf7',
    secondaryColor: '#f5b82e',
    irisColor: '#38bdf8',
    accessory: 'veil',
    affinity: 100,
    energy: 100,
    x: 0.92,
    z: 0.12,
    targetX: 0.92,
    targetZ: 0.12,
    slotX: 0.92,
    slotZ: 0.12,
    ringIndex: -1,
    heading: -Math.PI / 2,
    speed: 0,
    animState: 'dance',
    animTimer: 0.4,
    speechText: null,
    speechTimer: 0,
    interactionsCount: 0,
    isPlayerControlled: false,
    scaleFactor: 1.1,
  };

  const guests: RoachEntity[] = slots.map((slot, idx) => {
    const handle = SAMPLE_HANDLES[idx % SAMPLE_HANDLES.length];
    const roach = createGuestRoach(`guest_${idx + 1}`, handle, slot, idx);
    if (idx === 2) {
      roach.speechText = 'cadê eu';
      roach.speechTimer = 4.2;
    } else if (idx === 8) {
      roach.speechText = 'MANO kkkkkkk';
      roach.speechTimer = 4.8;
    } else if (idx === 15) {
      roach.speechText = 'meo deos';
      roach.speechTimer = 3.8;
    }
    return roach;
  });

  const roaches = [groom, bride, ...guests];

  return {
    round: 1,
    phase: 'baile',
    phaseTimer: 0,
    ceremonyProgress: 18,
    totalScore: 0,
    likesCount: 0,
    giftsCount: 0,
    interactionsTotal: 0,
    roaches,
    groomId: groom.id,
    brideId: bride.id,
    featuredRoachId: guests[0].id,
    controlledRoachId: guests[0].id,
    selectedRoachId: null,
    cameraMode: 'panoramic',
    autoCameraEnabled: true,
    autoCameraTimer: 0,
    brideAnnouncement: {
      id: 'init_bride',
      handle: bride.handle,
      initial: bride.initial,
      color: '#c81e4b',
      timer: 5.0,
    },
    recentEvents: [
      {
        id: 'evt_welcome',
        type: 'crown_bride',
        user: bride.handle,
        summary: `${bride.handle} entrou como Noiva da Rodada 1!`,
        timestamp: Date.now(),
        source: 'player',
      },
    ],
    lastBurstAt: 0,
    celebrationBurstCount: 0,
  };
}

function clampToArena(x: number, z: number): { x: number; z: number } {
  const dist = Math.hypot(x, z);
  const maxR = ARENA_RADIUS - ROACH_RADIUS;
  if (dist > maxR && dist > 0.0001) {
    const ratio = maxR / dist;
    return { x: x * ratio, z: z * ratio };
  }
  return { x, z };
}

export function resolveCollisionsAndProximity(
  roaches: RoachEntity[],
  dt: number,
): ProximityInteraction[] {
  const encounters: ProximityInteraction[] = [];
  const minDist = ROACH_RADIUS * 1.85;
  const minDistSq = minDist * minDist;
  const proxSq = PROXIMITY_RADIUS * PROXIMITY_RADIUS;

  for (let i = 0; i < roaches.length; i++) {
    const a = roaches[i];
    // Keep guests outside the central wedding podium barrier unless Groom or Bride
    if (a.role !== 'groom' && a.role !== 'bride') {
      const distCenter = Math.hypot(a.x, a.z);
      const minCenter = PODIUM_RADIUS + ROACH_RADIUS * 0.9;
      if (distCenter < minCenter && distCenter > 0.0001) {
        const push = minCenter / distCenter;
        a.x *= push;
        a.z *= push;
      }
    }

    for (let j = i + 1; j < roaches.length; j++) {
      const b = roaches[j];
      // Groom & Bride on the podium can stand closer together
      const pairIsCouple =
        (a.role === 'groom' && b.role === 'bride') ||
        (a.role === 'bride' && b.role === 'groom');

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < proxSq && !pairIsCouple) {
        if (
          a.animTimer <= 0 &&
          b.animTimer <= 0 &&
          (a.speed > 0.4 || b.speed > 0.4 || a.isPlayerControlled || b.isPlayerControlled)
        ) {
          encounters.push({
            roachAId: a.id,
            roachBId: b.id,
            midX: (a.x + b.x) * 0.5,
            midZ: (a.z + b.z) * 0.5,
          });
          a.interactionsCount += 1;
          b.interactionsCount += 1;
          a.affinity = Math.min(100, a.affinity + 6);
          b.affinity = Math.min(100, b.affinity + 6);
          a.animState = 'interact';
          b.animState = 'interact';
          a.animTimer = 1.4;
          b.animTimer = 1.4;
        }
      }

      const targetMinSq = pairIsCouple ? 1.15 * 1.15 : minDistSq;
      const targetMin = pairIsCouple ? 1.15 : minDist;
      if (distSq < targetMinSq && distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const overlap = (targetMin - dist) * 0.5;
        const nx = dx / dist;
        const nz = dz / dist;

        if (a.role !== 'groom' && a.role !== 'bride') {
          a.x -= nx * overlap * Math.min(1, dt * 18 + 0.35);
          a.z -= nz * overlap * Math.min(1, dt * 18 + 0.35);
        }
        if (b.role !== 'groom' && b.role !== 'bride') {
          b.x += nx * overlap * Math.min(1, dt * 18 + 0.35);
          b.z += nz * overlap * Math.min(1, dt * 18 + 0.35);
        }
      }
    }

    const clamped = clampToArena(a.x, a.z);
    a.x = clamped.x;
    a.z = clamped.z;
  }

  return encounters;
}

function pushEventRecord(
  state: WeddingGameState,
  event: LiveEventRecord,
): LiveEventRecord[] {
  return [event, ...state.recentEvents].slice(0, 6);
}

export function crownNewBride(
  state: WeddingGameState,
  candidateHandle: string,
  source: 'websocket' | 'http' | 'player' = 'player',
): WeddingGameState {
  const normalized = normalizeHandle(candidateHandle);
  const currentBride = state.roaches.find((r) => r.id === state.brideId);
  let targetGuest = state.roaches.find(
    (r) =>
      r.id !== state.groomId &&
      r.handle.toLowerCase() === normalized.toLowerCase(),
  );

  // If already the bride, just celebrate and boost!
  if (currentBride && currentBride.handle.toLowerCase() === normalized.toLowerCase()) {
    currentBride.animState = 'celebrate';
    currentBride.animTimer = 2.6;
    currentBride.speechText = 'Sou a NOIVA!';
    currentBride.speechTimer = 3.5;
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + 12);
    return state;
  }

  // Demote previous bride back to a guest slot
  if (currentBride) {
    currentBride.role = 'guest_f';
    currentBride.outfitColor = '#c81e4b';
    currentBride.accessory = 'bow';
    currentBride.scaleFactor = 1.0;
    const slot = generateConcentricSlots(state.roaches.length).slice(-1)[0];
    currentBride.slotX = slot.x;
    currentBride.slotZ = slot.z;
    currentBride.targetX = slot.x;
    currentBride.targetZ = slot.z;
    currentBride.x = slot.x * 0.65;
    currentBride.z = slot.z * 0.65;
    currentBride.animState = 'react';
    currentBride.animTimer = 1.8;
  }

  if (!targetGuest) {
    const newSlot = generateConcentricSlots(state.roaches.length + 1).slice(-1)[0];
    targetGuest = createGuestRoach(
      `guest_vip_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      normalized,
      newSlot,
      state.roaches.length,
    );
    state.roaches.push(targetGuest);
  }

  // Promote targetGuest to Bride!
  targetGuest.role = 'bride';
  targetGuest.outfitColor = '#fffdf7';
  targetGuest.secondaryColor = '#f5b82e';
  targetGuest.accessory = 'veil';
  targetGuest.scaleFactor = 1.1;
  targetGuest.affinity = 100;
  targetGuest.x = 0.92;
  targetGuest.z = 0.12;
  targetGuest.targetX = 0.92;
  targetGuest.targetZ = 0.12;
  targetGuest.slotX = 0.92;
  targetGuest.slotZ = 0.12;
  targetGuest.heading = -Math.PI / 2;
  targetGuest.animState = 'celebrate';
  targetGuest.animTimer = 2.5;
  targetGuest.speechText = 'Iruuu! Virei a Noiva!';
  targetGuest.speechTimer = 4.0;

  state.brideId = targetGuest.id;
  state.brideAnnouncement = {
    id: `bride_${Date.now()}`,
    handle: targetGuest.handle,
    initial: targetGuest.initial,
    color: '#c81e4b',
    timer: 4.8,
  } satisfies BrideAnnouncement;

  state.ceremonyProgress = Math.min(100, state.ceremonyProgress + 16);
  state.totalScore += 150;
  state.recentEvents = pushEventRecord(state, {
    id: `evt_${Date.now()}_${Math.random()}`,
    type: 'crown_bride',
    user: targetGuest.handle,
    summary: `${targetGuest.handle} virou a NOIVA!`,
    timestamp: Date.now(),
    source,
  });

  if (state.phase === 'baile') {
    state.phase = 'coroacao';
    state.phaseTimer = 0;
  }

  return state;
}

export function applyLiveEventToState(
  state: WeddingGameState,
  event: LiveEventInput,
): WeddingGameState {
  const source = event.source ?? 'player';
  const handle = normalizeHandle(event.user || '@convidado');
  let roach = state.roaches.find(
    (r) => r.handle.toLowerCase() === handle.toLowerCase(),
  );

  if (event.type === 'crown_bride') {
    return crownNewBride(state, handle, source);
  }

  if (event.type === 'ceremony_boost') {
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + (event.giftValue ?? 35));
    state.totalScore += 200;
    state.celebrationBurstCount += 1;
    state.recentEvents = pushEventRecord(state, {
      id: `evt_${Date.now()}_${Math.random()}`,
      type: 'ceremony_boost',
      user: handle,
      summary: `${handle} acelerou o Casamento!`,
      timestamp: Date.now(),
      source,
    });
    return state;
  }

  if (!roach) {
    const nextSlot = generateConcentricSlots(state.roaches.length + 1).slice(-1)[0];
    roach = createGuestRoach(
      `guest_${Date.now()}_${state.roaches.length}`,
      handle,
      nextSlot,
      state.roaches.length,
    );
    // Enter from outer perimeter running toward slot
    roach.x = nextSlot.x * 1.1;
    roach.z = nextSlot.z * 1.1;
    roach.animState = 'run';
    roach.animTimer = 2.0;
    state.roaches.push(roach);
  }

  if (event.type === 'gift') {
    const giftValue = Math.max(1, event.giftValue ?? 10);
    const giftName = event.giftName || 'Rosa Dourada';
    state.giftsCount += 1;
    state.totalScore += giftValue * 20;
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + Math.min(35, 6 + giftValue * 0.6));
    roach.affinity = Math.min(100, roach.affinity + 25);
    roach.animState = 'celebrate';
    roach.animTimer = 2.5;
    roach.speechText = `${giftName}!`;
    roach.speechTimer = 3.6;
    state.featuredRoachId = roach.id;
    state.celebrationBurstCount += 1;

    state.recentEvents = pushEventRecord(state, {
      id: `evt_${Date.now()}_${Math.random()}`,
      type: 'gift',
      user: handle,
      summary: `${handle} enviou ${giftName}`,
      timestamp: Date.now(),
      source,
    });

    // Special gifts >= 20 coins crown the sender as the new Noiva!
    if (giftValue >= 20 && roach.id !== state.groomId) {
      crownNewBride(state, handle, source);
    }
  } else if (event.type === 'like') {
    const count = Math.max(1, event.count ?? 5);
    state.likesCount += count;
    state.totalScore += count * 2;
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + Math.min(10, count * 0.5));
    roach.energy = 100;
    roach.animState = 'dance';
    roach.animTimer = 2.2;
    state.celebrationBurstCount += 1;

    // Make nearby guests dance too
    for (const r of state.roaches) {
      const d = Math.hypot(r.x - roach.x, r.z - roach.z);
      if (d < 4.5) {
        r.animState = 'dance';
        r.animTimer = 1.8;
      }
    }

    state.recentEvents = pushEventRecord(state, {
      id: `evt_${Date.now()}_${Math.random()}`,
      type: 'like',
      user: handle,
      summary: `${handle} curtiu a festa (+${count})`,
      timestamp: Date.now(),
      source,
    });
  } else if (event.type === 'comment') {
    const msg = (event.comment || 'Arrocha casal!').slice(0, 42);
    roach.speechText = msg;
    roach.speechTimer = 4.2;
    roach.animState = 'react';
    roach.animTimer = 1.6;
    state.featuredRoachId = roach.id;
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + 3);
    state.totalScore += 15;

    state.recentEvents = pushEventRecord(state, {
      id: `evt_${Date.now()}_${Math.random()}`,
      type: 'comment',
      user: handle,
      summary: `${handle}: "${msg}"`,
      timestamp: Date.now(),
      source,
    });
  } else if (event.type === 'follow' || event.type === 'share') {
    roach.animState = 'celebrate';
    roach.animTimer = 2.2;
    roach.speechText = event.type === 'follow' ? 'ENTREI KKKK' : 'Chamei a galera!';
    roach.speechTimer = 3.5;
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + 5);
    state.totalScore += 25;

    state.recentEvents = pushEventRecord(state, {
      id: `evt_${Date.now()}_${Math.random()}`,
      type: event.type,
      user: handle,
      summary:
        event.type === 'follow'
          ? `${handle} entrou na pista!`
          : `${handle} compartilhou a festa!`,
      timestamp: Date.now(),
      source,
    });
  }

  return state;
}

export function triggerRoachInteraction(
  state: WeddingGameState,
  roachId: string,
): WeddingGameState {
  const roach = state.roaches.find((r) => r.id === roachId);
  if (!roach) return state;

  state.selectedRoachId = roach.id;
  state.featuredRoachId = roach.id;

  if (roach.role === 'groom' || roach.role === 'bride') {
    roach.animState = 'celebrate';
    roach.animTimer = 2.4;
    roach.speechText = roach.role === 'groom' ? 'Vem dançar!' : 'Casamento lindo!';
    roach.speechTimer = 3.2;
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + 9);
    state.totalScore += 50;
    state.celebrationBurstCount += 1;

    state.recentEvents = pushEventRecord(state, {
      id: `evt_${Date.now()}_${Math.random()}`,
      type: 'like',
      user: roach.handle,
      summary: `Interação com o casal no altar!`,
      timestamp: Date.now(),
      source: 'player',
    });
    return state;
  }

  roach.affinity = Math.min(100, roach.affinity + 20);
  roach.animState = 'celebrate';
  roach.animTimer = 2.2;
  roach.speechText =
    SPEECH_PHRASES[Math.floor(Math.random() * SPEECH_PHRASES.length)];
  roach.speechTimer = 3.5;
  state.controlledRoachId = roach.id;
  state.ceremonyProgress = Math.min(100, state.ceremonyProgress + 5);
  state.totalScore += 30;
  state.celebrationBurstCount += 1;

  // If affinity reaches 100%, automatically crown this guest as the new Bride!
  if (roach.affinity >= 100 && roach.id !== state.groomId) {
    crownNewBride(state, roach.handle, 'player');
  }

  return state;
}

export function stepWeddingSimulation(
  state: WeddingGameState,
  dt: number,
  playerInput: PlayerMoveInput,
  seedTick: number,
): ProximityInteraction[] {
  const clampedDt = Math.min(dt, 0.05);
  state.phaseTimer += clampedDt;
  state.autoCameraTimer += clampedDt;

  if (state.brideAnnouncement) {
    state.brideAnnouncement.timer -= clampedDt;
    if (state.brideAnnouncement.timer <= 0) {
      state.brideAnnouncement = null;
    }
  }

  // Advance wedding phases smoothly based on progress & timers
  const progress = state.ceremonyProgress;
  let nextPhase: WeddingPhase = state.phase;

  if (state.phase === 'baile') {
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + clampedDt * 2.1);
    if (progress >= 35 || state.phaseTimer > 12) {
      nextPhase = 'coroacao';
    }
  } else if (state.phase === 'coroacao') {
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + clampedDt * 2.6);
    if (progress >= 60 || state.phaseTimer > 8) {
      nextPhase = 'arrocha';
    }
  } else if (state.phase === 'arrocha') {
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + clampedDt * 3.4);
    if (progress >= 100) {
      nextPhase = 'cerimonia';
    }
  } else if (state.phase === 'cerimonia') {
    if (state.phaseTimer > 6.5) {
      nextPhase = 'celebracao';
      state.celebrationBurstCount += 1;
    }
  } else if (state.phase === 'celebracao') {
    if (state.phaseTimer > 6.0) {
      // Advance to next round and promote top-affinity guest as new Bride!
      state.round += 1;
      state.ceremonyProgress = 12;
      nextPhase = 'baile';
      const topGuest = [...state.roaches]
        .filter((r) => r.id !== state.groomId && r.id !== state.brideId)
        .sort((a, b) => b.affinity - a.affinity)[0];
      if (topGuest) {
        crownNewBride(state, topGuest.handle, 'player');
      }
    }
  }

  if (nextPhase !== state.phase) {
    state.phase = nextPhase;
    state.phaseTimer = 0;

    if (nextPhase === 'cerimonia' || nextPhase === 'celebracao') {
      state.recentEvents = pushEventRecord(state, {
        id: `evt_phase_${Date.now()}`,
        type: 'ceremony_boost',
        user: '@cerimonial',
        summary:
          nextPhase === 'cerimonia'
            ? 'Momento do Sim! Noivo e Noiva no altar!'
            : 'Felizes para sempre! Chuva de celebração!',
        timestamp: Date.now(),
        source: 'player',
      });
    }
  }

  // Automatic phase-driven camera: distanced panoramic during party, couple close-up during ceremony
  if (state.autoCameraEnabled) {
    const desiredMode: CameraMode =
      state.phase === 'cerimonia' || state.phase === 'celebracao'
        ? 'wedding'
        : 'panoramic';
    if (state.cameraMode !== desiredMode) {
      state.cameraMode = desiredMode;
      state.autoCameraTimer = 0;
    }
  }

  // Update each cockroach's movement, speech timers, and animations
  const groom = state.roaches.find((r) => r.id === state.groomId);
  const bride = state.roaches.find((r) => r.id === state.brideId);

  for (let idx = 0; idx < state.roaches.length; idx++) {
    const r = state.roaches[idx];

    if (r.speechTimer > 0) {
      r.speechTimer -= clampedDt;
      if (r.speechTimer <= 0) {
        r.speechText = null;
      }
    }

    if (r.animTimer > 0) {
      r.animTimer -= clampedDt;
      if (r.animTimer <= 0) {
        r.animTimer = 0;
        r.animState = state.phase === 'arrocha' || state.phase === 'celebracao' ? 'dance' : 'idle';
      }
    }

    // Groom & Bride choreography on central wedding podium
    if (r.role === 'groom' || r.role === 'bride') {
      const isCoupleClose =
        state.phase === 'cerimonia' ||
        state.phase === 'celebracao' ||
        state.phase === 'arrocha';
      const sep = isCoupleClose ? 0.56 : 0.94;
      const angleBase =
        state.phase === 'arrocha'
          ? Math.sin(seedTick * 1.4) * 0.35
          : state.phase === 'celebracao'
            ? seedTick * 0.8
            : 0;
      const sign = r.role === 'groom' ? -1 : 1;
      const goalX = Math.cos(angleBase) * sep * sign;
      const goalZ = Math.sin(angleBase) * sep * sign;

      const dx = goalX - r.x;
      const dz = goalZ - r.z;
      r.x += dx * Math.min(1, clampedDt * 3.5);
      r.z += dz * Math.min(1, clampedDt * 3.5);
      r.speed = Math.hypot(dx, dz) * 3.5;

      if (state.phase === 'cerimonia' || state.phase === 'celebracao') {
        // Face each other during ceremony!
        const partner = r.role === 'groom' ? bride : groom;
        if (partner) {
          r.heading = Math.atan2(partner.x - r.x, partner.z - r.z);
        }
        r.animState = state.phase === 'celebracao' ? 'celebrate' : 'interact';
      } else {
        // Face forward / slightly toward each other for camera 4
        r.heading = r.role === 'groom' ? 0.25 : -0.25;
        if (r.animTimer <= 0) {
          r.animState = 'dance';
        }
      }
      continue;
    }

    // Player-controlled active cockroach via WASD / Arrow keys
    if (r.id === state.controlledRoachId && (playerInput.moveX !== 0 || playerInput.moveZ !== 0)) {
      const mag = Math.hypot(playerInput.moveX, playerInput.moveZ) || 1;
      const maxSpeed = playerInput.boost ? 6.2 : 3.8;
      const vx = (playerInput.moveX / mag) * maxSpeed;
      const vz = (playerInput.moveZ / mag) * maxSpeed;

      r.x += vx * clampedDt;
      r.z += vz * clampedDt;
      r.speed = maxSpeed;
      r.heading = Math.atan2(vx, vz);
      r.animState = playerInput.boost ? 'run' : 'walk';
      continue;
    }

    // Autonomous guest movement: mostly holding concentric ring formation, with lively wanderers!
    const isMover = idx % 4 === 0 || state.phase === 'celebracao';
    if (isMover) {
      const dx = r.targetX - r.x;
      const dz = r.targetZ - r.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.28) {
        const moveSpeed = r.animState === 'run' ? 3.2 : 1.7;
        r.x += (dx / dist) * moveSpeed * clampedDt;
        r.z += (dz / dist) * moveSpeed * clampedDt;
        r.speed = moveSpeed;
        r.heading = Math.atan2(dx, dz);
        if (r.animTimer <= 0) {
          r.animState = moveSpeed > 2.4 ? 'run' : 'walk';
        }
      } else {
        r.speed = 0;
        r.heading = Math.atan2(-r.x, -r.z);
        if (r.animTimer <= 0) {
          r.animState =
            state.phase === 'celebracao'
              ? 'celebrate'
              : state.phase === 'arrocha' || idx % 2 === 0
                ? 'dance'
                : 'idle';
        }

        // Occasionally pick a nearby promenade target on the dancefloor
        const wanderGate = Math.sin(seedTick * 0.7 + idx * 1.9);
        if (wanderGate > 0.996 && idx % 4 === 0) {
          const offsetAngle = Math.atan2(r.slotZ, r.slotX) + ((idx % 2 === 0 ? 1 : -1) * 0.45);
          const radius = Math.max(PODIUM_RADIUS + 1.4, Math.hypot(r.slotX, r.slotZ) + ((idx % 3) - 1) * 1.1);
          r.targetX = Math.cos(offsetAngle) * Math.min(radius, ARENA_RADIUS - 1.2);
          r.targetZ = Math.sin(offsetAngle) * Math.min(radius, ARENA_RADIUS - 1.2);
        }
      }
    } else {
      // Return smoothly toward assigned concentric slot & face center
      const dx = r.slotX - r.x;
      const dz = r.slotZ - r.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.2) {
        r.x += (dx / dist) * 1.5 * clampedDt;
        r.z += (dz / dist) * 1.5 * clampedDt;
        r.speed = 1.5;
        r.heading = Math.atan2(dx, dz);
      } else {
        r.speed = 0;
        r.heading = Math.atan2(-r.x, -r.z);
        if (r.animTimer <= 0) {
          r.animState =
            state.phase === 'celebracao'
              ? 'celebrate'
              : state.phase === 'arrocha' || idx % 2 === 0
                ? 'dance'
                : 'idle';
        }
      }
    }

    // Occasional organic speech bubble chatter in the crowd
    if (!r.speechText && Math.sin(seedTick * 1.3 + idx * 3.17) > 0.99935) {
      r.speechText = SPEECH_PHRASES[(idx + Math.floor(seedTick)) % SPEECH_PHRASES.length];
      r.speechTimer = 3.2;
    }
  }

  const encounters = resolveCollisionsAndProximity(state.roaches, clampedDt);
  if (encounters.length > 0) {
    state.interactionsTotal += encounters.length;
    state.totalScore += encounters.length * 10;
    state.ceremonyProgress = Math.min(100, state.ceremonyProgress + encounters.length * 1.2);
  }

  return encounters;
}

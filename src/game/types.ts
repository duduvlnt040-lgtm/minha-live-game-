export type CameraMode = 'panoramic' | 'follow' | 'front' | 'wedding';

export type WeddingPhase =
  | 'baile'
  | 'coroacao'
  | 'arrocha'
  | 'cerimonia'
  | 'celebracao';

export type RoachRole = 'groom' | 'bride' | 'guest_m' | 'guest_f';

export type RoachAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'dance'
  | 'celebrate'
  | 'react'
  | 'interact';

export type RoachAccessory =
  | 'none'
  | 'heart_glasses'
  | 'party_hat'
  | 'top_hat'
  | 'veil'
  | 'bow';

export interface RoachEntity {
  id: string;
  handle: string;
  initial: string;
  role: RoachRole;
  outfitColor: string;
  secondaryColor: string;
  irisColor: string;
  accessory: RoachAccessory;
  affinity: number; // 0..100
  energy: number; // 0..100
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  slotX: number;
  slotZ: number;
  ringIndex: number;
  heading: number;
  speed: number;
  animState: RoachAnimState;
  animTimer: number;
  speechText: string | null;
  speechTimer: number;
  interactionsCount: number;
  isPlayerControlled: boolean;
  scaleFactor: number;
}

export type LiveEventType =
  | 'gift'
  | 'like'
  | 'comment'
  | 'follow'
  | 'share'
  | 'crown_bride'
  | 'ceremony_boost';

export interface LiveEventInput {
  type: LiveEventType;
  user: string;
  comment?: string;
  giftName?: string;
  giftValue?: number;
  count?: number;
  avatarUrl?: string;
  source?: 'websocket' | 'http' | 'player';
}

export interface LiveEventRecord {
  id: string;
  type: LiveEventType;
  user: string;
  summary: string;
  timestamp: number;
  source: 'websocket' | 'http' | 'player';
}

export interface BrideAnnouncement {
  id: string;
  handle: string;
  initial: string;
  color: string;
  timer: number;
}

export interface ProximityInteraction {
  roachAId: string;
  roachBId: string;
  midX: number;
  midZ: number;
}

export interface WeddingGameState {
  round: number;
  phase: WeddingPhase;
  phaseTimer: number;
  ceremonyProgress: number; // 0..100
  totalScore: number;
  likesCount: number;
  giftsCount: number;
  interactionsTotal: number;
  roaches: RoachEntity[];
  groomId: string;
  brideId: string;
  featuredRoachId: string;
  controlledRoachId: string;
  selectedRoachId: string | null;
  cameraMode: CameraMode;
  autoCameraEnabled: boolean;
  autoCameraTimer: number;
  brideAnnouncement: BrideAnnouncement | null;
  recentEvents: LiveEventRecord[];
  lastBurstAt: number;
  celebrationBurstCount: number;
}

export interface TikTokBridgeStatus {
  configured: boolean;
  connected: boolean;
  mode: 'unconfigured' | 'listening' | 'connected';
  externalProducers: number;
  endpointWs: string;
  endpointHttp: string;
  totalEventsReceived: number;
  lastEventAt: number | null;
  targetUsername: string | null;
}

export interface PlayerMoveInput {
  moveX: number; // -1..1
  moveZ: number; // -1..1
  boost: boolean;
}

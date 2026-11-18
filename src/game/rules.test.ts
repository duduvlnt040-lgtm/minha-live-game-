import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_RADIUS,
  PODIUM_RADIUS,
  applyLiveEventToState,
  createInitialGameState,
  crownNewBride,
  generateConcentricSlots,
  resolveCollisionsAndProximity,
  stepWeddingSimulation,
  triggerRoachInteraction,
} from './rules';

test('generateConcentricSlots keeps all guests outside podium and inside arena', () => {
  const slots = generateConcentricSlots(70);
  assert.equal(slots.length, 70);
  for (const s of slots) {
    const r = Math.hypot(s.x, s.z);
    assert.ok(r > PODIUM_RADIUS, `slot radius ${r} should exceed podium`);
    assert.ok(r < ARENA_RADIUS, `slot radius ${r} should stay inside arena`);
  }
});

test('createInitialGameState spawns groom, bride, and concentric guests', () => {
  const state = createInitialGameState(40);
  assert.equal(state.round, 1);
  assert.equal(state.phase, 'baile');
  assert.equal(state.roaches.length, 42);
  const groom = state.roaches.find((r) => r.id === state.groomId);
  const bride = state.roaches.find((r) => r.id === state.brideId);
  assert.equal(groom?.role, 'groom');
  assert.equal(bride?.role, 'bride');
});

test('resolveCollisionsAndProximity separates overlapping guests and records encounters', () => {
  const state = createInitialGameState(4);
  const g1 = state.roaches[2];
  const g2 = state.roaches[3];
  g1.x = 6.0;
  g1.z = 0.0;
  g1.speed = 2.0;
  g1.animTimer = 0;
  g2.x = 6.3;
  g2.z = 0.0;
  g2.speed = 2.0;
  g2.animTimer = 0;

  const encounters = resolveCollisionsAndProximity(state.roaches, 0.016);
  assert.equal(encounters.length, 1);
  assert.ok(Math.hypot(g2.x - g1.x, g2.z - g1.z) > 0.3);
  assert.equal(g1.animState, 'interact');
  assert.equal(g2.animState, 'interact');
});

test('crownNewBride promotes a user and updates brideAnnouncement banner', () => {
  const state = createInitialGameState(12);
  const prevBrideId = state.brideId;

  crownNewBride(state, '@nova_noiva_vip', 'websocket');

  assert.notEqual(state.brideId, prevBrideId);
  const newBride = state.roaches.find((r) => r.id === state.brideId);
  const oldBride = state.roaches.find((r) => r.id === prevBrideId);
  assert.equal(newBride?.handle, 'nova_noiva_vip');
  assert.equal(newBride?.role, 'bride');
  assert.equal(newBride?.accessory, 'veil');
  assert.equal(oldBride?.role, 'guest_f');
  assert.equal(state.brideAnnouncement?.handle, 'nova_noiva_vip');
});

test('applyLiveEventToState handles gift, like, and comment events', () => {
  const state = createInitialGameState(10);
  const initialCount = state.roaches.length;

  applyLiveEventToState(state, {
    type: 'comment',
    user: 'visitante_top',
    comment: 'ARROCHAAA',
    source: 'websocket',
  });

  assert.equal(state.roaches.length, initialCount + 1);
  const spawned = state.roaches.find((r) => r.handle === 'visitante_top');
  assert.equal(spawned?.speechText, 'ARROCHAAA');

  const prevProgress = state.ceremonyProgress;
  applyLiveEventToState(state, {
    type: 'like',
    user: 'visitante_top',
    count: 10,
    source: 'websocket',
  });
  assert.ok(state.likesCount >= 10);
  assert.ok(state.ceremonyProgress > prevProgress);

  applyLiveEventToState(state, {
    type: 'gift',
    user: 'visitante_top',
    giftName: 'Coroa Real',
    giftValue: 50,
    source: 'websocket',
  });
  assert.equal(state.giftsCount, 1);
  assert.equal(state.roaches.find((r) => r.id === state.brideId)?.handle, 'visitante_top');
});

test('stepWeddingSimulation advances phases to ceremony, celebration, and next round with automatic camera', () => {
  const state = createInitialGameState(10);
  state.phase = 'arrocha';
  state.ceremonyProgress = 99.5;
  stepWeddingSimulation(state, 0.2, { moveX: 0, moveZ: 0, boost: false }, 1);
  assert.equal(state.cameraMode, 'panoramic');

  for (let i = 0; i < 6; i++) {
    stepWeddingSimulation(state, 0.05, { moveX: 0, moveZ: 0, boost: false }, 1 + i);
  }
  assert.equal(state.phase, 'cerimonia');
  assert.equal(state.cameraMode, 'wedding');

  state.phaseTimer = 6.6;
  stepWeddingSimulation(state, 0.05, { moveX: 0, moveZ: 0, boost: false }, 10);
  assert.equal(state.phase, 'celebracao');
  assert.equal(state.cameraMode, 'wedding');

  state.phaseTimer = 6.1;
  stepWeddingSimulation(state, 0.05, { moveX: 0, moveZ: 0, boost: false }, 20);
  assert.equal(state.round, 2);
  assert.equal(state.phase, 'baile');
  assert.equal(state.cameraMode, 'panoramic');
});

test('triggerRoachInteraction boosts affinity and crowns bride at 100%', () => {
  const state = createInitialGameState(8);
  const guest = state.roaches[2];
  guest.affinity = 90;
  triggerRoachInteraction(state, guest.id);
  assert.equal(state.brideId, guest.id);
});

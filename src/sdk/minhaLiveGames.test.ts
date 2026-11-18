import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGameState } from '../game/rules';
import {
  bindMinhaLiveGamesSdk,
  emitSdkScore,
  type MinhaLiveGamesSDK,
  normalizeSdkCommand,
  normalizeSdkControl,
  normalizeSdkEvent,
} from './minhaLiveGames';

test('normalizeSdkEvent converts gifts, likes, and comments to LiveEventInput', () => {
  const gift = normalizeSdkEvent({
    type: 'presente',
    username: 'maria_tiktok',
    gift: { name: 'Buquê Real', diamondCount: 25 },
    repeatCount: 2,
  });
  assert.deepEqual(gift, {
    type: 'gift',
    user: 'maria_tiktok',
    giftName: 'Buquê Real',
    giftValue: 50,
    count: 2,
    avatarUrl: undefined,
    source: 'websocket',
  });

  const like = normalizeSdkEvent({
    event: 'curtida',
    payload: {
      uniqueId: '@joao_live',
      likeCount: 18,
    },
  });
  assert.deepEqual(like, {
    type: 'like',
    user: '@joao_live',
    count: 18,
    avatarUrl: undefined,
    source: 'websocket',
  });

  const comment = normalizeSdkEvent({
    kind: 'comentario',
    user: { nickname: 'Ana Festa' },
    message: 'ARROCHA CASAL!',
  });
  assert.deepEqual(comment, {
    type: 'comment',
    user: 'Ana Festa',
    comment: 'ARROCHA CASAL!',
    avatarUrl: undefined,
    source: 'websocket',
  });
});

test('normalizeSdkCommand maps wedding commands accurately', () => {
  assert.equal(normalizeSdkCommand({ command: '!noiva', user: '@camila' })?.type, 'crown_bride');
  assert.equal(normalizeSdkCommand({ cmd: 'arrocha', username: 'pedro' })?.type, 'like');
  assert.equal(normalizeSdkCommand({ command: '!casar', user: '@lucas' })?.type, 'ceremony_boost');
  assert.equal(normalizeSdkCommand({ command: '!entrar', user: '@novo' })?.type, 'follow');

  const fallback = normalizeSdkCommand({ command: '!salve', user: '@fã', args: ['galera'] });
  assert.equal(fallback?.type, 'comment');
  assert.equal(fallback?.comment, '!salve galera');
});

test('normalizeSdkControl normalizes start, pause, and restart actions', () => {
  assert.equal(normalizeSdkControl('iniciar'), 'start');
  assert.equal(normalizeSdkControl({ action: 'start' }), 'start');
  assert.equal(normalizeSdkControl({ control: 'resume' }), 'start');
  assert.equal(normalizeSdkControl('pausar'), 'pause');
  assert.equal(normalizeSdkControl({ action: 'pause' }), 'pause');
  assert.equal(normalizeSdkControl('reiniciar'), 'restart');
  assert.equal(normalizeSdkControl({ command: 'reset' }), 'restart');
  assert.equal(normalizeSdkControl({ action: 'unknown' }), null);
});

test('bindMinhaLiveGamesSdk preserves window.MinhaLiveGames and wires callbacks + emitScore', () => {
  const g = globalThis as unknown as { MinhaLiveGames?: MinhaLiveGamesSDK };
  const prevSdk = g.MinhaLiveGames;

  const captured: {
    eventCb?: (e: unknown) => void;
    cmdCb?: (c: unknown) => void;
    ctrlCb?: (c: unknown) => void;
  } = {};
  const emittedScores: Array<{ score: number; meta?: Record<string, unknown> }> = [];

  const hostSdk: MinhaLiveGamesSDK = {
    onEvent: (cb) => {
      captured.eventCb = cb;
    },
    onCommand: (cb) => {
      captured.cmdCb = cb;
    },
    onControl: (cb) => {
      captured.ctrlCb = cb;
    },
    emitScore: (score, meta) => {
      emittedScores.push({ score, meta });
    },
  };

  g.MinhaLiveGames = hostSdk;

  const receivedEvents: string[] = [];
  const receivedControls: string[] = [];

  const cleanup = bindMinhaLiveGamesSdk({
    onEvent: (evt) => receivedEvents.push(`${evt.type}:${evt.user}`),
    onControl: (action) => receivedControls.push(action),
  });

  // Never overwrite the host SDK reference!
  assert.strictEqual(g.MinhaLiveGames, hostSdk);

  captured.eventCb?.({ type: 'gift', user: '@vip', giftName: 'Coroa', giftValue: 30 });
  captured.cmdCb?.({ command: '!arrocha', user: '@dancarino' });
  captured.ctrlCb?.('pausar');
  captured.ctrlCb?.({ action: 'iniciar' });
  captured.ctrlCb?.({ control: 'reiniciar' });

  assert.deepEqual(receivedEvents, ['gift:@vip', 'like:@dancarino']);
  assert.deepEqual(receivedControls, ['pause', 'start', 'restart']);

  const state = createInitialGameState(10);
  state.totalScore = 420;
  const ok = emitSdkScore(state);
  assert.equal(ok, true);
  assert.equal(emittedScores.length, 1);
  assert.equal(emittedScores[0].score, 420);
  assert.equal(emittedScores[0].meta?.round, 1);

  cleanup();
  g.MinhaLiveGames = prevSdk;
});

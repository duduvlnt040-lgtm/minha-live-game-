import React, { useEffect, useRef, useState } from 'react';
import { weddingAudio } from './audio/weddingAudio';
import { LiveBridgeDrawer } from './components/LiveBridgeDrawer';
import { WeddingHud } from './components/WeddingHud';
import {
  applyLiveEventToState,
  createInitialGameState,
  stepWeddingSimulation,
  triggerRoachInteraction,
} from './game/rules';
import type {
  LiveEventInput,
  TikTokBridgeStatus,
  WeddingGameState,
} from './game/types';
import {
  bindMinhaLiveGamesSdk,
  emitSdkScore,
  normalizeSdkCommand,
  normalizeSdkControl,
  normalizeSdkEvent,
  type SdkControlAction,
} from './sdk/minhaLiveGames';
import { type BallroomController, mountBallroomScene } from './three/ballroomScene';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const badgeOverlayRef = useRef<HTMLDivElement | null>(null);
  const gameStateRef = useRef<WeddingGameState>(createInitialGameState(68));
  const ballroomRef = useRef<BallroomController | null>(null);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const pausedRef = useRef(false);
  const prevPhaseRef = useRef(gameStateRef.current.phase);
  const prevBrideIdRef = useRef(gameStateRef.current.brideId);
  const lastEmittedScoreRef = useRef(-1);
  const lastScoreEmitAtRef = useRef(0);

  const [isPaused, setIsPaused] = useState(false);

  const [hudSnap, setHudSnap] = useState(() => ({
    round: gameStateRef.current.round,
    phase: gameStateRef.current.phase,
    ceremonyProgress: gameStateRef.current.ceremonyProgress,
    participantsCount: gameStateRef.current.roaches.length,
    cameraMode: gameStateRef.current.cameraMode,
    autoCameraEnabled: gameStateRef.current.autoCameraEnabled,
    groom: gameStateRef.current.roaches.find((r) => r.id === gameStateRef.current.groomId),
    bride: gameStateRef.current.roaches.find((r) => r.id === gameStateRef.current.brideId),
    selectedRoach: undefined as WeddingGameState['roaches'][number] | undefined,
    brideAnnouncement: gameStateRef.current.brideAnnouncement,
    recentEvents: gameStateRef.current.recentEvents,
  }));

  const [bridgeStatus, setBridgeStatus] = useState<TikTokBridgeStatus>({
    configured: false,
    connected: false,
    mode: 'unconfigured',
    externalProducers: 0,
    endpointWs: '',
    endpointHttp: '',
    totalEventsReceived: 0,
    lastEventAt: null,
    targetUsername: null,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  const maybeEmitScore = (force = false) => {
    const state = gameStateRef.current;
    const rounded = Math.max(0, Math.round(state.totalScore));
    const now = performance.now();
    if (
      force ||
      (rounded !== lastEmittedScoreRef.current && now - lastScoreEmitAtRef.current >= 500)
    ) {
      lastEmittedScoreRef.current = rounded;
      lastScoreEmitAtRef.current = now;
      emitSdkScore(state);
    }
  };

  // Helper to sync discrete HUD snapshot (never called at 60Hz)
  const syncHudSnapshot = () => {
    const s = gameStateRef.current;
    document.body.dataset.round = String(s.round);
    document.body.dataset.phase = s.phase;
    document.body.dataset.camera = s.cameraMode;
    document.body.dataset.participants = String(s.roaches.length);

    setHudSnap({
      round: s.round,
      phase: s.phase,
      ceremonyProgress: s.ceremonyProgress,
      participantsCount: s.roaches.length,
      cameraMode: s.cameraMode,
      autoCameraEnabled: s.autoCameraEnabled,
      groom: s.roaches.find((r) => r.id === s.groomId),
      bride: s.roaches.find((r) => r.id === s.brideId),
      selectedRoach: s.selectedRoachId
        ? s.roaches.find((r) => r.id === s.selectedRoachId)
        : undefined,
      brideAnnouncement: s.brideAnnouncement ? { ...s.brideAnnouncement } : null,
      recentEvents: [...s.recentEvents],
    });
  };

  // Helper to apply incoming real-time events from SDK, WebSocket, or postMessage
  const dispatchLiveEvent = (evt: LiveEventInput) => {
    applyLiveEventToState(gameStateRef.current, evt);
    ballroomRef.current?.syncFromState(gameStateRef.current);
    ballroomRef.current?.triggerConfettiBurst(0, 1.8, 0.2, 22);
    if (evt.type === 'crown_bride' || (evt.type === 'gift' && (evt.giftValue ?? 0) >= 20)) {
      weddingAudio.playCoronationChime();
    } else {
      weddingAudio.playPop(1.05);
    }
    setBridgeStatus((prev) => ({
      ...prev,
      totalEventsReceived: prev.totalEventsReceived + 1,
      lastEventAt: Date.now(),
    }));
    maybeEmitScore(true);
    syncHudSnapshot();
  };

  // Helper to handle SDK lifecycle controls (start, pause, restart)
  const handleSdkControl = (action: SdkControlAction) => {
    if (action === 'pause') {
      pausedRef.current = true;
      setIsPaused(true);
      document.body.dataset.state = 'paused';
      return;
    }

    if (action === 'start') {
      pausedRef.current = false;
      setIsPaused(false);
      document.body.dataset.state = 'playing';
      return;
    }

    if (action === 'restart') {
      pausedRef.current = false;
      setIsPaused(false);
      document.body.dataset.state = 'playing';
      const fresh = createInitialGameState(68);
      gameStateRef.current = fresh;
      prevPhaseRef.current = fresh.phase;
      prevBrideIdRef.current = fresh.brideId;
      ballroomRef.current?.syncFromState(fresh);
      ballroomRef.current?.triggerConfettiBurst(0, 2.0, 0.2, 22);
      maybeEmitScore(true);
      syncHudSnapshot();
    }
  };

  const dispatchLiveEventRef = useRef(dispatchLiveEvent);
  dispatchLiveEventRef.current = dispatchLiveEvent;
  const handleSdkControlRef = useRef(handleSdkControl);
  handleSdkControlRef.current = handleSdkControl;
  const maybeEmitScoreRef = useRef(maybeEmitScore);
  maybeEmitScoreRef.current = maybeEmitScore;

  // Mount Three.js Ballroom once
  useEffect(() => {
    document.body.dataset.state = 'playing';

    const mountEl = canvasMountRef.current;
    const overlayEl = badgeOverlayRef.current;
    if (!mountEl || !overlayEl) return;

    let hudSyncAccum = 0;

    const controller = mountBallroomScene(
      mountEl,
      overlayEl,
      () => gameStateRef.current,
      (dt, elapsed) => {
        if (pausedRef.current) {
          return;
        }

        const keys = keysPressedRef.current;
        const moveX =
          (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
          (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
        const moveZ =
          (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
          (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
        const boost = keys.has('ShiftLeft') || keys.has('ShiftRight');

        const state = gameStateRef.current;
        const encounters = stepWeddingSimulation(
          state,
          dt,
          { moveX, moveZ, boost },
          elapsed,
        );

        if (encounters.length > 0) {
          for (const enc of encounters.slice(0, 2)) {
            ballroomRef.current?.triggerConfettiBurst(enc.midX, 1.0, enc.midZ, 8);
          }
          maybeEmitScoreRef.current(false);
        }

        if (state.phase !== prevPhaseRef.current) {
          prevPhaseRef.current = state.phase;
          if (state.phase === 'cerimonia' || state.phase === 'celebracao') {
            weddingAudio.playWeddingFanfare();
            ballroomRef.current?.triggerConfettiBurst(0, 2.2, 0.2, 42);
          }
          maybeEmitScoreRef.current(true);
          syncHudSnapshot();
        }

        if (state.brideId !== prevBrideIdRef.current) {
          prevBrideIdRef.current = state.brideId;
          weddingAudio.playCoronationChime();
          ballroomRef.current?.triggerConfettiBurst(0.9, 1.8, 0.1, 28);
          maybeEmitScoreRef.current(true);
          syncHudSnapshot();
        }

        hudSyncAccum += dt;
        if (hudSyncAccum >= 0.25) {
          hudSyncAccum = 0;
          maybeEmitScoreRef.current(false);
          syncHudSnapshot();
        }
      },
    );

    ballroomRef.current = controller;
    maybeEmitScoreRef.current(true);
    syncHudSnapshot();

    return () => {
      controller.dispose();
      ballroomRef.current = null;
    };
  }, []);

  // Connect Minha Live Games SDK + WebSocket (when backend or ?ws= / VITE_LIVE_WS_URL is available) + postMessage
  useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer = 0;

    // Bind platform-injected window.MinhaLiveGames without overwriting it
    const unbindSdk = bindMinhaLiveGamesSdk({
      onEvent: (evt) => dispatchLiveEventRef.current(evt),
      onControl: (action) => handleSdkControlRef.current(action),
      onConnected: () => {
        if (!active) return;
        setBridgeStatus((prev) => ({
          ...prev,
          configured: true,
          connected: true,
          mode: 'connected',
        }));
      },
    });

    const params = new URLSearchParams(window.location.search);
    const explicitWsUrl =
      params.get('ws') ||
      params.get('liveWs') ||
      (import.meta.env.VITE_LIVE_WS_URL as string | undefined) ||
      '';

    function connectWs(targetUrl: string) {
      if (!active || !targetUrl) return;
      try {
        ws = new WebSocket(targetUrl);
      } catch {
        return;
      }

      ws.onopen = () => {
        if (!active) return;
        if (explicitWsUrl) {
          setBridgeStatus((prev) => ({
            ...prev,
            configured: true,
            connected: true,
            mode: 'connected',
            endpointWs: targetUrl,
          }));
        }
      };

      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed?.type === 'bridge:status' && parsed.payload) {
            setBridgeStatus(parsed.payload);
          } else if (parsed?.type === 'live:event' && parsed.payload) {
            const normalized = normalizeSdkEvent(parsed.payload);
            if (normalized) dispatchLiveEventRef.current(normalized);
          } else {
            const normalized = normalizeSdkEvent(parsed);
            if (normalized) dispatchLiveEventRef.current(normalized);
          }
        } catch {
          // Ignore invalid JSON frames
        }
      };

      ws.onclose = () => {
        if (active) {
          reconnectTimer = window.setTimeout(() => connectWs(targetUrl), 3000);
        }
      };
    }

    const hasBackendCookie =
      typeof document !== 'undefined' && document.cookie.includes('cb3d_backend=1');
    const backendRequested = params.get('backend') === '1' || hasBackendCookie;

    if (explicitWsUrl) {
      connectWs(explicitWsUrl);
    } else if (window.location.protocol.startsWith('http') && backendRequested) {
      // Only open local /ws/live when Express backend is active (avoids 404s on static HTML5 hosts)
      fetch('/api/live/status')
        .then(async (res) => {
          const ct = res.headers.get('content-type') || '';
          if (!res.ok || !ct.includes('application/json')) return null;
          return (await res.json()) as TikTokBridgeStatus;
        })
        .then((data) => {
          if (!active || !data) return;
          setBridgeStatus(data);
          const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
          connectWs(`${proto}://${window.location.host}/ws/live?role=viewer`);
        })
        .catch(() => {
          // Static HTML5 / Minha Live Games hosting mode
        });
    }

    // Listen to parent window postMessage events from MINHA LIVE GAMES
    const onWindowMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'minha-live-games:control') {
        const action = normalizeSdkControl(data.payload ?? data);
        if (action) handleSdkControlRef.current(action);
      } else if (data.type === 'minha-live-games:command') {
        const cmdEvt = normalizeSdkCommand(data.payload ?? data);
        if (cmdEvt) dispatchLiveEventRef.current(cmdEvt);
      } else if (
        (data.type === 'minha-live-games:event' || data.type === 'live:event') &&
        data.payload
      ) {
        const evt = normalizeSdkEvent(data.payload);
        if (evt) dispatchLiveEventRef.current(evt);
      }
    };
    window.addEventListener('message', onWindowMessage);

    return () => {
      active = false;
      unbindSdk();
      clearTimeout(reconnectTimer);
      ws?.close();
      window.removeEventListener('message', onWindowMessage);
    };
  }, []);

  // Keyboard controls (WASD/Arrows move, Space dance burst, M mute, L live panel)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      keysPressedRef.current.add(e.code);

      if (e.code === 'Space' && !pausedRef.current) {
        e.preventDefault();
        const controlled = gameStateRef.current.roaches.find(
          (r) => r.id === gameStateRef.current.controlledRoachId,
        );
        if (controlled) {
          triggerRoachInteraction(gameStateRef.current, controlled.id);
          ballroomRef.current?.triggerConfettiBurst(controlled.x, 1.4, controlled.z, 20);
          weddingAudio.playPop(1.15);
          maybeEmitScoreRef.current(true);
          syncHudSnapshot();
        }
      } else if (e.code === 'KeyM') {
        weddingAudio.setMuted(!weddingAudio.isMuted());
      } else if (e.code === 'KeyL') {
        setDrawerOpen((prev) => !prev);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.code);
    };

    const clearHeldKeys = () => {
      keysPressedRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeldKeys);
    document.addEventListener('visibilitychange', clearHeldKeys);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeldKeys);
      document.removeEventListener('visibilitychange', clearHeldKeys);
    };
  }, []);

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (drawerOpen || pausedRef.current) return;
    const hitId = ballroomRef.current?.pickRoachAtClientPos(e.clientX, e.clientY);
    if (hitId) {
      triggerRoachInteraction(gameStateRef.current, hitId);
      const roach = gameStateRef.current.roaches.find((r) => r.id === hitId);
      if (roach) {
        ballroomRef.current?.triggerConfettiBurst(roach.x, 1.5, roach.z, 18);
      }
      weddingAudio.playPop(0.95 + Math.random() * 0.2);
      maybeEmitScore(true);
      syncHudSnapshot();
    }
  }

  async function handleTriggerTestEvent(event: LiveEventInput) {
    const hasBackend =
      document.cookie.includes('cb3d_backend=1') ||
      new URLSearchParams(window.location.search).get('backend') === '1';

    if (hasBackend) {
      try {
        const res = await fetch('/api/live/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...event, source: 'player' }),
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          return;
        }
      } catch {
        // Fallback to direct dispatch below
      }
    }
    dispatchLiveEvent({ ...event, source: 'player' });
  }

  return (
    <main className="w-screen h-[100dvh] bg-[#16050b] flex items-center justify-center overflow-hidden">
      {/* 9:16 Vertical Stream Viewport — strictly preserves 9:16 across all screen sizes */}
      <div
        data-testid="game-viewport-9-16"
        className="relative overflow-hidden bg-[#3a0817] border-x border-[#f2bd49]/25"
        style={{
          width: 'min(100vw, calc(100dvh * 9 / 16))',
          height: 'min(100dvh, calc(100vw * 16 / 9))',
          boxShadow: '0 0 60px rgba(0,0,0,0.75)',
        }}
      >
        {/* Dedicated Three.js Canvas Mount */}
        <div
          ref={canvasMountRef}
          data-testid="ballroom-canvas-mount"
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full cursor-pointer"
        />

        {/* World-to-Screen Projected Floating Badges & Speech Bubbles */}
        <div
          ref={badgeOverlayRef}
          className="pointer-events-none absolute inset-0 overflow-hidden z-[5]"
        />

        {/* Integrated Diegetic HUD */}
        <WeddingHud
          round={hudSnap.round}
          phase={hudSnap.phase}
          ceremonyProgress={hudSnap.ceremonyProgress}
          participantsCount={hudSnap.participantsCount}
          groom={hudSnap.groom}
          bride={hudSnap.bride}
          selectedRoach={hudSnap.selectedRoach}
          brideAnnouncement={hudSnap.brideAnnouncement}
          recentEvents={hudSnap.recentEvents}
        />

        {/* Minimal pause indicator shown only when paused via SDK onControl */}
        {isPaused && (
          <div
            data-testid="sdk-paused-overlay"
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[2px]"
          >
            <div className="px-5 py-2.5 rounded-xl bg-[#2a0814]/90 border border-[#f5b82e]/70 text-[#fff6dc] font-display text-lg font-bold tracking-wider shadow-xl">
              JOGO PAUSADO
            </div>
          </div>
        )}

        {/* TikTok LIVE Integration & Test Drawer (toggle via L) */}
        <LiveBridgeDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          bridgeStatus={bridgeStatus}
          onTriggerTestEvent={handleTriggerTestEvent}
        />
      </div>
    </main>
  );
}

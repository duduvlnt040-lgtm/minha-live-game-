import type { LiveEventInput, WeddingGameState } from '../game/types';

export type SdkControlAction = 'start' | 'pause' | 'restart';

export interface MinhaLiveGamesSDK {
  onEvent?: (callback: (event: unknown) => void) => unknown;
  onCommand?: (callback: (command: unknown) => void) => unknown;
  onControl?: (callback: (control: unknown) => void) => unknown;
  emitScore?: (score: number, meta?: Record<string, unknown>) => void;
  ready?: () => void;
  onReady?: (callback: () => void) => void;
}

export interface MinhaLiveGamesHandlers {
  onEvent: (event: LiveEventInput) => void;
  onControl: (action: SdkControlAction) => void;
  onConnected?: () => void;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === 'object' && !Array.isArray(val)
    ? (val as Record<string, unknown>)
    : null;
}

function firstString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  return '';
}

function firstNumber(...candidates: unknown[]): number | undefined {
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) {
      return c;
    }
    if (typeof c === 'string' && c.trim().length > 0) {
      const parsed = Number(c);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function extractUser(src: Record<string, unknown>): string {
  const userObj =
    asRecord(src.user) ??
    asRecord(src.sender) ??
    asRecord(src.author) ??
    asRecord(src.from);

  const rawName = firstString(
    typeof src.user === 'string' ? src.user : undefined,
    src.username,
    src.uniqueId,
    src.nickname,
    src.handle,
    src.usuario,
    src.nome,
    typeof src.author === 'string' ? src.author : undefined,
    typeof src.sender === 'string' ? src.sender : undefined,
    userObj?.uniqueId,
    userObj?.username,
    userObj?.handle,
    userObj?.nickname,
    userObj?.name,
  );

  const cleaned = rawName.replace(/^@+/, '').trim();
  return cleaned || 'Convidado';
}

function mergePayload(raw: unknown): Record<string, unknown> | null {
  const top = asRecord(raw);
  if (!top) return null;
  const nested =
    asRecord(top.payload) ??
    asRecord(top.data) ??
    asRecord(top.detail) ??
    asRecord(top.eventData);

  if (!nested) return top;
  return { ...top, ...nested };
}

export function normalizeSdkCommand(raw: unknown): LiveEventInput | null {
  if (typeof raw === 'string') {
    return normalizeSdkCommand({ command: raw });
  }

  const src = mergePayload(raw);
  if (!src) return null;

  const rawCmd = firstString(
    src.command,
    src.cmd,
    src.name,
    src.action,
    src.text,
    src.message,
  );
  if (!rawCmd) return null;

  const user = extractUser(src);
  const normalized = rawCmd.toLowerCase().replace(/^!/, '').trim();
  const cmdToken = normalized.split(/\s+/)[0] || '';

  if (
    cmdToken === 'noiva' ||
    cmdToken === 'coroar' ||
    cmdToken === 'coroar_noiva' ||
    cmdToken === 'crown' ||
    cmdToken === 'bride'
  ) {
    return {
      type: 'crown_bride',
      user,
      source: 'websocket',
    };
  }

  if (
    cmdToken === 'arrocha' ||
    cmdToken === 'dancar' ||
    cmdToken === 'dançar' ||
    cmdToken === 'dance' ||
    cmdToken === 'festa' ||
    cmdToken === 'animar'
  ) {
    return {
      type: 'like',
      user,
      count: 15,
      source: 'websocket',
    };
  }

  if (
    cmdToken === 'casar' ||
    cmdToken === 'casamento' ||
    cmdToken === 'cerimonia' ||
    cmdToken === 'cerimônia' ||
    cmdToken === 'altar' ||
    cmdToken === 'beijo'
  ) {
    return {
      type: 'ceremony_boost',
      user,
      giftValue: 35,
      source: 'websocket',
    };
  }

  if (cmdToken === 'entrar' || cmdToken === 'join') {
    return {
      type: 'follow',
      user,
      source: 'websocket',
    };
  }

  const args = Array.isArray(src.args)
    ? src.args.filter((a): a is string => typeof a === 'string').join(' ')
    : '';
  const comment = args ? `${rawCmd} ${args}` : rawCmd;

  return {
    type: 'comment',
    user,
    comment,
    source: 'websocket',
  };
}

export function normalizeSdkEvent(raw: unknown): LiveEventInput | null {
  const src = mergePayload(raw);
  if (!src) return null;

  const rawType = firstString(
    src.type,
    src.event,
    src.eventType,
    src.kind,
    src.tipo,
  )
    .toLowerCase()
    .trim();

  if (rawType === 'command' || rawType === 'comando') {
    return normalizeSdkCommand(src);
  }

  const user = extractUser(src);
  const giftObj = asRecord(src.gift) ?? asRecord(src.present) ?? asRecord(src.presente);
  const userObj = asRecord(src.user) ?? asRecord(src.sender);
  const avatarUrl =
    firstString(
      src.avatarUrl,
      src.profilePictureUrl,
      src.avatar,
      src.photo,
      userObj?.avatarUrl,
      userObj?.profilePictureUrl,
    ) || undefined;

  const giftName = firstString(
    src.giftName,
    src.presentName,
    typeof src.gift === 'string' ? src.gift : undefined,
    typeof src.presente === 'string' ? src.presente : undefined,
    giftObj?.name,
    giftObj?.giftName,
    src.itemName,
  );

  const commentText = firstString(
    src.comment,
    src.comentario,
    src.message,
    src.mensagem,
    src.text,
    src.content,
    src.msg,
  );

  // Determine event type explicitly or by payload inference
  let resolvedType: LiveEventInput['type'] | null = null;
  if (
    rawType === 'gift' ||
    rawType === 'presente' ||
    rawType === 'present' ||
    rawType === 'tiktok_gift' ||
    rawType === 'superchat' ||
    rawType === 'coins'
  ) {
    resolvedType = 'gift';
  } else if (
    rawType === 'like' ||
    rawType === 'likes' ||
    rawType === 'curtida' ||
    rawType === 'curtidas' ||
    rawType === 'heart'
  ) {
    resolvedType = 'like';
  } else if (
    rawType === 'comment' ||
    rawType === 'comentario' ||
    rawType === 'comentário' ||
    rawType === 'comentarios' ||
    rawType === 'chat' ||
    rawType === 'message' ||
    rawType === 'msg'
  ) {
    resolvedType = 'comment';
  } else if (
    rawType === 'follow' ||
    rawType === 'seguir' ||
    rawType === 'seguidor' ||
    rawType === 'new_follower'
  ) {
    resolvedType = 'follow';
  } else if (
    rawType === 'share' ||
    rawType === 'compartilhar' ||
    rawType === 'compartilhamento'
  ) {
    resolvedType = 'share';
  } else if (
    rawType === 'crown_bride' ||
    rawType === 'coroar_noiva' ||
    rawType === 'noiva' ||
    rawType === 'bride'
  ) {
    resolvedType = 'crown_bride';
  } else if (
    rawType === 'ceremony_boost' ||
    rawType === 'casamento' ||
    rawType === 'cerimonia' ||
    rawType === 'boost'
  ) {
    resolvedType = 'ceremony_boost';
  } else if (giftName || firstNumber(src.giftValue, src.diamondCount, src.coins, giftObj?.diamondCount) !== undefined) {
    resolvedType = 'gift';
  } else if (commentText) {
    resolvedType = 'comment';
  } else if (firstNumber(src.likeCount, src.likes, src.count) !== undefined) {
    resolvedType = 'like';
  }

  if (!resolvedType) return null;

  if (resolvedType === 'gift') {
    const repeatCount = Math.max(1, firstNumber(src.repeatCount, src.quantity, src.count) ?? 1);
    const explicitTotal = firstNumber(src.giftValue, src.totalValue, src.totalCoins);
    const unitCoins = firstNumber(
      src.diamondCount,
      src.diamonds,
      src.coins,
      src.value,
      src.price,
      src.amount,
      giftObj?.diamondCount,
      giftObj?.coins,
      giftObj?.value,
    );
    const giftValue = Math.max(
      1,
      explicitTotal ?? (unitCoins !== undefined ? unitCoins * repeatCount : repeatCount * 10),
    );
    return {
      type: 'gift',
      user,
      giftName: giftName || 'Rosa Dourada',
      giftValue,
      count: repeatCount,
      avatarUrl,
      source: 'websocket',
    };
  }

  if (resolvedType === 'like') {
    const count = Math.max(
      1,
      firstNumber(src.count, src.likeCount, src.likes, src.amount, src.quantity) ?? 5,
    );
    return {
      type: 'like',
      user,
      count,
      avatarUrl,
      source: 'websocket',
    };
  }

  if (resolvedType === 'comment') {
    return {
      type: 'comment',
      user,
      comment: commentText || 'Arrocha casal!',
      avatarUrl,
      source: 'websocket',
    };
  }

  if (resolvedType === 'ceremony_boost') {
    return {
      type: 'ceremony_boost',
      user,
      giftValue: firstNumber(src.giftValue, src.value, src.amount) ?? 35,
      avatarUrl,
      source: 'websocket',
    };
  }

  return {
    type: resolvedType,
    user,
    avatarUrl,
    source: 'websocket',
  };
}

export function normalizeSdkControl(raw: unknown): SdkControlAction | null {
  let token = '';
  if (typeof raw === 'string') {
    token = raw;
  } else {
    const src = mergePayload(raw);
    if (!src) return null;
    token = firstString(
      src.action,
      src.control,
      src.command,
      src.type,
      src.state,
      src.status,
    );
  }

  const normalized = token.toLowerCase().trim();
  if (
    normalized === 'start' ||
    normalized === 'iniciar' ||
    normalized === 'play' ||
    normalized === 'resume' ||
    normalized === 'retomar' ||
    normalized === 'continuar'
  ) {
    return 'start';
  }
  if (
    normalized === 'pause' ||
    normalized === 'pausar' ||
    normalized === 'stop' ||
    normalized === 'parar'
  ) {
    return 'pause';
  }
  if (
    normalized === 'restart' ||
    normalized === 'reiniciar' ||
    normalized === 'reset' ||
    normalized === 'resetar'
  ) {
    return 'restart';
  }
  return null;
}

export function getMinhaLiveGamesSdk(): MinhaLiveGamesSDK | undefined {
  const g = globalThis as unknown as { MinhaLiveGames?: MinhaLiveGamesSDK };
  return g.MinhaLiveGames;
}

export function emitSdkScore(
  state: WeddingGameState,
  sdk: MinhaLiveGamesSDK | undefined = getMinhaLiveGamesSdk(),
): boolean {
  if (!sdk || typeof sdk.emitScore !== 'function') {
    return false;
  }
  const score = Math.max(0, Math.round(state.totalScore));
  const bride = state.roaches.find((r) => r.id === state.brideId)?.handle;
  const groom = state.roaches.find((r) => r.id === state.groomId)?.handle;
  try {
    sdk.emitScore(score, {
      round: state.round,
      phase: state.phase,
      ceremonyProgress: Math.round(state.ceremonyProgress),
      participants: state.roaches.length,
      giftsCount: state.giftsCount,
      likesCount: state.likesCount,
      bride,
      groom,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Connects cleanly to a host-injected `window.MinhaLiveGames` SDK without ever
 * creating or overwriting `window.MinhaLiveGames`.
 */
export function bindMinhaLiveGamesSdk(handlers: MinhaLiveGamesHandlers): () => void {
  let boundSdk: MinhaLiveGamesSDK | null = null;
  let disposed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  const unsubscribers: Array<() => void> = [];

  const attachToSdk = (sdk: MinhaLiveGamesSDK | undefined): boolean => {
    if (disposed || !sdk || typeof sdk !== 'object') return false;
    if (boundSdk === sdk) return true;

    const hasPlatformMethods =
      typeof sdk.onEvent === 'function' ||
      typeof sdk.onCommand === 'function' ||
      typeof sdk.onControl === 'function';

    if (!hasPlatformMethods) return false;

    boundSdk = sdk;

    if (typeof sdk.onEvent === 'function') {
      const maybeUnsub = sdk.onEvent((rawEvent: unknown) => {
        const normalized = normalizeSdkEvent(rawEvent);
        if (normalized) {
          handlers.onEvent(normalized);
        }
      });
      if (typeof maybeUnsub === 'function') {
        unsubscribers.push(maybeUnsub as () => void);
      }
    }

    if (typeof sdk.onCommand === 'function') {
      const maybeUnsub = sdk.onCommand((rawCmd: unknown) => {
        const normalized = normalizeSdkCommand(rawCmd);
        if (normalized) {
          handlers.onEvent(normalized);
        }
      });
      if (typeof maybeUnsub === 'function') {
        unsubscribers.push(maybeUnsub as () => void);
      }
    }

    if (typeof sdk.onControl === 'function') {
      const maybeUnsub = sdk.onControl((rawControl: unknown) => {
        const action = normalizeSdkControl(rawControl);
        if (action) {
          handlers.onControl(action);
        }
      });
      if (typeof maybeUnsub === 'function') {
        unsubscribers.push(maybeUnsub as () => void);
      }
    }

    if (typeof sdk.ready === 'function') {
      try {
        sdk.ready();
      } catch {
        // Ignore host callback errors
      }
    }

    handlers.onConnected?.();
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    return true;
  };

  const tryBind = () => attachToSdk(getMinhaLiveGamesSdk());

  if (!tryBind()) {
    let attempts = 0;
    pollTimer = setInterval(() => {
      attempts += 1;
      if (tryBind() || attempts >= 100) {
        if (pollTimer !== null) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
    }, 150);
  }

  const onReadyEvent = () => {
    tryBind();
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('minha-live-games:ready', onReadyEvent);
    window.addEventListener('MinhaLiveGamesReady', onReadyEvent);
  }

  return () => {
    disposed = true;
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('minha-live-games:ready', onReadyEvent);
      window.removeEventListener('MinhaLiveGamesReady', onReadyEvent);
    }
    for (const unsub of unsubscribers) {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    }
  };
}

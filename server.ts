import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import type { LiveEventInput, LiveEventType, TikTokBridgeStatus } from './src/game/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const VALID_EVENT_TYPES = new Set<LiveEventType>([
  'gift',
  'like',
  'comment',
  'follow',
  'share',
  'crown_bride',
  'ceremony_boost',
]);

interface ExtendedWebSocket extends WebSocket {
  clientRole: 'viewer' | 'producer';
}

let externalProducers = 0;
let totalEventsReceived = 0;
let lastEventAt: number | null = null;
const targetUsername = process.env.TIKTOK_LIVE_USERNAME?.trim() || null;

function getBridgeStatus(reqHost?: string, protocol?: string): TikTokBridgeStatus {
  const wsProto = protocol === 'https' ? 'wss' : 'ws';
  const httpProto = protocol === 'https' ? 'https' : 'http';
  const host = reqHost || `localhost:${PORT}`;

  const configured = Boolean(targetUsername || externalProducers > 0);
  const connected = externalProducers > 0;
  const mode = connected
    ? 'connected'
    : targetUsername
      ? 'listening'
      : 'unconfigured';

  return {
    configured,
    connected,
    mode,
    externalProducers,
    endpointWs: `${wsProto}://${host}/ws/live`,
    endpointHttp: `${httpProto}://${host}/api/live/event`,
    totalEventsReceived,
    lastEventAt,
    targetUsername,
  };
}

function sanitizeEvent(raw: unknown, defaultSource: 'websocket' | 'http' | 'player'): LiveEventInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = String(obj.type || '').trim() as LiveEventType;
  if (!VALID_EVENT_TYPES.has(type)) return null;

  const user = String(obj.user || obj.username || '@convidado').slice(0, 32);
  const comment = typeof obj.comment === 'string' ? obj.comment.slice(0, 80) : undefined;
  const giftName = typeof obj.giftName === 'string' ? obj.giftName.slice(0, 40) : undefined;
  const giftValue =
    typeof obj.giftValue === 'number' && Number.isFinite(obj.giftValue)
      ? Math.max(1, Math.min(10000, obj.giftValue))
      : undefined;
  const count =
    typeof obj.count === 'number' && Number.isFinite(obj.count)
      ? Math.max(1, Math.min(500, obj.count))
      : undefined;

  const source =
    obj.source === 'player' || obj.source === 'http' || obj.source === 'websocket'
      ? obj.source
      : defaultSource;

  return {
    type,
    user,
    comment,
    giftName,
    giftValue,
    count,
    source,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/live' });

  function broadcastToViewers(message: unknown) {
    const payload = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  function broadcastStatus() {
    broadcastToViewers({
      type: 'bridge:status',
      payload: getBridgeStatus(),
    });
  }

  wss.on('connection', (ws, req) => {
    const extWs = ws as ExtendedWebSocket;
    const url = new URL(req.url || '/ws/live', `http://${req.headers.host || 'localhost'}`);
    const roleParam = url.searchParams.get('role');
    extWs.clientRole = roleParam === 'producer' ? 'producer' : 'viewer';

    if (extWs.clientRole === 'producer') {
      externalProducers += 1;
      broadcastStatus();
    } else {
      extWs.send(
        JSON.stringify({
          type: 'bridge:status',
          payload: getBridgeStatus(req.headers.host),
        }),
      );
    }

    extWs.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed?.type === 'register:producer') {
          if (extWs.clientRole !== 'producer') {
            extWs.clientRole = 'producer';
            externalProducers += 1;
            broadcastStatus();
          }
          return;
        }

        const candidate = parsed?.type === 'live:event' ? parsed.payload : parsed;
        const event = sanitizeEvent(candidate, 'websocket');
        if (event) {
          totalEventsReceived += 1;
          lastEventAt = Date.now();
          broadcastToViewers({
            type: 'live:event',
            payload: event,
            timestamp: lastEventAt,
          });
        }
      } catch {
        // Ignore malformed WebSocket messages
      }
    });

    extWs.on('close', () => {
      if (extWs.clientRole === 'producer') {
        externalProducers = Math.max(0, externalProducers - 1);
        broadcastStatus();
      }
    });
  });

  app.get('/api/live/status', (req, res) => {
    const forwardedProto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    res.json(getBridgeStatus(req.headers.host, forwardedProto));
  });

  app.post('/api/live/event', (req, res) => {
    const event = sanitizeEvent(req.body, 'http');
    if (!event) {
      res.status(400).json({
        error: 'Payload inválido. Envie { type, user, ... } com um tipo válido.',
        validTypes: Array.from(VALID_EVENT_TYPES),
      });
      return;
    }

    totalEventsReceived += 1;
    lastEventAt = Date.now();
    broadcastToViewers({
      type: 'live:event',
      payload: event,
      timestamp: lastEventAt,
    });

    res.json({ ok: true, event, timestamp: lastEventAt });
  });

  // Signal presence of optional Node live-bridge backend without causing 404s on static hosts
  app.use((req, res, next) => {
    if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html')) {
      res.cookie('cb3d_backend', '1', { sameSite: 'lax', path: '/' });
    }
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Casamento da Barata 3D server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

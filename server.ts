import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface ClientInfo {
  ws: WebSocket;
  roomId: string;
  role: 'host' | 'viewer';
}

interface Room {
  roomId: string;
  host?: WebSocket;
  viewer?: WebSocket;
  created: number;
}

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// In-memory room store for WebRTC signaling
const rooms = new Map<string, Room>();

// Cleanup stale rooms older than 2 hours
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (now - room.created > 2 * 60 * 60 * 1000) {
      if (!room.host && !room.viewer) {
        rooms.delete(id);
      }
    }
  }
}, 300000);

// API route for Ice Servers (STUN/TURN defaults)
app.get('/api/ice-servers', (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  });
});

// API route to create/check room
app.post('/api/rooms/create', (req, res) => {
  const roomId = Math.floor(100000 + Math.random() * 900000).toString();
  rooms.set(roomId, { roomId, created: Date.now() });
  res.json({ roomId, success: true });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) {
    return res.status(404).json({ exists: false, message: 'Room not found' });
  }
  res.json({
    exists: true,
    hasHost: !!room.host,
    hasViewer: !!room.viewer,
  });
});

// Handle WebSocket upgrades on /ws
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

const clients = new Map<WebSocket, ClientInfo>();

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'join') {
        const { roomId, role } = msg;
        let room = rooms.get(roomId);
        if (!room) {
          room = { roomId, created: Date.now() };
          rooms.set(roomId, room);
        }

        clients.set(ws, { ws, roomId, role });

        if (role === 'host') {
          room.host = ws;
          ws.send(JSON.stringify({ type: 'joined', role: 'host', roomId }));
          if (room.viewer && room.viewer.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'peer-joined', role: 'viewer' }));
          }
        } else if (role === 'viewer') {
          room.viewer = ws;
          ws.send(JSON.stringify({ type: 'joined', role: 'viewer', roomId }));
          if (room.host && room.host.readyState === WebSocket.OPEN) {
            room.host.send(JSON.stringify({ type: 'peer-joined', role: 'viewer' }));
            ws.send(JSON.stringify({ type: 'peer-joined', role: 'host' }));
          }
        }
        return;
      }

      // Forwarding WebRTC signaling messages (offer, answer, candidate, stream-config)
      const client = clients.get(ws);
      if (!client) return;

      const room = rooms.get(client.roomId);
      if (!room) return;

      const target = client.role === 'host' ? room.viewer : room.host;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({
          ...msg,
          fromRole: client.role,
        }));
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      const room = rooms.get(client.roomId);
      if (room) {
        if (client.role === 'host') {
          room.host = undefined;
          if (room.viewer && room.viewer.readyState === WebSocket.OPEN) {
            room.viewer.send(JSON.stringify({ type: 'peer-disconnected', role: 'host' }));
          }
        } else if (client.role === 'viewer') {
          room.viewer = undefined;
          if (room.host && room.host.readyState === WebSocket.OPEN) {
            room.host.send(JSON.stringify({ type: 'peer-disconnected', role: 'viewer' }));
          }
        }
      }
      clients.delete(ws);
    }
  });
});

async function start() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();

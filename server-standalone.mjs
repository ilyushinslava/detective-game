import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import jiti from 'jiti';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const _load = jiti(__dirname, { interopDefault: true, esmResolve: true });
const GameRoomServerModule = _load('./src/server/index.ts');
const GameRoomServer = GameRoomServerModule.default || GameRoomServerModule;

const PORT = process.env.PORT || 1999;

const rooms = new Map();

class StandaloneRoomContext {
  constructor(id) {
    this.id = id;
    this._connectionsMap = new Map();
  }

  getConnections() {
    return this._connectionsMap.values();
  }
}

function getOrCreateRoom(roomId) {
  let entry = rooms.get(roomId);
  if (!entry) {
    const roomCtx = new StandaloneRoomContext(roomId);
    const server = new GameRoomServer(roomCtx);
    entry = { roomCtx, server };
    rooms.set(roomId, entry);
  }
  return entry;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const hostHeader = req.headers.host || `localhost:${PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const reqUrl = new URL(req.url, `${protocol}://${hostHeader}`);

  if (
    reqUrl.pathname === '/rooms' ||
    reqUrl.pathname.endsWith('/rooms') ||
    reqUrl.pathname.startsWith('/parties/main/lobby') ||
    reqUrl.searchParams.get('action') === 'list'
  ) {
    try {
      const defaultRoom = getOrCreateRoom('main').server;
      const standardReq = new Request(reqUrl.toString(), {
        method: req.method,
        headers: req.headers,
      });
      const response = await defaultRoom.onRequest(standardReq);
      const body = await response.text();
      res.writeHead(response.status || 200, {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      });
      res.end(body);
      return;
    } catch (err) {
      console.error('[Standalone Server] HTTP Handler Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const hostHeader = req.headers.host || `localhost:${PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const reqUrl = new URL(req.url, `${protocol}://${hostHeader}`);

  if (!reqUrl.pathname.startsWith('/party/')) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws, req) => {
  const hostHeader = req.headers.host || `localhost:${PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const reqUrl = new URL(req.url, `${protocol}://${hostHeader}`);

  const match = reqUrl.pathname.match(/^\/party\/([^\/]+)/);
  const roomId = match ? decodeURIComponent(match[1]) : 'default';

  const { roomCtx, server: roomServer } = getOrCreateRoom(roomId);
  const connId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const connProxy = {
    id: connId,
    send(data) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      }
    },
    close(code, reason) {
      ws.close(code, reason);
    },
  };

  roomCtx._connectionsMap.set(connId, connProxy);

  const standardReq = new Request(reqUrl.toString(), {
    method: req.method,
    headers: req.headers,
  });

  try {
    roomServer.onConnect(connProxy, { request: standardReq });
  } catch (err) {
    console.error(`[Standalone Server] onConnect error in room ${roomId}:`, err);
  }

  ws.on('message', (data) => {
    try {
      const message = typeof data === 'string' ? data : data.toString('utf-8');
      roomServer.onMessage(message, connProxy);
    } catch (err) {
      console.error(`[Standalone Server] onMessage error in room ${roomId}:`, err);
    }
  });

  ws.on('close', () => {
    try {
      roomCtx._connectionsMap.delete(connId);
      roomServer.onClose(connProxy);
      if (roomCtx._connectionsMap.size === 0) {
        rooms.delete(roomId);
      }
    } catch (err) {
      console.error(`[Standalone Server] onClose error in room ${roomId}:`, err);
    }
  });

  ws.on('error', (err) => {
    console.warn(`[Standalone Server] Socket error in room ${roomId}:`, err);
  });
});

server.listen(PORT, () => {
  console.log(`[Standalone Server] Running on port ${PORT}`);
});

// src/websocket/shellServer.js
import { WebSocketServer } from 'ws';
import config from '../config/index.js';
import { getSessionByToken } from '../services/sessionService.js';
import { getUserById } from '../services/userService.js';
import { getServer } from '../services/serverService.js';
import { createShellSession, getShellSession } from '../process/shellManager.js';
import { audit } from '../services/auditService.js';

function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function attachShellServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const m = url.pathname.match(/^\/ws\/shell\/([^/]+)$/);
    if (!m) return;
    const serverId = m[1];

    try {
      const cookies = parseCookies(req.headers.cookie || '');
      const token = cookies[config.sessionCookieName];
      const session = await getSessionByToken(token);
      if (!session) return reject(socket, 401);
      const user = await getUserById(session.userId);
      if (!user || user.status !== 'active') return reject(socket, 403);
      const server = await getServer(serverId);
      if (!server) return reject(socket, 404);
      if (user.role !== 'admin' && server.ownerId !== user.id) return reject(socket, 403);

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req, { user, server });
      });
    } catch {
      reject(socket, 500);
    }
  });

  function reject(socket, code) {
    try { socket.write(`HTTP/1.1 ${code}\r\n\r\n`); } catch {}
    socket.destroy();
  }

  wss.on('connection', async (ws, _req, ctx) => {
    const { user, server } = ctx;
    let shellId = null;

    try {
      const { shellId: newId, session } = createShellSession({
        serverId: server.id,
        userId: user.id,
      });
      shellId = newId;
      await session.start();

      await audit({
        userId: user.id,
        action: 'shell.open',
        target: server.id,
        ip: _req.socket?.remoteAddress || null,
      });

      ws.send(JSON.stringify({ type: 'ready', shellId }));

      const onData = (data) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'data', data }));
        }
      };
      const onExit = ({ exitCode }) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'exit', exitCode }));
          ws.close();
        }
      };
      const onClosed = ({ reason }) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'closed', reason }));
          ws.close();
        }
      };

      session.on('data', onData);
      session.on('exit', onExit);
      session.on('closed', onClosed);

      ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }
        if (msg.type === 'input') {
          if (typeof msg.data === 'string' && msg.data.length <= 8192) {
            session.write(msg.data);
          }
        } else if (msg.type === 'resize') {
          session.resize(Number(msg.cols), Number(msg.rows));
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      });

      ws.on('close', () => {
        session.off('data', onData);
        session.off('exit', onExit);
        session.off('closed', onClosed);
        // KUNCI: matikan shell saat browser disconnect
        session.close('ws-disconnect');
        audit({
          userId: user.id,
          action: 'shell.close',
          target: server.id,
          ip: _req.socket?.remoteAddress || null,
        });
      });

      ws.on('error', () => {
        try { session.close('ws-error'); } catch {}
      });
    } catch (e) {
      try {
        ws.send(JSON.stringify({ type: 'error', message: e.message }));
      } catch {}
      ws.close();
    }
  });

  return wss;
}
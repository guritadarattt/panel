// src/websocket/consoleServer.js
import { WebSocketServer } from 'ws';
import config from '../config/index.js';
import { getSessionByToken } from '../services/sessionService.js';
import { getUserById } from '../services/userService.js';
import { getServer } from '../services/serverService.js';
import { getRuntime } from '../process/processManager.js';

function parseCookies(header = '') {
  const out = {};
  header.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function attachConsoleServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', async (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const m = url.pathname.match(/^\/ws\/console\/([^/]+)$/);
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
    const { server, user } = ctx;
    const rt = await getRuntime(server);

    // send history
    for (const line of rt.buffer.slice(-500)) {
      ws.send(JSON.stringify({ type: 'line', ...line }));
    }
    ws.send(JSON.stringify({ type: 'status', status: rt.status, pid: rt.pid }));

    const onOutput = (entry) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'line', ...entry }));
    };
    const onStatus = (status, extra) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'status', status, ...extra }));
    };
    rt.on('output', onOutput);
    rt.on('status', onStatus);

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type === 'command') {
        // Safety: only allow a small set of console commands forwarded to stdin
        if (typeof msg.data !== 'string' || msg.data.length > 1024) return;
        if (!rt.child || !rt.child.stdin.writable) return;
        rt.child.stdin.write(msg.data + '\n');
        rt.emit('output', { ts: Date.now(), stream: 'stdin', line: `> ${msg.data}` });
      } else if (msg.type === 'action') {
        try {
          if (msg.action === 'start') await rt.start();
          if (msg.action === 'stop') await rt.stop();
          if (msg.action === 'restart') await rt.restart();
          if (msg.action === 'kill') await rt.kill();
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', message: e.message }));
        }
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      }
    });

    ws.on('close', () => {
      rt.off('output', onOutput);
      rt.off('status', onStatus);
    });
  });

  return wss;
}
// src/process/shellManager.js
import pty from 'node-pty';
import path from 'node:path';
import fs from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Shell session ephemeral — hidup selama WebSocket terbuka.
 * Setiap sesi = PTY bash di direktori server.
 */
class ShellSession extends EventEmitter {
  constructor({ serverId, userId, cols = 120, rows = 30 }) {
    super();
    this.serverId = serverId;
    this.userId = userId;
    this.pty = null;
    this.closed = false;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.idleTimer = null;
    this.idleTimeoutMs = 30 * 60 * 1000; // 30 menit idle → auto close
  }

  async start() {
    const cwd = path.resolve(config.paths.serverRoot, this.serverId);
    await fs.mkdir(cwd, { recursive: true });

    // Env minimal — jangan bocorkan SESSION_SECRET, dll.
    const env = {
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      HOME: cwd,
      PWD: cwd,
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      TERM: 'xterm-256color',
      SHELL: '/bin/bash',
      GURITA_SERVER_ID: this.serverId,
    };

    try {
      this.pty = pty.spawn('/bin/bash', ['--noprofile', '--norc', '-i'], {
        name: 'xterm-256color',
        cols: this.cols || 120,
        rows: this.rows || 30,
        cwd,
        env,
      });
    } catch (e) {
      throw new Error(`Gagal spawn shell: ${e.message}`);
    }

    // Pesan sambutan
    this.pty.write(
      `echo "[Gurita Shell] server=${this.serverId}  cwd=$(pwd)"\r` +
      `echo "Ketik perintah. Ctrl+D atau tombol Close untuk keluar."\r` +
      `echo ""\r`
    );

    this.pty.onData((data) => {
      this.lastActivity = Date.now();
      this.emit('data', data);
    });

    this.pty.onExit(({ exitCode, signal }) => {
      this.closed = true;
      this.emit('exit', { exitCode, signal });
      this._cleanup();
    });

    this._resetIdleTimer();
    return { pid: this.pty.pid };
  }

  write(data) {
    if (!this.pty || this.closed) return false;
    this.lastActivity = Date.now();
    this._resetIdleTimer();
    this.pty.write(data);
    return true;
  }

  resize(cols, rows) {
    if (!this.pty || this.closed) return;
    try {
      this.pty.resize(
        Math.max(20, Math.min(500, cols)),
        Math.max(5, Math.min(200, rows))
      );
    } catch {}
  }

  close(reason = 'user') {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.idleTimer);
    try {
      if (this.pty) {
        // kirim Ctrl+D dulu, lalu SIGTERM, lalu SIGKILL
        try { this.pty.write('\x04'); } catch {}
        setTimeout(() => {
          try { process.kill(this.pty.pid, 'SIGTERM'); } catch {}
          setTimeout(() => {
            try { process.kill(this.pty.pid, 'SIGKILL'); } catch {}
          }, 800);
        }, 200);
      }
    } catch {}
    logger.info('shell.closed', { serverId: this.serverId, userId: this.userId, reason });
    this.emit('closed', { reason });
  }

  _resetIdleTimer() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.closed) return;
      this.emit('data', `\r\n\x1b[33m[idle] Tidak ada aktivitas 30 menit — shell ditutup.\x1b[0m\r\n`);
      this.close('idle');
    }, this.idleTimeoutMs);
  }

  _cleanup() {
    clearTimeout(this.idleTimer);
    this.pty = null;
  }
}

/** Registry sesi shell aktif — key: shellId */
const sessions = new Map();

export function createShellSession(opts) {
  const shellId = `sh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const s = new ShellSession(opts);
  sessions.set(shellId, s);
  s.on('closed', () => sessions.delete(shellId));
  s.on('exit', () => sessions.delete(shellId));
  return { shellId, session: s };
}

export function getShellSession(shellId) {
  return sessions.get(shellId) || null;
}

export function closeAllShellsForServer(serverId) {
  for (const [id, s] of sessions) {
    if (s.serverId === serverId) s.close('server-action');
  }
}
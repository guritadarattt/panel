// src/process/processManager.js
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { createCgroup, attachPid, removeCgroup, cgroupsAvailable } from './cgroupManager.js';

const registry = new Map(); // serverId -> Runtime

class Runtime extends EventEmitter {
  constructor(server) {
    super();
    this.server = server;
    this.child = null;
    this.status = 'stopped';
    this.pid = null;
    this.exitCode = null;
    this.startedAt = null;
    this.stopping = false;
    this.cgroup = null;
    this.buffer = [];
    this.bufferMax = 2000;
    this.logStream = null;
    this.autoRestartTimer = null;
  }

  _pushLine(stream, line) {
    const entry = { ts: Date.now(), stream, line };
    this.buffer.push(entry);
    if (this.buffer.length > this.bufferMax) this.buffer.shift();
    this.emit('output', entry);
    if (this.logStream) this.logStream.write(JSON.stringify(entry) + '\n');
  }

  async _openLogFile() {
    const dir = path.join(config.paths.logRoot, 'servers');
    await fs.mkdir(dir, { recursive: true });
    const fp = path.join(dir, `${this.server.id}.log`);
    this.logStream = await fs.open(fp, 'a').then((fh) => fh.createWriteStream());
  }

  _parseStartup(startup) {
    const allowedExecutables = new Set([
      'node', 'nodejs', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'deno',
      'python3', 'python', 'java', 'ruby', 'php', 'php8', 'php8.1', 'php8.2',
    ]);
    const trimmed = String(startup || '').trim();
    if (!trimmed) throw new Error('Empty startup command');
    const tokens = [];
    let cur = '';
    let quote = null;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (quote) {
        if (c === quote) quote = null;
        else cur += c;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (/\s/.test(c)) {
        if (cur) { tokens.push(cur); cur = ''; }
      } else {
        cur += c;
      }
    }
    if (quote) throw new Error('Unbalanced quotes in startup');
    if (cur) tokens.push(cur);
    if (tokens.length === 0) throw new Error('Empty startup command');
    const exe = tokens[0];
    const baseExe = path.basename(exe);
    if (!allowedExecutables.has(baseExe) && !allowedExecutables.has(exe)) {
      throw new Error(`Executable "${exe}" is not allowed`);
    }
    if (/[;&|`$()<>]/.test(trimmed)) {
      throw new Error('Startup contains shell metacharacters');
    }
    return { exe, args: tokens.slice(1) };
  }

  async _buildAllocationEnv() {
    try {
      const { listAllocations } = await import('../services/allocationService.js');
      const allocs = await listAllocations({ serverId: this.server.id });
      if (!allocs || allocs.length === 0) return {};
      const env = { PORT: String(allocs[0].port) };
      allocs.slice(1).forEach((a, i) => {
        env[`SERVER_PORT_${i + 2}`] = String(a.port);
      });
      return env;
    } catch {
      return {};
    }
  }

  async start() {
    if (this.status === 'running' || this.status === 'starting') {
      throw new Error('Server already running');
    }
    const workingDirectory = path.resolve(config.paths.serverRoot, this.server.id);
    await fs.mkdir(workingDirectory, { recursive: true });

    const { exe, args } = this._parseStartup(this.server.startup);

    this.cgroup = await createCgroup(this.server.id, this.server.resources || {});

    this.status = 'starting';
    this.emit('status', this.status);
    await this._openLogFile();

    const allocEnv = await this._buildAllocationEnv();

    const child = spawn(exe, args, {
      cwd: workingDirectory,
      shell: false,
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH,
        HOME: workingDirectory,
        LANG: 'C.UTF-8',
        NODE_ENV: 'production',
        ...(this.server.env || {}),
        ...allocEnv,
      },
    });

    this.child = child;
    this.pid = child.pid;
    this.exitCode = null;
    this.startedAt = Date.now();
    this.status = 'running';
    this.emit('status', this.status);

    if (this.cgroup?.active) {
      await attachPid(this.server.id, child.pid);
    }

    child.stdout.on('data', (d) => this._emitChunk('stdout', d));
    child.stderr.on('data', (d) => this._emitChunk('stderr', d));

    child.on('error', (err) => {
      this._pushLine('stderr', `[process error] ${err.message}`);
      this.status = 'crashed';
      this.emit('status', this.status);
    });

    child.on('exit', (code, signal) => {
      this.exitCode = code;
      this.pid = null;
      const wasStopping = this.stopping;
      this.stopping = false;
      this.status = wasStopping ? 'stopped' : (code === 0 ? 'stopped' : 'crashed');
      this.emit('status', this.status, { code, signal });
      this._pushLine('stderr', `[process exited code=${code} signal=${signal}]`);
      removeCgroup(this.server.id).catch(() => {});
      if (this.logStream) { this.logStream.end(); this.logStream = null; }
      if (!wasStopping && this.server.autoRestart) {
        this.autoRestartTimer = setTimeout(() => this.start().catch(() => {}), 3000);
      }
    });

    return { pid: child.pid };
  }

  _emitChunk(stream, chunk) {
    const text = chunk.toString('utf8');
    const parts = text.split(/\r?\n/);
    for (const p of parts) {
      if (p.length) this._pushLine(stream, p);
    }
  }

  async stop({ timeoutMs = 8000 } = {}) {
    if (!this.child || this.status !== 'running') {
      this.status = 'stopped';
      this.emit('status', this.status);
      return;
    }
    this.stopping = true;
    try {
      process.kill(-this.child.pid, 'SIGTERM');
    } catch {
      try { this.child.kill('SIGTERM'); } catch {}
    }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!this.child || this.child.exitCode !== null) return;
      await new Promise((r) => setTimeout(r, 150));
    }
    try { process.kill(-this.child.pid, 'SIGKILL'); } catch {
      try { this.child.kill('SIGKILL'); } catch {}
    }
  }

  async kill() {
    if (!this.child || !this.pid) return;
    this.stopping = true;
    try { process.kill(-this.child.pid, 'SIGKILL'); } catch {
      try { this.child.kill('SIGKILL'); } catch {}
    }
  }

  async restart() {
    await this.stop();
    await new Promise((r) => setTimeout(r, 400));
    return this.start();
  }

  /**
   * Jalankan `npm install` (atau pnpm/yarn/bun) di working directory server.
   * Hanya boleh dijalankan saat server tidak berjalan.
   */
  async installDeps({ packageManager = 'npm', timeoutMs = 5 * 60 * 1000 } = {}) {
    if (this.status === 'running' || this.status === 'starting') {
      throw new Error('Stop server dulu sebelum menjalankan install');
    }
    const allowed = { npm: ['npm', ['install', '--no-audit', '--no-fund']] };
    if (packageManager === 'pnpm') allowed.pnpm = ['pnpm', ['install']];
    if (packageManager === 'yarn') allowed.yarn = ['yarn', ['install']];
    if (packageManager === 'bun') allowed.bun = ['bun', ['install']];
    const spec = allowed[packageManager];
    if (!spec) throw new Error(`Package manager tidak didukung: ${packageManager}`);

    const workingDirectory = path.resolve(config.paths.serverRoot, this.server.id);
    await fs.mkdir(workingDirectory, { recursive: true });

    try {
      await fs.access(path.join(workingDirectory, 'package.json'));
    } catch {
      throw new Error('package.json tidak ditemukan di root server');
    }

    this._pushLine('stdout', `[install] menjalankan ${spec[0]} ${spec[1].join(' ')} ...`);

    return new Promise((resolve, reject) => {
      const child = spawn(spec[0], spec[1], {
        cwd: workingDirectory,
        shell: false,
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          PATH: process.env.PATH,
          HOME: workingDirectory,
          LANG: 'C.UTF-8',
        },
      });

      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
        reject(new Error('Install timeout'));
      }, timeoutMs);

      child.stdout.on('data', (d) => this._emitChunk('stdout', d));
      child.stderr.on('data', (d) => this._emitChunk('stderr', d));
      child.on('error', (err) => {
        clearTimeout(timer);
        this._pushLine('stderr', `[install error] ${err.message}`);
        reject(err);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          this._pushLine('stdout', `[install] selesai (exit 0)`);
          resolve({ ok: true, exitCode: code });
        } else {
          this._pushLine('stderr', `[install] gagal (exit ${code})`);
          reject(new Error(`Install gagal dengan exit ${code}`));
        }
      });
    });
  }

  isAlive() {
    return !!this.child && this.child.exitCode === null;
  }
}

export async function getRuntime(server) {
  let rt = registry.get(server.id);
  if (!rt) {
    rt = new Runtime(server);
    registry.set(server.id, rt);
  } else {
    rt.server = server;
  }
  return rt;
}

export function getRuntimeIfExists(serverId) {
  return registry.get(serverId) || null;
}

export function listRuntimes() {
  return [...registry.values()];
}

export function cgroupStatus() {
  return { available: cgroupsAvailable() };
}
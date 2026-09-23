// src/config/index.js
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = process.cwd();

function abs(p) {
  return path.isAbsolute(p) ? p : path.resolve(root, p);
}

function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

const NODE_ENV = process.env.NODE_ENV || 'development';

let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET === 'CHANGE_THIS_TO_A_LONG_RANDOM_STRING') {
  if (NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to a strong random value in production.');
  }
  SESSION_SECRET = crypto.randomBytes(48).toString('hex');
  // eslint-disable-next-line no-console
  console.warn('[config] Using ephemeral SESSION_SECRET (dev mode).');
}

export const config = Object.freeze({
  env: NODE_ENV,
  isProd: NODE_ENV === 'production',
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '127.0.0.1',
  sessionSecret: SESSION_SECRET,
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 24),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'gurita_sid',
  allowRegistration: String(process.env.ALLOW_REGISTRATION || 'false') === 'true',
  trustProxy: String(process.env.TRUST_PROXY || 'false') === 'true',
  loginRate: {
    windowMin: Number(process.env.LOGIN_RATE_WINDOW_MIN || 10),
    maxAttempts: Number(process.env.LOGIN_RATE_MAX_ATTEMPTS || 8),
  },
  paths: {
    root,
    database: abs(required('DATABASE_PATH', './database')),
    storage: abs(required('STORAGE_PATH', './storage')),
    serverRoot: abs(required('SERVER_ROOT', './storage/servers')),
    backupRoot: abs(required('BACKUP_ROOT', './storage/backups')),
    logRoot: abs(required('LOG_ROOT', './storage/logs')),
  },
  cgroups: {
    enabled: String(process.env.ENABLE_CGROUPS || 'true') === 'true',
    root: process.env.CGROUP_ROOT || '/sys/fs/cgroup/gurita-panel',
  },
});

// Ensure directories exist
for (const p of Object.values(config.paths)) {
  if (typeof p === 'string' && p.length > 0) {
    try {
      fs.mkdirSync(p, { recursive: true });
    } catch (e) {
      console.error(`[config] Failed to create dir ${p}:`, e.message);
      throw e;
    }
  }
}

// Ensure themes + tmp dirs
try {
  fs.mkdirSync(path.join(root, 'themes'), { recursive: true });
  fs.mkdirSync(path.join(root, 'storage', 'tmp-themes'), { recursive: true });
} catch (e) {
  console.error('[config] Failed to create themes dirs:', e.message);
}

// Ensure media dirs
try {
  fs.mkdirSync(path.join(root, 'storage', 'media'), { recursive: true });
  fs.mkdirSync(path.join(root, 'storage', 'media', 'music'), { recursive: true });
  fs.mkdirSync(path.join(root, 'storage', 'tmp-media'), { recursive: true });
} catch (e) {
  console.error('[config] Failed to create media dirs:', e.message);
}

export default config;
// src/utils/logger.js
import fs from 'node:fs';
import path from 'node:path';
import config from '../config/index.js';

const LOG_DIR = config.paths.logRoot;
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}

const SENSITIVE = /(password|token|secret|authorization|cookie)/i;

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE.test(k)) out[k] = '[REDACTED]';
    else if (typeof v === 'object') out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

function write(level, msg, meta) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ? { meta: redact(meta) } : {}),
  });
  const file = path.join(LOG_DIR, `${level}.log`);
  fs.appendFile(file, line + '\n', () => {});
  if (level === 'error' || config.env !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[${level}]`, msg, meta ? redact(meta) : '');
  }
}

export const logger = {
  info: (m, meta) => write('info', m, meta),
  warn: (m, meta) => write('warn', m, meta),
  error: (m, meta) => write('error', m, meta),
  audit: (m, meta) => write('audit', m, meta),
};
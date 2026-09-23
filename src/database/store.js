// src/database/store.js
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import lockfile from 'proper-lockfile';
import config from '../config/index.js';

const DB_DIR = config.paths.database;

const DEFAULTS = Object.freeze({
  'users.json': [],
  'servers.json': [],
  'allocations.json': [],
  'settings.json': {
    panelName: 'Gurita Panel',
    allowRegistration: false,
    createdAt: new Date().toISOString(),
  },
  'sessions.json': [],
  'api-keys.json': [],
  'audit-logs.json': [],
  'backups.json': [],
});

function filePath(name) {
  return path.join(DB_DIR, name);
}

async function ensureFile(name) {
  const fp = filePath(name);
  try {
    await fs.access(fp);
  } catch {
    const initial = DEFAULTS[name] ?? [];
    await atomicWriteRaw(fp, initial);
  }
}

async function atomicWriteRaw(fp, data) {
  const dir = path.dirname(fp);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(fp)}.${process.pid}.${Date.now()}.tmp`
  );
  const json = JSON.stringify(data, null, 2);
  // validate round-trip
  JSON.parse(json);
  const fh = await fs.open(tmp, 'w', 0o600);
  try {
    await fh.writeFile(json, 'utf8');
    await fh.sync();
  } finally {
    await fh.close();
  }
  await fs.rename(tmp, fp);
  // fsync directory for durability
  try {
    const dh = await fs.open(dir, 'r');
    try {
      await dh.sync();
    } finally {
      await dh.close();
    }
  } catch {
    /* best effort */
  }
}

async function withLock(fp, fn) {
  const release = await lockfile.lock(fp, {
    retries: { retries: 10, factor: 1.4, minTimeout: 20, maxTimeout: 200 },
    stale: 15000,
    realpath: false,
  });
  try {
    return await fn();
  } finally {
    await release();
  }
}

export async function readJSON(name) {
  await ensureFile(name);
  const fp = filePath(name);
  try {
    const raw = await fs.readFile(fp, 'utf8');
    if (!raw.trim()) return structuredClone(DEFAULTS[name] ?? []);
    return JSON.parse(raw);
  } catch (e) {
    // attempt recovery from backup
    const bak = fp + '.bak';
    if (fsSync.existsSync(bak)) {
      try {
        const rawBak = await fs.readFile(bak, 'utf8');
        const data = JSON.parse(rawBak);
        await atomicWriteRaw(fp, data);
        // eslint-disable-next-line no-console
        console.warn(`[store] Recovered ${name} from backup.`);
        return data;
      } catch {
        /* fallthrough */
      }
    }
    throw new Error(`Database file ${name} is corrupted: ${e.message}`);
  }
}

export async function writeJSON(name, data) {
  await ensureFile(name);
  const fp = filePath(name);
  return withLock(fp, async () => {
    // backup previous
    try {
      const prev = await fs.readFile(fp, 'utf8');
      if (prev.trim()) {
        await fs.writeFile(fp + '.bak', prev, { mode: 0o600 });
      }
    } catch {
      /* ignore */
    }
    await atomicWriteRaw(fp, data);
    return data;
  });
}

export async function updateJSON(name, mutator) {
  await ensureFile(name);
  const fp = filePath(name);
  return withLock(fp, async () => {
    let current;
    try {
      const raw = await fs.readFile(fp, 'utf8');
      current = raw.trim() ? JSON.parse(raw) : structuredClone(DEFAULTS[name] ?? []);
    } catch {
      current = structuredClone(DEFAULTS[name] ?? []);
    }
    const next = await mutator(current);
    const finalData = next === undefined ? current : next;
    try {
      await fs.writeFile(fp + '.bak', JSON.stringify(current, null, 2), {
        mode: 0o600,
      });
    } catch {
      /* ignore */
    }
    await atomicWriteRaw(fp, finalData);
    return finalData;
  });
}

export async function deleteJSON(name) {
  const fp = filePath(name);
  return withLock(fp, async () => {
    try {
      await fs.unlink(fp);
      return true;
    } catch {
      return false;
    }
  });
}

/* ---------- Higher-level helpers ---------- */

export function generateId(prefix) {
  return `${prefix}_${crypto.randomBytes(9).toString('hex')}`;
}

export async function findOne(name, predicate) {
  const arr = await readJSON(name);
  if (!Array.isArray(arr)) return null;
  return arr.find(predicate) ?? null;
}

export async function findMany(name, predicate = () => true) {
  const arr = await readJSON(name);
  if (!Array.isArray(arr)) return [];
  return arr.filter(predicate);
}

export async function insertOne(name, doc) {
  const inserted = await updateJSON(name, (arr) => {
    if (!Array.isArray(arr)) arr = [];
    arr.push(doc);
    return arr;
  });
  return inserted;
}

export async function updateOne(name, predicate, patch) {
  let updated = null;
  await updateJSON(name, (arr) => {
    if (!Array.isArray(arr)) arr = [];
    const idx = arr.findIndex(predicate);
    if (idx === -1) return arr;
    arr[idx] = { ...arr[idx], ...patch, updatedAt: new Date().toISOString() };
    updated = arr[idx];
    return arr;
  });
  return updated;
}

export async function deleteOne(name, predicate) {
  let removed = null;
  await updateJSON(name, (arr) => {
    if (!Array.isArray(arr)) return arr;
    const idx = arr.findIndex(predicate);
    if (idx === -1) return arr;
    removed = arr[idx];
    arr.splice(idx, 1);
    return arr;
  });
  return removed;
}
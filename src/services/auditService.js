// src/services/auditService.js
import { insertOne, generateId, readJSON, writeJSON } from '../database/store.js';
import { logger } from '../utils/logger.js';

const MAX_ENTRIES = 20000;

export async function audit({ userId = null, action, target = null, result = 'ok', ip = null, meta = {} }) {
  const entry = {
    id: generateId('log'),
    userId,
    action,
    target,
    result,
    ip,
    meta,
    createdAt: new Date().toISOString(),
  };
  logger.audit(action, { userId, target, result });
  await insertOne('audit-logs.json', entry);

  // Trim periodically (cheap: only when above threshold)
  const all = await readJSON('audit-logs.json');
  if (Array.isArray(all) && all.length > MAX_ENTRIES) {
    const trimmed = all.slice(-MAX_ENTRIES);
    await writeJSON('audit-logs.json', trimmed);
  }
  return entry;
}

export async function listAudit({ limit = 100, userId = null } = {}) {
  const all = await readJSON('audit-logs.json');
  const filtered = userId ? all.filter((x) => x.userId === userId) : all;
  return filtered.slice(-limit).reverse();
}
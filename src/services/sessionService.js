// src/services/sessionService.js
import { randomToken, sha256 } from '../utils/crypto.js';
import { readJSON, updateJSON, generateId } from '../database/store.js';
import config from '../config/index.js';

const TTL_MS = config.sessionTtlHours * 60 * 60 * 1000;

export async function createSession({ userId, ip, userAgent }) {
  const token = randomToken(32);
  const tokenHash = sha256(token);
  const session = {
    id: generateId('ses'),
    userId,
    tokenHash,
    ip: ip || null,
    userAgent: userAgent || null,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS,
  };
  await updateJSON('sessions.json', (arr) => {
    if (!Array.isArray(arr)) arr = [];
    // prune expired
    arr = arr.filter((s) => s.expiresAt > Date.now());
    arr.push(session);
    return arr;
  });
  return { token, session };
}

export async function getSessionByToken(token) {
  if (!token) return null;
  const tokenHash = sha256(token);
  const arr = await readJSON('sessions.json');
  const s = arr.find((x) => x.tokenHash === tokenHash);
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    await destroySessionByToken(token);
    return null;
  }
  return s;
}

export async function destroySessionByToken(token) {
  const tokenHash = sha256(token);
  await updateJSON('sessions.json', (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x.tokenHash !== tokenHash);
  });
}

export async function destroyAllSessionsForUser(userId) {
  await updateJSON('sessions.json', (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x.userId !== userId);
  });
}

export async function pruneExpiredSessions() {
  await updateJSON('sessions.json', (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((s) => s.expiresAt > Date.now());
  });
}
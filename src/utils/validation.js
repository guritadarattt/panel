// src/utils/validation.js
import { badRequest } from './errors.js';

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertUsername(u) {
  if (typeof u !== 'string' || !USERNAME_RE.test(u)) {
    throw badRequest('Invalid username (3-32 chars: a-z A-Z 0-9 _ . -)');
  }
  return u;
}

export function assertEmail(e) {
  if (typeof e !== 'string' || !EMAIL_RE.test(e) || e.length > 254) {
    throw badRequest('Invalid email');
  }
  return e.toLowerCase();
}

export function assertPassword(p) {
  if (typeof p !== 'string' || p.length < 8 || p.length > 200) {
    throw badRequest('Password must be 8-200 chars');
  }
  return p;
}

export function assertString(v, name, { min = 1, max = 256 } = {}) {
  if (typeof v !== 'string' || v.length < min || v.length > max) {
    throw badRequest(`Invalid ${name}`);
  }
  return v;
}

export function assertInt(v, name, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw badRequest(`Invalid ${name}`);
  }
  return Math.floor(n);
}
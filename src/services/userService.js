// src/services/userService.js
import {
  readJSON,
  writeJSON,
  insertOne,
  updateOne,
  deleteOne,
  findOne,
  generateId,
} from '../database/store.js';
import { hashPassword } from '../utils/passwords.js';
import { validateUser } from '../database/schemas.js';
import { assertUsername, assertEmail, assertPassword } from '../utils/validation.js';
import { conflict, notFound } from '../utils/errors.js';

const DEFAULT_LIMITS = {
  maxServers: 3,
  maxRam: 2048,
  maxDisk: 5120,
  maxCpu: 200,
};

/**
 * Hapus field rahasia sebelum dikirim ke client.
 */
function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

/* =========================================================
   READ
========================================================= */

export async function listUsers() {
  const arr = await readJSON('users.json');
  return arr.map(publicUser);
}

/**
 * Ambil user mentah (termasuk passwordHash).
 * Dipakai internal oleh auth, middleware, dsb.
 */
export async function getUserById(id) {
  return findOne('users.json', (u) => u.id === id);
}

export async function getUserByUsername(username) {
  return findOne(
    'users.json',
    (u) => u.username.toLowerCase() === String(username).toLowerCase()
  );
}

export async function getUserByEmail(email) {
  return findOne(
    'users.json',
    (u) => u.email.toLowerCase() === String(email).toLowerCase()
  );
}

/* =========================================================
   CREATE
========================================================= */

export async function createUser({
  username,
  email,
  password,
  role = 'user',
  resourceLimits = {},
}) {
  assertUsername(username);
  assertEmail(email);
  assertPassword(password);
  if (!['admin', 'reseller', 'user'].includes(role)) {
    throw conflict('Invalid role');
  }

  const exists = await findOne(
    'users.json',
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() ||
      u.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) throw conflict('Username atau email sudah dipakai');

  const hash = await hashPassword(password);
  const now = new Date().toISOString();

  const user = {
    id: generateId('usr'),
    username,
    email: email.toLowerCase(),
    passwordHash: hash,
    role,
    status: 'active',
    resourceLimits: { ...DEFAULT_LIMITS, ...resourceLimits },
    createdAt: now,
    updatedAt: now,
  };

  validateUser(user);
  await insertOne('users.json', user);
  return publicUser(user);
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateUser(id, patch, { allowRole = false } = {}) {
  const target = await getUserById(id);
  if (!target) throw notFound('User tidak ditemukan');

  const safe = {};

  if (patch.username !== undefined) {
    assertUsername(patch.username);
    const exists = await findOne(
      'users.json',
      (u) =>
        u.id !== id &&
        u.username.toLowerCase() === String(patch.username).toLowerCase()
    );
    if (exists) throw conflict('Username sudah dipakai');
    safe.username = patch.username;
  }

  if (patch.email !== undefined) {
    assertEmail(patch.email);
    const exists = await findOne(
      'users.json',
      (u) => u.id !== id && u.email.toLowerCase() === String(patch.email).toLowerCase()
    );
    if (exists) throw conflict('Email sudah dipakai');
    safe.email = patch.email.toLowerCase();
  }

  if (patch.status !== undefined) {
    if (!['active', 'suspended'].includes(patch.status)) {
      throw conflict('Status tidak valid');
    }
    safe.status = patch.status;
  }

  if (patch.resourceLimits !== undefined) {
    safe.resourceLimits = { ...target.resourceLimits, ...patch.resourceLimits };
  }

  if (allowRole && patch.role !== undefined) {
    if (!['admin', 'reseller', 'user'].includes(patch.role)) {
      throw conflict('Role tidak valid');
    }
    safe.role = patch.role;
  }

  if (patch.password !== undefined) {
    assertPassword(patch.password);
    safe.passwordHash = await hashPassword(patch.password);
  }

  const updated = await updateOne('users.json', (u) => u.id === id, safe);
  return publicUser(updated);
}

/* =========================================================
   DELETE
========================================================= */

export async function deleteUser(id) {
  return deleteOne('users.json', (u) => u.id === id);
}

/* =========================================================
   HELPERS
========================================================= */

export function toPublic(u) {
  return publicUser(u);
}

/**
 * Utilitas: cek apakah user dengan username atau email tertentu ada.
 */
export async function usernameOrEmailExists(username, email, { excludeId = null } = {}) {
  const u = await findOne(
    'users.json',
    (x) =>
      x.id !== excludeId &&
      (x.username.toLowerCase() === String(username).toLowerCase() ||
        x.email.toLowerCase() === String(email).toLowerCase())
  );
  return !!u;
}
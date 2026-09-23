// src/services/serverService.js
import path from 'node:path';
import fs from 'node:fs/promises';
import { generateId, insertOne, updateOne, deleteOne, findOne, readJSON } from '../database/store.js';
import { validateServer } from '../database/schemas.js';
import { assertString, assertInt } from '../utils/validation.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import config from '../config/index.js';
import { getUserById } from './userService.js';

const ALLOWED_RUNTIMES = new Set(['node', 'python3', 'python', 'java', 'npm', 'pnpm', 'yarn', 'bun', 'deno', 'ruby', 'php']);

function sanitizeResources(res = {}) {
  return {
    memory: assertInt(res.memory ?? 256, 'memory (MB)', { min: 64, max: 65536 }),
    cpu: assertInt(res.cpu ?? 50, 'cpu (%)', { min: 5, max: 3200 }),
    disk: assertInt(res.disk ?? 512, 'disk (MB)', { min: 32, max: 1048576 }),
    pids: assertInt(res.pids ?? 100, 'pids', { min: 16, max: 8192 }),
  };
}

export async function listServersForUser(user) {
  const all = await readJSON('servers.json');
  if (user.role === 'admin') return all;
  return all.filter((s) => s.ownerId === user.id);
}

export async function getServer(id) {
  return findOne('servers.json', (s) => s.id === id);
}

export async function createServer({ name, ownerId, runtime, startup, resources, autoRestart = false, createdByRole }) {
  if (createdByRole && createdByRole !== 'admin') {
    throw forbidden('Hanya admin yang dapat membuat server');
  }
  assertString(name, 'name', { min: 1, max: 64 });
  if (!ALLOWED_RUNTIMES.has(runtime)) throw badRequest('Runtime not allowed');
  assertString(startup, 'startup', { min: 1, max: 512 });
  const owner = await getUserById(ownerId);
  if (!owner) throw notFound('Owner not found');
  if (owner.status !== 'active') throw conflict('Owner is suspended');

  const safeResources = sanitizeResources(resources);

  // Cek limit resource user (tetap berlaku)
  const ownerServers = (await readJSON('servers.json')).filter((s) => s.ownerId === ownerId);
  const lim = owner.resourceLimits || {};
  if (owner.role !== 'admin') {
    if (ownerServers.length + 1 > (lim.maxServers ?? 0)) {
      throw forbidden('Server count exceeds user limit');
    }
    const usedRam = ownerServers.reduce((a, s) => a + (s.resources?.memory || 0), 0);
    const usedCpu = ownerServers.reduce((a, s) => a + (s.resources?.cpu || 0), 0);
    const usedDisk = ownerServers.reduce((a, s) => a + (s.resources?.disk || 0), 0);
    if (usedRam + safeResources.memory > (lim.maxRam ?? 0)) throw forbidden('RAM limit exceeded');
    if (usedCpu + safeResources.cpu > (lim.maxCpu ?? 0)) throw forbidden('CPU limit exceeded');
    if (usedDisk + safeResources.disk > (lim.maxDisk ?? 0)) throw forbidden('Disk limit exceeded');
  }

  const now = new Date().toISOString();
  const server = {
    id: generateId('srv'),
    name,
    ownerId,
    runtime,
    startup,
    status: 'stopped',
    resources: safeResources,
    autoRestart,
    createdAt: now,
    updatedAt: now,
  };
  validateServer(server);
  await insertOne('servers.json', server);

  const dir = path.join(config.paths.serverRoot, server.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'README.txt'),
    `Welcome to ${name}\nPlace your files in this directory.\n`
  );
  return server;
}

export async function updateServer(id, patch, { allowOwnerChange = false } = {}) {
  const target = await getServer(id);
  if (!target) throw notFound('Server not found');
  const safe = {};
  if (patch.name !== undefined) safe.name = assertString(patch.name, 'name', { min: 1, max: 64 });
  if (patch.runtime !== undefined) {
    if (!ALLOWED_RUNTIMES.has(patch.runtime)) throw badRequest('Runtime not allowed');
    safe.runtime = patch.runtime;
  }
  if (patch.startup !== undefined) safe.startup = assertString(patch.startup, 'startup', { min: 1, max: 512 });
  if (patch.autoRestart !== undefined) safe.autoRestart = !!patch.autoRestart;
  if (patch.resources !== undefined) {
    safe.resources = sanitizeResources({ ...target.resources, ...patch.resources });
  }
  if (allowOwnerChange && patch.ownerId !== undefined) {
    const owner = await getUserById(patch.ownerId);
    if (!owner) throw notFound('Owner not found');
    safe.ownerId = patch.ownerId;
  }
  return updateOne('servers.json', (s) => s.id === id, safe);
}

export async function deleteServer(id) {
  const { deleteAllocationsForServer } = await import('./allocationService.js');
  await deleteAllocationsForServer(id);
  return deleteOne('servers.json', (s) => s.id === id);
}

export async function getServerDir(serverId) {
  const dir = path.join(config.paths.serverRoot, serverId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
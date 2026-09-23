// src/controllers/adminServerController.js
import * as svc from '../services/serverService.js';
import * as userSvc from '../services/userService.js';
import { getRuntime } from '../process/processManager.js';
import { audit } from '../services/auditService.js';
import { badRequest, notFound } from '../utils/errors.js';
import { readJSON, updateOne } from '../database/store.js';

export async function listAll(req, res) {
  const servers = await readJSON('servers.json');
  const users = await readJSON('users.json');
  const userMap = new Map(users.map((u) => [u.id, u.username]));
  const enriched = servers.map((s) => ({
    ...s,
    ownerUsername: userMap.get(s.ownerId) || '(unknown)',
  }));
  res.json({ servers: enriched });
}

export async function create(req, res) {
  const { name, ownerId, runtime, startup, resources, autoRestart } = req.body || {};
  if (!ownerId) throw badRequest('ownerId wajib diisi');

  const owner = await userSvc.getUserById(ownerId);
  if (!owner) throw notFound('User tidak ditemukan');
  if (owner.status !== 'active') throw badRequest('User sedang suspended');

  const server = await svc.createServer({
    name,
    ownerId,
    runtime,
    startup,
    resources,
    autoRestart: !!autoRestart,
    createdByRole: req.user.role,
  });
  await audit({
    userId: req.user.id,
    action: 'admin.server.create',
    target: server.id,
    ip: req.ip,
    meta: { ownerId },
  });
  res.status(201).json({ server });
}

/**
 * Update lengkap: nama, owner, runtime, startup, resource, autoRestart.
 * Hanya admin.
 */
export async function patch(req, res) {
  const server = await svc.getServer(req.params.id);
  if (!server) throw notFound('Server tidak ditemukan');

  const {
    name, ownerId, runtime, startup,
    resources, autoRestart,
  } = req.body || {};

  const patch = {};

  if (name !== undefined) patch.name = name;
  if (runtime !== undefined) patch.runtime = runtime;
  if (startup !== undefined) patch.startup = startup;
  if (resources !== undefined) patch.resources = resources;
  if (autoRestart !== undefined) patch.autoRestart = !!autoRestart;
  if (ownerId !== undefined && ownerId !== server.ownerId) {
    const owner = await userSvc.getUserById(ownerId);
    if (!owner) throw notFound('Owner baru tidak ditemukan');
    if (owner.status !== 'active') throw badRequest('Owner baru sedang suspended');
    patch.ownerId = ownerId;
  }

  if (Object.keys(patch).length === 0) {
    throw badRequest('Tidak ada perubahan');
  }

  const updated = await svc.updateServer(server.id, patch, { allowOwnerChange: true });

  await audit({
    userId: req.user.id,
    action: 'admin.server.update',
    target: server.id,
    ip: req.ip,
    meta: { fields: Object.keys(patch) },
  });

  res.json({ server: updated });
}

export async function suspend(req, res) {
  const server = await svc.getServer(req.params.id);
  if (!server) throw notFound();
  const rt = await getRuntime(server);
  if (rt.isAlive()) await rt.stop();
  const updated = await updateOne('servers.json', (s) => s.id === server.id, { status: 'suspended' });
  await audit({ userId: req.user.id, action: 'admin.server.suspend', target: server.id, ip: req.ip });
  res.json({ server: updated });
}

export async function unsuspend(req, res) {
  const server = await svc.getServer(req.params.id);
  if (!server) throw notFound();
  const updated = await updateOne('servers.json', (s) => s.id === server.id, { status: 'stopped' });
  await audit({ userId: req.user.id, action: 'admin.server.unsuspend', target: server.id, ip: req.ip });
  res.json({ server: updated });
}

export async function remove(req, res) {
  const server = await svc.getServer(req.params.id);
  if (!server) throw notFound();
  const rt = await getRuntime(server);
  if (rt.isAlive()) await rt.stop();
  await svc.deleteServer(server.id);
  await audit({ userId: req.user.id, action: 'admin.server.delete', target: server.id, ip: req.ip });
  res.json({ ok: true });
}
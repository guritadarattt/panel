// src/controllers/serverController.js
import * as svc from '../services/serverService.js';
import { getRuntime } from '../process/processManager.js';
import { serverStats } from '../resources/resourceManager.js';
import { audit } from '../services/auditService.js';
import { forbidden, notFound, badRequest } from '../utils/errors.js';

async function getOwned(req) {
  const server = await svc.getServer(req.params.id);
  if (!server) throw notFound('Server not found');
  if (req.user.role === 'admin') return server;
  if (server.ownerId !== req.user.id) throw forbidden();
  return server;
}

export async function list(req, res) {
  const servers = await svc.listServersForUser(req.user);
  res.json({ servers });
}

export async function get(req, res) {
  const server = await getOwned(req);
  res.json({ server });
}

export async function create(req, res) {
  if (req.user.role !== 'admin') {
    throw forbidden('Hanya admin yang dapat membuat server');
  }
  // Admin endpoint tersedia di /api/admin/servers
  // Fallback ini jarang dipakai, tapi biar tidak error kalau tetap dipanggil
  const { name, runtime, startup, resources, autoRestart, ownerId } = req.body || {};
  if (!ownerId) throw badRequest('ownerId wajib diisi');
  const server = await svc.createServer({
    name, ownerId, runtime, startup, resources, autoRestart,
    createdByRole: req.user.role,
  });
  await audit({ userId: req.user.id, action: 'server.create', target: server.id, ip: req.ip });
  res.status(201).json({ server });
}
export async function patch(req, res) {
  const server = await getOwned(req);

  // Admin → boleh semua field, tapi tetap lewat /api/admin/servers/:id
  // User biasa → HANYA boleh ubah "name"
  if (req.user.role !== 'admin') {
    const allowed = ['name'];
    const patch = {};
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    }
    if (Object.keys(patch).length === 0) {
      throw forbidden('Hanya admin yang dapat mengubah konfigurasi server');
    }
    const updated = await svc.updateServer(server.id, patch, { allowOwnerChange: false });
    await audit({ userId: req.user.id, action: 'server.rename', target: server.id, ip: req.ip });
    return res.json({ server: updated });
  }

  // Kalau admin akses lewat endpoint ini (jarang), izinkan semua
  const allowed = ['name', 'runtime', 'startup', 'autoRestart', 'resources', 'ownerId'];
  const patch = {};
  for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
  const server2 = await svc.updateServer(server.id, patch, { allowOwnerChange: true });
  await audit({ userId: req.user.id, action: 'server.update', target: server.id, ip: req.ip });
  res.json({ server: server2 });
}

export async function remove(req, res) {
  const server = await getOwned(req);
  const rt = await getRuntime(server);
  if (rt.isAlive()) await rt.stop();
  await svc.deleteServer(server.id);
  await audit({ userId: req.user.id, action: 'server.delete', target: server.id, ip: req.ip });
  res.json({ ok: true });
}

async function action(req, res, fn) {
  const server = await getOwned(req);
  const rt = await getRuntime(server);
  try {
    await fn(rt);
    await audit({ userId: req.user.id, action: `server.${req.path.split('/').pop()}`, target: server.id, ip: req.ip });
    res.json({ ok: true, status: rt.status, pid: rt.pid });
  } catch (e) {
    await audit({ userId: req.user.id, action: `server.${req.path.split('/').pop()}`, target: server.id, ip: req.ip, result: 'error', meta: { message: e.message } });
    throw e;
  }
}

export const start = (req, res) => action(req, res, (rt) => rt.start());
export const stop = (req, res) => action(req, res, (rt) => rt.stop());
export const restart = (req, res) => action(req, res, (rt) => rt.restart());
export const kill = (req, res) => action(req, res, (rt) => rt.kill());

export async function resources(req, res) {
  const server = await getOwned(req);
  const rt = await getRuntime(server);
  const stats = await serverStats(server.id, { pid: rt.pid, resources: server.resources });
  res.json({ stats });
}

export async function installDeps(req, res, next) {
  try {
    const server = await getOwned(req);
    const rt = await getRuntime(server);
    if (rt.isAlive()) throw forbidden('Stop server dulu sebelum install');

    const pm = (req.body?.packageManager || 'npm').toLowerCase();
    const result = await rt.installDeps({ packageManager: pm });

    await audit({
      userId: req.user.id,
      action: 'server.install',
      target: server.id,
      ip: req.ip,
      meta: { packageManager: pm, exitCode: result.exitCode },
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
}
// src/controllers/allocationController.js
import * as svc from '../services/allocationService.js';
import { getServer } from '../services/serverService.js';
import { audit } from '../services/auditService.js';
import { forbidden, notFound } from '../utils/errors.js';

async function authorizeServer(req, serverId) {
  const server = await getServer(serverId);
  if (!server) throw notFound('Server tidak ditemukan');
  if (req.user.role !== 'admin' && server.ownerId !== req.user.id) throw forbidden();
  return server;
}

export async function listForServer(req, res) {
  const server = await authorizeServer(req, req.params.id);
  const allocs = await svc.listAllocations({ serverId: server.id });
  res.json({ allocations: allocs });
}

export async function createForServer(req, res) {
  const server = await authorizeServer(req, req.params.id);
  const { ip = '0.0.0.0', port, protocol = 'tcp', notes = '', auto = false } = req.body || {};

  let finalPort = port;
  if (auto || port === undefined || port === null || port === '') {
    finalPort = await svc.findFreePort({ ip, start: 20000, end: 40000, protocol });
  }

  const alloc = await svc.createAllocation({
    serverId: server.id,
    ownerId: server.ownerId,
    ip, port: finalPort, protocol, notes,
  });
  await audit({
    userId: req.user.id,
    action: 'allocation.create',
    target: alloc.id,
    ip: req.ip,
    meta: { serverId: server.id, port: finalPort },
  });
  res.status(201).json({ allocation: alloc });
}

export async function listAll(req, res) {
  if (req.user.role !== 'admin') throw forbidden();
  const allocs = await svc.listAllocations();
  res.json({ allocations: allocs });
}

export async function remove(req, res) {
  const alloc = await svc.getAllocation(req.params.allocId);
  if (!alloc) throw notFound();
  const server = await getServer(alloc.serverId);
  if (!server) throw notFound('Server tidak ditemukan');
  if (req.user.role !== 'admin' && server.ownerId !== req.user.id) throw forbidden();
  await svc.deleteAllocation(alloc.id);
  await audit({ userId: req.user.id, action: 'allocation.delete', target: alloc.id, ip: req.ip });
  res.json({ ok: true });
}

export async function patch(req, res) {
  const alloc = await svc.getAllocation(req.params.allocId);
  if (!alloc) throw notFound();
  const server = await getServer(alloc.serverId);
  if (!server) throw notFound('Server tidak ditemukan');
  if (req.user.role !== 'admin' && server.ownerId !== req.user.id) throw forbidden();
  const updated = await svc.updateAllocation(alloc.id, { notes: req.body?.notes });
  res.json({ allocation: updated });
}
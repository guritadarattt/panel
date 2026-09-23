// src/controllers/userController.js
import * as svc from '../services/userService.js';
import { audit } from '../services/auditService.js';
import { assertUsername, assertEmail, assertPassword } from '../utils/validation.js';
import { badRequest, notFound } from '../utils/errors.js';
import { destroyAllSessionsForUser } from '../services/sessionService.js';

export async function list(req, res) {
  const users = await svc.listUsers();
  res.json({ users });
}

export async function get(req, res) {
  const u = await svc.getUserById(req.params.id);
  if (!u) throw notFound();
  res.json({ user: svc.toPublic(u) });
}

export async function create(req, res) {
  const { username, email, password, role, resourceLimits } = req.body || {};
  assertUsername(username);
  assertEmail(email);
  assertPassword(password);
  const user = await svc.createUser({
    username, email, password,
    role: role || 'user',
    resourceLimits,
  });
  await audit({ userId: req.user.id, action: 'user.create', target: user.id, ip: req.ip });
  res.status(201).json({ user });
}

export async function patch(req, res) {
  const allowed = ['email', 'status', 'resourceLimits', 'password'];
  if (req.user.role === 'admin') allowed.push('role');
  const patch = {};
  for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
  const user = await svc.updateUser(req.params.id, patch, { allowRole: req.user.role === 'admin' });

  // Kalau status berubah jadi suspended, cabut semua sesi
  if (patch.status === 'suspended') {
    await destroyAllSessionsForUser(req.params.id);
  }

  await audit({ userId: req.user.id, action: 'user.update', target: req.params.id, ip: req.ip, meta: { patch: Object.keys(patch) } });
  res.json({ user });
}

export async function ban(req, res) {
  if (req.params.id === req.user.id) throw badRequest('Tidak bisa suspend diri sendiri');
  const user = await svc.updateUser(req.params.id, { status: 'suspended' }, { allowRole: false });
  await destroyAllSessionsForUser(req.params.id);
  await audit({ userId: req.user.id, action: 'user.ban', target: req.params.id, ip: req.ip });
  res.json({ user });
}

export async function unban(req, res) {
  const user = await svc.updateUser(req.params.id, { status: 'active' }, { allowRole: false });
  await audit({ userId: req.user.id, action: 'user.unban', target: req.params.id, ip: req.ip });
  res.json({ user });
}

export async function remove(req, res) {
  if (req.params.id === req.user.id) throw badRequest('Tidak bisa menghapus diri sendiri');
  await svc.deleteUser(req.params.id);
  await destroyAllSessionsForUser(req.params.id);
  await audit({ userId: req.user.id, action: 'user.delete', target: req.params.id, ip: req.ip });
  res.json({ ok: true });
}
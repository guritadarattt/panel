// src/controllers/authController.js
import config from '../config/index.js';
import { createSession, destroySessionByToken } from '../services/sessionService.js';
import { getUserByUsername, createUser, toPublic } from '../services/userService.js';
import { verifyPassword } from '../utils/passwords.js';
import { assertUsername, assertEmail, assertPassword, assertString } from '../utils/validation.js';
import { audit } from '../services/auditService.js';
import { unauthorized, badRequest } from '../utils/errors.js';
import { getSettings } from '../services/settingsService.js';

export async function postLogin(req, res) {
  const { username, password } = req.body || {};
  try {
    assertString(username, 'username', { min: 1, max: 64 });
    assertString(password, 'password', { min: 1, max: 256 });
  } catch (e) {
    await audit({ action: 'login.fail', result: 'invalid_input', ip: req.ip });
    throw badRequest('Invalid credentials');
  }

  const user = await getUserByUsername(username);
  if (!user) {
    await audit({ action: 'login.fail', result: 'no_user', ip: req.ip, meta: { username } });
    throw unauthorized('Invalid credentials');
  }
  if (user.status !== 'active') {
    await audit({ userId: user.id, action: 'login.fail', result: 'suspended', ip: req.ip });
    throw unauthorized('Account suspended');
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await audit({ userId: user.id, action: 'login.fail', result: 'bad_password', ip: req.ip });
    throw unauthorized('Invalid credentials');
  }

  const { token } = await createSession({
    userId: user.id,
    ip: req.ip,
    userAgent: req.get('user-agent') || null,
  });

  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: '/',
    maxAge: config.sessionTtlHours * 3600 * 1000,
  });

  await audit({ userId: user.id, action: 'login.success', ip: req.ip });
  res.json({ user: toPublic(user) });
}

export async function postLogout(req, res) {
  const token = req.cookies?.[config.sessionCookieName];
  if (token) await destroySessionByToken(token);
  res.clearCookie(config.sessionCookieName, { path: '/' });
  if (req.user) await audit({ userId: req.user.id, action: 'logout', ip: req.ip });
  res.json({ ok: true });
}

export async function getMe(req, res) {
  if (!req.user) return res.json({ user: null });
  res.json({ user: toPublic(req.user) });
}

export async function postRegister(req, res) {
  const settings = await getSettings();
  if (!config.allowRegistration && !settings.allowRegistration) {
    throw badRequest('Registration disabled');
  }
  const { username, email, password } = req.body || {};
  assertUsername(username);
  assertEmail(email);
  assertPassword(password);
  const user = await createUser({ username, email, password, role: 'user' });
  await audit({ userId: user.id, action: 'user.register', ip: req.ip });
  res.status(201).json({ user });
}

export async function postChangePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  assertString(currentPassword, 'currentPassword', { min: 1, max: 256 });
  assertPassword(newPassword);
  const ok = await verifyPassword(currentPassword, req.user.passwordHash);
  if (!ok) throw unauthorized('Current password incorrect');
  const { updateUser } = await import('../services/userService.js');
  await updateUser(req.user.id, { password: newPassword });
  await audit({ userId: req.user.id, action: 'user.password.change', ip: req.ip });
  res.json({ ok: true });
}
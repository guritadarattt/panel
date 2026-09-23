// src/controllers/accountController.js
import { updateUser } from '../services/userService.js';
import { verifyPassword } from '../utils/passwords.js';
import { destroyAllSessionsForUser, createSession } from '../services/sessionService.js';
import { audit } from '../services/auditService.js';
import { assertUsername, assertEmail, assertPassword, assertString } from '../utils/validation.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import config from '../config/index.js';

/** Info user yang sedang login */
export async function me(req, res) {
  const u = req.user;
  const { passwordHash, ...rest } = u;
  res.json({ user: rest });
}

/** Ubah profil (username/email) */
export async function updateProfile(req, res) {
  const { username, email } = req.body || {};
  const patch = {};
  if (username !== undefined) patch.username = username;
  if (email !== undefined) patch.email = email;

  if (Object.keys(patch).length === 0) {
    throw badRequest('Tidak ada perubahan');
  }

  const updated = await updateUser(req.user.id, patch, { allowRole: false });
  await audit({ userId: req.user.id, action: 'account.profile.update', ip: req.ip });

  res.json({ user: updated });
}

/** Ubah password — wajib isi password lama */
export async function updatePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  assertString(currentPassword, 'currentPassword', { min: 1, max: 256 });
  assertPassword(newPassword);

  if (newPassword !== confirmPassword) {
    throw badRequest('Konfirmasi password tidak cocok');
  }
  if (newPassword === currentPassword) {
    throw badRequest('Password baru harus berbeda dengan password lama');
  }

  const ok = await verifyPassword(currentPassword, req.user.passwordHash);
  if (!ok) throw unauthorized('Password lama salah');

  await updateUser(req.user.id, { password: newPassword });

  // Setelah ganti password, cabut semua sesi LAIN tapi pertahankan sesi saat ini.
  // Caranya: hapus semua sesi user, lalu buat sesi baru untuk user ini.
  await destroyAllSessionsForUser(req.user.id);

  const { token } = await createSession({
    userId: req.user.id,
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

  await audit({ userId: req.user.id, action: 'account.password.change', ip: req.ip });
  res.json({ ok: true, message: 'Password diubah. Sesi lain diputus.' });
}
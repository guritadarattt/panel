// src/controllers/settingsController.js
import * as svc from '../services/settingsService.js';
import { audit } from '../services/auditService.js';
import { badRequest } from '../utils/errors.js';

const MAX_LOGO_BYTES = 512 * 1024; // 512 KB
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];

export async function get(req, res) {
  const s = await svc.getSettings();
  res.json({ settings: s });
}

export async function patch(req, res) {
  const { panelName, allowRegistration, suspendedMessage } = req.body || {};
  const patch = {};

  if (panelName !== undefined) {
    if (typeof panelName !== 'string' || panelName.length === 0 || panelName.length > 64) {
      throw badRequest('panelName harus 1-64 karakter');
    }
    patch.panelName = panelName.trim();
  }

  if (allowRegistration !== undefined) {
    patch.allowRegistration = !!allowRegistration;
  }

  if (suspendedMessage !== undefined) {
    if (typeof suspendedMessage !== 'string' || suspendedMessage.length > 300) {
      throw badRequest('suspendedMessage terlalu panjang');
    }
    patch.suspendedMessage = suspendedMessage;
  }

  const updated = await svc.updateSettings(patch);
  await audit({ userId: req.user.id, action: 'settings.update', ip: req.ip, meta: { keys: Object.keys(patch) } });
  res.json({ settings: updated });
}

/**
 * Upload logo. Body: { dataUrl: "data:image/png;base64,..." }
 */
export async function uploadLogo(req, res) {
  const { dataUrl } = req.body || {};
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw badRequest('Format logo tidak valid');
  }
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw badRequest('Format data URL tidak valid');
  const mime = m[1];
  const b64 = m[2];

  if (!ALLOWED_MIME.includes(mime)) {
    throw badRequest(`Tipe gambar tidak didukung: ${mime}`);
  }
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > MAX_LOGO_BYTES) {
    throw badRequest(`Logo terlalu besar (maks ${MAX_LOGO_BYTES / 1024} KB)`);
  }

  const updated = await svc.updateSettings({ logoDataUrl: dataUrl });
  await audit({ userId: req.user.id, action: 'settings.logo.upload', ip: req.ip, meta: { mime, bytes: buf.length } });
  res.json({ settings: updated });
}

export async function deleteLogo(req, res) {
  const updated = await svc.updateSettings({ logoDataUrl: null });
  await audit({ userId: req.user.id, action: 'settings.logo.delete', ip: req.ip });
  res.json({ settings: updated });
}

/**
 * Endpoint publik — dipakai halaman login untuk branding.
 */
export async function publicInfo(_req, res) {
  const s = await svc.getSettings();
  res.json({
    panelName: s.panelName,
    logoDataUrl: s.logoDataUrl,
  });
}
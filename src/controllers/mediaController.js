// src/controllers/mediaController.js
import * as svc from '../services/mediaService.js';
import * as settingsSvc from '../services/settingsService.js';
import { audit } from '../services/auditService.js';

/* ---------- Public ---------- */

export async function background(_req, res) {
  const bg = await svc.readBackground();
  if (!bg) return res.status(404).send('No background');
  res.setHeader('Content-Type', bg.mime);
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.send(bg.buf);
}

export async function appearance(_req, res) {
  const s = await settingsSvc.getSettings();
  res.json({
    backgroundUrl: s.backgroundUrl,
    backgroundType: s.backgroundType,
    backgroundOpacity: s.backgroundOpacity,
    backgroundBlur: s.backgroundBlur,
    backgroundUpdatedAt: s.backgroundUpdatedAt,
    musicEnabled: s.musicEnabled,
    musicAutoplay: s.musicAutoplay,
    musicLoop: s.musicLoop,
    musicVolume: s.musicVolume,
    musicShowOnLogin: s.musicShowOnLogin,
  });
}

export async function playlist(_req, res) {
  const s = await settingsSvc.getSettings();
  if (!s.musicEnabled) return res.json({ tracks: [] });
  const tracks = await svc.listTracks();
  res.json({
    tracks: tracks.map((t) => ({ title: t.title, filename: t.filename, url: t.url })),
  });
}

export async function music(req, res) {
  const { filename } = req.params;
  const { buf, mime, size } = await svc.readTrack(filename);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', String(size));
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buf);
}

/* ---------- Admin ---------- */

export async function uploadBackground(req, res) {
  const result = await svc.setBackground(req.file);
  await audit({
    userId: req.user.id,
    action: 'media.background.upload',
    ip: req.ip,
    meta: { type: result.type },
  });
  res.json({ ok: true, ...result });
}

export async function deleteBackground(req, res) {
  await svc.clearBackground();
  await audit({ userId: req.user.id, action: 'media.background.delete', ip: req.ip });
  res.json({ ok: true });
}

export async function updateAppearanceSettings(req, res) {
  const allowed = [
    'backgroundOpacity', 'backgroundBlur',
    'musicEnabled', 'musicAutoplay', 'musicLoop', 'musicVolume', 'musicShowOnLogin',
  ];
  const patch = {};
  for (const k of allowed) {
    if (req.body?.[k] !== undefined) patch[k] = req.body[k];
  }
  const updated = await settingsSvc.updateSettings(patch);
  await audit({
    userId: req.user.id,
    action: 'media.settings.update',
    ip: req.ip,
    meta: { keys: Object.keys(patch) },
  });
  res.json({
    settings: {
      backgroundUrl: updated.backgroundUrl,
      backgroundType: updated.backgroundType,
      backgroundOpacity: updated.backgroundOpacity,
      backgroundBlur: updated.backgroundBlur,
      backgroundUpdatedAt: updated.backgroundUpdatedAt,
      musicEnabled: updated.musicEnabled,
      musicAutoplay: updated.musicAutoplay,
      musicLoop: updated.musicLoop,
      musicVolume: updated.musicVolume,
      musicShowOnLogin: updated.musicShowOnLogin,
    },
  });
}

export async function listMusic(_req, res) {
  res.json({ tracks: await svc.listTracks() });
}

export async function uploadMusic(req, res) {
  const result = await svc.addTrack(req.file);
  await audit({
    userId: req.user.id,
    action: 'media.music.upload',
    ip: req.ip,
    meta: { filename: result.filename },
  });
  res.status(201).json({ ok: true, ...result });
}

export async function deleteMusic(req, res) {
  const { filename } = req.params;
  await svc.deleteTrack(filename);
  await audit({
    userId: req.user.id,
    action: 'media.music.delete',
    ip: req.ip,
    meta: { filename },
  });
  res.json({ ok: true });
}
// src/services/mediaService.js
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import config from '../config/index.js';
import { badRequest, notFound } from '../utils/errors.js';
import * as settingsSvc from './settingsService.js';

const MEDIA_DIR = path.join(config.paths.storage, 'media');
const MUSIC_DIR = path.join(MEDIA_DIR, 'music');

const BG_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm'];
const AUDIO_EXTS = ['.mp3', '.ogg', '.wav', '.m4a'];
const MAX_BG_BYTES = 20 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_TRACKS = 50;

export async function ensureDirs() {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.mkdir(MUSIC_DIR, { recursive: true });
  return { MEDIA_DIR, MUSIC_DIR };
}

export function getMediaDir() { return MEDIA_DIR; }
export function getMusicDir() { return MUSIC_DIR; }

function safeExt(originalName, allowed) {
  const ext = path.extname(originalName || '').toLowerCase();
  if (!allowed.includes(ext)) {
    throw badRequest(`Ekstensi tidak didukung: ${ext || '(kosong)'}`);
  }
  return ext;
}

/* =========================================================
   BACKGROUND
========================================================= */

export async function setBackground(file) {
  if (!file) throw badRequest('File tidak ditemukan');
  await ensureDirs();

  const ext = safeExt(file.originalname, BG_EXTS);
  if (file.size > MAX_BG_BYTES) {
    throw badRequest(`Background > ${MAX_BG_BYTES / 1024 / 1024} MB`);
  }

  await clearBackgroundFiles();

  const filename = `background${ext}`;
  const dest = path.join(MEDIA_DIR, filename);
  await fs.rename(file.path, dest);
  await fs.chmod(dest, 0o644);

  const isVideo = ['.mp4', '.webm'].includes(ext);
  const url = `/api/media/background`;

  await settingsSvc.updateSettings({
    backgroundUrl: url,
    backgroundType: isVideo ? 'video' : 'image',
    backgroundUpdatedAt: Date.now(),
  });

  return { url, type: isVideo ? 'video' : 'image', size: file.size };
}

async function clearBackgroundFiles() {
  await ensureDirs();
  const entries = await fs.readdir(MEDIA_DIR, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name.startsWith('background.')) {
      await fs.unlink(path.join(MEDIA_DIR, e.name)).catch(() => {});
    }
  }
}

export async function clearBackground() {
  await clearBackgroundFiles();
  await settingsSvc.updateSettings({
    backgroundUrl: null,
    backgroundType: null,
    backgroundUpdatedAt: null,
  });
}

export async function readBackground() {
  await ensureDirs();
  const entries = await fs.readdir(MEDIA_DIR).catch(() => []);
  const bg = entries.find((n) => n.startsWith('background.'));
  if (!bg) return null;
  const full = path.join(MEDIA_DIR, bg);
  const buf = await fs.readFile(full);
  const ext = path.extname(bg).toLowerCase();
  const mime = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  }[ext] || 'application/octet-stream';
  return { buf, mime, filename: bg };
}

/* =========================================================
   MUSIC
========================================================= */

export async function listTracks() {
  await ensureDirs();
  const entries = await fs.readdir(MUSIC_DIR, { withFileTypes: true }).catch(() => []);
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name.startsWith('.')) continue;
    const full = path.join(MUSIC_DIR, e.name);
    let stat;
    try { stat = await fs.stat(full); } catch { continue; }
    const ext = path.extname(e.name).toLowerCase();
    if (!AUDIO_EXTS.includes(ext)) continue;
    out.push({
      filename: e.name,
      title: path.basename(e.name, ext),
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      url: `/api/media/music/${encodeURIComponent(e.name)}`,
    });
  }
  out.sort((a, b) => a.filename.localeCompare(b.filename));
  return out;
}

export async function addTrack(file) {
  if (!file) throw badRequest('File tidak ditemukan');
  await ensureDirs();

  const ext = safeExt(file.originalname, AUDIO_EXTS);
  if (file.size > MAX_AUDIO_BYTES) {
    throw badRequest(`Lagu > ${MAX_AUDIO_BYTES / 1024 / 1024} MB`);
  }

  const tracks = await listTracks();
  if (tracks.length >= MAX_TRACKS) {
    throw badRequest(`Maks ${MAX_TRACKS} lagu`);
  }

  const base = path.basename(file.originalname, ext)
    .replace(/[^\w\u00C0-\u024F\s\-_.]/g, '_')
    .slice(0, 60)
    .trim() || 'track';
  const hash = crypto.randomBytes(3).toString('hex');
  const filename = `${base}_${hash}${ext}`;
  const dest = path.join(MUSIC_DIR, filename);

  await fs.rename(file.path, dest);
  await fs.chmod(dest, 0o644);

  return {
    filename,
    title: base,
    url: `/api/media/music/${encodeURIComponent(filename)}`,
  };
}

export async function deleteTrack(filename) {
  if (!filename || typeof filename !== 'string') throw badRequest('Filename wajib');
  if (filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    throw badRequest('Filename tidak valid');
  }
  const ext = path.extname(filename).toLowerCase();
  if (!AUDIO_EXTS.includes(ext)) throw badRequest('Ekstensi tidak didukung');

  const full = path.join(MUSIC_DIR, filename);
  try {
    await fs.unlink(full);
  } catch {
    throw notFound('Lagu tidak ditemukan');
  }
  return { ok: true };
}

export async function readTrack(filename) {
  if (!filename || typeof filename !== 'string') throw badRequest('Filename wajib');
  if (filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    throw badRequest('Filename tidak valid');
  }
  const ext = path.extname(filename).toLowerCase();
  if (!AUDIO_EXTS.includes(ext)) throw badRequest('Ekstensi tidak didukung');

  const full = path.join(MUSIC_DIR, filename);
  let stat;
  try { stat = await fs.stat(full); } catch { throw notFound('Lagu tidak ditemukan'); }

  const buf = await fs.readFile(full);
  const mime = {
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
  }[ext] || 'application/octet-stream';

  return { buf, mime, size: stat.size };
}
// src/services/themeService.js
import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { badRequest, notFound } from '../utils/errors.js';

const THEMES_DIR = path.join(config.paths.root, 'themes');
const THEME_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

export async function ensureThemesDir() {
  await fs.mkdir(THEMES_DIR, { recursive: true });
  return THEMES_DIR;
}

export function getThemesDir() {
  return THEMES_DIR;
}

export async function listThemes() {
  await ensureThemesDir();
  const entries = await fs.readdir(THEMES_DIR, { withFileTypes: true }).catch(() => []);
  const out = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.')) continue;
    try {
      const theme = await loadTheme(e.name);
      if (theme) out.push(theme);
    } catch (err) {
      logger.warn('theme.load.failed', { name: e.name, message: err.message });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function loadTheme(name) {
  if (!THEME_NAME_RE.test(name)) return null;

  const dir = path.join(THEMES_DIR, name);
  const pkgPath = path.join(dir, 'package.json');

  let pkgRaw;
  try {
    pkgRaw = await fs.readFile(pkgPath, 'utf8');
  } catch {
    throw new Error(`package.json tidak ditemukan di tema "${name}"`);
  }

  let pkg;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch (e) {
    throw new Error(`package.json tema "${name}" bukan JSON valid: ${e.message}`);
  }

  if (pkg.gurita?.type && pkg.gurita.type !== 'theme') {
    throw new Error(`package.json tema "${name}" memiliki type bukan "theme"`);
  }
  if (!pkg.name) throw new Error(`package.json tema "${name}" tidak punya field "name"`);

  const entry = pkg.entry || 'theme.css';
  if (!/^[\w.\-]+\.css$/i.test(entry)) {
    throw new Error(`Field "entry" harus file .css`);
  }
  try {
    await fs.access(path.join(dir, entry));
  } catch {
    throw new Error(`File entry "${entry}" tidak ditemukan di tema "${name}"`);
  }

  let previewExists = false;
  if (pkg.preview) {
    try {
      await fs.access(path.join(dir, pkg.preview));
      previewExists = true;
    } catch {}
  }

  return {
    folder: name,
    name: pkg.name,
    displayName: pkg.displayName || pkg.name,
    version: pkg.version || '0.0.0',
    author: pkg.author || 'unknown',
    description: pkg.description || '',
    entry,
    preview: previewExists ? pkg.preview : null,
    minPanelVersion: pkg.gurita?.minPanelVersion || null,
  };
}

export async function readThemeCss(folder) {
  const theme = await loadTheme(folder);
  if (!theme) throw notFound('Tema tidak ditemukan');
  const cssPath = path.join(THEMES_DIR, folder, theme.entry);
  const css = await fs.readFile(cssPath, 'utf8');
  return { css, theme };
}

export async function readThemePreview(folder) {
  const theme = await loadTheme(folder);
  if (!theme) throw notFound('Tema tidak ditemukan');
  if (!theme.preview) throw notFound('Tema ini tidak punya preview');
  const p = path.join(THEMES_DIR, folder, theme.preview);
  const buf = await fs.readFile(p);
  const ext = path.extname(theme.preview).toLowerCase();
  const mime = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  }[ext] || 'application/octet-stream';
  return { buf, mime };
}

export async function deleteTheme(folder) {
  if (!THEME_NAME_RE.test(folder)) throw badRequest('Nama tema tidak valid');
  if (folder === 'default') throw badRequest('Tema "default" tidak bisa dihapus');
  const dir = path.join(THEMES_DIR, folder);
  try {
    await fs.access(dir);
  } catch {
    throw notFound('Tema tidak ditemukan');
  }
  await fs.rm(dir, { recursive: true, force: true });
  return { ok: true };
}

export function isValidThemeName(name) {
  return typeof name === 'string' && THEME_NAME_RE.test(name);
}
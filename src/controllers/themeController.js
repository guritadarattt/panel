// src/controllers/themeController.js
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import unzipper from 'unzipper';
import * as themeSvc from '../services/themeService.js';
import * as settingsSvc from '../services/settingsService.js';
import { audit } from '../services/auditService.js';
import { badRequest } from '../utils/errors.js';

// src/controllers/themeController.js — tambahkan import di atas
import * as githubSvc from '../services/themeGithubService.js';


/** Publik — CSS tema aktif */
export async function activeCss(_req, res) {
  const settings = await settingsSvc.getSettings();
  const folder = settings.activeTheme || 'default';
  try {
    const { css } = await themeSvc.readThemeCss(folder);
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(css);
  } catch {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.send('/* theme not found */');
  }
}

/** Publik — info tema aktif */
export async function activeInfo(_req, res) {
  const settings = await settingsSvc.getSettings();
  const folder = settings.activeTheme || 'default';
  try {
    const theme = await themeSvc.loadTheme(folder);
    res.json({ theme });
  } catch {
    res.json({ theme: { folder: 'default', name: 'default', displayName: 'Default' } });
  }
}

/** Admin — list semua tema */
export async function list(_req, res) {
  const themes = await themeSvc.listThemes();
  const settings = await settingsSvc.getSettings();
  res.json({ themes, active: settings.activeTheme || 'default' });
}

/** Admin — preview */
export async function preview(req, res) {
  const { folder } = req.params;
  const { buf, mime } = await themeSvc.readThemePreview(folder);
  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buf);
}

/** Admin — aktifkan */
export async function activate(req, res) {
  const { folder } = req.params;
  if (!themeSvc.isValidThemeName(folder)) throw badRequest('Nama tema tidak valid');
  await themeSvc.loadTheme(folder);
  const settings = await settingsSvc.updateSettings({ activeTheme: folder });
  await audit({ userId: req.user.id, action: 'theme.activate', target: folder, ip: req.ip });
  res.json({ ok: true, active: settings.activeTheme });
}

/** Admin — hapus */
export async function remove(req, res) {
  const { folder } = req.params;
  const settings = await settingsSvc.getSettings();
  if ((settings.activeTheme || 'default') === folder) {
    throw badRequest('Tidak bisa menghapus tema yang sedang aktif');
  }
  await themeSvc.deleteTheme(folder);
  await audit({ userId: req.user.id, action: 'theme.delete', target: folder, ip: req.ip });
  res.json({ ok: true });
}

/** Admin — upload zip */
export async function upload(req, res) {
  if (!req.file) throw badRequest('File zip wajib');
  const themeDir = themeSvc.getThemesDir();
  const tmpZip = req.file.path;

  try {
    const directory = await unzipper.Open.file(tmpZip);

    const pkgEntry = directory.files.find((f) =>
      f.path === 'package.json' || /^[^/]+\/package\.json$/.test(f.path)
    );
    if (!pkgEntry) throw badRequest('Zip harus mengandung package.json');

    const prefix = pkgEntry.path === 'package.json'
      ? ''
      : pkgEntry.path.replace(/\/package\.json$/, '') + '/';

    const chunks = [];
    for await (const c of pkgEntry.stream()) chunks.push(c);
    const pkgRaw = Buffer.concat(chunks).toString('utf8');

    let pkg;
    try { pkg = JSON.parse(pkgRaw); } catch { throw badRequest('package.json tidak valid'); }
    if (!pkg.name) throw badRequest('package.json harus punya field "name"');

    const folderName = String(pkg.name).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!themeSvc.isValidThemeName(folderName)) {
      throw badRequest('Nama tema tidak valid (a-z 0-9 _ -)');
    }

    const targetDir = path.join(themeDir, folderName);
    try {
      await fs.access(targetDir);
      throw badRequest(`Tema "${folderName}" sudah ada. Hapus dulu.`);
    } catch (e) {
      if (e.status) throw e;
    }

    await fs.mkdir(targetDir, { recursive: true });

    for (const entry of directory.files) {
      let relPath = entry.path;
      if (prefix && relPath.startsWith(prefix)) {
        relPath = relPath.slice(prefix.length);
      }
      if (!relPath) continue;

      const resolved = path.resolve(targetDir, relPath);
      const base = path.resolve(targetDir);
      if (resolved !== base && !resolved.startsWith(base + path.sep)) {
        throw badRequest(`Zip berisi path tidak valid: ${relPath}`);
      }

      if (entry.type === 'Directory') {
        await fs.mkdir(resolved, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(resolved), { recursive: true });
        await new Promise((resolve, reject) => {
          entry.stream()
            .pipe(createWriteStream(resolved))
            .on('finish', resolve)
            .on('error', reject);
        });
      }
    }

    const loaded = await themeSvc.loadTheme(folderName);
    await fs.unlink(tmpZip).catch(() => {});

    await audit({
      userId: req.user.id,
      action: 'theme.upload',
      target: folderName,
      ip: req.ip,
      meta: { version: loaded.version },
    });

    res.status(201).json({ ok: true, theme: loaded });
  } catch (e) {
    await fs.unlink(tmpZip).catch(() => {});
    throw e;
  }
}

// ... kode yang sudah ada ...

/** Admin — import tema dari GitHub */
export async function importGithub(req, res) {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') throw badRequest('URL wajib diisi');

  const theme = await githubSvc.importFromGithub(url);

  await audit({
    userId: req.user.id,
    action: 'theme.import.github',
    target: theme.folder,
    ip: req.ip,
    meta: { url: url.slice(0, 200), version: theme.version },
  });

  res.status(201).json({ ok: true, theme });
}
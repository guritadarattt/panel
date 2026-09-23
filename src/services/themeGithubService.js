// src/services/themeGithubService.js
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import unzipper from 'unzipper';
import * as themeSvc from './themeService.js';
import { badRequest, conflict } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const ALLOWED_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'codeload.github.com',
]);

const MAX_ZIP_BYTES = 20 * 1024 * 1024;   // 20 MB
const MAX_FILES = 500;
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Parse URL GitHub menjadi komponen.
 * Mendukung:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/branch
 *   https://github.com/owner/repo/tree/branch/sub/folder
 *   https://github.com/owner/repo/archive/refs/heads/main.zip
 *   https://github.com/owner/repo/archive/refs/tags/v1.0.0.zip
 */
export function parseGithubUrl(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    throw badRequest('URL tidak valid');
  }

  if (url.protocol !== 'https:') throw badRequest('URL harus HTTPS');
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw badRequest('Hanya URL dari github.com yang diizinkan');
  }

  const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length < 2) throw badRequest('URL GitHub tidak lengkap');

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, '');

  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) {
    throw badRequest('Owner/repo tidak valid');
  }

  let branch = null;
  let subdir = '';
  let explicitZip = false;

  // /owner/repo/archive/refs/(heads|tags)/<branch>.zip
  if (parts[2] === 'archive' && parts[3] === 'refs' && (parts[4] === 'heads' || parts[4] === 'tags')) {
    branch = parts.slice(5).join('/').replace(/\.zip$/, '');
    explicitZip = true;
  }
  // /owner/repo/tree/<branch>/<subdir...>
  else if (parts[2] === 'tree' && parts[3]) {
    branch = parts[3];
    subdir = parts.slice(4).join('/');
  }

  return { owner, repo, branch, subdir, explicitZip };
}

/**
 * Cari default branch dari GitHub API (fallback: 'main', lalu 'master').
 */
async function getDefaultBranch(owner, repo) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'Gurita-Panel', 'Accept': 'application/vnd.github+json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (data?.default_branch) return data.default_branch;
    }
  } catch {}
  return 'main';
}

/**
 * Download zip dari codeload, simpan ke file sementara.
 */
async function downloadZip(owner, repo, branch) {
  const url = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${encodeURIComponent(branch)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Gurita-Panel' },
    signal: ctrl.signal,
    redirect: 'follow',
  });
  clearTimeout(timer);

  if (!res.ok) {
    if (res.status === 404) {
      throw badRequest(`Repo/branch tidak ditemukan: ${owner}/${repo}@${branch}`);
    }
    throw badRequest(`Gagal download zip: HTTP ${res.status}`);
  }

  const len = Number(res.headers.get('content-length') || 0);
  if (len && len > MAX_ZIP_BYTES) {
    throw badRequest(`Zip terlalu besar (${(len / 1024 / 1024).toFixed(1)} MB, max ${MAX_ZIP_BYTES / 1024 / 1024} MB)`);
  }

  const tmp = path.join(os.tmpdir(), `gurita-theme-${crypto.randomBytes(8).toString('hex')}.zip`);
  const out = createWriteStream(tmp);
  let written = 0;

  return new Promise((resolve, reject) => {
    res.body.pipe(out);
    res.body.on('data', (chunk) => {
      written += chunk.length;
      if (written > MAX_ZIP_BYTES) {
        try { res.body.destroy(); } catch {}
        try { out.destroy(); } catch {}
        fs.unlink(tmp).catch(() => {});
        reject(badRequest('Zip melebihi batas ukuran'));
      }
    });
    out.on('finish', () => resolve(tmp));
    out.on('error', (e) => { fs.unlink(tmp).catch(() => {}); reject(e); });
    res.body.on('error', (e) => { fs.unlink(tmp).catch(() => {}); reject(e); });
  });
}

/**
 * Import tema dari GitHub.
 * Return info tema yang di-import.
 */
export async function importFromGithub(rawUrl) {
  const { owner, repo, branch: explicitBranch, subdir, explicitZip } = parseGithubUrl(rawUrl);

  let branch = explicitBranch;
  if (!branch) {
    branch = await getDefaultBranch(owner, repo);
  }

  // Branch yang mengandung slash (mis. feature/x) perlu tetap URL-encoded
  const zipPath = await downloadZip(owner, repo, branch);

  try {
    const directory = await unzipper.Open.file(zipPath);

    if (directory.files.length > MAX_FILES) {
      throw badRequest(`Zip terlalu banyak file (>${MAX_FILES})`);
    }

    // Folder root di zip GitHub biasanya: <repo>-<branch>/
    // Cari package.json di subdir yang diminta.
    const wantedPrefix = subdir ? `${subdir.replace(/^\/+|\/+$/g, '')}/` : '';
    const pkgCandidates = directory.files.filter((f) => {
      if (wantedPrefix) {
        return f.path.endsWith(`${wantedPrefix}package.json`);
      }
      return f.path === 'package.json' || /^[^/]+\/package\.json$/.test(f.path);
    });

    if (pkgCandidates.length === 0) {
      throw badRequest(
        subdir
          ? `package.json tidak ditemukan di subfolder "${subdir}"`
          : 'package.json tidak ditemukan di repo'
      );
    }

    // Pilih kandidat pertama (paling masuk akal)
    const pkgEntry = pkgCandidates[0];
    const prefix = pkgEntry.path.replace(/\/package\.json$/, '') + '/';

    // Baca package.json
    const chunks = [];
    for await (const c of pkgEntry.stream()) chunks.push(c);
    const pkgRaw = Buffer.concat(chunks).toString('utf8');

    let pkg;
    try { pkg = JSON.parse(pkgRaw); } catch { throw badRequest('package.json tidak valid'); }
    if (!pkg.name) throw badRequest('package.json wajib punya field "name"');

    const folderName = String(pkg.name).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!themeSvc.isValidThemeName(folderName)) {
      throw badRequest('Nama tema di package.json tidak valid (a-z 0-9 _ -)');
    }

    const themesDir = themeSvc.getThemesDir();
    const targetDir = path.join(themesDir, folderName);

    // Cek tabrakan
    try {
      await fs.access(targetDir);
      throw conflict(`Tema "${folderName}" sudah ada. Hapus dulu dari panel.`);
    } catch (e) {
      if (e.status) throw e;
    }

    await fs.mkdir(targetDir, { recursive: true });

    const baseResolved = path.resolve(targetDir);
    let extracted = 0;

    for (const entry of directory.files) {
      let relPath = entry.path;

      // Kalau subdir diminta, hanya ambil file di dalam subdir itu
      if (prefix && relPath.startsWith(prefix)) {
        relPath = relPath.slice(prefix.length);
      } else if (prefix && relPath === prefix.replace(/\/$/, '')) {
        continue;
      } else if (prefix && !relPath.startsWith(prefix)) {
        // File di luar prefix (folder root repo) → skip
        continue;
      }

      if (!relPath) continue;

      // Cegah zip-slip
      const resolved = path.resolve(targetDir, relPath);
      if (resolved !== baseResolved && !resolved.startsWith(baseResolved + path.sep)) {
        throw badRequest(`Path tidak valid di zip: ${relPath}`);
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
        extracted++;
      }
    }

    // Validasi tema
    const loaded = await themeSvc.loadTheme(folderName);

    // Simpan metadata asal
    await fs.writeFile(
      path.join(targetDir, '.gurita-source.json'),
      JSON.stringify({
        source: 'github',
        url: rawUrl,
        owner, repo, branch, subdir: subdir || null,
        importedAt: new Date().toISOString(),
      }, null, 2)
    );

    logger.info('theme.github.import', { folder: folderName, owner, repo, branch, files: extracted });

    return loaded;
  } finally {
    await fs.unlink(zipPath).catch(() => {});
  }
}
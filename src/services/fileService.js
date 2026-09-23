// src/services/fileService.js
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import mime from 'mime-types';
import { safeJoin, assertSafeFilename } from '../utils/safePath.js';
import { badRequest, forbidden } from '../utils/errors.js';

export async function listDir(serverDir, rel = '.') {
  const target = await safeJoin(serverDir, rel);
  const stat = await fs.stat(target);
  if (!stat.isDirectory()) throw badRequest('Not a directory');
  const entries = await fs.readdir(target, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(target, e.name);
    let s;
    try { s = await fs.lstat(full); } catch { continue; }
    out.push({
      name: e.name,
      isDir: s.isDirectory(),
      isSymlink: s.isSymbolicLink(),
      size: s.size,
      mode: (s.mode & 0o777).toString(8),
      modified: s.mtime.toISOString(),
    });
  }
  return out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
}

export async function readFile(serverDir, rel, { maxBytes = 5 * 1024 * 1024 } = {}) {
  const target = await safeJoin(serverDir, rel);
  const stat = await fs.stat(target);
  if (stat.isDirectory()) throw badRequest('Is a directory');
  if (stat.size > maxBytes) throw badRequest('File too large to open');
  const buf = await fs.readFile(target);
  return { content: buf.toString('utf8'), size: stat.size };
}

export async function writeFile(serverDir, rel, content, { maxBytes = 5 * 1024 * 1024 } = {}) {
  if (typeof content !== 'string') throw badRequest('Content must be string');
  if (Buffer.byteLength(content, 'utf8') > maxBytes) throw badRequest('File too large');
  const target = await safeJoin(serverDir, rel);
  const parent = path.dirname(target);
  await fs.mkdir(parent, { recursive: true });
  await fs.writeFile(target, content, { mode: 0o640 });
  return { ok: true };
}

export async function createFile(serverDir, rel, name) {
  assertSafeFilename(name);
  const dir = await safeJoin(serverDir, rel);
  const target = await safeJoin(dir, name);
  try {
    await fs.writeFile(target, '', { flag: 'wx', mode: 0o640 });
  } catch (e) {
    if (e.code === 'EEXIST') throw badRequest('File exists');
    throw e;
  }
  return { ok: true };
}

export async function createFolder(serverDir, rel, name) {
  assertSafeFilename(name);
  const dir = await safeJoin(serverDir, rel);
  const target = await safeJoin(dir, name);
  await fs.mkdir(target, { recursive: false });
  return { ok: true };
}

export async function renameEntry(serverDir, rel, from, to) {
  assertSafeFilename(from);
  assertSafeFilename(to);
  const dir = await safeJoin(serverDir, rel);
  const s = await safeJoin(dir, from);
  const d = await safeJoin(dir, to);
  await fs.rename(s, d);
  return { ok: true };
}

export async function deleteEntry(serverDir, rel) {
  const target = await safeJoin(serverDir, rel);
  const stat = await fs.lstat(target);
  if (stat.isDirectory()) {
    await fs.rm(target, { recursive: true, force: false });
  } else {
    await fs.unlink(target);
  }
  return { ok: true };
}

export async function extractZip(serverDir, rel, zipRel, destRel = '.') {
  const zipPath = await safeJoin(serverDir, zipRel);
  const destDir = await safeJoin(serverDir, destRel);
  await fs.mkdir(destDir, { recursive: true });

  const directory = await unzipper.Open.file(zipPath);
  const baseResolved = path.resolve(destDir);

  for (const entry of directory.files) {
    const resolved = path.resolve(path.join(destDir, entry.path));
    if (resolved !== baseResolved && !resolved.startsWith(baseResolved + path.sep)) {
      throw forbidden('Zip contains invalid path');
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
  return { ok: true };
}

export async function createZipStream(serverDir, relPaths) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  for (const rel of relPaths) {
    const target = await safeJoin(serverDir, rel);
    const stat = await fs.stat(target).catch(() => null);
    if (!stat) continue;
    if (stat.isDirectory()) archive.directory(target, path.basename(target));
    else archive.file(target, { name: path.basename(target) });
  }
  archive.finalize();
  return archive;
}

export function getMime(name) {
  return mime.lookup(name) || 'application/octet-stream';
}
// src/controllers/fileController.js
import path from 'node:path';
import multer from 'multer';
import { getServerDir } from '../services/serverService.js';
import * as fsSvc from '../services/fileService.js';
import { getServer } from '../services/serverService.js';
import { forbidden, notFound, badRequest } from '../utils/errors.js';
import { audit } from '../services/auditService.js';
import { safeJoin } from '../utils/safePath.js';

async function authorizeServer(req) {
  const server = await getServer(req.params.id);
  if (!server) throw notFound();
  if (req.user.role !== 'admin' && server.ownerId !== req.user.id) throw forbidden();
  return server;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, _f, cb) => {
      try {
        const dir = await getServerDir(req.params.id);
        cb(null, dir);
      } catch (e) { cb(e); }
    },
    filename: (_req, file, cb) => {
      const safe = path.basename(file.originalname).replace(/[^\w.\-]/g, '_');
      cb(null, safe);
    },
  }),
  limits: { fileSize: 512 * 1024 * 1024 },
});

export const uploadMiddleware = upload.single('file');

export async function list(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const rel = req.query.path || '.';
  res.json({ entries: await fsSvc.listDir(dir, rel) });
}

export async function readFile(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const rel = req.query.path;
  if (!rel) throw badRequest('path required');
  res.json(await fsSvc.readFile(dir, rel));
}

export async function writeFile(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const { path: rel, content } = req.body || {};
  if (!rel) throw badRequest('path required');
  await fsSvc.writeFile(dir, rel, content);
  await audit({ userId: req.user.id, action: 'file.write', target: `${server.id}:${rel}`, ip: req.ip });
  res.json({ ok: true });
}

export async function create(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const { path: rel = '.', name, type } = req.body || {};
  if (!name) throw badRequest('name required');
  if (type === 'folder') await fsSvc.createFolder(dir, rel, name);
  else await fsSvc.createFile(dir, rel, name);
  res.json({ ok: true });
}

export async function rename(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const { path: rel = '.', from, to } = req.body || {};
  if (!from || !to) throw badRequest('from and to required');
  await fsSvc.renameEntry(dir, rel, from, to);
  res.json({ ok: true });
}

export async function remove(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const rel = req.query.path || req.body?.path;
  if (!rel) throw badRequest('path required');
  await fsSvc.deleteEntry(dir, rel);
  await audit({ userId: req.user.id, action: 'file.delete', target: `${server.id}:${rel}`, ip: req.ip });
  res.json({ ok: true });
}

export async function download(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const rel = req.query.path;
  if (!rel) throw badRequest('path required');
  const abs = await safeJoin(dir, rel);
  res.setHeader('Content-Type', fsSvc.getMime(abs));
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(abs)}"`);
  const { createReadStream } = await import('node:fs');
  createReadStream(abs).pipe(res);
}

export async function uploadDone(req, res) {
  const server = await authorizeServer(req);
  await audit({ userId: req.user.id, action: 'file.upload', target: server.id, ip: req.ip, meta: { name: req.file?.filename } });
  res.json({ ok: true, file: req.file?.filename });
}

export async function zip(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const paths = req.body?.paths;
  if (!Array.isArray(paths) || paths.length === 0) throw badRequest('paths required');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="archive.zip"');
  const stream = await fsSvc.createZipStream(dir, paths);
  stream.pipe(res);
}

export async function unzip(req, res) {
  const server = await authorizeServer(req);
  const dir = await getServerDir(server.id);
  const { path: zipRel, dest = '.' } = req.body || {};
  if (!zipRel) throw badRequest('path required');
  if (typeof zipRel !== 'string' || !zipRel.toLowerCase().endsWith('.zip')) {
    throw badRequest('File must be .zip');
  }
  await fsSvc.extractZip(dir, dest, zipRel, dest);
  await audit({
    userId: req.user.id,
    action: 'file.unzip',
    target: `${server.id}:${zipRel}`,
    ip: req.ip,
  });
  res.json({ ok: true });
}
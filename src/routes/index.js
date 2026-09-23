// src/routes/index.js
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

import auth from './auth.js';
import users from './users.js';
import servers from './servers.js';
import account from './account.js';

import * as a from '../controllers/allocationController.js';
import * as settings from '../controllers/settingsController.js';
import * as adminServers from '../controllers/adminServerController.js';
import * as themes from '../controllers/themeController.js';
import * as media from '../controllers/mediaController.js';

import { hostStats } from '../resources/resourceManager.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { listAudit } from '../services/auditService.js';
import { cgroupStatus, listRuntimes } from '../process/processManager.js';

const r = Router();

/* =========================================================
   TMP DIRS
========================================================= */
const TMP_THEMES = path.join(process.cwd(), 'storage', 'tmp-themes');
const TMP_MEDIA = path.join(process.cwd(), 'storage', 'tmp-media');
fs.mkdirSync(TMP_THEMES, { recursive: true });
fs.mkdirSync(TMP_MEDIA, { recursive: true });

const themeUpload = multer({
  dest: TMP_THEMES,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const mediaUpload = multer({
  dest: TMP_MEDIA,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

/* =========================================================
   PUBLIC
========================================================= */
r.get('/public/info', settings.publicInfo);

/* =========================================================
   MOUNT
========================================================= */
r.use('/auth', auth);
r.use('/account', account);
r.use('/users', users);
r.use('/servers', servers);

/* =========================================================
   ADMIN: SETTINGS
========================================================= */
r.get('/settings', requireAuth, requireAdmin, settings.get);
r.patch('/settings', requireAuth, requireAdmin, settings.patch);
r.post('/settings/logo', requireAuth, requireAdmin, settings.uploadLogo);
r.delete('/settings/logo', requireAuth, requireAdmin, settings.deleteLogo);

/* =========================================================
   PUBLIC: THEME
========================================================= */
r.get('/themes/active.css', themes.activeCss);
r.get('/themes/active', themes.activeInfo);

/* =========================================================
   ADMIN: THEME
========================================================= */
r.get('/themes', requireAuth, requireAdmin, themes.list);
r.get('/themes/:folder/preview', requireAuth, requireAdmin, themes.preview);
r.post('/themes/:folder/activate', requireAuth, requireAdmin, themes.activate);
r.delete('/themes/:folder', requireAuth, requireAdmin, themes.remove);
r.post('/themes/upload', requireAuth, requireAdmin, themeUpload.single('file'), themes.upload);
r.post('/themes/import-github', requireAuth, requireAdmin, themes.importGithub);

/* =========================================================
   PUBLIC: MEDIA
========================================================= */
r.get('/media/background', media.background);
r.get('/media/appearance', media.appearance);
r.get('/media/playlist', media.playlist);
r.get('/media/music/:filename', media.music);

/* =========================================================
   ADMIN: MEDIA
========================================================= */
r.post('/media/background', requireAuth, requireAdmin, mediaUpload.single('file'), media.uploadBackground);
r.delete('/media/background', requireAuth, requireAdmin, media.deleteBackground);
r.patch('/media/appearance', requireAuth, requireAdmin, media.updateAppearanceSettings);

r.get('/media/music', requireAuth, requireAdmin, media.listMusic);
r.post('/media/music', requireAuth, requireAdmin, mediaUpload.single('file'), media.uploadMusic);
r.delete('/media/music/:filename', requireAuth, requireAdmin, media.deleteMusic);

/* =========================================================
   ADMIN: SERVERS
========================================================= */
r.get('/admin/servers', requireAuth, requireAdmin, adminServers.listAll);
r.post('/admin/servers', requireAuth, requireAdmin, adminServers.create);
r.patch('/admin/servers/:id', requireAuth, requireAdmin, adminServers.patch);
r.post('/admin/servers/:id/suspend', requireAuth, requireAdmin, adminServers.suspend);
r.post('/admin/servers/:id/unsuspend', requireAuth, requireAdmin, adminServers.unsuspend);
r.delete('/admin/servers/:id', requireAuth, requireAdmin, adminServers.remove);

/* =========================================================
   ADMIN: MISC
========================================================= */
r.get('/host/stats', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    res.json({ stats: await hostStats(), cgroups: cgroupStatus() });
  } catch (e) { next(e); }
});

r.get('/audit', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json({ logs: await listAudit({ limit: Number(req.query.limit || 100) }) });
  } catch (e) { next(e); }
});

r.get('/runtimes', requireAuth, requireAdmin, (_req, res) => {
  res.json({
    runtimes: listRuntimes().map((rt) => ({
      id: rt.server.id,
      status: rt.status,
      pid: rt.pid,
    })),
  });
});

r.get('/allocations', requireAuth, requireAdmin, a.listAll);

export default r;
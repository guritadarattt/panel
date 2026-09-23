// src/routes/servers.js
import { Router } from 'express';
import * as c from '../controllers/serverController.js';
import * as f from '../controllers/fileController.js';
import * as a from '../controllers/allocationController.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

r.get('/', c.list);
r.post('/', c.create);
r.get('/:id', c.get);
r.patch('/:id', c.patch);
r.delete('/:id', c.remove);

r.post('/:id/start', c.start);
r.post('/:id/stop', c.stop);
r.post('/:id/restart', c.restart);
r.post('/:id/kill', c.kill);
r.post('/:id/install', c.installDeps);
r.get('/:id/resources', c.resources);

r.get('/:id/files', f.list);
r.get('/:id/files/read', f.readFile);
r.post('/:id/files/write', f.writeFile);
r.post('/:id/files/create', f.create);
r.post('/:id/files/rename', f.rename);
r.delete('/:id/files', f.remove);
r.get('/:id/files/download', f.download);
r.post('/:id/files/upload', f.uploadMiddleware, f.uploadDone);
r.post('/:id/files/zip', f.zip);
r.post('/:id/files/unzip', f.unzip);

r.get('/:id/allocations', a.listForServer);
r.post('/:id/allocations', a.createForServer);
r.patch('/:id/allocations/:allocId', a.patch);
r.delete('/:id/allocations/:allocId', a.remove);

export default r;
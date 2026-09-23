// src/routes/users.js
import { Router } from 'express';
import * as c from '../controllers/userController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth, requireAdmin);
r.get('/', c.list);
r.post('/', c.create);
r.get('/:id', c.get);
r.patch('/:id', c.patch);
r.delete('/:id', c.remove);
r.post('/:id/ban', c.ban);
r.post('/:id/unban', c.unban);

export default r;
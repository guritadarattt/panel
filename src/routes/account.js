// src/routes/account.js
import { Router } from 'express';
import * as c from '../controllers/accountController.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth);

r.get('/me', c.me);
r.patch('/profile', c.updateProfile);
r.post('/password', c.updatePassword);

export default r;
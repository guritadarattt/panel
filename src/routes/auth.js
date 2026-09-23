// src/routes/auth.js
import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';

const r = Router();
r.post('/login', loginLimiter, c.postLogin);
r.post('/logout', c.postLogout);
r.get('/me', c.getMe);
r.post('/register', c.postRegister);
r.post('/password', requireAuth, c.postChangePassword);

export default r;
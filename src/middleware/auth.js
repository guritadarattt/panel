// src/middleware/auth.js
import config from '../config/index.js';
import { getSessionByToken } from '../services/sessionService.js';
import { getUserById } from '../services/userService.js';
import { unauthorized, forbidden } from '../utils/errors.js';

export async function attachUser(req, _res, next) {
  try {
    const token = req.cookies?.[config.sessionCookieName];
    if (!token) return next();
    const session = await getSessionByToken(token);
    if (!session) return next();
    const user = await getUserById(session.userId);
    if (!user || user.status !== 'active') return next();
    req.user = user;
    req.session = session;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'admin') return next(forbidden());
  next();
}
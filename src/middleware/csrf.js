// src/middleware/csrf.js
import crypto from 'node:crypto';
import { forbidden } from '../utils/errors.js';

const COOKIE = 'gurita_csrf';

export function issueCsrf(req, res, next) {
  if (!req.cookies?.[COOKIE]) {
    const token = crypto.randomBytes(24).toString('base64url');
    res.cookie(COOKIE, token, {
      httpOnly: false, // JS must read it
      sameSite: 'strict',
      secure: req.secure,
      path: '/',
    });
    req.cookies = { ...(req.cookies || {}), [COOKIE]: token };
  }
  res.locals.csrfToken = req.cookies[COOKIE];
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function verifyCsrf(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  // Bearer API requests bypass CSRF (they don't rely on cookies)
  if (req.headers.authorization?.startsWith('Bearer ')) return next();

  const cookieToken = req.cookies?.[COOKIE];
  const headerToken = req.get('x-csrf-token') || req.body?._csrf;
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(forbidden('CSRF token invalid'));
  }
  next();
}
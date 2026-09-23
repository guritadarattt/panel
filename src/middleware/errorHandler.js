// src/middleware/errorHandler.js
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';

export function notFoundHandler(_req, _res, next) {
  next(new AppError('Not found', 404, 'not_found'));
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'internal_error';
  const expose = err.expose ?? status < 500;

  logger.error(err.message, {
    code,
    status,
    path: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    stack: config.isProd ? undefined : err.stack,
  });

  const body = { error: { code, message: expose ? err.message : 'Internal server error' } };
  if (!config.isProd && err.stack) body.error.stack = err.stack;
  res.status(status).json(body);
}
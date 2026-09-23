// src/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

export const loginLimiter = rateLimit({
  windowMs: config.loginRate.windowMin * 60 * 1000,
  max: config.loginRate.maxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many login attempts' } },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many requests' } },
});
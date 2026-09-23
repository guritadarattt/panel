// src/utils/errors.js
export class AppError extends Error {
  constructor(message, status = 500, code = 'internal_error') {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = status < 500;
  }
}

export const badRequest = (m = 'Bad request') => new AppError(m, 400, 'bad_request');
export const unauthorized = (m = 'Unauthorized') => new AppError(m, 401, 'unauthorized');
export const forbidden = (m = 'Forbidden') => new AppError(m, 403, 'forbidden');
export const notFound = (m = 'Not found') => new AppError(m, 404, 'not_found');
export const conflict = (m = 'Conflict') => new AppError(m, 409, 'conflict');
export const tooMany = (m = 'Too many requests') => new AppError(m, 429, 'rate_limited');
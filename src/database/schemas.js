// src/database/schemas.js
export function validateUser(u) {
  if (!u || typeof u !== 'object') throw new Error('User must be object');
  if (!u.id || !u.username || !u.passwordHash || !u.role) {
    throw new Error('User missing required fields');
  }
  if (!['admin', 'reseller', 'user', 'suspended'].includes(u.role)) {
    throw new Error('Invalid role');
  }
  if (!['active', 'suspended'].includes(u.status)) {
    throw new Error('Invalid status');
  }
  return true;
}

export function validateServer(s) {
  if (!s || typeof s !== 'object') throw new Error('Server must be object');
  if (!s.id || !s.name || !s.ownerId || !s.runtime || !s.startup) {
    throw new Error('Server missing required fields');
  }
  if (!s.resources || typeof s.resources !== 'object') {
    throw new Error('Server missing resources');
  }
  return true;
}
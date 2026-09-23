// src/utils/passwords.js
import bcrypt from 'bcrypt';

const ROUNDS = 12;

export async function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length < 8) {
    throw new Error('Password too short');
  }
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}
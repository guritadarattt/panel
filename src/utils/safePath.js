// src/utils/safePath.js
import path from 'node:path';
import fs from 'node:fs/promises';
import { badRequest, forbidden } from './errors.js';

/**
 * Resolve a user-supplied relative path inside a base directory.
 * Prevents path traversal and symlink escape.
 */
export async function safeJoin(baseDir, userRelPath = '.') {
  if (typeof userRelPath !== 'string') throw badRequest('Invalid path');
  if (userRelPath.includes('\0')) throw badRequest('Invalid path');

  const baseResolved = path.resolve(baseDir);
  const target = path.resolve(baseResolved, userRelPath);

  if (target !== baseResolved && !target.startsWith(baseResolved + path.sep)) {
    throw forbidden('Path escapes server directory');
  }

  // Verify no symlink in path resolves outside base
  try {
    const real = await fs.realpath(target);
    if (real !== baseResolved && !real.startsWith(baseResolved + path.sep)) {
      throw forbidden('Path escapes via symlink');
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      // Target does not exist yet — verify parent
      const parent = path.dirname(target);
      try {
        const parentReal = await fs.realpath(parent);
        if (parentReal !== baseResolved && !parentReal.startsWith(baseResolved + path.sep)) {
          throw forbidden('Parent escapes via symlink');
        }
      } catch (pe) {
        if (pe.code !== 'ENOENT') throw pe;
      }
    } else {
      throw e;
    }
  }
  return target;
}

export function assertSafeFilename(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) {
    throw badRequest('Invalid filename');
  }
  if (name === '.' || name === '..') throw badRequest('Invalid filename');
  if (name.includes('/') || name.includes('\\')) throw badRequest('Invalid filename');
  if (name.includes('\0')) throw badRequest('Invalid filename');
  return name;
}
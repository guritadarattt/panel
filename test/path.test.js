import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { safeJoin, assertSafeFilename } from '../src/utils/safePath.js';

test('safeJoin blocks traversal', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'gurita-'));
  await assert.rejects(() => safeJoin(base, '../escape'));
});

test('safeJoin allows subpath', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'gurita-'));
  const p = await safeJoin(base, 'sub/file.txt');
  assert.ok(p.startsWith(base));
});

test('assertSafeFilename', () => {
  assert.equal(assertSafeFilename('hello.txt'), 'hello.txt');
  assert.throws(() => assertSafeFilename('../x'));
  assert.throws(() => assertSafeFilename('a/b'));
});
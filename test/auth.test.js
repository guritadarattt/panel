import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/utils/passwords.js';

test('password hashing is stable', async () => {
  const h = await hashPassword('superSecret123!');
  assert.ok(h.length > 20);
  assert.equal(await verifyPassword('superSecret123!', h), true);
  assert.equal(await verifyPassword('wrong', h), false);
});
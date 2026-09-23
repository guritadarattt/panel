import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertUsername, assertEmail, assertInt } from '../src/utils/validation.js';

test('username validation', () => {
  assert.equal(assertUsername('gurita1'), 'gurita1');
  assert.throws(() => assertUsername('ab'));
  assert.throws(() => assertUsername('bad name'));
});

test('email validation', () => {
  assert.equal(assertEmail('A@B.com'), 'a@b.com');
  assert.throws(() => assertEmail('nope'));
});

test('int validation', () => {
  assert.equal(assertInt('5', 'x', { min: 0, max: 10 }), 5);
  assert.throws(() => assertInt('100', 'x', { min: 0, max: 10 }));
});
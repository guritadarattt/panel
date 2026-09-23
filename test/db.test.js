import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJSON, writeJSON, updateJSON, generateId } from '../src/database/store.js';

test('read/write JSON round trip', async () => {
  const arr = [{ id: 'a' }, { id: 'b' }];
  await writeJSON('users.json', arr);
  const back = await readJSON('users.json');
  assert.deepEqual(back, arr);
});

test('concurrent update does not lose writes', async () => {
  await writeJSON('audit-logs.json', []);
  const tasks = Array.from({ length: 25 }, (_, i) =>
    updateJSON('audit-logs.json', (arr) => {
      arr.push({ id: i });
      return arr;
    })
  );
  await Promise.all(tasks);
  const back = await readJSON('audit-logs.json');
  assert.equal(back.length, 25);
});

test('generateId has prefix', () => {
  const id = generateId('usr');
  assert.match(id, /^usr_[a-f0-9]+$/);
});
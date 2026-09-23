// scripts/migrate.js
import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../src/config/index.js';
import { readJSON, writeJSON } from '../src/database/store.js';

const KNOWN = [
  'users.json','servers.json','allocations.json','settings.json',
  'sessions.json','api-keys.json','audit-logs.json','backups.json',
];

async function main() {
  console.log('Gurita Panel migration');
  console.log('Database dir:', config.paths.database);
  for (const name of KNOWN) {
    try {
      const data = await readJSON(name);
      await writeJSON(name, data);
      console.log(`✓ ${name}`);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
    }
  }
}

main();
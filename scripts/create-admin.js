// scripts/create-admin.js
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createUser, listUsers } from '../src/services/userService.js';
import config from '../src/config/index.js';

async function main() {
  const existing = await listUsers();
  const admins = existing.filter((u) => u.role === 'admin');
  if (admins.length > 0 && !process.argv.includes('--force')) {
    console.log(`Admin already exists: ${admins[0].username}. Use --force to add another.`);
    process.exit(0);
  }
  const rl = readline.createInterface({ input, output });
  const username = (await rl.question('Admin username: ')).trim();
  const email = (await rl.question('Admin email: ')).trim();
  // Use a raw password prompt without echo would require tty tricks. Keep it simple.
  const password = (await rl.question('Admin password (min 8 chars): ')).trim();
  await rl.close();
  const user = await createUser({ username, email, password, role: 'admin' });
  console.log(`Created admin: ${user.username} (${user.id})`);
}

main().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
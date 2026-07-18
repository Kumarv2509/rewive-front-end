// Applies mock-server/schema.sql to DATABASE_URL. Idempotent — run any time.
//   DATABASE_URL=postgres://... npm run migrate
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hasDb, query } from './db.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set — nothing to migrate. (Memory mode needs no migration.)');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, 'schema.sql'), 'utf8');

try {
  if (!hasDb()) throw new Error('pg driver unavailable');
  await query(sql);
  console.log('Migration applied — live-tracking schema is up to date.');
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}

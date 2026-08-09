// Applies the full tenant-store migration series (control-plane.js MIGRATIONS)
// to DATABASE_URL — the shared store is tenant zero, so it runs the same
// series the control plane fans out to tenant schemas. Idempotent — run any
// time:  DATABASE_URL=postgres://... npm run migrate
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { hasDb, query } from './db.js';
import { MIGRATIONS } from './control-plane.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set — nothing to migrate. (Memory mode needs no migration.)');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));

try {
  if (!hasDb()) throw new Error('pg driver unavailable');
  for (const m of MIGRATIONS) {
    await query(readFileSync(join(here, m.file), 'utf8'));
    console.log(`v${m.version} ${m.name} — applied.`);
  }
  console.log('Migration complete — the shared store is up to date.');
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}

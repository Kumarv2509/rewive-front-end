// Postgres access for the live-tracking entities (metric points, tracking
// configs, ingest keys, live findings/closures, sweep runs). Everything else
// in the mock server stays in-memory + KV — see CLAUDE.md and tracking.js for
// the coexistence story.
//
// When DATABASE_URL is unset the exported helpers report hasDb() === false and
// tracking.js falls back to an in-process memory store, so `npm run dev:all`
// keeps working with zero setup. Use a POOLED connection string (Neon/Supabase
// pgbouncer endpoint) in production — each serverless invocation opens at most
// one connection.
let pool = null;
let pgUnavailable = false;

export function hasDb() {
  return Boolean(process.env.DATABASE_URL) && !pgUnavailable;
}

async function getPool() {
  if (pool) return pool;
  try {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? undefined : { rejectUnauthorized: false },
    });
    return pool;
  } catch (err) {
    // pg not installed or failed to load — degrade to memory mode rather than
    // taking every request down with it.
    pgUnavailable = true;
    console.warn('[db] pg unavailable, falling back to memory store:', err?.message);
    return null;
  }
}

export async function query(text, params = []) {
  const p = await getPool();
  if (!p) throw new Error('No database configured');
  return p.query(text, params);
}

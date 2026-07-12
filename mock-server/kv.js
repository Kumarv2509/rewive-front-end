// Optional persistence for the mock server when it runs as a Vercel serverless
// function, where every request can land on a different cold-started instance
// with an empty in-memory state. Locally (npm run dev:all / mock-server), the
// process stays alive for the whole session, so this is never needed there —
// if the import fails or no store is configured, everything silently no-ops
// and the server behaves exactly as it did before persistence existed.
//
// Requires a Redis-compatible store connected to the Vercel project (the
// "Vercel KV" product itself is deprecated — use a Redis integration from the
// Vercel Marketplace, e.g. Upstash for Redis, which populates the same
// KV_REST_API_URL / KV_REST_API_TOKEN env vars this client reads).
let kv = null;
try {
  const mod = await import('@vercel/kv');
  kv = mod.kv;
} catch {
  kv = null;
}

const STATE_KEY = 'rewive:mock-server-state';

export async function loadState() {
  if (!kv) return null;
  try {
    return await kv.get(STATE_KEY);
  } catch {
    return null;
  }
}

export async function saveState(state) {
  if (!kv) return;
  try {
    await kv.set(STATE_KEY, state);
  } catch {
    // best effort — a persistence hiccup shouldn't fail the request
  }
}

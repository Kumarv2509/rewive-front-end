import app, { exportState, importState, persistLiveState, seedLiveTracking } from '../mock-server/app.js';
import { loadState, saveState } from '../mock-server/kv.js';

// Deployed demos never run server.js, so the default live-tracked mandates get
// seeded here instead — once per instance, and a no-op once any tracking
// config exists. Held as a promise so concurrent requests on a cold start
// await the same attempt rather than racing it.
let seedOnce = null;

// Vercel's bracket catch-all (`[...path].js`) only reliably matched a single
// path segment in this project, so instead every /api/v1/* request is rewritten
// (see vercel.json) to this single static function with the real path forwarded
// via a `path` query parameter, which we reconstruct into req.url before handing
// off to the shared Express app.
//
// Every request also hydrates the mock server's in-memory state from the
// connected store (if any) before running, and persists it back after — see
// mock-server/kv.js for why, and why this no-ops harmlessly without one.
export default async function handler(req, res) {
  const url = new URL(req.url, 'http://internal');
  const forwardedPath = url.searchParams.get('path') ?? '';
  url.searchParams.delete('path');
  const query = url.searchParams.toString();
  req.url = `/api/v1/${forwardedPath}${query ? `?${query}` : ''}`;

  importState(await loadState());

  // After importState — the seed reads brainsState, which the snapshot rewrites.
  seedOnce ??= seedLiveTracking().catch((err) => {
    console.warn('[seed] live tracking seed failed:', err?.message ?? err);
    return 0;
  });
  await seedOnce;

  await new Promise((resolve) => {
    res.on('finish', resolve);
    app(req, res);
  });

  // Live-tracking rows go to Postgres (awaited here — the in-app fire-and-forget
  // can't be trusted to complete before a serverless invocation freezes);
  // everything else snapshots to KV with live-* entities stripped.
  await persistLiveState().catch(() => {});
  await saveState(exportState());
}

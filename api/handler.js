import app, { exportState, importState } from '../mock-server/app.js';
import { loadState, saveState } from '../mock-server/kv.js';

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

  await new Promise((resolve) => {
    res.on('finish', resolve);
    app(req, res);
  });

  await saveState(exportState());
}

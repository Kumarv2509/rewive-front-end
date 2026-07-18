import app, { startHeartbeat, runLiveSweep } from './app.js';
import { hasDb } from './db.js';

const PORT = process.env.PORT || 4000;
// Local stand-in for Vercel Cron: sweep live-tracked mandates on an interval.
// REWIVE_SWEEP_MS=0 disables it (use the in-app "Run sweep now" button).
const SWEEP_MS = Number(process.env.REWIVE_SWEEP_MS ?? 60_000);

app.listen(PORT, () => {
  console.log(`Rewive mock API listening on http://localhost:${PORT}`);
  console.log(`Live tracking store: ${hasDb() ? 'Postgres (DATABASE_URL)' : 'in-memory (set DATABASE_URL for persistence)'}`);
  startHeartbeat();
  console.log('Demo heartbeat running — SLA clocks tick, senses sweep, connectors load.');
  if (SWEEP_MS > 0) {
    const sweepTimer = setInterval(() => {
      runLiveSweep('dev-interval').catch((err) => console.warn('[sweep] failed:', err?.message ?? err));
    }, SWEEP_MS);
    sweepTimer.unref?.();
    console.log(`Agent sweep running every ${Math.round(SWEEP_MS / 1000)}s (REWIVE_SWEEP_MS to tune, 0 to disable).`);
  }
});

import app, { startHeartbeat, runLiveSweep, seedLiveTracking } from './app.js';
import { hasDb } from './db.js';

const PORT = process.env.PORT || 4000;
// Local stand-in for Vercel Cron: sweep live-tracked mandates on an interval.
// REWIVE_SWEEP_MS=0 disables it (use the in-app "Run sweep now" button).
const SWEEP_MS = Number(process.env.REWIVE_SWEEP_MS ?? 60_000);

app.listen(PORT, async () => {
  console.log(`Rewive mock API listening on http://localhost:${PORT}`);
  console.log(`Live tracking store: ${hasDb() ? 'Postgres (DATABASE_URL)' : 'in-memory (set DATABASE_URL for persistence)'}`);
  // Give the sweep real mandates to walk on a cold boot. No-ops if any
  // tracking config already exists, so Postgres demos keep their own setup.
  const seeded = await seedLiveTracking().catch((err) => {
    console.warn('[seed] live tracking seed failed:', err?.message ?? err);
    return 0;
  });
  if (seeded) console.log(`Seeded ${seeded} live-tracked mandates with ~30 days of metrics.`);
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

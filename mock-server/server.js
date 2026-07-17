import app, { startHeartbeat } from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Rewive mock API listening on http://localhost:${PORT}`);
  startHeartbeat();
  console.log('Demo heartbeat running — SLA clocks tick, senses sweep, connectors load.');
});

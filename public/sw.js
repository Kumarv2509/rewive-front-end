// Minimal service worker — exists so the app is installable to a home screen
// (the phase-0 mobile shell). Deliberately no caching: the app is API-driven
// and every screen polls live state, so a stale cache would show a number no
// live signal stands behind. Web push lands here later (phase 0.5).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

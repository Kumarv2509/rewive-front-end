# Rewive Front End

React + TypeScript + Vite front end for **Rewive — the Decision Accountability Layer**. Dashboards show you the number; Rewive makes someone answer for it: every mandate is held twice (a person and an agent counterpart), drift raises a finding that must be dispositioned (Accept / Act / Acknowledge / Abandon — silence escalates), accepted findings become exit conditions watched until the number is back, and every decision lands in a ledger with a verdict on whether it worked.

Pick an operating context (FMCG or Healthcare) on the landing page and every screen — Command Center, Findings, Closure, Decision Ledger, Counterparts, Operating Picture, Outcomes — swaps to that industry's mandates and data. All of it is backed by a typed REST contract (`src/api/types.ts`) served by a mock Express API (`mock-server/`), so the app runs fully without a real backend.

## Getting started

```bash
npm install
cp .env.example .env
npm run dev:all   # runs the Vite dev server (:5173) and mock API (:4000) together
```

Open http://localhost:5173 — or `public/demo.html` for a demo launcher and `public/story.html` for the narrative pitch.

## Scripts

```bash
npm run dev          # Vite dev server only
npm run mock-server   # mock Express API only
npm run dev:all       # both, concurrently
npm run build         # type-check + production build
npm run lint          # eslint
npm run preview       # preview the production build
```

See `CLAUDE.md` for architecture notes and `docs/FEATURE_INVENTORY.md` for what's built per version.

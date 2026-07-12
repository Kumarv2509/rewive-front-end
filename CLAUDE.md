# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Rewive front end — a React/TypeScript demo of **the Decision Accountability Layer**: every business mandate is held twice (once by a person, once by an agent "counterpart" watching the same number), drift becomes a **finding** that must be dispositioned (Accept / Act / Acknowledge / Abandon — silence escalates on an SLA), accepted findings become **exit conditions** watched until the number is back (Closure), and every decision lands in a **Decision Ledger** with a later assessor verdict (worked / didn't / too early). The signature line is "Every mandate, held twice."

Everything is industry-parameterized: the public landing page (`/`) picks an operating context (FMCG or Healthcare; a Manufacturing pack is seeded but hidden from pickers until it's as deep as the other two) and every screen swaps its content accordingly. No production backend exists — a mock Express server in `mock-server/` implements the exact REST contract the frontend expects, with in-memory stateful mutations.

## Commands

```bash
npm run dev          # Vite dev server only (frontend on :5173, proxies /api -> :4000)
npm run mock-server   # Mock Express API only (:4000)
npm run dev:all       # Both together (concurrently) — use this for local development
npm run build         # tsc -b && vite build (type-checks, then builds to dist/)
npm run lint          # eslint .
npm run preview       # Preview the production build
```

There is no test suite configured.

## Architecture

**Information architecture** (`src/components/layout/areas.ts`, routes in `src/App.tsx`): a public landing page at `/`, then three nav areas under `AppLayout`:

- **Operate** — the hero path: Command Center (`/command`), Findings (`/operate/findings`), Closure (`/operate/closure`), Decision Ledger (`/operate/decisions`), Counterparts (`/operate/counterparts`), Runs & Actions, Tasks.
- **Insights** — Outcomes, Performance (the reframed leaderboard), Agent Space.
- **Foundation** (URL prefix is still `/build`) — Operating Picture (`/build/picture`), Mandate Library (`/build/kpis`), Data Connectors.

Agent-building screens (Create an Agent `/build/create`, Agent Studio `/build/studio`, Unified Agent Studio `/build/agent-studio/:id`, Solution Design `/build/solutions/:id`) are **routable but off the nav** — they're reached through a finding's **Act** disposition (finding → solution design → agent spec), not browsed to. Old v1/v3/v4 URLs (`/runs`, `/insights/findings`, `/operate/shadow`, …) redirect; keep that convention when moving routes.

**Naming note:** the user-facing term is **counterpart**; internal identifiers still use the older "shadow" naming (`ShadowAgent`, `useShadowOrg`, `src/api/shadowOrg.ts`, `src/screens/ShadowOrg/`). Don't reintroduce "shadow" in UI copy; renaming the internals is an optional cleanup.

**Data flow:** every screen fetches through TanStack Query hooks in `src/api/` (one module per domain; no service layer). `src/api/types.ts` is the source of truth for every API shape — check it before changing any request/response. `src/api/client.ts` holds the single axios instance; a request interceptor appends the chosen `?industry=` (persisted in localStorage) so the context survives serverless cold starts. Mutations invalidate/optimistically update the query cache and pair with a toast from the screen component. Live data uses `refetchInterval`, not websockets.

**The v4/v5 core model** (in `src/api/types.ts`): `KpiBrain` (Operating Picture: intents ← mandates/stream-KPIs ← senses/drivers), `ShadowOrg`/`ShadowAgent` (counterparts, one per function stream + an org-level chief), `Finding` + `FindingDisposition` (the four-A call, SLA escalation), `ClosureKpi` (exit conditions), `DecisionLedgerItem` + `Verdict` (assessor verdicts). Personas (store manager / CFO / operations head) filter the Command Center.

**Mock API (`mock-server/`):** Express app (`app.js`) with seed data split across `data.js` (original v1/FMCG operational data), `v4data.js` (Operating Picture, counterparts, findings, closure per industry), and `v4content.js` (per-industry operational packs: dashboard, decisions, runs, leaderboard, outcomes, agent catalog). Industry-scoped endpoints pick a pack via the org profile or `?industry=`. When adding a data point: type in `src/api/types.ts` → hook in `src/api/<domain>.ts` → seed + route in `mock-server/`, per industry.

**Styling:** one global stylesheet, `src/styles/globals.css` (CSS variables + utility classes like `.card`, `.pill`, `.btn`). No Tailwind/CSS-in-JS — reuse the existing classes. Shared atoms in `src/components/shared/`. The landing page and `public/story.html`/`public/demo.html` carry their own inline styles.

## Positioning (keep copy consistent with this)

Category: the decision accountability layer — "the system of record for operational decisions." Hero: "Nothing drifts unanswered." (statement form — avoid "makes someone answer for it", which reads as blame). The loop is **Sense → Find → Decide → Act → Close**. Keep-verbatim lines: "Every mandate, held twice." · "The company's memory of judgment." · "Nothing is 'done' until the number is back." Avoid: "shadow organization", "agentic operating model" (the latter survives only as the story-page essay framing), and any humans-vs-agents ranking framing.

## Conventions

- Path imports are relative (no `@/` alias configured).
- Currency: AED for FMCG, USD for Healthcare. Seed org is "Americana Foods (demo)".
- New API resources: type in `src/api/types.ts`, hook in `src/api/<domain>.ts`, mock route + per-industry seed in `mock-server/`.
- Vite proxies `/api` to `http://localhost:4000` (see `vite.config.ts`) — don't hardcode the mock server port elsewhere.

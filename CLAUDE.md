# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Rewive front end — a React/TypeScript demo of **the Decision Accountability Layer**: every business mandate is held twice (once by a person, once by an agent "counterpart" watching the same number), drift becomes a **finding** that must be dispositioned (Accept / Act / Acknowledge / Abandon — silence escalates on an SLA), accepted findings become **exit conditions** watched until the number is back (Closure), and every decision lands in a **Decision Ledger** with a later assessor verdict (worked / didn't / too early). The signature line is "Every mandate, held twice."

Everything is industry-parameterized: the public landing page (`/`) picks an operating context (FMCG, Healthcare, or Manufacturing) and every screen swaps its content accordingly. No production backend exists — a mock Express server in `mock-server/` implements the exact REST contract the frontend expects, with in-memory stateful mutations.

## Commands

```bash
npm run dev          # Vite dev server only (frontend on :5173, proxies /api -> :4000)
npm run mock-server   # Mock Express API only (:4000)
npm run dev:all       # Both together (concurrently) — use this for local development
npm run build         # tsc -b && vite build (type-checks, then builds to dist/)
npm run lint          # eslint .
npm run preview       # Preview the production build
npm run migrate       # Apply mock-server/schema.sql to DATABASE_URL (live tracking)
```

There is no test suite configured.

## Live mandate tracking (the one real pipeline)

Everything is seeded demo content **except** live mandate tracking: real numeric metrics → deterministic drift rules → counterpart-raised findings, flowing into the same findings/disposition/closure pipeline the seeds use. The moving parts, all in `mock-server/`: `db.js` (Postgres via `DATABASE_URL`, in-memory fallback when unset — `dev:all` needs zero setup), `tracking.js` (store + `overlayLiveTracking` for `GET /kpi-brain`), `tracking-routes.js` (`POST /metrics` with hashed ingest keys, CSV import, tracking configs, `agent-sweep`), `drift.js` (pure rules: threshold breach / sustained deviation / trend-to-breach), `sweep.js` (raise + re-alert trip-wires + closure recovery progress), `authoring.js` (Claude authors the narrative via `ANTHROPIC_API_KEY`; deterministic template fallback — a sweep never fails because authoring failed).

Sweep-raised entities carry `live-` id prefixes: they persist in Postgres (source of truth), are hydrated into `findingsState`/`closureKpisState` per request (`hydrateLiveState`/`persistLiveState` in `app.js`), and are **stripped from the KV snapshot** — never let KV hold a `live-*` copy. Live findings run wall-clock SLAs (`sla_deadline_at`), not the demo heartbeat tick. Sweeps run via Vercel Cron (`vercel.json` crons → `GET /api/v1/agent-sweep`, `CRON_SECRET` bearer), the Connectors screen's "Run sweep now", or a dev-server interval (`REWIVE_SWEEP_MS`). The Connectors screen hosts the real surfaces: tracking configs, ingest keys, CSV/XLSX upload (parsed client-side via lazy-loaded `xlsx`), sweep history. Env: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CRON_SECRET` (all optional — see `.env.example`).

## Architecture

**Information architecture** (`src/components/layout/areas.ts`, routes in `src/App.tsx`): a public landing page at `/`, then one flat loop-ordered rail of 7 items under `AppLayout` (the old Operate/Insights/Foundation top-nav areas are retired):

- **Today** (`/command`) — the single "waiting on you" queue (findings + approvals, one count — the only such number in the product).
- **Findings** (`/operate/findings`) — lifecycle tabs `?tab=open|watching|closed`; the old Closure screen is the Watching/Closed tabs now (`/operate/closure` redirects). A finding's detail page is its **thread**: raised → decided → watching → closed + verdict.
- **Decisions** (`/operate/decisions`) — the ledger; rows deep-link to the finding they answered (`findingId` on `DecisionLedgerItem`).
- **Execution** — Runs (`/operate/runs`), Tasks (`/operate/tasks`), Outcomes (`/insights/outcomes/:runId`) share a `SectionTabs` header; routes unchanged.
- **Agents** — Counterparts (`/operate/counterparts`) + Workforce (`/insights/agents`) share a `SectionTabs` header.
- **Performance** (`/insights/people`), **Foundation** (`/build/picture`, `/build/kpis`, `/build/connectors`).

**Tenancy (demo-grade):** the SaaS front door is `/login` — a split-view organization sign-in (org-branded panel left, sign-in card right). `src/tenants.ts` registers the tenants (Americana Foods → fmcg, Metro Health Network → healthcare, Gulf Precision Industries → manufacturing) with flat brand accents, demo email domains, and session helpers (`rewive.tenant` in localStorage). Signing in sets tenant + industry + persona lens ("Sign in as" role → each team lands in its own view); all app routes sit behind `RequireTenant` in `App.tsx`. The industry choice stays authoritative: `getActiveTenant()` re-derives the tenant if the industry is switched in-app (Operating Picture) or the session predates tenancy. The top nav shows the signed-in org chip + "Switch organization"; landing CTAs deep-link `/login?org=<tenantId>`. There is no real auth — any password works.

The persona lens is global chrome (top bar, `personaLens.tsx`, persisted). Screen intros use the shared `Intro` component (one line + "How this works" disclosure) instead of paragraph subtitles. There is no global "+ New Agent" CTA — agent creation lives in Agents → Workforce and a finding's Act flow.

Agent-building screens (Create an Agent `/build/create`, Agent Studio `/build/studio`, Unified Agent Studio `/build/agent-studio/:id`, Solution Design `/build/solutions/:id`) are **routable but off the nav** — they're reached through a finding's **Act** disposition (finding → solution design → agent spec), not browsed to. Old v1/v3/v4/v5 URLs (`/runs`, `/insights/findings`, `/operate/shadow`, `/operate/closure`, …) redirect; keep that convention when moving routes.

**Naming note:** the user-facing term is **counterpart**; internal identifiers still use the older "shadow" naming (`ShadowAgent`, `useShadowOrg`, `src/api/shadowOrg.ts`, `src/screens/ShadowOrg/`). Don't reintroduce "shadow" in UI copy; renaming the internals is an optional cleanup.

**Data flow:** every screen fetches through TanStack Query hooks in `src/api/` (one module per domain; no service layer). `src/api/types.ts` is the source of truth for every API shape — check it before changing any request/response. `src/api/client.ts` holds the single axios instance; a request interceptor appends the chosen `?industry=` (persisted in localStorage) so the context survives serverless cold starts. Mutations invalidate/optimistically update the query cache and pair with a toast from the screen component. Live data uses `refetchInterval`, not websockets.

**The v4/v5 core model** (in `src/api/types.ts`): `KpiBrain` (Operating Picture: intents ← mandates/stream-KPIs ← senses/drivers), `ShadowOrg`/`ShadowAgent` (counterparts, one per function stream + an org-level chief), `Finding` + `FindingDisposition` (the four-A call, SLA escalation), `ClosureKpi` (exit conditions), `DecisionLedgerItem` + `Verdict` (assessor verdicts). Personas are **roles in a hierarchy** (COO → operations head → store manager, COO → sales supervisor; CFO → commercial finance — defined in `src/screens/CommandCenter/personas.ts` and mirrored in `mock-server/roles.js`, keep them identical). Every collection item (finding, approval, run, task, counterpart, agent, leaderboard/loop-speed row, ledger row) carries exactly one `persona` — roles partition the data with no overlap. The global lens filters every data screen via `useEffectiveLens()` (`personaLens.tsx`); the "+ their team" toggle sends `scope=team` so a senior role sees its whole reporting subtree. When seeding new items, always set `persona`.

**Mock API (`mock-server/`):** Express app (`app.js`) with seed data split across `data.js` (original v1/FMCG operational data), `v4data.js` (Operating Picture, counterparts, findings, closure per industry), and `v4content.js` (per-industry operational packs: dashboard, decisions, runs, leaderboard, outcomes, agent catalog). Industry-scoped endpoints pick a pack via the org profile or `?industry=`. When adding a data point: type in `src/api/types.ts` → hook in `src/api/<domain>.ts` → seed + route in `mock-server/`, per industry.

**Styling:** one global stylesheet, `src/styles/globals.css` (CSS variables + utility classes like `.card`, `.pill`, `.btn`). No Tailwind/CSS-in-JS — reuse the existing classes. Shared atoms in `src/components/shared/`. The landing page and `public/story.html`/`public/demo.html` carry their own inline styles.

## Positioning (keep copy consistent with this)

Category: the decision accountability layer — "the system of record for operational decisions." Hero: "Nothing drifts unanswered." (statement form — avoid "makes someone answer for it", which reads as blame). The loop is **Sense → Find → Decide → Act → Close**. Keep-verbatim lines: "Every mandate, held twice." · "The company's memory of judgment." · "Nothing is 'done' until the number is back." Avoid: "shadow organization", "agentic operating model" (the latter survives only as the story-page essay framing), and any humans-vs-agents ranking framing.

## Conventions

- Path imports are relative (no `@/` alias configured).
- Currency: AED for FMCG, USD for Healthcare and Manufacturing. Seed org is "Americana Foods (demo)".
- New API resources: type in `src/api/types.ts`, hook in `src/api/<domain>.ts`, mock route + per-industry seed in `mock-server/`.
- Vite proxies `/api` to `http://localhost:4000` (see `vite.config.ts`) — don't hardcode the mock server port elsewhere.

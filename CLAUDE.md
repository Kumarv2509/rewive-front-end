# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Rewive front end — a React/TypeScript demo of **the Decision Accountability Layer**: every business mandate is held twice (once by a person, once by an agent watching the same number), drift becomes a **finding** that must be dispositioned (Accept / Act / Acknowledge / Abandon — silence escalates on an SLA), accepted findings become **exit conditions** watched until the number is back (Closure), and every decision lands in a **Decision Ledger** with a later assessor verdict (worked / didn't / too early). The signature line is "Every mandate, held twice."

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

Everything is seeded demo content **except** live mandate tracking: real numeric metrics → deterministic drift rules → agent-raised findings, flowing into the same findings/disposition/closure pipeline the seeds use. The moving parts, all in `mock-server/`: `db.js` (Postgres via `DATABASE_URL`, in-memory fallback when unset — `dev:all` needs zero setup), `tracking.js` (store + `overlayLiveTracking` for `GET /kpi-brain`), `tracking-routes.js` (`POST /metrics` with hashed ingest keys, CSV import, tracking configs, `agent-sweep`), `drift.js` (pure rules: threshold breach / sustained deviation / trend-to-breach), `sweep.js` (raise + re-alert trip-wires + closure recovery progress), `authoring.js` (Claude authors the narrative via `ANTHROPIC_API_KEY`; deterministic template fallback — a sweep never fails because authoring failed).

Sweep-raised entities carry `live-` id prefixes: they persist in Postgres (source of truth), are hydrated into `findingsState`/`closureKpisState` per request (`hydrateLiveState`/`persistLiveState` in `app.js`), and are **stripped from the KV snapshot** — never let KV hold a `live-*` copy. Live findings run wall-clock SLAs (`sla_deadline_at`), not the demo heartbeat tick. Sweeps run via Vercel Cron (`vercel.json` crons → `GET /api/v1/agent-sweep`, `CRON_SECRET` bearer), the Connectors screen's "Run sweep now", or a dev-server interval (`REWIVE_SWEEP_MS`). The Connectors screen hosts the real surfaces: tracking configs, ingest keys, CSV/XLSX upload (parsed client-side via lazy-loaded `xlsx`), sweep history. Env: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CRON_SECRET` (all optional — see `.env.example`).

A sweep writes its per-mandate analysis trail to `sweep_runs.progress` as it walks (`queued → analyzing → authoring →` an outcome), which `GET /sweep-progress` serves industry-scoped to the **live analysis strip** on Findings (`src/screens/Findings/LiveAnalysisStrip.tsx`) — the agents working, not just their output. Two things make that watchable and must stay: the sweep is paced (`REWIVE_SWEEP_PACE_MS`, default 900ms per mandate, skipped on `cron`), and `/sweep-progress` is exempt from the global `liveLock` request serializer in `app.js` — it reads only the tracking store, and the sweep holds that lock for its whole run. Only add a route to `LIVE_LOCK_EXEMPT` if it touches no shared in-memory state.

`seed-tracking.js` gives a cold boot 14 default live-tracked mandates (4 per industry — 2 reading `clear`, 2 that raise on the first sweep — plus 2 extra healthcare cash mandates, days in AR and point-of-service collections, because the CFO story is the one demoed live) so the strip and Connectors aren't blank — called from `server.js` at boot and once per instance from `api/handler.js` (deployed demos never run `server.js`). It parses target/current off each brain node's own `targetValue`/`currentValue` rather than inventing numbers, so `overlayLiveTracking` writes the same figures back and the Operating Picture is unchanged. It no-ops once any tracking config exists, and its points are snapped to midnight UTC so a re-seed updates the same rows instead of laying down a second offset series.

## Architecture

**Information architecture** (`src/components/layout/areas.ts`, routes in `src/App.tsx`): a public landing page at `/`, then one flat loop-ordered rail of 7 items under `AppLayout` (the old Operate/Insights/Foundation top-nav areas are retired):

- **Today** (`/command`) — the single "waiting on you" queue (findings + approvals, one count — the only such number in the product).
- **Findings** (`/operate/findings`) — lifecycle tabs `?tab=open|watching|closed`; the old Closure screen is the Watching/Closed tabs now (`/operate/closure` redirects). A finding's detail page is its **thread**: raised → decided → watching → closed + verdict.
- **Decisions** (`/operate/decisions`) — the ledger; rows deep-link to the finding they answered (`findingId` on `DecisionLedgerItem`).
- **Execution** — Runs (`/operate/runs`), Tasks (`/operate/tasks`), Outcomes (`/insights/outcomes/:runId`) share a `SectionTabs` header; routes unchanged.
- **Agents** — Agents (`/operate/counterparts`) + Workforce (`/insights/agents`) share a `SectionTabs` header.
- **Performance** (`/insights/people`), **Foundation** (`/build/picture`, `/build/kpis`, `/build/connectors`).

**Entity vs division:** `entity` (legal entity, e.g. "UAE Trading Co.") and `region` are optional strings on `Finding`, `ClosureKpi`, `DecisionLedgerItem`, and `MandateTrackingConfig`. A **division** (Protein / G&I / F&V / Ambient) is not a field at all — it is a subtree of the persona hierarchy. Nothing joins the two, so nothing validates that a row's entity matches its persona's division; keep them consistent by hand when seeding. Every lens-scoped rollup must filter by persona: `/decisions/stats` (the stat tiles + By-entity/By-region half-year rollups) and `/closure-kpis` both take `persona`/`scope`. Exit conditions carry no persona — they inherit their finding's via `filterClosuresByPersona` in `app.js`, which fails open on an unresolvable `findingId`. Rollups skip rows with a blank entity, so anything created at runtime must carry one: sweep-raised findings inherit entity/region from their tracking config, and Accept-created closures inherit from their finding.

**Tenancy (demo-grade):** the SaaS front door is `/login` — a split-view organization sign-in (org-branded panel left, sign-in card right). `src/tenants.ts` registers the tenants (Americana Foods → fmcg, Medcare UAE → healthcare, Gulf Precision Industries → manufacturing) with flat brand accents, demo email domains, and session helpers (`rewive.tenant` in localStorage). Signing in sets tenant + industry + persona lens ("Sign in as" role → each team lands in its own view); all app routes sit behind `RequireTenant` in `App.tsx`. The industry choice stays authoritative: `getActiveTenant()` re-derives the tenant if the industry is switched in-app (Operating Picture) or the session predates tenancy. The top nav shows the signed-in org chip + "Switch organization"; landing CTAs deep-link `/login?org=<tenantId>`. There is no real auth — any password works.

The persona lens is global chrome (top bar, `personaLens.tsx`, persisted). Screen intros use the shared `Intro` component (one line + "How this works" disclosure) instead of paragraph subtitles. There is no global "+ New worker" CTA — worker creation lives in Agents → Workforce and a finding's Act flow.

Agent-building screens (Create an Agent `/build/create`, Agent Studio `/build/studio`, Unified Agent Studio `/build/agent-studio/:id`, Solution Design `/build/solutions/:id`) are **routable but off the nav** — they're reached through a finding's **Act** disposition (finding → solution design → agent spec), not browsed to. Old v1/v3/v4/v5 URLs (`/runs`, `/insights/findings`, `/operate/shadow`, `/operate/closure`, …) redirect; keep that convention when moving routes.

**Naming note — three distinct things, do not blur them:**

| Concept | User-facing word | What it does | Internal naming |
|---|---|---|---|
| Mandate holder | **agent** | Watches a number alongside a person, raises findings | `ShadowAgent`, `useShadowOrg`, `src/api/shadowOrg.ts`, `src/screens/ShadowOrg/`, `counterpartName`, `findCounterpart`, route `/operate/counterparts` |
| Executor | **worker** | Runs tasks, has capabilities/ROI/token cost; built from a finding's Act flow | `AgentSpace`, `AgentStudio`, `CreateAgent`, `agentType`, `type: 'agent'`, routes `/insights/agents`, `/build/agent-studio` |
| Assessor | **assessor agent** | Delivers the later verdict on a decision | `assessorVerdict` |

The loop reads: *the Planning **agent** raised it → you spawn a **worker** to fix it → an **assessor agent** says whether it worked.* Nav: rail "Agents" → tabs "Agents" (holders) and "Workforce" (workers). Internal identifiers and URLs deliberately lag the user-facing words — same convention as the older "shadow" naming — so old bookmarks keep working; renaming them is an optional cleanup. Don't reintroduce "shadow" or "counterpart" in UI copy, and never let a blanket find-and-replace run over "agent": it collides with all three concepts plus union literals (`type: 'agent'`), CSS classes (`agent-card`), and route slugs.

**Data flow:** every screen fetches through TanStack Query hooks in `src/api/` (one module per domain; no service layer). `src/api/types.ts` is the source of truth for every API shape — check it before changing any request/response. `src/api/client.ts` holds the single axios instance; a request interceptor appends the chosen `?industry=` (persisted in localStorage) so the context survives serverless cold starts. Mutations invalidate/optimistically update the query cache and pair with a toast from the screen component. Live data uses `refetchInterval`, not websockets.

**The v4/v5 core model** (in `src/api/types.ts`): `KpiBrain` (Operating Picture: intents ← mandates/stream-KPIs ← senses/drivers), `ShadowOrg`/`ShadowAgent` (agents, one per function stream + an org-level chief), `Finding` + `FindingDisposition` (the four-A call, SLA escalation), `ClosureKpi` (exit conditions), `DecisionLedgerItem` + `Verdict` (assessor verdicts). Personas are **roles in a hierarchy** (COO → operations head → store manager, COO → sales supervisor; CFO → commercial finance — defined in `src/screens/CommandCenter/personas.ts` and mirrored in `mock-server/roles.js`, keep them identical). Every collection item (finding, approval, run, task, counterpart, agent, leaderboard/loop-speed row, ledger row) carries exactly one `persona` — roles partition the data with no overlap. The global lens filters every data screen via `useEffectiveLens()` (`personaLens.tsx`); the "+ their team" toggle sends `scope=team` so a senior role sees its whole reporting subtree. When seeding new items, always set `persona`.

Healthcare and Manufacturing offer the seven `LEGACY_PERSONAS` (the original six plus `fpa`, so a CFO lens rolls up two branches — FP&A and the commercial-finance line — that someone can actually sign in as). **Role ids are shared; only the labels are per-industry.** `HEALTHCARE_LABEL_OVERRIDES` in `personas.ts` renames the operating roles for a clinic network (`operations_head` → "Clinical operations head", `store_manager` → "Clinic manager", `sales_supervisor` → "Front-office supervisor", `commercial_finance` → "Payer contracting"). Relabel there rather than forking the tree — `ROLE_CHILDREN`, escalation and `personaScope` must stay identical across industries or the mirrors in `mock-server/roles.js` drift.

**Mock API (`mock-server/`):** Express app (`app.js`) with seed data split across `data.js` (original v1/FMCG operational data), `v4data.js` (Operating Picture, counterparts, findings, closure per industry), and `v4content.js` (per-industry operational packs: dashboard, decisions, runs, leaderboard, outcomes, agent catalog). Industry-scoped endpoints pick a pack via the org profile or `?industry=`. When adding a data point: type in `src/api/types.ts` → hook in `src/api/<domain>.ts` → seed + route in `mock-server/`, per industry.

**Styling:** one global stylesheet, `src/styles/globals.css` (CSS variables + utility classes like `.card`, `.pill`, `.btn`). No Tailwind/CSS-in-JS — reuse the existing classes. Shared atoms in `src/components/shared/`. The landing page and `public/story.html`/`public/demo.html` carry their own inline styles.

## Positioning (keep copy consistent with this)

Category: the decision accountability layer — "the system of record for operational decisions." Hero: "Nothing drifts unanswered." (statement form — avoid "makes someone answer for it", which reads as blame). The loop is **Sense → Find → Decide → Act → Close**. Keep-verbatim lines: "Every mandate, held twice." · "The company's memory of judgment." · "Nothing is 'done' until the number is back." Avoid: "shadow organization", "agentic operating model" (the latter survives only as the story-page essay framing), and any humans-vs-agents ranking framing.

## Conventions

- Path imports are relative (no `@/` alias configured).
- Currency: AED for FMCG and Healthcare (both UAE orgs), USD for Manufacturing. Seed org is "Americana Foods (demo)".
- New API resources: type in `src/api/types.ts`, hook in `src/api/<domain>.ts`, mock route + per-industry seed in `mock-server/`.
- Vite proxies `/api` to `http://localhost:4000` (see `vite.config.ts`) — don't hardcode the mock server port elsewhere.

# Handoff — v5.1 comprehension redesign + FP&A P&L workspace shipped on v5 (2026-07-15)

## Where things stand

- **`v5` is 6 commits ahead of `master`. The four newest are LOCAL ONLY — push is
  currently blocked** (see gotcha below):
  - `f4ac86f` — loop speed by mandate table on the Performance screen (pushed).
  - `51491f0` — on-screen spotlight tour (pushed).
  - `cdd2901` — landing retold: aampe-style product storytelling in Rewive's identity.
  - `4b7462b` — **v5.1 comprehension & navigation redesign** (see below — this is the big one).
  - `7964225` — **full P&L by SKU & channel with drift anomalies as a task list** (FP&A workspace).
  - plus this handoff refresh.
- **Push gotcha (2026-07-15): the network MITMs GitHub HTTPS.** `git push` fails with
  "SSL certificate problem" because a FortiGate firewall re-signs github.com
  (issuer `CN=FG201FT922921744, O=Fortinet`) and its CA is not on this machine
  (only "FortiClient DNS Root" is in the keychains — the leaf doesn't chain to it,
  and the firewall serves no intermediate). SSH to GitHub connects but no SSH key is
  registered (`Permission denied (publickey)`). To push: (a) switch off the VPN /
  change network — plain push worked on 2026-07-14; or (b) register an SSH key on
  GitHub and push via `git@github.com:…`; or (c) get the FortiGate CA from IT and set
  repo-local `git config http.sslCAInfo`. Do **not** disable `http.sslVerify`.
- Fold into `master` via a PR when ready. **`gh` CLI auth is also broken** (keyring
  token invalid; a device-code refresh timed out on 2026-07-14) — rerun
  `gh auth refresh -h github.com` before `gh pr create`, or open the PR on GitHub.
- Build and lint are clean; no test suite exists.
- Local dev: `npm run dev:all` (Vite :5173 + mock API :4000). Watch for stale mock-server
  processes holding :4000 — an old one serves stale seed data. `lsof -i :4000` and kill
  before restarting. The mock server has **no watch mode**: seed edits in `mock-server/`
  need a restart to take effect.

## New this session (2026-07-15) — v5.1

The session started as a UX advisory ("easy to understand and navigation friendly"),
then implemented all of its findings. Core thesis: organize the product around the
loop and around "what needs me," not around internal object types.

### Navigation & comprehension redesign (`4b7462b`)

- **One flat rail, 7 items, loop-ordered** (`src/components/layout/areas.ts`):
  Today, Findings, Decisions, Execution, Agents, Performance, Foundation. The
  Operate/Insights/Foundation **top-nav areas are retired**; every old URL redirects
  (App.tsx). `docs/BLUEPRINT.md`'s screen map predates this — see open threads.
- **Today** (was Command Center): findings + approvals merged into **one ranked
  "Waiting on you" queue with one count** — the only such number in the product
  (`CommandCenter/UnifiedQueue.tsx`). Stat cards cut 5 → 3 (`TodayStats.tsx`); the
  greeting seed no longer quotes a competing count.
- **Findings lifecycle tabs** (Open / Watching / Closed via `?tab=`): the **Closure
  screen is gone** — exit conditions and trip-wires are the Watching/Closed tabs now
  (`Findings/Lifecycle.tsx`); `/operate/closure` redirects to `?tab=watching`.
- **The finding thread** (`Findings/Detail.tsx`): one spine per finding — Sensed &
  raised (evidence + impact path) → Decide (the disposition bar *is* step 2) →
  Watching (exit condition progress) → Closed + verdict. Every list deep-links here.
- **Merged surfaces behind `SectionTabs`** (`components/shared/SectionTabs.tsx`):
  Execution = Runs + Tasks + Outcomes; Agents = Counterparts + Workforce (Agent
  Space). Routes unchanged, so bookmarks keep working. Tasks' empty state teaches
  the Act-disposition origin.
- **Global chrome**: persona lens moved to the top bar, persisted in
  `localStorage['rewive.personaLens']` (`components/layout/personaLens.tsx`);
  **"+ New Agent" demoted** from global CTA (lives in Agents → Workforce and the Act
  flow); screen intros collapsed to one line + a "How this works" disclosure
  (`components/shared/Intro.tsx`).
- **Role routing**: Persona union extended with `sales_supervisor`, `coo`,
  `commercial_finance` (old three kept — see open threads). FMCG findings reseeded
  per the routing rules (sales execution → sales supervisor; sales+logistics
  cross-functional → COO; returns/discounts/trade spend → commercial finance).
  Finding rows wear a `→ Role` chip; the thread says "Decide — COO's call"; the lens
  filters Today *and* Findings.
- **Ledger ↔ findings**: `DecisionLedgerItem.findingId` links each decision to the
  finding it answered ("View the finding it answered →"); threads link back.
- **Fixes**: Mandate Library now follows the industry (FMCG segments Manufacturing /
  Distribution / Retail & trade + 9 FMCG KPIs in `data.js`; segment chips derive from
  `getActiveIndustry()`); tour steps gained an optional `search` field and
  `TourOverlay` matches pathname+search (two steps share `/operate/findings`).

### FP&A P&L workspace (`7964225`) — Decisions → "P&L impact · FP&A" tab

- **Full P&L statement** (gross revenue → EBITDA), **Actual vs Budget vs Forecast**
  per line, drift colored by direction (cost lines flip good/bad), **drillable by the
  industry's two dimensions** — SKU family × channel (FMCG), service line × payer
  (healthcare), part family × customer (manufacturing).
- **Drift anomalies as a task list**: each row = the exact P&L cell it hits
  (anchor-links back to the statement), drift vs both bases, routed-to role chip,
  loop status (raised / watching / cleared / new · queued for counterpart review),
  and a **Thread →** link where a counterpart has raised it (6 of 9 FMCG anomalies
  map to real findings).
- Plumbing: `GET /api/v1/pl-statement` (seeds in `mock-server/pldata.js`, variances
  reconcile line by line to the EBITDA miss) and `GET /api/v1/pl-impact` (the loop
  funnel per P&L line, seeds in `v4data.js`); types `PlStatement*`/`PlImpactLine`;
  screens `Decisions/PlStatement.tsx` + `Decisions/PlImpactTable.tsx`.

### Landing retold (`cdd2901`)

Same dark-indigo identity; borrows aampe.com's *storytelling* arc: a live finding
card inside the loop as the hero visual, a "five primitives" vocabulary section
anchored to the screens where each lives, a stats row from the demo org's quarter,
and per-seat sections (store manager / operations head / CFO). An earlier full
aampe-style visual clone (orange/cream/serif) was built and reverted by request —
don't resurrect it.

## Previous session (2026-07-14)

- **Loop speed by mandate** (`f4ac86f`): per-mandate table on Performance (owner,
  counterpart, findings/90d, time-to-decide/close, closed-in-window %, sparkline).
  `GET /api/v1/leaderboard/loop-speed`; seeds per industry in `v4content.js`.
- **Spotlight tour** (`51491f0`): `src/components/tour/` — module-level store, nine
  steps, `TourOverlay` in `AppLayout`; anchors are `data-tour="…"` attributes.
  Entry: "Show me on screen" on `/guide`, or `?tour=N` deep link (needs
  `rewive.guideSeen` set in fresh profiles). v5.1 rerouted the closure step to
  `/operate/findings?tab=watching` and updated the `where` labels.

## What v5 is (positioning unchanged)

Positioning rules live in `CLAUDE.md` → "Positioning" (the Architecture section was
updated for the new IA); per-version detail in `docs/FEATURE_INVENTORY.md`.

- Hero: **"Nothing drifts unanswered."** — do not revert to "makes someone answer for it".
- Agents are **counterparts** in all user-facing copy; internals still say "shadow"
  (`ShadowAgent`, `src/api/shadowOrg.ts`, `src/screens/ShadowOrg/`) — optional cleanup.
- The loop: **Sense → Find → Decide → Act → Close**.
- Industry picker: **FMCG + Healthcare only**; Manufacturing seeded but hidden.
- `/guide` auto-opens for first-time users via `localStorage['rewive.guideSeen']`
  (redirect lives only in `CommandCenter/index.tsx`).
- Currency convention: **impact in AED (FMCG), token/API costs stay USD**; Healthcare
  pack keeps its own USD figures.

## Open threads / natural next steps

1. **PR `v5` → `master`** for the six commits (needs `gh` auth fixed, see above).
2. **`docs/BLUEPRINT.md` is stale** — its screen map/redirect table describes the
   pre-v5.1 three-area nav. Refresh it (and `public/story.html`/`demo.html` if they
   reference Closure or Command Center by name).
3. **Persona consolidation** — old personas (store_manager/cfo/operations_head) and
   new routing roles (sales_supervisor/coo/commercial_finance) coexist; Command
   Center seeds and the agent catalog still use the old three. Decide whether to
   migrate to a single role set.
4. **Manufacturing pack depth** — to re-enable the third industry: more mandates in
   `v4data.js` + content in `v4content.js`, re-add to `industryOptions`, the landing
   `INDUSTRIES` list, and `story.html`. (Loop-speed and P&L seeds already exist.)
5. **Optional internal rename** — `ShadowAgent`/`shadowOrg.ts`/`ShadowOrg/` →
   counterpart naming, if churn is acceptable.
6. **"New" anomalies → findings**: P&L anomalies with status `new` are display-only
   ("queued for counterpart review"); a "raise as finding" mutation would close that
   loop in the demo.
7. **Keep-verbatim lines** for any new copy: "Every mandate, held twice." · "The
   company's memory of judgment." · "Nothing is 'done' until the number is back."

## Context that isn't in the code

- The founder demos this to FMCG stakeholders (Americana context — seed org is
  "Americana Foods (demo)", AED currency); FMCG is the beachhead, Healthcare second.
- The v5.1 redesign implements a written UX advisory produced earlier in the
  2026-07-15 session; its core diagnosis: 13 nav destinations → 7, three competing
  "waiting on you" counts → one, a finding's lifecycle split across three screens →
  lifecycle tabs + the thread page.
- Repositioning rationale (why "shadow org"/"agentic operating model" were dropped)
  was worked out in the 2026-07-11 session; strategy summary in merged PR #2.
- Demo entry points for reviewers: `public/demo.html` (launcher), `public/story.html`
  (narrative pitch), `/guide` + the spotlight tour, `docs/BLUEPRINT.md` (screen map —
  stale, see open threads). A good five-click demo: Today → cold-chain finding →
  disposition from the thread → Findings · Watching → Decisions (P&L impact tab).

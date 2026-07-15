# Handoff — role-scoped data + hierarchy mode; every dead-end section wired (2026-07-15, later session)

## Where things stand

- **PR #3 is open: `v5` → `master`** —
  https://github.com/Kumarv2509/rewive-front-end/pull/3. **Two new commits are
  local-only and NOT pushed** (see the FortiGate note below — it recurred at the
  end of this session). Push when the network allows, then the PR picks them up:
  - `090594b` — **fix(v5.1): wire every dead-end section end-to-end**.
  - `57148f8` — **feat(v5.1): role-scoped data everywhere + hierarchy mode**
    (the founder's ask: "every role will have their own set … no overlap or
    skip … hierarchy mode to see what is impacted").
- Earlier v5 commits (`f4ac86f` loop speed, `51491f0` tour, `cdd2901` landing,
  `4b7462b` v5.1 redesign, `7964225` P&L workspace) are already on origin.
- **Push gotcha (intermittent, ACTIVE again at session end): one of this
  machine's networks MITMs GitHub HTTPS.** `git push` fails with "SSL
  certificate problem" — a FortiGate firewall re-signs github.com (issuer
  `CN=FG201FT922921744, O=Fortinet`); its CA is not on this machine. Fix:
  change network / drop the VPN, or register an SSH key, or get the FortiGate
  CA from IT and set repo-local `git config http.sslCAInfo`. Do **not**
  disable `http.sslVerify`. (`gh` CLI auth itself works — `rianpraveen`.)
- Build and lint are clean; no test suite exists. Everything below was
  verified live against the mock API (curl) — not just typechecked.
- Local dev: `npm run dev:all` (Vite :5173 + mock API :4000). A fresh mock
  server was left running on :4000 with clean seed state. Watch for stale
  mock-server processes holding :4000 (`lsof -ti :4000`, kill before
  restarting). The mock server has **no watch mode**: seed edits in
  `mock-server/` need a restart.

## New this session (2026-07-15, later session)

### Role-scoped data + hierarchy mode (`57148f8`) — the big one

Every role now owns a **disjoint slice** of the product, and a manager can
widen the lens to their whole reporting line.

- **One role tree, defined twice, kept identical** (`mock-server/roles.js` ↔
  `src/screens/CommandCenter/personas.ts`):
  `COO → { Operations head → Store manager, Sales supervisor }` and
  `CFO → Commercial finance`. Two roots — ops line and finance line.
- **Every collection item carries exactly one `persona`**: findings, pending
  approvals, runs, live runs, tasks, counterparts (ShadowAgent), agent
  catalog, leaderboard rows, loop-speed rows, decision-ledger rows — seeded
  across all three industries (~100 items tagged via
  scratchpad script; ids untouched). **Convention: any new seed item must set
  `persona`** (now in CLAUDE.md). Types updated accordingly in
  `src/api/types.ts` (persona on RunListItem, LiveRunSummary, SolutionTask,
  ShadowAgent, LeaderboardRow, LoopSpeedRow, DecisionLedgerItem; `RoleScope`).
- **Server**: `filterByPersona(items, persona, scope)` in `app.js` uses
  `personaScope()` from `roles.js`; `scope=team` expands to the role's
  subtree. Every list endpoint accepts `persona` + `scope`: findings,
  decisions/pending, dashboard/summary, runs, runs/live, tasks, shadow-org,
  agents/catalog, leaderboard, leaderboard/loop-speed, decisions.
- **Frontend**: `useEffectiveLens()` (in `personaLens.tsx`) is the single
  resolver — global lens + non-admin lock + hierarchy toggle → `{ persona,
  scope, rolesInScope, reports }`. All data screens use it (Today, Findings,
  Runs, Tasks, Counterparts, Workforce, Performance, Decisions). This also
  fixed a pre-existing bug: Findings ignored the non-admin persona lock.
- **Chrome**: a persisted **"+ their team"** checkbox next to the lens in the
  top bar (only rendered when the lens role has reports;
  `localStorage['rewive.personaLensHierarchy']`). `ScopeBanner`
  (`components/shared/ScopeBanner.tsx`) sits under each screen header and
  spells out which roles are in view. Run and task rows wear `→ Role` chips.
- **The loop stays role-true**: tasks created by a finding's **Act**
  disposition inherit the finding's persona; quick-solution tasks inherit the
  signal's; agent specs inherit the task's (the old hardcoded
  `operations_head` in `POST /agent-specs` is gone).
- **Verified**: per endpoint, the union of the six role slices equals the full
  set with zero pairwise overlaps (fmcg); COO+team = COO + Ops head + Store
  manager + Sales supervisor; CFO+team = CFO + Commercial finance; an
  Ops-head finding's Act produced Ops-head tasks visible under COO+team,
  invisible under CFO+team.
- **Judgment calls to sanity-check with the founder**: assignments follow the
  routing rules where they existed (trade spend → commercial finance, sales
  execution → sales supervisor, cross-functional → COO) and best semantic
  read elsewhere — healthcare revenue cycle sits under CFO, manufacturing
  quality under Store manager (line-level), People/HR streams under COO.
  Some slices are thin: Sales supervisor has no healthcare/manufacturing
  items and no FMCG catalog agent; Store manager is thin in FMCG. Honest
  empty states, but remap or add seeds if the demo needs them.

### Every dead-end section wired end-to-end (`090594b`)

An audit found no unfetched screens — the gaps were dead actions and one
un-closeable loop. All fixed and exercised via curl:

- **Tracked KPI "needs data" now resolves** (was permanent): the KPI panel's
  Connect link carries `?forKpi=` to Data Connectors, which shows a banner
  with the KPI's needed drivers; the created connection stores `forKpiId`;
  the KPI walks `needs data → connection pending approval → data connected`
  (reject returns it to needs data). New `TrackedKpiDataStatus`
  `'pending_approval'`.
- **Runs pause/resume is real server state** (pause previously returned a fake
  response and mutated nothing; resume existed but had no UI). `runDetails`
  moved into per-industry mutable state; the live card shows a **⏸ PAUSED**
  pill and a working **Resume**; live polling stops/restarts with it. The
  dead "Watch" button (no onClick) was removed.
- **Outcomes "Schedule"** posts to a new
  `POST /outcomes/:runId/actions/:actionId/schedule` and renders ✓ Scheduled
  (was toast-only).
- **Agent builder "Refine plan"** (was completely inert) focuses the chat
  input with a seeded "Refine the plan: " draft — feeding the already-wired
  message flow.
- **Tasks channel selector caption was a lie** — it *is* persisted via
  `PATCH /tasks/:id/channel`; caption reworded to "saved to the task —
  delivery is simulated in this demo"; `docs/FEATURE_INVENTORY.md` updated.
- Deliberately left alone: orphaned Signal Studio screen (unroutable since the
  signals→findings evolution), server-only features with no UI (KPI tickets,
  signal review committee), FMCG-flavoured global data under other industries
  (connectors / people directory / audit log — a bigger industry-scoping
  decision).

## Previous sessions (still true)

- **v5.1 comprehension redesign** (`4b7462b`): one flat 7-item loop-ordered
  rail; Today = one "Waiting on you" queue with the product's only count;
  findings lifecycle tabs (Closure screen retired → Watching/Closed);
  the finding thread page; merged Execution and Agents surfaces behind
  `SectionTabs`; persona lens in global chrome.
- **FP&A P&L workspace** (`7964225`): Decisions → "P&L impact · FP&A" tab;
  full P&L Actual/Budget/Forecast drillable by the industry's two dimensions;
  drift anomalies as a task list; seeds `mock-server/pldata.js` + `v4data.js`.
- **Landing retold** (`cdd2901`), **spotlight tour** (`51491f0`), **loop speed
  table** (`f4ac86f`).

## What v5 is (positioning unchanged)

Rules live in `CLAUDE.md` → "Positioning"; per-version detail in
`docs/FEATURE_INVENTORY.md`.

- Hero: **"Nothing drifts unanswered."** The loop: **Sense → Find → Decide →
  Act → Close.**
- Agents are **counterparts** in user-facing copy; internals still say
  "shadow" (`ShadowAgent`, `src/api/shadowOrg.ts`) — optional cleanup.
- Industry picker: **FMCG + Healthcare only**; Manufacturing seeded but hidden.
- Keep-verbatim: "Every mandate, held twice." · "The company's memory of
  judgment." · "Nothing is 'done' until the number is back."
- Currency: impact in AED (FMCG), token/API costs USD; Healthcare in USD.

## Open threads / natural next steps

1. **Push `090594b` + `57148f8`** (blocked by FortiGate at session end), then
   review & merge PR #3.
2. **Old-persona leftovers**: `personaKpiOverrides` (`data.js`) still covers
   only store_manager/cfo/operations_head (FMCG only) — the three newer roles
   get no KPI overrides on Today. Tour/Guide copy still names only the old
   three personas (`tour/steps.ts:19`, `Guide/index.tsx:25`).
3. **Thin role slices** (see judgment calls above) — decide whether Sales
   supervisor / Store manager need more seeded content per industry.
4. **`docs/BLUEPRINT.md` is stale** — still describes the pre-v5.1 three-area
   nav (and `public/story.html`/`demo.html` may reference retired names).
5. **P&L discoverability** — the FP&A workspace is the second tab on
   Decisions; candidates: bookmarkable route (`?view=pl`), P&L card on Today
   under the CFO / Commercial finance lens.
6. **Manufacturing pack depth** — to re-enable the third industry (also:
   `closureKpisSeed.manufacturing` is empty → Watching tab empty state).
7. **"New" anomalies → findings**: P&L anomalies with status `new` are
   display-only; a "raise as finding" mutation would close that loop.
8. **Optional internal rename** — shadow → counterpart naming.

## Context that isn't in the code

- The founder demos to FMCG stakeholders (Americana context; seed org
  "Americana Foods (demo)", AED). FMCG is the beachhead, Healthcare second.
- The role hierarchy + "no overlap or skip" partition + hierarchy mode was the
  founder's direct ask this session (their words: "every role will have their
  own set of findings, execution, Agents, Performance etc, so the roles
  doesn't overlap or skip … on the hierarchy mode it should work to see what
  is impacted based on the role they perform").
- Good demo path for the new work: lens = COO → Today shows only COO items →
  tick "+ their team" → the queue, Findings, Execution, Agents, Performance
  and the Ledger all widen to the ops line, with role chips showing whose
  each item is; switch lens to CFO to show the finance line never bleeds in.
- Repositioning rationale in merged PR #2; the v5.1 UX advisory diagnosis in
  the 2026-07-15 morning session (13 nav destinations → 7, one count, one
  thread per finding).

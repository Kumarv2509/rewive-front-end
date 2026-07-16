# Handoff — H1 2026 lifecycle history, entities & regions, self-refreshing demo clock (2026-07-16)

## Where things stand

- **Committed and pushed; PR #4 (`v5` → `master`) is OPEN** —
  https://github.com/Kumarv2509/rewive-front-end/pull/4 — three commits:
  `f645682` (mock+api: H1 history, entity/region, clock-relative seeds),
  `2c9d76a` (decisions+findings: half-year panel + entity/region surfaces),
  `da02eb0` (this handoff). Build + eslint clean; verified live against the
  mock API (curl) **and** driven headlessly in Chromium (Playwright
  screenshots of every screen — zero console errors / failed requests).
- **Processes at session end**: Vite dev on :5173 (user's own `dev:all`
  session, untouched) + a **detached** mock API on :4000 (`nohup node
  mock-server/server.js`, log at the session scratchpad's `mock-api.log`).
  It was launched detached because harness-managed background tasks kept
  getting reaped between turns, taking the API down (the user's tab then
  showed error states everywhere). To take over: `lsof -ti:4000 | xargs
  kill`, then `npm run mock-server`. The mock server has **no watch mode**:
  seed edits in `mock-server/` need a restart.
- **Push gotcha (intermittent, from 2026-07-15): one of this machine's
  networks MITMs GitHub HTTPS.** `git push` fails with "SSL certificate
  problem" — a FortiGate firewall re-signs github.com (issuer
  `CN=FG201FT922921744, O=Fortinet`). Fix: change network / drop the VPN, or
  use an SSH key, or set repo-local `http.sslCAInfo`. Do **not** disable
  `http.sslVerify`. (`gh` CLI auth works — `rianpraveen`.)
- PR #3 (`v5` → `master`) merged 2026-07-15 (`17ea4e4`); `master` carries
  everything up to `1cba44e`.

## New this session (2026-07-16)

The founder's ask: *"mimic the full lifecycle and all the alerts like I am in
Jun 2026, give me half-year stats and relevant tasks; the business dealt in
different entities and regions."*

### Half-year (Jan–Jun 2026) lifecycle backfill — `mock-server/v4data.js`

- **FMCG findings: 6 → 16**, now covering every lifecycle state at once:
  5 open (two SLA-at-risk ≤8h; `fmcg-f-3` escalated; `fmcg-f-9` is an
  acknowledged-in-May finding whose trip-wire fired and came back escalated),
  1 acting (`fmcg-f-7`, Riyadh DC case fill — has a live solution design),
  1 acknowledged, 2 accepted (one with a **regressed** exit condition,
  `fmcg-f-h3` KSA distributor DSO — assessor verdict `not_worked`),
  5 closed with `assessorVerdict` populated (first seeds ever to use it),
  2 abandoned (one historical, with a counterpart-tuning reason).
- **Closure KPIs: FMCG 2 → 7** (5 closed across Feb–Jun, 1 tracking,
  1 regressed); healthcare 1 → 3. `manufacturing` still `[]`.
- Healthcare got 2 historical closed loops (`hc-f-0` Feb denial episode,
  `hc-f-h1` Lakeside OR utilization); manufacturing only got entity tags.
- Referential integrity holds both ways (`finding.closureKpiId` ↔
  `closure.findingId`; ledger `findingId` → real finding) — there's a check
  snippet in this session's transcript if you touch the seeds.

### Entities & regions — a new dimension

- `Finding`, `ClosureKpi`, `DecisionLedgerItem` gained optional
  `entity`/`region` (`src/api/types.ts`); every seed item of those types is
  tagged. FMCG: UAE Trading Co. / KSA Manufacturing Co. / Egypt Foods
  S.A.E. / Gulf Distribution Co. × UAE / KSA / Egypt / Kuwait & GCC.
  Healthcare: Metro General Hospital / Northside Clinics / Lakeside Surgical
  Center × Northeast / Midwest / South. Manufacturing: Plant 1 — Jebel Ali
  (UAE) / Plant 2 — Dammam (KSA).
- UI: entity (region) shows on finding rows, the thread header, exit-condition
  cards and under ledger subtitles; Findings has an **All regions** select
  (client-side filter, options derived from data; `?region=` URL param).
  Runs/tasks/agents do **not** carry the dimension (deliberate scope cut).

### H1 stats + HalfYearReview panel

- `DecisionStats.halfYear` (new types `HalfYearReview/-Month/-BreakdownRow`):
  monthly raised/decided/closed + win-rate, plus by-entity and by-region
  rollups. Seeded for all three industries (`data.js` for FMCG,
  `v4content.js` for HC/Mfg). `openNow` counts match the actual open seeds.
- `src/screens/Decisions/HalfYearReview.tsx` renders it at the top of the
  Ledger tab: grouped monthly bars + a separate win-rate line (no dual axis),
  two breakdown tables. Series colors `#7C7CFF/#0D9488/#16A34A` were run
  through the dataviz palette validator against the dark surface (all checks
  pass); win-rate line is amber. Hidden entirely if `halfYear` is absent.
- FMCG ledger: 7 → 15 rows spanning 09 Jan–18 Jun, each new row linked to its
  finding with an assessor note; includes decisions that *failed* (`led4`
  terms extension → regressed; `led8` acknowledge whose trip-wire fired).

### Tasks

- `app.js` pre-seeds `solutionDesigns` with `sol-fmcg-riyadh-otif` (the Act
  behind `fmcg-f-7`), so `/api/v1/tasks` has 4 in-flight tasks from the seed
  (mixed statuses/personas) instead of only after a live Act.

### The demo clock is now self-refreshing (the "breaks" fix)

- The user reported "a lot of breaks". A full-screen sweep found **zero**
  errors; the real issues were (a) the API having been down overnight (see
  Processes above) and (b) **seed-date rot**: dates were pinned to
  2026-06-30, so on 2026-07-16 every counterpart read "last raised 16d ago"
  next to "14h left on SLA".
- Fix: **all 87 ISO timestamps in `v4data.js` are now computed from the
  server clock at boot** — `hoursAgo(n)` / `daysAgo(n)` helpers at the top of
  the file; live items land hours ago, H1 history lands ~2 weeks–6 months
  back. Evidence strings that named absolute dates were reworded to relative
  ("fired this week"). **Convention going forward: never hardcode an ISO
  date in `v4data.js` seeds — use the helpers.** (Ledger `date` display
  strings like "12 May" and `data.js`/`v4content.js` relative strings like
  "2h ago" are still static — acceptable for history, but the same rot risk
  applies if "now"-adjacent.)
- Not re-verified by the user yet — they were asked to hard-refresh and
  report which screen if anything still looks broken.

## Previous session (2026-07-15, later session)

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

1. ~~Commit + push + PR~~ — **done**: PR #4 is open (`v5` → `master`);
   review & merge it.
2. **Confirm the "breaks" report is resolved** — the user's last message said
   "lot of break are there"; diagnosis + fix are in "New this session", but
   they haven't confirmed after the hard-refresh yet. If something is still
   broken, get the screen name / a screenshot first.
3. **Entity/region breadth** — the dimension exists only on findings,
   closures and ledger rows. Candidates: runs/tasks/agents tagging, an
   entity filter on Decisions, a region/entity lens in global chrome
   (mirroring the persona lens), and P&L dimA/dimB alignment.
4. **Ledger `date` strings** are static `"DD Mon"` with no year while
   findings are now clock-relative — fine for H1 history, but consider ISO +
   client formatting if the ledger should sort or bucket by real dates
   (the `halfYear` block is hand-seeded, not derived).
5. **Old-persona leftovers**: the display-dead `dashboardSummary.kpis` block +
   `personaKpiOverrides` were **dropped** from the contract, seeds and server —
   `GET /dashboard/summary` now returns only `{ greetingName, summarySentence }`
   (Today's stats come from findings/approvals/decision-stats, role-scoped).
   Tour/Guide copy still names only the old three personas
   (`tour/steps.ts:19`, `Guide/index.tsx:25`).
6. **Thin role slices** (see judgment calls above) — decide whether Sales
   supervisor / Store manager need more seeded content per industry.
7. **`docs/BLUEPRINT.md` is stale** — still describes the pre-v5.1 three-area
   nav (and `public/story.html`/`demo.html` may reference retired names).
8. **P&L discoverability** — the FP&A workspace is the second tab on
   Decisions; candidates: bookmarkable route (`?view=pl`), P&L card on Today
   under the CFO / Commercial finance lens.
9. **Manufacturing pack depth** — to re-enable the third industry (also:
   `closureKpisSeed.manufacturing` is empty → Watching tab empty state).
10. **"New" anomalies → findings**: P&L anomalies with status `new` are
    display-only; a "raise as finding" mutation would close that loop.
11. **Optional internal rename** — shadow → counterpart naming.

## Context that isn't in the code

- The founder demos to FMCG stakeholders (Americana context; seed org
  "Americana Foods (demo)", AED). FMCG is the beachhead, Healthcare second.
- The role hierarchy + "no overlap or skip" partition + hierarchy mode was the
  founder's direct ask this session (their words: "every role will have their
  own set of findings, execution, Agents, Performance etc, so the roles
  doesn't overlap or skip … on the hierarchy mode it should work to see what
  is impacted based on the role they perform").
- Good demo path for the 2026-07-16 work: Findings → Open (two red SLAs, two
  escalations, entities/regions on every row) → Watching (a regressed exit
  condition next to a tracking one, a solution in motion, a trip-wire) →
  Closed (five loops at 100%) → open `fmcg-f-h2`'s thread (raised → decided →
  watched → closed → assessor verdict) → Decisions (H1 2026 panel, win rate
  61%→78%, by-entity/by-region) → Execution → Tasks (the Riyadh DC Act's four
  tasks). The two `not_worked` rows in the ledger are the honesty beat.
- Good demo path for the role work (2026-07-15): lens = COO → Today shows only COO items →
  tick "+ their team" → the queue, Findings, Execution, Agents, Performance
  and the Ledger all widen to the ops line, with role chips showing whose
  each item is; switch lens to CFO to show the finance line never bleeds in.
- Repositioning rationale in merged PR #2; the v5.1 UX advisory diagnosis in
  the 2026-07-15 morning session (13 nav destinations → 7, one count, one
  thread per finding).

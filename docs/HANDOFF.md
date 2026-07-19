# Handoff — live mandate tracking, Manufacturing at parity, marketing-site design passes (2026-07-18/19, latest session)

## Where things stand

- **`v5` is 12 commits ahead of the PR-#4 merge point, NOT pushed, no PR yet**:
  1. `e0e365e` — **paper-ledger redesign** (parallel session, documented below).
  2. `53257e4` — **org tree + commercial-finance dotted line** (part 1 — supersedes the second-hand description the previous handoff had for it).
  3. `a3da560` — the previous handoff commit.
  4. `cdba393` — **Business base-data section + roped findings** (part 2).
  5. `ec5d3ac` — mid-session handoff commit.
  6. `6d3181f` — **holistic seeds: lifecycle-diverse findings across every role + business fact sections** (part 3).
  7. `ce02dec` — **DuPont cascade: full P&L tier in the FMCG Operating Picture** (part 4).
  8. `7885692` — **healthcare P&L tier** (part 4, seeds only).
  9. `1c6a3aa` — the previous handoff commit.
  10. `a2fb841` — **finding impactPath seeds routed through the P&L tier** (resolved old open thread 3b: 24 FMCG findings now carry `pl_line` steps; the hero fill finding reads sense → mandate → gross revenue → intent).
  11. `13d63b9` — **half-year review derived from live state** (2026-07-17 session, documented below; resolved old open thread 3).
  12. `d667457` — the previous handoff commit.
  13. `b7db762` — **stat tiles derived too** (same session; no hand-seeded decision stats remain anywhere).
  14. `0de608e` — the previous handoff commit.
  15. `49bf366` — **Today queue sectioned by mandate**: `UnifiedQueue.tsx`
      groups findings under mono eyebrow headers per mandate (first
      `stream_kpi` step of the finding's `impactPath`), with the DuPont
      P&L line as a right-aligned `→` hint and a `× N` count; sections
      ordered by most-urgent SLA; approvals under a trailing "Approvals"
      section. One count unchanged. Verified headless (all-lens: 17
      mandate sections + approvals; COO — Protein lens: 2).
  16. `697fe66` — the previous handoff commit.
  17. `4ea8961` — **demo heartbeat**: a 30s interval in `app.js`
      (`startHeartbeat()`, called ONLY by `server.js` — never the Vercel
      handler) that (a) decays open findings' SLA clocks at **12x demo
      time** and auto-escalates expired ones up the role tree with the
      shared `escalateFindingUp()` (dotted forks included; top-of-tree
      findings clamp at 0h "breached and waiting" instead of looping),
      (b) stamps staggered `lastSenseSweepAt` on counterparts (new
      optional ShadowAgent field; card footers show "senses swept 2m
      ago"), and (c) refreshes active connectors' `lastSyncedAt` +
      audit-logs loads as 'Rewive (system)'. Tune with
      `REWIVE_SLA_HOURS_PER_TICK` (0 freezes clocks; 1 = stage speed,
      hero escalates in ~2 min; default 0.1 ≈ hero in ~20 min).
      **Demo consequence**: left running for hours, the whole queue
      migrates to the Group CEO breached — restart the mock server to
      reset, or freeze the clock between demos. Findings/counterpart
      queries already poll every 30s, so escalations appear live with
      no frontend work. Verified with a throwaway
      `REWIVE_SLA_HOURS_PER_TICK=5` instance on :4100: hero walked
      `protein_supply_chain → coo`, trade-spend forked to the CFO,
      connectors loaded, all 19 counterparts swept.
  18. `02076f3` — the previous handoff commit.
  19. `6c7bcf1` — **npm scripts for the heartbeat speeds**:
      `mock-server:stage` (1h/tick — hero escalates ~2 min after boot)
      and `mock-server:frozen` (clocks stopped); plain `mock-server`
      stays the 12x default.
  20. `e686ac3` — the previous handoff commit.
  21. `e71bf9b` — **Datasets placeholder** (`/build/datasets`, Foundation):
      per-industry registry of the data to come — `expected` slots naming
      source/cadence/the Operating Picture nodes they'll feed +
      analysis ideas tied to existing findings; `live` ones ride the
      heartbeat (fresh loads, row growth). CSV staging (client-side
      profiling → `POST /datasets` as 'receiving') and an analysis
      workbench (`POST /analysis-requests`, queued until data lands).
      Contract: `Dataset`/`AnalysisRequest` in types.ts,
      `src/api/datasets.ts`, seeds in `mock-server/datasetsdata.js`,
      state in the serverless snapshot. **Foundation now has a
      `FOUNDATION_TABS` SectionTabs header on all four screens** —
      its sub-screens were previously unreachable by browsing.
      Company-wide like business context (no persona). Verified:
      endpoints + headless screenshot.
  22. `74aa7cf` + `b885a11` — handoff commits (Datasets, SSH saga).
  23. `5636aff` — **Picture statuses reconciled with Datasets**: the
      kpi-brain endpoint derives node statuses at read time
      (`reconcileBrainStatuses` in app.js) — mandate 'connected' only if
      a **live** dataset names it in `feeds` (exact node-name match —
      keep dataset `feeds` in sync with node names!), sense 'connected'
      only if its stream has a live dataset, everything else
      'needs_data'; 'proposed'/targets/P&L lines keep seeded status.
      FMCG now honestly shows 4/26 mandates + 2/6 senses connected
      (POS + trade-spend feeds), healthcare 2/22 + 1/8, manufacturing
      0. Fixed hc dataset feed names to exact node names. The founder
      chose this over the fully-lit picture ("reconcile it") — flipping
      a dataset seed to 'live' is how you light up more of the tree.
  24. `25226e5` + `6c08996` — handoff commits (Datasets reconciliation;
      prioritized next steps).
  25. `337b46c` — **organization sign-in (tenancy)** — the SaaS front
      door; 2026-07-18 session, documented below.
  26. `98d1324` — **agents ↔ mandates, both directions** — same session,
      documented below.
  27. `7c325b3` — the previous handoff commit.
  28. `b8e4143` — **live mandate tracking — the one real pipeline**
      (2026-07-18 session, documented below): real metric ingestion →
      drift rules → counterpart-raised findings, Postgres-backed,
      Claude-authored narratives with template fallback.
  29. this handoff commit.
- **UNCOMMITTED at handoff (deliberate — founder hasn't picked what to
  keep):**
  (a) **Manufacturing at parity + Gulf Precision tenant** — `v4data.js`,
  `datasetsdata.js`, `tenants.ts`, `CLAUDE.md`, one card in `site.html`;
  verified end-to-end, build+lint clean; documented below. Safe to commit
  as `feat(industry): manufacturing at parity`.
  (b) **`public/site.html`** (untracked, ~70KB) — the standalone marketing
  site, built and iterated by TWO sessions concurrently on 2026-07-18/19
  (both are documented first-hand below; neither description is
  second-hand). Session A (the "four looks" section): 3D depth pass →
  night-ledger dark → dark + gradients → **light + gradients** (current
  ground). Session B (the "pitch site" section): created the file in the
  first place (11 ledger-numbered entries + FAQ, animated SLA/escalation
  hero), then the color pass (washes/colorbar/hue-coded loop), the
  light-gradient conversion of those washes, the parallax orb backdrop,
  Entry 10 "How it lands" + Entry 11 FAQ, OG/Twitter meta, scroll-spy
  nav. The two passes compose — do not clobber either; the file changes
  out from under sessions, re-read before every edit.
- **Push STILL blocked (SSH) — three failed attempts as of 2026-07-17.**
  The client side is PROVEN good: we reach real GitHub (server host key
  matches GitHub's published
  `SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU`), and ssh offers
  the right key — `~/.ssh/id_ed25519_rewive` (generated fresh this
  session after the founder reported a fingerprint mismatch on the first
  key), fingerprint `SHA256:qi700T0YxECL3859MQIEId9q2+/3E09fi/vgYPdR2P8`,
  wired as the `github.com` IdentityFile in `~/.ssh/config`
  (`IdentitiesOnly yes`; old `~/.ssh/id_ed25519` no longer used).
  **The GitHub side is where it dies**: after each "added it" from the
  founder, `github.com/rianpraveen.keys` AND `github.com/Kumarv2509.keys`
  are still EMPTY (checked cache-busted via WebFetch — these public pages
  list an account's authentication keys), and `ssh -T` still says
  *Permission denied (publickey)*, which means NO github.com account
  holds the key. Open questions put to the founder, unanswered at
  handoff: (a) which username is in the top-right when adding the key —
  possibly a third account; (b) what the **Authentication keys** section
  of `github.com/settings/keys` actually lists (vs Signing keys — those
  don't authenticate and don't appear at `.keys`); (c) whether the page
  is really github.com and not a company GitHub Enterprise host. The
  add may also be dying at the sudo/2FA confirmation step.
  **Success test that needs no session**: a line starting
  `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMGi…` visible at
  `github.com/<username>.keys` → then `git push origin v5` will work.
  Copy helper for the founder: `pbcopy < ~/.ssh/id_ed25519_rewive.pub`.
  Don't fall back to HTTPS/`gh` — the FortiGate MITM breaks TLS
  (memory `fortinet-git-push`).
- **Escalation demoed live to the founder (2026-07-17)**: at stage speed
  the hero finding walked `protein_supply_chain → coo` on its own ~2 min
  after boot, watched in the browser (queue pill flipped, 12h reset,
  audit entry by 'Rewive (system)'). Server was then reset to the
  default 12x speed — that's what is running at handoff.
- **Push is blocked on exactly one founder action.** This network's FortiGate
  MITMs GitHub HTTPS and its CA is in no local trust store, so git, curl
  **and `gh` all fail TLS** (don't fix by disabling verification; memory
  `fortinet-git-push` has the full diagnosis). The remote was switched to
  **SSH** (`git@github.com:Kumarv2509/rewive-front-end.git`) which rides
  `~/.ssh/config`'s `github.com → ssh.github.com:443` mapping — the network
  path works, but GitHub answers *Permission denied (publickey)* because the
  local ed25519 key was never registered. **Founder: add
  `~/.ssh/id_ed25519.pub`** (comment `praveenj@broqr (claude-code)`) at
  github.com/settings/keys on the account with push access (`gh` config says
  `rianpraveen`), then `git push origin v5`. `gh` CLI is unusable on this
  network — hand the founder compare/PR URLs instead of using `gh pr create`.
- **Processes at handoff (2026-07-19): BOTH servers are UP** — vite on
  :5173 (session B's background `npm run dev:all`, started 2026-07-18
  after killing lingering ports) and a mock API on :4000 (session A's
  instance with `REWIVE_SWEEP_MS=0`, memory-mode live-tracking store,
  which replaced the stale founder-owned one). `/site.html` serves 200.
  If anything wedges, `npm run dev:all` after killing by port is the
  safe reset. Mock server still has
  no watch mode — restart after seed edits (and note a restart resets the
  in-memory industry to `fmcg`; see the gotcha above). **Process gotcha
  learned the hard way**: stopping the background `dev:all` task does NOT
  kill concurrently's children — vite and the API linger holding :5173/
  :4000 (a relaunch then "listens" and silently exits, and vite drifts to
  :5174, so you test STALE code). Kill by port before relaunching:
  `for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.
- **The previous handoff's open thread #1 is DONE**: all of this session's
  browser verification (grouped lens dropdown, amber ⋯ dotted pills,
  escalation walking up the tree, Group-CEO team scope, Business section)
  ran **on the paper-ledger theme** at HEAD.
- Build (`tsc -b && vite build`) and `eslint .` clean including the
  uncommitted manufacturing work (re-verified 2026-07-19). Bundle note:
  SheetJS is lazy-loaded (own chunk) — main bundle stays ~790KB.
- PR #4 merged to `master` earlier on 2026-07-16 (`4eb7320`).

## This session (2026-07-18/19): live mandate tracking — the one real pipeline (`b8e4143`)

The founder asked to "connect the data to the agent to get the mandates
tracked, production grade." Three decisions were made via question
(all recommended options accepted): **push-model ingestion** (API key +
CSV upload) over warehouse-pull or pure simulation; **hybrid agent
brain** (deterministic rules decide WHEN a finding is raised, Claude
authors the narrative) over LLM-end-to-end or rules-only; **Postgres**
(Neon/Supabase, `DATABASE_URL`) over KV-only or a separate worker
service. CLAUDE.md has a permanent section ("Live mandate tracking");
the plan survives at `~/.claude/plans/sprightly-herding-pebble.md`.

**Architecture — additive coexistence via hydrate/persist overlay.**
Seeded demo content is untouched. New real entities (metric points,
tracking configs, hashed ingest keys, sweep runs) live only in the
tracking store. Sweep-raised findings/closures carry **`live-` id
prefixes**: Postgres is their source of truth, `hydrateLiveState()`
(app.js) upserts them into `findingsState`/`closureKpisState` on every
request so the ENTIRE existing 4-A/escalation/closure machinery works on
them unmodified, `persistLiveState()` diffs and writes back after the
response, and `exportState()` **strips `live-*` from the KV snapshot**
(split-brain defense — never let KV hold a copy). No `DATABASE_URL` →
in-memory store with the same interface; `npm run dev:all` needs zero
setup.

- **Files**: `mock-server/db.js` (lazy pg Pool max=1, memory fallback),
  `schema.sql` + `migrate.js` (`npm run migrate`, idempotent),
  `tracking.js` (store + `overlayLiveTracking` + `formatValue`),
  `tracking-routes.js` (all endpoints), `drift.js` (pure rules),
  `sweep.js` (orchestration), `authoring.js` (Claude), plus wiring in
  `app.js`/`api/handler.js`/`server.js`/`vercel.json`. Frontend:
  `src/api/tracking.ts` hooks, four new Connectors panels, Live
  pill/sparkline on `BrainNodeCard`, sweep provenance on finding
  detail/rows.
- **Drift rules** (`drift.js`): normalized adverse deviation
  (direction-aware, `up_good`/`down_good`); `threshold_breach`
  (dev ≥ breachPct), `sustained_deviation` (N consecutive ≥ warnPct),
  `trend_to_breach` (OLS slope projects breach within 14d). Severity →
  wall-clock SLA budget (critical 4h / high 8h / medium 24h / low 48h,
  stored as `sla_deadline_at`; live findings SKIP the demo heartbeat —
  hydrate recomputes remaining hours and escalates on the first request
  past the deadline, serverless-safe).
- **Sweep** (`runSweep`): pg advisory lock (no double-run), per enabled
  config: (1) acknowledged findings get their re-alert trip-wire
  enforced NUMERICALLY (reopens one level up via the shared persona
  walk when dev worsens past `ackDeviationPct + pct` or the window
  expires), (2) accepted findings' closures advance
  (`recoveryProgressPct`, direction-aware), (3) rules-triggered nodes
  with no active finding raise one — counterpart resolved by
  `watchesNodeIds` → streamKey → chief; impactPath computed by walking
  brain edges upward on strongest weight; **three dedupe layers**
  (in-sweep check, partial unique index `live_findings_one_active` +
  ON CONFLICT, the lock).
- **Authoring** (`authoring.js`): `claude-opus-4-8`, structured output
  (strict JSON schema: title/summary/evidence/impactEffects — one per
  path step/closureTemplate/reAlertCondition), system prompt written in
  the counterpart's voice with house style rules; 30s timeout, ≤5
  Claude authorings per sweep; ANY failure (no key, 429, refusal, bad
  JSON) falls back to a deterministic `templateNarrative` — **a sweep
  never fails to raise because authoring failed**. `authored_by` column
  records which path ran. Claude path is UNTESTED live (no
  `ANTHROPIC_API_KEY` on this machine); template path fully verified.
- **Endpoints**: `POST /metrics` (X-API-Key vs sha256 `key_hash`, ≤1000
  pts, per-row rejects), `POST /metrics/import` (browser parses
  CSV/XLSX via lazy-loaded SheetJS — keeps the main bundle at baseline —
  posts JSON in 1000-row chunks under Vercel's body limit),
  `GET/PUT /tracking-configs`, `GET/POST/DELETE /ingest-keys` (plaintext
  `rwv_…` shown once), `GET /agent-sweep` (Vercel Cron, `Bearer
  CRON_SECRET`), `POST /agent-sweep` (UI button), `GET /sweep-runs`.
  Cron: hourly in `vercel.json` + `maxDuration: 60` (**hourly needs
  Vercel Pro**; Hobby ≈ daily — the button and the dev interval
  `REWIVE_SWEEP_MS`, default 60s, cover demos).
- **Verified end-to-end in memory mode** (fmcg `up_good` + healthcare
  `down_good`): config → key → push declining series → Picture shows
  Live pill/real values/off_track/spark → sweep raises exactly one
  finding under the right counterpart persona with a correct impact
  path → re-sweep no duplicate → accept creates live closure → recovery
  points advance it (88%) → close writes verdict; acknowledge → worsen →
  sweep reopens one level up (cfo → group_ceo); 401 bad key; per-row
  unknown-node rejects. Build + lint clean.
- **To go production**: set `DATABASE_URL` (POOLED string) +
  `ANTHROPIC_API_KEY` + `CRON_SECRET` in Vercel, run `npm run migrate`
  once against the DB, deploy, confirm cron rows in `sweep_runs`.
  `.env.example` documents all three.

## This session (2026-07-19): Manufacturing at parity + Gulf Precision tenant (UNCOMMITTED)

Manufacturing was seeded-but-hidden ("lighter — proves the template").
It is now a full third industry and EXPOSED in the picker + login:

- **Brain 17 → 32 nodes / 16 → 41 edges** (`v4data.js`): new 5-line P&L
  tier in USD (`mfg-pl-rev/material/conversion/maintenance/ebitda`) wired
  mandates → lines → EBITDA → unit-cost intent; 6 new mandates
  (Changeover time, Energy per unit, MTTR, Inbound defect PPM, WIP days,
  Lost-time incidents); 4 new senses (Energy meters, QC inspections,
  EHS incident log, ERP costing). All counterpart `watchesNodeIds`
  widened to the new nodes.
- **Findings 3 → 6**: kept the downtime/OTIF/scrap trio; added
  `mfg-f-4` inbound casting PPM (ACCEPTED, persona cfo, linked to
  tracking closure `mfg-c-1` at 45%), `mfg-f-5` energy-per-unit spike
  (rental compressor left running — open, cfo), `mfg-f-6` near-miss
  reporting collapse at Dammam (open, coo, 6h SLA — the
  leading-indicator-went-dark story). Closures 0 → 3 (one tracking, two
  closed historical). plImpact 3 → 5 rows.
- **Datasets 1 → 6** (`datasetsdata.js`): five live (MES, CMMS, ERP,
  QMS, energy submeters) whose `feeds` name node names EXACTLY (the
  reconcile rule), so 15/17 mandates read connected; EHS stays
  'expected' → the two safety mandates honestly show needs_data.
- **Exposure**: `industryOptions` third entry (17 kpis);
  `tenants.ts` third tenant **Gulf Precision Industries** (GP, steel
  blue `#1B4B72`, gulfprecision.com, Plant 1 Jebel Ali / Plant 2
  Dammam); third industry card on `site.html`; CLAUDE.md updated
  (picker line, tenants line, currency line — mfg is USD).
- **Verified**: all industry-scoped endpoints on a restarted :4000
  (picker, brain node/edge counts + zero dangling edges + all finding/
  watch refs valid, findings sorted open-first, closures, plImpact,
  shadow-org health rollups, datasets). Build + lint clean. NOTE: a
  stale user-owned `dev:all` API was holding :4000 with old seeds and
  was killed/restarted — the port-holding gotcha below remains true.

## This session (2026-07-18): marketing site — 3D pass + four looks (`public/site.html`, UNTRACKED)

The standalone marketing page went through four design iterations, all
verified with headless Playwright screenshots (chromium via the npx
cache at `~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`):

1. **3D depth pass** (kept in all later looks): layered `--shadow-3d`
   token; hero finding-card is a pointer-tracking 3D object (lerped
   rotate, floating depth chips riding `--px/--py` custom props at
   different translateZ); held-twice holders angle INWARD toward the
   bobbing mandate chip; loop SVG is a tilted disc that rights itself
   on scroll-in and flattens on hover; ledger/org-tree "lay flat" as
   they enter; pointer tilt on card grids; nav depth on scroll; dot
   grain + parallax. All gated on `prefers-reduced-motion` + fine
   pointer.
2. **Night-ledger dark** (`#0F1014` ground, brightened accents).
3. **Dark + gradients** (violet→indigo→teal signature).
4. **Light + gradients — CURRENT**: paper ground restored, gradient
   deepened for contrast (`#8B5CF6 → #3B3BC4 → #0D7E74`) on the
   headline word, CTAs (position-shift hover), vig-frame top edge,
   avatar, progress bar, loop ring (SVG linearGradient), continuous
   spectrum colorbar; pastel radial ambient fields behind hero/close.
   Semantic colors stay flat for legibility.

Theme-swap mechanics (for future re-skins): everything is tokenized
EXCEPT SVG presentation attrs and a handful of literal rgba borders —
the working method is a node batch script over exact strings (see this
session's transcript); the light↔dark maps are symmetric. Two
comparison artifacts remain in the session scratchpad (`themes.html`
light duos, `themes-dark.html` dark duos) — regenerate rather than
reference. **The founder edits this file from other sessions**
(the color pass appeared mid-session) — always re-read before editing.
Deliberately breaks the paper-ledger no-gradient rule ON THIS PAGE ONLY;
the app keeps the flat theme.

## This session (2026-07-18/19, session B): the pitch site — creation, color, gradients, parallax, rollout + FAQ (`public/site.html`, UNTRACKED)

The founder's ask, in sequence: *"give me a state of the art website which
can pitch this product effectively to the customers"* → *"make it more
colorfull"* → *"make it light gradient"* → *"can we add a parallex effect
and some background behind"* → *"continue to build"*. This session created
`public/site.html` and ran those passes while session A ran its theme
looks on the SAME file — coordination worked by re-reading before every
edit and appending override blocks instead of rewriting shared CSS.

- **The site itself**: fully self-contained (no external fonts/scripts/
  images — system serif/mono stacks), served at `/site.html` in dev and
  on every Vercel deploy (it's in `public/`). Reads as a ledger: numbered
  entries (`Entry 01`…) with mono eyebrows + hairline rules, sticky nav
  with scroll-progress bar. Structure: hero → verbatim strip (the three
  keep-verbatim lines, each with a colored tick) → 01 problem (reporting
  era vs accountability layer) → 02 held twice (Layla Nasser + Commercial
  counterpart flanking a drifting OSA mandate chip) → 03 loop (animated
  ring) → 04 dispositions → 05 "findings walk YOUR org chart" (SVG org
  tree incl. the CFO dotted line) → 06 ledger (count-up stat tiles +
  4 sample rows with worked/didn't/too-early verdicts) → 07 foundation
  (DuPont P&L / org-as-escalation-path / data honesty / per-org sign-in)
  → 08 industries (tenant brand accents: Americana terracotta `#8A3B12`,
  Metro Health teal `#0D6E66`) → 09 scrollytelling worked example →
  10 rollout → 11 FAQ → close band → footer. Copy obeys the positioning
  rules (keep-verbatim lines intact; no banned phrasings).
- **The hero demonstrates the product's sharpest claim**: a finding card
  whose SLA clock ticks down at demo speed (~35 min of SLA per real
  second); at zero it visibly escalates up a three-rung ladder
  (Supply chain → COO — Protein → Group CEO) with an "escalated ↑"
  flash, then resets and loops. Plain JS state machine at the bottom of
  the file (`HOLDERS`/`escalate()`), reduced-motion gated.
- **Color pass** (the block session A saw appear mid-session): one
  appended CSS block `/* the color pass */` + small HTML edits — per-entry
  tinted section washes, hue-coded loop (Sense indigo, Find plum, Decide
  teal, Act amber, Close green — consistent across ring/stage chips/
  timeline dots), disposition card tints + 3px top rules, colored stat
  tiles, tenant-brand industry cards, 5-hue colorbar top+bottom,
  mac-traffic dots on the vignette chrome, tier-colored impact-path chips.
- **Light-gradient conversion** (after session A restored the light
  ground): section washes became fade-in/out linear gradients
  (`ground → wash → ground`), card faces fade white→wash, the held-twice
  banner is an indigo→teal duotone, the close band deepens paper→indigo,
  body gets a violet veil fading out by 640px, the headline word is
  gradient-clipped text. **Gradients are allowed on this page only** —
  the app keeps the flat paper-ledger rule.
- **Parallax backdrop** (`.bg-scene`): five soft radial-gradient orbs
  (violet/teal/amber/terra/indigo) in a fixed layer at `z-index:-1`,
  each riding the existing `--scrolly` custom prop at its own rate via
  the **`translate` property** — which composes with the `transform`
  animation (`orbdrift` idle float), so drift + parallax coexist without
  a wrapper element. Orbs show on paper sections and duck behind opaque
  washes (accepted layering). Reduced-motion: both killed.
- **Entry 10 "How it lands"**: 3 gradient-numbered week cards (load the
  picture → connect the senses → first finding lands), each ending in a
  teal "what you have now" line — answers the how-big-is-this-project
  objection. **Entry 11 FAQ**: five native `<details>` accordions with
  the honest answers (doesn't replace BI; agents never decide; ignoring
  = recorded + escalates; read-only feeds, nothing faked; first closed
  loop within a month). Plus **OG/Twitter meta** for link unfurls and a
  **scroll-spy** (IntersectionObserver, `rootMargin -30%/-60%`) lighting
  the active nav link.
- **Verification recipes + gotchas (worth keeping)**:
  - Headless Chrome (`--headless=new`) **clamps window width to 500px**
    — a `--window-size=390,…` screenshot is a 390px CROP of a 500px
    layout and shows phantom right-edge clipping. True-390 testing:
    wrap the page in a 390px iframe (`--allow-file-access-from-files`)
    and read overflow from injected JS via `--dump-dom` — scratchpad
    `frame390.html`/`debug.html` pattern. Real result: zero horizontal
    overflow at 390.
  - `sips --cropOffset` silently center-crops; don't trust it for
    screenshot crops — capture at the target viewport instead.
  - Fragment-URL screenshots (`…/site.html#rollout`) come out blank
    under `--virtual-time-budget` (smooth-scroll never settles); the
    tall-window full-page shot is the reliable check.
  - `playwright-core` is NOT installed anywhere anymore (the old npx
    cache path in session A's notes may also rot) — plain headless
    Chrome + injected-JS dumps covered everything this session needed.
- **Placeholders to swap before customers see it**: the CTA mailto
  `hello@rewive.app` (invented domain) and the demo links pointing at
  `/` (correct once deployed beside the app). Mobile nav links hide
  below 880px with no hamburger — open thread.

## This session (2026-07-18): organization sign-in — the SaaS front door (`337b46c`)

The founder's ask: *"as this is the saas product multiple team will login
so i want to set the background with organization login so want to split
the tenant kind of view."* Built demo-grade tenancy: each organization is
a workspace mapped onto an industry pack, with a split-view branded login.

- **`src/tenants.ts`** — the tenant registry + session. Two orgs:
  `americana` → **Americana Foods** (fmcg, flat terracotta `#8A3B12`,
  `americanafoods.com`) and `metro-health` → **Metro Health Network**
  (healthcare, flat teal `#0D6E66`, `metrohealth.org` — named after the
  hospital entities already in the healthcare seeds). Manufacturing has
  **no tenant on purpose** (hidden-pack convention). Session =
  `localStorage['rewive.tenant']`.
- **`/login`** (`src/screens/Login/index.tsx`, chrome-less route) — split
  view: left panel is the org's brand (flat accent bg that transitions on
  org switch, org mark, operating-context eyebrow, tagline, proof lines,
  "Every mandate, held twice." foot); right is the sign-in card: org
  picker tiles, work email (prefilled `you@<domain>`, tracks org switch
  until hand-edited), password (**any value works — no real auth**, the
  card says so), and **"Sign in as"** role select (Admin · all lenses +
  the industry's role groups). Submit = `setActiveTenantId` + `setLens` +
  `setHierarchy(false)` + the existing `useSetIndustry` mutation →
  `/command`. `?org=<id>` preselects.
- **Route guard**: all app routes sit behind `RequireTenant` in `App.tsx`
  (landing, `/guide`, `/login` stay public). **The industry choice stays
  authoritative**: `getActiveTenant()` re-derives the tenant whenever the
  active industry disagrees (covers pre-tenancy localStorage sessions AND
  in-app industry switching on the Operating Picture — the chrome never
  claims one org while showing another's data).
- **TopNav** shows the signed-in org chip (accent mark · name · industry,
  subscribed to `useOrgProfile` so it flips live) + a **"Switch
  organization"** button → clears the tenant → `/login?org=<current>`.
  **Landing CTAs now route through the login** (`useEnter` navigates to
  `/login?org=…` instead of mutating industry directly).
- **Fix caught by driving it**: the login's role list showed "COO —
  Protein" for the healthcare org — `personaLabel` read the *active*
  industry. It now takes an optional industry param
  (`personaLabel(p, industry?)`, same for `personaGroupsForIndustry`);
  Login passes the tenant's. All old one-arg call sites unchanged.
- **CSS**: `.login-*` + `.topnav-tenant-*` blocks appended to
  `globals.css`, tokens-only, flat colors (the org-picker radio dot uses
  an inset box-shadow ring, NOT a radial-gradient — paper-ledger rule).
- CLAUDE.md gained a **"Tenancy (demo-grade)"** paragraph under
  Architecture.
- **Verified headless** (playwright-core + system Chrome, scratchpad
  `drive-login.mjs`): fresh-browser deep link to `/command` bounces to
  `/login`; org switch swaps panel/email/roles; sign-in as Metro Health
  store manager lands on `/command` with the MH chip + healthcare data +
  `lens=store_manager`; Switch organization returns preselected; Americana
  re-entry shows FMCG grouped roles. Zero console errors. **Remember
  `rewive.guideSeen='1'`** in drivers — first visit still detours to
  `/guide` after sign-in (pre-existing onboarding, kept deliberately).

## This session (2026-07-18): agents ↔ mandates, both directions (`98d1324`)

The founder's ask: *"can we connect Agents to Mandates."* The data half
existed (`ShadowAgent.watchesNodeIds`) but surfaced only as a count;
workforce agents had no link at all. Now navigable both ways:

- **Counterpart cards** (Agents → Counterparts): new **"holds"** section —
  each watched mandate as a chip with a health dot (green/amber/red from
  the node) deep-linking to `/build/picture?focus=<nodeId>` (the focus
  param already existed). `mandatesOf()` resolves `watchesNodeIds` against
  the brain; the mandates stat now counts the resolved list.
- **Workforce agents**: new optional **`mandateIds?: string[]`** on
  `AgentCatalogEntry` (types.ts), **seeded for all 18 catalog agents**
  across the three packs in `v4content.js` (e.g. Trade-Spend ROI Agent →
  `fmcg-k-troi` + `fmcg-k-tradepct`; Readmission Risk Agent → the
  `hc-t-quality` intent). Grid cards show plain ⌖ pills (card is itself a
  link — no nested anchors); the detail page gets a **Mandates** row with
  accent links into the focused picture.
  **Keep-in-sync convention (same spirit as dataset `feeds`)**:
  `mandateIds` must exactly match Operating Picture node ids — unmatched
  ids silently render nothing.
- **Operating Picture**: selecting a mandate/target now shows a
  **"Held twice" strip** (bottom of the canvas, reuses `.brain-legend`
  styling): human owner (name · role) + counterpart (→ Counterparts),
  "worked by <workforce agents>" (→ their detail), and "Its findings →"
  (`?stream=`). Counterpart resolved by `watchesNodeIds` first, then
  `streamKey` fallback; workforce lookup filters the catalog by
  `mandateIds`. Uses `useShadowOrg()` + `useAgentCatalog()` inside
  `KpiBrainCanvas` — both cached queries.
- **Verified headless** (`drive-mandates.mjs`): full round trip —
  counterpart chip "On-shelf availability" → focused node with strip
  "Layla Nasser · Commercial director + Commercial counterpart · worked
  by Shelf Availability Agent" → workforce ⌖ pills → Trade-Spend ROI
  detail links → back to the picture showing "worked by" that agent.
  Zero console errors. **Driver gotcha**: `text=` locators collide with
  the Intro copy (it also says "held twice") — target
  `.brain-legend:has-text("Held twice")`.
- Build + lint clean at `98d1324`.

## Previous session (2026-07-17): the half-year review is derived, not seeded

The founder asked to "fix the halfYear stats undercount" (old open thread 3 —
the hand-seeded block predated ~26 findings; `openNow` summed to 5 against 26
actual). Chose **derive** over re-bump so it can never rot again:

- **New `mock-server/halfyear.js`** — `deriveHalfYear({findings, closures,
  ledger, currency})` computes the block over the last **7 calendar months
  (6 prior + current)**: `raised` from findings' `detectedAt`, `decided` +
  cumulative win rate from ledger rows (parsing their `'DD Mon'` display
  dates; `'ongoing'` rows count in totals/breakdowns but not monthly),
  `closed` from closure KPIs' `closedAt`, `openNow` from live finding status
  (`open` + `acting`), impact by summing parseable AED/$ amounts from
  `measuredImpact.text` (direction `up` only). Months before the first
  assessed verdict backfill the first real win rate instead of showing 0%.
- **`/decisions/stats` computes it per request** from the mutable in-memory
  state (`app.js`), so the panel updates live mid-demo — verified: accepting
  a finding dropped UAE Trading Co.'s "open now" 14 → 13 on the next fetch.
  The serverless `api/handler.js` reuses the same Express app, so Vercel is
  covered. The three hand-seeded `halfYear` blocks (`data.js` FMCG,
  `v4content.js` HC + Mfg) are **deleted**.
- **Frontend**: `HalfYearReview.tsx` win-rate axis was hardcoded 40–90% and
  would clip the real derived rates (86–100%) — it now scales to the data;
  the bar chart got a divide-by-zero guard. Types comment updated.
- **FMCG now reads**: "42 findings raised across 4 entities and 4 regions
  over the last 7 months; 24 decisions on the ledger, 8 loops closed. Win
  rate 86% to date" — every number clickable-true against Findings/Ledger.
  Label is rolling, e.g. "Jan–Jul 2026 · derived from the ledger".
- **The four stat tiles are derived too** (`b7db762`, follow-up ask):
  `deriveStatTiles()` in the same module — decisions tracked = ledger rows
  (delta counts this quarter's dated rows), win rate over assessed verdicts
  (FMCG: "87% · 13 of 15 assessed worked"), median detectedAt →
  dispositionAt across decided findings (FMCG 24.0h over 17), measured
  impact from the ledger's summable currency amounts (FMCG AED 1.8M over
  9). Tiles cover the whole ledger/findings window, **not QTD** — so
  `trackedQtd`/`measuredImpactQtd` were renamed `tracked`/`measuredImpact`
  in `types.ts` and the captions changed in `StatsRow.tsx` ("Decisions on
  the ledger", "Measured impact · to date") and `TodayStats.tsx` (the Today
  screen's third tile shows the same measuredImpact). The panel's
  cumulative win rate now also counts undated `'ongoing'` verdicts so tile
  and panel read the same 87%. **No hand-seeded decisionStats blocks exist
  anymore** — `data.js` no longer exports `decisionStats`, and the HC/Mfg
  packs in `v4content.js` dropped theirs.
- **Trade-offs to know**: numbers are smaller than the old fabricated block
  (42 findings vs 118, 24 decisions vs "142 QTD") but reconcile,
  on-message for "the system of record"; June shows 0 raised (no seed
  lands there — one mid-June finding would fill the bar); manufacturing's
  measured-impact tile is honestly "—" (its ledger has no currency
  amounts).
- **Gotcha (re)confirmed while at it**: restarting the mock server resets
  the in-memory org profile to the seed (`fmcg`), but the *browser's*
  persisted `rewive.industry` localStorage choice rides every request and
  can flip the context back — if the founder reports "wrong industry",
  it's the landing-page picker / localStorage, not the code.

## This session, part 1 (`53257e4`): the founder's org, navigable end-to-end

The founder described their real structure — Group CEO; CFO with FP&A;
multiple COOs (Protein, G&I, Fruits & Vegetables, Ambient Foods) each with
Supply chain / Production / Commercial finance / Analysts; extended teams
(Shared services, Procurement, HR services, Audit) — and asked how it
navigates the Sense→Decide cycle. Two options were offered; they said
"build option 1" then "build option 2".

### Option 1 — the org as the role tree

- **Persona union grew 6 → 30** (`src/api/types.ts`): `group_ceo` root; CFO
  holds `fpa` + group `commercial_finance`; division COOs `coo` (= Protein),
  `coo_gi`, `coo_fnv`, `coo_ambient`, each with 4 function roles
  (`<div>_supply_chain` / `_production` / `_commercial_finance` /
  `_analysts`); horizontals `shared_services`, `procurement`, `hr_services`,
  `audit` under the CEO.
- **Legacy roles re-parented into Protein** (operations_head → store_manager,
  sales_supervisor under `coo`), so all pre-existing seeds stay reachable.
  `coo` is relabeled **"COO — Protein" in the FMCG context only**:
  `personas.ts` now exports `personaLabel(p)` (reads
  `getActiveIndustry()`; `FMCG_LABEL_OVERRIDES`) and **all 12 label call
  sites use it instead of indexing `PERSONA_LABEL`**. Healthcare/
  Manufacturing keep the flat six-role lens via `personaGroupsForIndustry()`.
- **Lens dropdown is grouped by org branch** (optgroups: Group / Protein /
  G&I / F&V / Ambient / Extended functions — `Topbar.tsx`);
  `VALID_LENSES` in `personaLens.tsx` is now derived from `PERSONAS`.
- **Escalation is the stitch between levels**: `POST /findings/:id/escalate`
  and re-alert now move `finding.persona` up `ROLE_PARENT` (derived from
  `ROLE_CHILDREN` in `mock-server/roles.js`) — supply chain → division COO →
  Group CEO. Verified live: the hero finding (`fmcg-f-protein-fill`, frozen
  chicken fill at 84%, 4h SLA) walked both hops and landed as the only item
  in the Group CEO's personal Today queue.
- Both role trees (`mock-server/roles.js` ↔
  `src/screens/CommandCenter/personas.ts`) updated — **keep-identical
  convention still applies**, and now also covers `DOTTED_PARENT`.

### Option 2 — the dotted line (the matrix)

- `DOTTED_PARENT` maps the four division commercial-finance roles → `cfo`,
  in both trees. Ownership/escalation stays on the solid line (division COO);
  the CFO is the *functional* parent.
- **CFO team scope rolls up the dotted roles** (server `personaScope`; the
  frontend `useEffectiveLens()` returns a new `dotted` array; `ScopeBanner`
  renders them as amber `⋯` pills with an explanatory tooltip).
- **Escalation forks**: escalate/re-alert on a dotted role sets
  `finding.dottedPersona` (new optional field on `Finding`) *before* moving
  `persona` up the solid line; `filterByPersona` counts `dottedPersona` as
  in-scope, so the finding appears in **both** the COO's and the CFO's own
  queues. UI: amber "⋯ CFO · functional line" pills in UnifiedQueue, the
  Findings list, and the thread header.
- Demo seed: `fmcg-f-protein-tradespend` (Protein trade-spend accruals 2.3x
  the promo calendar, 5h SLA, raised by the new
  `fmcg-sa-protein-commfin` counterpart) — escalate it once and flip the
  lens between COO — Protein and CFO to show the same drift held by two
  chains.

### Seeds (part 1)

Division supply-chain counterparts (Protein/G&I/F&V/Ambient), FP&A and
Procurement counterparts; 8 findings across the tree — the escalation hero,
Ramadan build (G&I), a co-pack conflict routed **directly to `coo_gi`**
(cross-functional = the COO's call), F&V shrink, Ambient promo OSA, FP&A
bridge gap, cross-division palm-oil re-price (Procurement, the horizontal
story), and the trade-spend dotted-line demo; ledger rows for Procurement /
COO F&V / COO Ambient. Chief-of-staff counterpart re-tagged `coo` →
`group_ceo`; People counterpart `coo` → `hr_services`.

## This session, part 2 (`cdba393`): Business base-data section

The founder's ask: *"rope more findings and show some base data like Sales
by SKU, Customer, P&L … also have a page to explain the business so it is
clear for someone to act on."*

- **New rail item "Business"** (chart icon, between Performance and
  Foundation), four tabs behind `SectionTabs`
  (`src/screens/Business/BusinessTabs.tsx`):
  - **The business** (`/business/overview`; `/business` redirects) — the
    explainer: narrative paragraphs, stat tiles, division cards (leader,
    revenue share, brands, "Held twice by: …"), operating entities, revenue
    by channel, and a 4-step **"How to act on what you see here"** guide.
  - **Sales by SKU family** (`/business/sku`) — 12 families × revenue YTD /
    growth / margin / fill rate.
  - **Sales by customer** (`/business/customers`) — 8 accounts × revenue /
    growth / trade spend / OSA / DSO.
  - **P&L** (`/business/pl`) — reuses `Decisions/PlStatement` (same FP&A
    statement, second mount point; the Decisions tab keeps its own).
- **The rope**: every off-plan row wears an on-plan/watch/**drifting** pill
  and a `finding →` link to the thread already watching that number. Base
  data is deliberately **not persona-partitioned** (documented in the types)
  — context is company-wide; the loop surfaces stay role-scoped.
- **Contract**: `BusinessContext` types in `src/api/types.ts`,
  `useBusinessContext()` in `src/api/business.ts`,
  `GET /api/v1/business-context` served from **`mock-server/businessdata.js`**
  (new file) — rich FMCG pack (Americana-style), slim Healthcare pack
  (service lines / payers, ropes to `hc-f-1`/`hc-f-2`), minimal
  Manufacturing pack.
- **Seeds (part 2)**: 7 more findings roped to the base data — Protein
  breaded-chicken **yield masked by rework**, Ambient **promo ROI 0.6x**
  (second dotted-line role), **Carrefour DSO** 74d, **Lulu OSA**
  merchandising gap, **audit** split price overrides, **shared-services** AP
  backlog, **HR attrition explicitly compounding the fill-rate hero** — plus
  3 counterparts (Protein production, Audit, Shared services).
  **20 open FMCG findings now span every branch of the tree.**

### Verified (this session, on the paper-ledger theme)

Browser walkthrough at :5173 + curl probes: grouped dropdown contents; COO —
G&I + team rollup (scope pills + both G&I findings); hero escalation
`protein_supply_chain → coo → group_ceo` (UI thread header updated per hop;
Group CEO role-scope queue = exactly the escalated finding); dotted-line
before/after (CFO team sees the trade-spend finding pre-escalation, CFO
*role* scope gains it post-fork with both pills); healthcare lens list stays
the legacy six with generic "COO"; Business overview/SKU/customers/P&L
render; Carrefour row → its finding thread. Mock state was reset after the
escalation tests (restart = reset; escalations are in-memory).

### Judgment calls / gotchas

- Division functions beyond supply chain (+ the three seeded horizontals'
  neighbours) exist in the tree but are **seeded light** — a lens on, say,
  `gi_analysts` is honest-empty. The `coo_gi` team rollup covers it for
  demos.
- Escalating past a role with no data-bearing parent in
  healthcare (`coo → group_ceo`) leaves the finding visible only under
  'all'/team lenses there — acceptable; healthcare demos don't escalate that
  high.
- `security`-style fix avoided on purpose: no `http.sslVerify false`, no
  MITM CA imported into PEM bundles. SSH is the sanctioned path.
- The browser-pane `scroll` action intermittently times out on this app;
  `read_page` refs + `scrollIntoView` via the JS tool worked around it
  (verification-only).

## This session, part 3 (`6d3181f`): the holistic view

The founder's ask: *"i want to have more findings and other facts so it is
holistic view."* Two moves:

- **Lifecycle depth, not just volume.** 11 more findings chosen so every
  branch has lived the whole loop: open ones for the empty roles
  (`gi_commercial_finance` rice-margin erosion, `protein_analysts` /
  `ambient_analysts` model-insight findings, an Egypt sourcing call routed
  to `coo_fnv`, a **`group_ceo` portfolio-mix finding only the consolidation
  can see**), two accepted-and-watching with tracking exit conditions
  (F&V price overrides 55%, sauce-line changeover 40%), one acknowledged on
  a trip-wire (pre-pack summer capacity re-alerts at 92% utilization), and
  three closed with assessor verdicts (Ramadan baseline double-count,
  noodle-die scrap, packaging-board consolidation — the horizontal-win
  story). **FMCG now: 42 findings — 25 open / 4 watching / 2 acknowledged /
  8 closed / 2 abandoned / 1 acting; 12 exit conditions (3 tracking,
  8 closed, 1 regressed).** Matching ledger rows; finding ↔ closure ↔
  ledger integrity verified by script (snippet in this session's
  transcript).
- **"The facts behind the mandates"** on the Business overview: four fact
  cards — market position (21.4% share, #1 frozen poultry, named
  competitors, private label), seasonality calendar (Ramadan build, summer
  shrink, quarter-close load-in, Q4 tender lock-in), footprint & people
  (6 plants / 9 DCs / 4,800 heads), cost structure (COGS 62%, trade 14.8%,
  WC 52 days) — each fact pointing at the live finding watching it.
  `factSections` is optional on `BusinessOverview`; healthcare has a light
  version; the rice SKU row now ropes the margin finding.

## This session, part 4 (`ce02dec` + `7885692`): the DuPont Foundation

The founder's ask: *"elaborate the foundation with full P&L list and all the
relevant mandate and Senses … make it more like a du pont so it clear."*

- **New `pl_line` node kind** (amber) in `BrainNodeKind` — the Operating
  Picture now reads top-down as a DuPont tree: **intent ← P&L line ←
  mandate ← sense**. `layout.ts` inserts the P&L tier as a row between the
  intent row and the stream columns, in statement order; industries without
  pl_line nodes keep the old spacing (manufacturing untouched).
- **FMCG**: 9 P&L nodes seeded from `pldata.js` (gross revenue → trade →
  returns → net revenue → COGS → gross margin → logistics → overheads →
  EBITDA, actual vs budget + health). Mandate→target edges rewired through
  their lines (OSA/fill/NPD → gross revenue; trade ROI/trade% → trade;
  sell-gap → returns; COGS variance/obsolescence → COGS; cost-per-case →
  logistics; campaign ROI → overheads), and **the statement math is itself
  edges** (gross − trade − returns → net rev → GM → EBITDA → margin
  intent). Non-P&L intents (share, cash) keep direct mandate edges.
- **Healthcare** (`7885692`, seeds only): 5 lines — net patient revenue,
  denials & write-offs, supply & pharmacy, labor & premium pay, EBITDA —
  with beds/OR→revenue, denial/clean-claim→denials, drug-spend/generic→
  supply, agency/labor/ALOS→labor, all → EBITDA → net-margin intent.
  Edge rationales carry the causal copy ("ALOS drift holds beds and
  converts to premium pay").
- Kind-map consumers updated: `BrainNodeCard`, `NodeEditor`, canvas legend,
  **`Findings/ImpactPath.tsx`** (P&L steps render amber), Add-a-mandate can
  feed a P&L line. FP&A counterpart watches net revenue/GM/EBITDA (FMCG);
  revenue-cycle and finance counterparts watch their lines (healthcare).
  Both verified in the browser; graph + watch-list integrity by script.
- **Keep-in-sync note**: P&L node values mirror `pldata.js` by hand — if
  the statement seeds change, update the pl_line nodes (or derive them).

## Previous session (2026-07-16, later): the paper-ledger redesign

The founder's ask: *"can we redesign the entire look and feel of the
product, it seems having a disconnect in a flow"*. Offered three directions
(unify-only / system-of-record rebrand / loop-first shell); they chose the
**"system of record" rebrand** with a **light "paper ledger"** default (both
choices made explicitly via option pickers).

### The new visual system — `src/styles/globals.css` rewritten in place

- **Every class and CSS-variable NAME kept; only values changed** — that's
  why 375 existing `var(--…)` references needed no edits. Tokens now: paper
  bg `#FAF9F6`, surface `#FFFFFF`, ink ramp `#1A1A2E/#5A5D72/#9A9DB0`, ONE
  flat accent `#3B3BC4` (deep `#2E2EA8`), semantic `#1B7F4D/#9A6700/#B42318/
  #0D7E74`, hairline borders `rgba(26,26,46,.10/.18)`, radius 16→10px.
- **New font tokens**: `--font-display` (system serif — Iowan/Palatino/
  Georgia) on `h1.page`, crumb, KPI values, logo; `--font-mono` on eyebrows,
  table `th`, nav-label, IDs/durations; `tabular-nums` on figures.
- **Banned and removed everywhere**: backdrop-filter blur, glow shadows,
  multi-color gradients, gradient-clipped text, the radial-gradient body
  backdrop. `--accent-grad` still EXISTS but resolves to flat accent — do
  not reintroduce real gradients through it.
- Dead `.topnav-areas` CSS (never rendered) deleted.

### One design system across all four surfaces

- **App**: cascades from globals; plus a sweep of ~145 dark-coupled inline
  colors/hexes across ~12 screen files onto tokens (ShadowOrg, HalfYearReview,
  PlStatement, KpiBrain×4, Findings/Lifecycle, SolutionDesign, Connectors,
  HandoffCard, TourOverlay).
- **Landing** (`.om` tokens) and **Guide** (`.gd-`) injected stylesheets now
  **alias the global tokens** (`--om-ink:var(--ink)` etc.) — keep aliasing,
  don't fork values again. Copy untouched, incl. keep-verbatim lines.
- **`public/story.html` / `public/demo.html`** are standalone → they
  **hardcode** the same palette values; update manually if tokens change.
- **Gotcha discovered**: SVG *presentation attributes* (`fill=`/`stroke=`)
  don't resolve `var()` — HalfYearReview chart colors moved into `style`
  objects; Landing's loop SVG uses literal hexes; KpiBrain canvas got
  `colorMode="light"` (React Flow's own chrome was staying dark otherwise).
  A pre-existing silently-broken `stroke="var(--surface-solid)"` attribute
  was fixed in passing.

### Flow-seam fixes (the "disconnect" diagnosis)

- **Act sub-flow no longer exits the loop visually**: `/build/solutions`,
  `/build/agent-studio`, `/build/studio`, `/build/create` now light
  **Findings** in the rail (they're reached from a finding's Act), with
  crumbs "Findings / Act · …". Foundation's rail match narrowed to
  picture/kpis/connectors (`src/components/layout/areas.ts`).
- **Sidebar identity is real**: `AreaSidebar` renders `useCurrentUser()`
  (name/initials/avatarBg/role) instead of the hardcoded "Kumara Vijayan"
  card. (Don't append "· Admin" — the seed role string already contains it.)
- **Header convention unified**: People, Signal Studio, Agent Studio, Create
  Agent, Unified Agent Studio, Connectors moved from bespoke `.sub`
  paragraphs to the shared `<Intro>`; `.sub` is now reserved for detail-page
  metadata subtitles (Outcomes, SignalDetail, SolutionDesign, Findings
  detail keep theirs). CommandCenter's greeting subtitle intentionally kept.
- SignalDetail's back-link went to `/insights/signals` (a redirect) —
  now goes straight to `/operate/findings`.

### Verified (Playwright, chromium headless)

- 12 routes screenshotted at 1440×900 under FMCG/all-lenses; probes: bogus
  finding id → graceful message; industry swap to healthcare → renders;
  solution-design DOM: rail active = "Findings", crumb = "Findings / Act ·
  Solution Design". Recipe: scratchpad `shots.mjs` + `probe.mjs` — needs
  `localStorage` keys `rewive.industry`, `rewive.personaLens`, and
  **`rewive.guideSeen='1'`** (first visit to `/command` otherwise redirects
  to `/guide` — intended onboarding, intercepts demo links).
- Design rules also saved to Claude project memory (`paper-ledger-rebrand`).

### Known rough edges / candidates for the founder's change list

- Queue rows still use boxed **emoji icons** (🤖/🕵️ tiles) — read heavy
  against the hairline aesthetic.
- Serif display face is a **system stack** (Iowan/Palatino/Georgia) — a
  webfont (e.g. a real editorial serif) would sharpen it if network fonts
  are acceptable for the demo.
- Two agent-building paradigms still coexist (`/build/studio` canvas vs
  `/build/agent-studio` altitudes) — visual reconciliation was out of scope.
- Tour scrim was eased from `rgba(5,5,14,.72)` to `.45` (judgment call —
  near-black over paper read as a theme break); revert is a 2-value change
  in `TourOverlay.tsx` if the spotlight needs more contrast.

## Previous session (2026-07-16, earlier)

The founder's ask: *"mimic the full lifecycle and all the alerts like I am in
Jun 2026, give me half-year stats and relevant tasks; the business dealt in
different entities and regions."*

### Half-year (Jan–Jun 2026) lifecycle backfill — `mock-server/v4data.js`

- **FMCG findings: 6 → 16** (now 23+ after this session), covering every
  lifecycle state at once:
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
  snippet in that session's transcript if you touch the seeds.

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
  `v4content.js` for HC/Mfg). `openNow` counts match the actual open seeds
  *as of that session* — this session added 15 open findings without
  touching `halfYear`, so the hand-seeded block undercounts now (see open
  threads).
- `src/screens/Decisions/HalfYearReview.tsx` renders it at the top of the
  Ledger tab: grouped monthly bars + a separate win-rate line, two breakdown
  tables. Hidden entirely if `halfYear` is absent.
- FMCG ledger: 7 → 15 rows (now 18) spanning 09 Jan–18 Jun, each new row
  linked to its finding with an assessor note; includes decisions that
  *failed* (`led4` terms extension → regressed; `led8` acknowledge whose
  trip-wire fired).

### Tasks

- `app.js` pre-seeds `solutionDesigns` with `sol-fmcg-riyadh-otif` (the Act
  behind `fmcg-f-7`), so `/api/v1/tasks` has 4 in-flight tasks from the seed
  (mixed statuses/personas) instead of only after a live Act.

### The demo clock is now self-refreshing (the "breaks" fix)

- The user reported "a lot of breaks". A full-screen sweep found **zero**
  errors; the real issues were (a) the API having been down overnight and
  (b) **seed-date rot**: dates were pinned to 2026-06-30, so on 2026-07-16
  every counterpart read "last raised 16d ago" next to "14h left on SLA".
- Fix: **all ISO timestamps in `v4data.js` are computed from the server
  clock at boot** — `hoursAgo(n)` / `daysAgo(n)` helpers at the top of the
  file; live items land hours ago, H1 history lands ~2 weeks–6 months back.
  **Convention going forward: never hardcode an ISO date in `v4data.js`
  seeds — use the helpers.** (This session's 15 new findings follow it.)

## Previous session (2026-07-15, later session)

### Role-scoped data + hierarchy mode (`57148f8`) — the big one

Every role owns a **disjoint slice** of the product, and a manager can widen
the lens to their whole reporting line.

- **One role tree, defined twice, kept identical** (`mock-server/roles.js` ↔
  `src/screens/CommandCenter/personas.ts`) — was 6 roles/2 roots then; this
  session grew it to 30 roles/1 root (see above); the convention holds.
- **Every collection item carries exactly one `persona`**: findings, pending
  approvals, runs, live runs, tasks, counterparts (ShadowAgent), agent
  catalog, leaderboard rows, loop-speed rows, decision-ledger rows.
  **Convention: any new seed item must set `persona`** (in CLAUDE.md).
  (This session's base-data rows are the documented exception — context
  surfaces are company-wide.)
- **Server**: `filterByPersona(items, persona, scope)` in `app.js` uses
  `personaScope()` from `roles.js`; `scope=team` expands to the role's
  subtree (now + dotted children). Every list endpoint accepts
  `persona` + `scope`.
- **Frontend**: `useEffectiveLens()` (in `personaLens.tsx`) is the single
  resolver — global lens + non-admin lock + hierarchy toggle → `{ persona,
  scope, rolesInScope, reports }` (now also `dotted`). All data screens use
  it. A persisted **"+ their team"** checkbox next to the lens
  (`localStorage['rewive.personaLensHierarchy']`); `ScopeBanner` spells out
  which roles are in view.
- **The loop stays role-true**: tasks created by a finding's **Act**
  disposition inherit the finding's persona; quick-solution tasks inherit
  the signal's; agent specs inherit the task's.

### Every dead-end section wired end-to-end (`090594b`)

- Tracked KPI "needs data" resolves via Connectors (`?forKpi=`,
  `'pending_approval'` status); runs pause/resume is real server state
  (⏸ PAUSED pill + Resume); Outcomes "Schedule" posts and renders
  ✓ Scheduled; agent-builder "Refine plan" focuses the chat with a seeded
  draft; Tasks channel caption reworded (it *is* persisted).
- Deliberately left alone: orphaned Signal Studio screen, server-only
  features with no UI (KPI tickets, review committee), FMCG-flavoured global
  data under other industries.

## Previous sessions (still true)

- **v5.1 comprehension redesign** (`4b7462b`): one flat loop-ordered rail
  (7 items then; 8 now with Business); Today = one "Waiting on you" queue
  with the product's only count; findings lifecycle tabs; the finding thread
  page; merged Execution and Agents surfaces behind `SectionTabs`; persona
  lens in global chrome.
- **FP&A P&L workspace** (`7964225`): Decisions → "P&L impact · FP&A" tab;
  full P&L Actual/Budget/Forecast drillable by the industry's two dimensions;
  seeds `mock-server/pldata.js` + `v4data.js`. (Now also mounted at
  `/business/pl`.)
- **Landing retold** (`cdd2901`), **spotlight tour** (`51491f0`), **loop
  speed table** (`f4ac86f`).

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

### Next steps — in priority order (as of 2026-07-19)

1. **Commit the uncommitted work** (founder call on granularity):
   manufacturing parity (`v4data.js`/`datasetsdata.js`/`tenants.ts`/
   `CLAUDE.md`) and the marketing site (`public/site.html`, untracked —
   also decide whether the light-gradient look is the keeper before
   committing it).
2. **Unblock the push — status changed 2026-07-18**: BOTH local keys are
   now rejected by GitHub (`id_ed25519_rewive`
   `SHA256:qi700T0YxECL3859MQIEId9q2+/3E09fi/vgYPdR2P8` AND the old
   `id_ed25519`) — the previously-working key appears to have been
   removed from the account or lost repo access. Same fix as ever: get
   the `id_ed25519_rewive.pub` line visible at
   `github.com/<username>.keys`, then `git push origin v5`. `v5` is now
   ~30 commits ahead including the live-tracking feature.
3. **Production-ize live tracking**: set `DATABASE_URL` (pooled) +
   `ANTHROPIC_API_KEY` + `CRON_SECRET` in Vercel, `npm run migrate`,
   deploy, verify a cron `sweep_runs` row and that the Claude authoring
   path produces house-style narratives (only the template path has
   been exercised so far). Hourly cron needs Vercel Pro.
4. **Point live tracking at Manufacturing for the demo**: the new
   industry + the real pipeline compose — e.g. enable tracking on
   `mfg-k-energy`, push a rising kWh series, sweep raises the finding
   the seeds only narrate. Nothing needs building; it's configuration.

### Next steps — previous priorities (as of 2026-07-18)

1. **Unblock the push** (founder action, sessions can't do it): get the
   key visible at `github.com/<username>.keys` — full diagnosis and the
   three unanswered questions are in "Where things stand". Then
   `git push origin v5` and open the PR via the compare URL
   `github.com/Kumarv2509/rewive-front-end/compare/master...v5`
   (**not** `gh` — TLS MITM).
2. **Decide the sense-coverage story** — the founder was asked
   (2026-07-18) whether to (a) keep the honest 4/26-mandates-connected
   view, (b) flip all dataset seeds `expected → live` in
   `mock-server/datasetsdata.js` for a fully-lit picture, or (c) light
   one division end-to-end as a middle path. **No answer yet** — don't
   pre-empt; each is a minutes-level seed edit because Picture statuses
   derive from the registry. A strong demo beat either way: flip one
   dataset live on stage and watch its branch of the tree turn on.
3. **The real sensing pipeline** (the actual product build, when it
   starts): the placeholders are deliberately its spec — each Dataset
   slot names source/cadence/mandates fed; queued AnalysisRequests say
   what to compute; the REST contract (raise finding → disposition →
   closure) already exists. Build = real feeds landing in the slots +
   a scheduled agent runtime (model call per mandate over its data
   slice) that raises findings through the same endpoints. The
   frontend should need near-zero changes.
4. **Wire staged CSVs into the loop**: an uploaded dataset registers as
   'receiving' but feeds nothing — let the founder map its columns to a
   mandate (set `feeds`) so a staged file lights that node, and run the
   queued analysis requests against staged data (even canned) so
   "Queue an analysis" pays off inside the demo.
5. **Heartbeat truthfulness**: counterpart sense-sweeps currently stamp
   every agent; consider sweeping only agents whose stream has a live
   dataset (others read "senses waiting on data") — one condition in
   `heartbeatTick` step 2, using the same liveStreams logic as
   `reconcileBrainStatuses`.

### Older threads (still open, lower priority)

6. **Thin new-role slices — mostly resolved in part 3**: every division
   function *kind* has now lived the loop; still honest-empty leaves:
   `protein_commercial_finance` history, `fnv_analysts`,
   `ambient_production`'s siblings in other divisions, and the horizontals
   beyond procurement/audit/shared/HR. Team scope covers them.
7. **CLAUDE.md is stale in several spots**: "7 items" rail note (now 8
   with Business, plus Foundation gained a 4-tab SectionTabs header incl.
   Datasets), the persona bullet predates the 30-role tree + dotted line
   + base-data exception, the mock-server file list is missing
   `halfyear.js`/`businessdata.js`/`datasetsdata.js` and the heartbeat;
   `docs/BLUEPRINT.md` still describes pre-v5.1 nav. (The tenancy
   paragraph added 2026-07-18 is current — the staleness is elsewhere.)
8. **Entity/region breadth** — dimension exists on findings/closures/ledger
   only; the new Business rows carry entity implicitly in copy, not as the
   filterable field.
9. **More dotted lines?** — the mechanism is generic (`DOTTED_PARENT`); the
   founder may want Analysts → FP&A or division HR → HR services once they
   see the commercial-finance one.
10. **Ledger `date` strings** are static `"DD Mon"`; consider ISO + client
    formatting if the ledger should sort/bucket by real dates. **Heads-up:**
    `mock-server/halfyear.js` now parses these strings for its monthly
    buckets (`parseLedgerDate`) — if the format changes, update it too.
11. **June "raised" bar is 0** in the derived review (no seed lands in
    June) — one mid-June finding seed fills it if it bothers the founder.
12. **Manufacturing pack depth**; **"new" P&L anomalies → findings** mutation;
    **shadow → counterpart internal rename**; **Tour/Guide copy** still names
    only the old three personas (`tour/steps.ts:19`, `Guide/index.tsx:25`).
13. **Tenancy follow-ups (if the SaaS story deepens)**: a real user model
    (named users per org, sign-out separate from org-switch, non-admin
    lock actually driven by the login role — today the mock
    `currentUser.isAdmin` is always true so the lens stays changeable);
    per-tenant data partitions in the mock server (both orgs currently
    share state, isolation comes from the industry packs); more than one
    org per industry would force real tenant-scoping and make the demo
    stronger.
14. **Mandate-link breadth**: `mandateIds` lives only on the catalog
    seeds — studio-built agents (`createdAgents`) never get one; the Act
    flow could stamp the originating finding's mandate onto the agent
    spec so built agents join the "worked by" strip automatically.

Resolved this cycle: ~~halfYear undercount~~ (`13d63b9`+`b7db762`, fully
derived), ~~impactPath P&L steps~~ (`a2fb841`), ~~"breaks" report~~ (the
clock-rot fix held; founder has been demoing live without issues).

## Context that isn't in the code

- The founder demos to FMCG stakeholders (Americana context; seed org
  "Americana Foods (demo)", AED). FMCG is the beachhead, Healthcare second.
  The org they described (Protein / G&I / F&V / Ambient + extended teams) is
  their real structure — the tree is not hypothetical.
- **Good demo path for the 2026-07-18 work**: start logged out at `/` →
  pick a context → land on `/login` with the org preselected → toggle the
  two orgs to show the brand panel swap → sign in to Americana as a store
  manager (any password) → the org chip + role-scoped Today make the
  "multiple teams log in" point → Switch organization → Metro Health as
  admin for the healthcare pack. Then the mandate loop: Agents →
  Counterparts → a "holds" chip (e.g. On-shelf availability) → the
  focused Operating Picture node shows the "Held twice" strip (owner +
  counterpart + Shelf Availability Agent) → through "worked by" into the
  agent detail → its Mandates row leads back to the picture. One circle,
  no dead ends.
- **Good demo path for the 2026-07-16/17 work**: Business → The business (read
  the narrative + act guide) → Sales by SKU family → Frozen chicken
  "drifting" → finding → thread shows 4h SLA → "Not mine — escalate ↑" twice
  → lens Group CEO (role scope) shows it landed at the top → lens CFO + team
  (amber ⋯ pills in the banner) → open the Protein trade-spend finding →
  escalate → flip lens COO — Protein ↔ CFO to show one drift held by two
  chains. The palm-oil finding (Procurement) is the horizontal-function
  beat; HR attrition ties the people number to the fill-rate hero.
- **DuPont beat (part 4)**: Foundation → the P&L tier reads left-to-right
  like the statement; click Trade spend & discounts (off track) to light
  trade-ledger sense → trade ROI/trade % mandates → the line → net revenue
  → EBITDA → margin intent. The group_ceo portfolio-mix finding and the
  Business "facts" cards (each fact naming its live finding) are the
  "holistic" beats from part 3.
- Earlier demo paths (H1 lifecycle, role lens) are in the 2026-07-16-earlier
  and 2026-07-15 sections' original write-ups if needed.
- Repositioning rationale in merged PR #2; the v5.1 UX advisory diagnosis in
  the 2026-07-15 morning session.

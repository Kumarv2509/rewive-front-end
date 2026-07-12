# Handoff — v5 merged to master (2026-07-12, end of day)

## Where things stand

- **v5 is merged.** PR #2 (`v5` → `master`) merged as `c652609`; `master` now carries the
  full Decision Accountability Layer repositioning (24 commits). PR #1 (`v3`) was
  auto-marked merged by GitHub at the same moment — its commits were already contained in
  the v5 history. **No open PRs.**
- Branches `v5` and `master` have identical content right now. Next work can branch from
  either; keep the convention of PRing into `master`.
- Build and lint are clean; no test suite exists.
- Local dev: `npm run dev:all` (Vite :5173 + mock API :4000). Watch for stale mock-server
  processes holding :4000 — an old one serves pre-v5 seed data. `lsof -i :4000` and kill
  before restarting. The mock server has **no watch mode**: seed edits in `mock-server/`
  need a restart to take effect.

## Verified this session

- **Full app walkthrough** (headless Chrome against the live dev stack): landing hero +
  2-industry picker, `/guide` scroller, Command Center, Findings (+ detail, four-A
  disposition bar, SLA escalation), Closure, Decision Ledger, Counterparts, Operating
  Picture, Mandate Library, Performance, Agent Space. All render, zero console errors,
  no "shadow" anywhere in UI copy.
- **Currency fix landed** (`c1f1711`): the v1 seed in `mock-server/data.js` (reused as
  the FMCG pack) quoted business impact in USD; now AED across Decision Ledger,
  Performance highlights, Command Center cards, Outcomes, and legacy signal prognoses.
  Convention: **impact in AED (FMCG), token/API costs stay USD**. Healthcare pack keeps
  its own USD figures. The v1 `agentCatalog` in `data.js` is dead data (unused import in
  `app.js`) — Agent Space serves per-industry catalogs from `v4content.js`.

## What v5 is (unchanged)

Positioning rules live in `CLAUDE.md` → "Positioning"; per-version detail in
`docs/FEATURE_INVENTORY.md`. **`docs/BLUEPRINT.md` (new this session) is the navigation
map** — every screen, URL, the off-nav Act flow (finding → solution design → agent
studio), the legacy redirect table, and a 9-step demo walkthrough.

- Hero: **"Nothing drifts unanswered."** — do not revert to "makes someone answer for it".
- Agents are **counterparts** in all user-facing copy; internals still say "shadow"
  (`ShadowAgent`, `src/api/shadowOrg.ts`, `src/screens/ShadowOrg/`) — optional cleanup.
- The loop: **Sense → Find → Decide → Act → Close**.
- Industry picker: **FMCG + Healthcare only**; Manufacturing seeded but hidden
  (11 mandates vs 26/22) until deepened.
- `/guide` auto-opens for first-time users via `localStorage['rewive.guideSeen']`
  (redirect lives only in `CommandCenter/index.tsx`).

## Open threads / natural next steps

1. **Manufacturing pack depth** — to re-enable the third industry: author more mandates
   in `mock-server/v4data.js` + operational content in `v4content.js`, then re-add it to
   `industryOptions` (v4data.js), the landing `INDUSTRIES` list, and `story.html`.
2. **Performance screen data** — the reframe ("where the loop closes fastest") is
   copy-only; the leaderboard still shows old execution metrics. A follow-up could add
   loop-closing-speed columns per mandate.
3. **Optional internal rename** — `ShadowAgent`/`shadowOrg.ts`/`ShadowOrg/` →
   counterpart naming, if churn is acceptable.
4. **Keep-verbatim lines** for any new copy: "Every mandate, held twice." · "The
   company's memory of judgment." · "Nothing is 'done' until the number is back."

## Context that isn't in the code

- The founder demos this to FMCG stakeholders (Americana context — seed org is
  "Americana Foods (demo)", AED currency); FMCG is the beachhead, Healthcare second.
- Repositioning rationale (why "shadow org"/"agentic operating model" were dropped,
  buyer = COO/CFO/transformation office) was worked out in the 2026-07-11 session; the
  strategy summary is in the (now merged) PR #2 description.
- Demo entry points for reviewers: `public/demo.html` (launcher), `public/story.html`
  (narrative pitch), `/guide` (in-app tour), `docs/BLUEPRINT.md` (screen map).

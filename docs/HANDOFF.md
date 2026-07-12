# Handoff — v5 repositioning (2026-07-12)

## Where things stand

- **Branch `v5`** (9 commits ahead of `v4`) is pushed and has an open PR into `master`:
  **https://github.com/Kumarv2509/rewive-front-end/pull/2** — awaiting review/merge.
- Build and lint are clean (`npm run build`, `npm run lint`). No test suite exists.
- Local dev: `npm run dev:all` (Vite :5173 + mock API :4000). Watch for stale mock-server
  processes holding :4000 — an old one will serve pre-v5 seed data (old "Shadow X" agent
  names, 3 industries). `lsof -i :4000` and kill before restarting.

## What v5 is

The product was repositioned from "the Agentic Operating Model / shadow organization" to
**the Decision Accountability Layer**. Full positioning rules live in `CLAUDE.md` →
"Positioning"; per-version detail in `docs/FEATURE_INVENTORY.md` → v5 section.

The one-paragraph version:

- Hero statement: **"Nothing drifts unanswered."** (chosen by the founder over softer
  variants; do not revert to "makes someone answer for it" — it reads as blame).
- Agents are **counterparts**, never "shadows", in all user-facing copy. Internal
  identifiers (`ShadowAgent`, `src/api/shadowOrg.ts`, `src/screens/ShadowOrg/`) still use
  the old naming — optional cleanup, rename only if touching them anyway.
- The loop is **Sense → Find → Decide → Act → Close** (not "Learn").
- Nav: Operate (Command Center · Findings · Closure · Decision Ledger · Counterparts ·
  Runs · Tasks) / Insights (Outcomes · Performance · Agent Space) / **Foundation**
  (Operating Picture · Mandate Library · Data Connectors). Agent-building screens are
  routable but off the nav — reached via a finding's **Act** disposition.
- Industry picker offers **FMCG + Healthcare only**; the Manufacturing pack is seeded but
  hidden (11 mandates vs 26/22) until deepened.
- `/guide` is a full-screen intro scroller (9 steps, snap slides, dots, skip) that
  auto-opens for first-time users via `localStorage['rewive.guideSeen']`
  (`src/screens/Guide/`, flag helpers in `Guide/seen.ts`, redirect lives only in
  `CommandCenter/index.tsx` so deep links are never hijacked).

## Open threads / natural next steps

1. **Merge the PR** (or gather feedback on it) — nothing is blocked on code.
2. **Manufacturing pack depth** — to re-enable the third industry: author more mandates in
   `mock-server/v4data.js` + operational content in `v4content.js`, then re-add it to
   `industryOptions` (v4data.js), the landing `INDUSTRIES` list, and `story.html`.
3. **Performance screen data** — the reframe ("where the loop closes fastest") is copy-only;
   the leaderboard still shows the old execution metrics. A follow-up could add
   loop-closing-speed columns per mandate.
4. **Optional internal rename** — `ShadowAgent`/`shadowOrg.ts`/`ShadowOrg/` →
   counterpart naming, if churn is acceptable.
5. **"Answer for it" phrasing** is retired everywhere; if new copy is written, keep the
   keep-verbatim lines: "Every mandate, held twice." · "The company's memory of judgment." ·
   "Nothing is 'done' until the number is back."

## Context that isn't in the code

- The founder demos this to FMCG stakeholders (Americana context — seed org is
  "Americana Foods (demo)", AED currency); FMCG is the beachhead, Healthcare second.
- The repositioning rationale (why "shadow org" and "agentic operating model" were
  dropped, buyer = COO/CFO/transformation office, decision-accountability category) was
  worked out in the 2026-07-11 session; the strategy summary is reproduced in the PR
  description.
- Demo entry points for reviewers: `public/demo.html` (launcher), `public/story.html`
  (narrative pitch), `/guide` (in-app tour).

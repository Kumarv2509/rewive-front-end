# Rewive feature inventory — v1 / v2 / v3 / v4 / v5

Status legend: **Built** = real code, working against the mock API · **Mockup only** = designed as an interactive prototype in chat, not in this codebase · **Partial** = some part built, rest still mockup-only.

## v1 — original prototype

Rebuilt from the static HTML prototype so every data point comes from an API instead of being hardcoded.

| Feature | Status |
|---|---|
| Command Center (KPIs, pending decisions, live runs, pulse) | Built |
| Create an Agent (chat-based builder) | Built |
| Runs & Actions (run list, live run timeline) | Built |
| Decision Ledger (verdict tracking) | Built |
| People & Agents (leaderboard) | Built |
| Outcomes (scorecards, insights, recommended actions) | Built |

## v2 — branch as it stood before this work started

| Feature | Status |
|---|---|
| Top nav restructure — Operate / Build / Insights areas | Built |
| Data Connectors (connector types, approval workflow) | Built |
| Agent Space (agent catalog, filters, detail page) | Built |
| Agent Studio (drag-and-drop, no-code workflow canvas — nodes, simulate, publish) | Built, unchanged in v3 |
| Signal Studio (suggested signals, committee review, KPI tickets) | Built — the committee-review and KPI-ticket tabs were later removed in v3 (see below) |
| All v1 screens, carried forward | Built |

**Known gap going in:** Create an Agent (chat) and Agent Studio (canvas) were two separate data models (`AgentBuilderSession` vs `AgentWorkflow`), not one spec at two altitudes — the core architectural complaint in the design brief. v3 resolves this, but as a **new, separate** entry point (Unified Agent Studio) rather than by rebuilding the existing chat/canvas screens — see notes below.

## v3 — branch `v3`, pushed to GitHub

### Built and integrated into the app

| Feature | Where |
|---|---|
| **KPI Library** — onboarding starting point, now the default Build landing page. Two paths: select KPIs from an industry catalog (organized by industry segment — Hospital / Clinic / Pharmacy chain — and by function/category — financial / operational / clinical / patient experience), or import drivers and budget from a planning tool. Every KPI shows exactly which data it needs, and a tracked-KPIs panel shows connected vs. still-needed data — this is what determines whether Signal Studio can compute against it | `/build/kpis` |
| Healthcare KPI catalog — 21 researched KPIs (ALOS, bed occupancy, 30-day readmission, net margin, days in AR, etc. for hospitals; no-show rate, revenue per visit, provider utilization, etc. for clinics; gross margin per script, generic dispensing rate, DIR fee impact, etc. for pharmacy chains) | KPI Library catalog |
| Anaplan / Workday Adaptive Planning added as real connector types, reusing the existing Data Connectors approval flow; importing from one pulls in mock drivers and budget lines and marks that KPI's data as already connected | KPI Library → Import tab, Data Connectors |
| Add a custom KPI by drivers — name plus any number of driver/data-source pairs, for anything not in the catalog | KPI Library |
| Signal Detail — why a signal was surfaced, impact prognosis, underlying dataset with PII masked by default, similar signals across stores *and* domains with prior-solution outcomes (cost, value generated, verdict) | `/insights/signals/:signalId` |
| Signal Studio simplified — committee-review and KPI-ticket tabs removed; signals go straight from the list into Signal Detail | `/insights/signals` |
| Solution Design document — spec (approach, data needed, owner, guardrails), separate from a build, with copy-and-tweak from a prior similar-signal solution | `/build/solutions/:id` |
| Task list on the solution — new agents to build, existing agents reused, human tasks, each owned and status-tagged | Solution Design screen |
| Validation agent — automated pros/cons/ROI/cost review that **proposes** a dev handoff or "ready for Runs & Actions", not a manual toggle | Solution Design screen |
| Send for approval → Approve, with a status flow (drafting → pending approval → approved) | Solution Design screen |
| **Unified Agent Studio** — one agent spec rendered at a Business altitude (intent, capabilities, plan preview) and a Developer altitude (data contract, permissions, guardrails, test run), reached via a **"Design agent"** action button on each new-agent task in an approved solution | `/build/agent-studio/:agentSpecId` |
| Escalate handoff card — business owner → dev/IT, carries the reason, unlocks nothing (both altitudes were always viewable — escalate is the deliberate handoff moment, not a lock) | Unified Agent Studio, when escalated |
| Handback card — dev → business, plain-language contract (does / won't / owner / when unsure) | Unified Agent Studio, after handback |
| Version trail — every business/dev edit, escalate, test run, handback, and publish logged with actor, altitude, timestamp | Unified Agent Studio |
| Test run against fixture data | Unified Agent Studio, Developer altitude |
| Publish — works for agents that never needed a developer (publish straight from Business altitude) and agents that did (publish after handback); creates a real, live entry in Agent Space either way | Unified Agent Studio → Agent Space |
| **Tasks** (new) — every task from every approved solution *and* confirmed quick solutions in one place, with per-task feedback/comments and a status progression | `/operate/tasks` |
| Notification channel selector per task (In app / Teams / Slack / ServiceNow) | Tasks screen — persisted per task via the mock API; actual delivery is simulated (no real Teams/Slack/ServiceNow integration) |
| Command Center persona lens — locked to the signed-in user's role for regular users, admin-switchable (Store Manager / CFO / Operations Head / All) | Command Center |
| Persona-driven KPIs and pending-decisions filtering | Command Center |
| **Command Center — "Signals waiting on you"** — persona-filtered signals right on the landing page, each with a one-click "Solution design" action; this was designed in the very first mockup but had never actually been added to the real screen until this round | Command Center |
| Agents tagged with persona | Agent Space cards + Agent Detail page |
| **Solution-in-hand fast path** — reviewer describes a fix in plain language, it's broken into tasks, nothing is created until they explicitly confirm, then it lands in Tasks under "Quick fix: <signal>" | Signal Detail → "I already have a solution" |
| **PII unmask request** — logged request instead of a silent toggle; data stays masked, the request is what's tracked | Signal Detail |
| **Restricted cross-group signal access request** — the "restricted" row now has a real "Request access" action instead of being inert | Signal Detail |
| **Runs & Actions exception log** — open/resolved agent issues per run, with a Resolve action | Runs & Actions |
| **Chase & escalate** — an SLA-based item (no response past the service window) and a form to flag feedback on any run, which escalates straight to the agent owner | Runs & Actions |
| **Decision Ledger — assessor agent verdict and close-the-loop** — an independent post-run assessment note distinct from the validation agent (which reviewed the *plan*, not the outcome), with a link back to close the originating signal | Decision Ledger |
| **Agent delegate identity** — name, tone, communication style, response type, an escalation-temperament slider, working hours, and "when it's unsure," editable per agent | Unified Agent Studio |

### Explicitly not built — still just discussed or mocked up

| Feature | Note |
|---|---|
| UAT stage / separate manual production deploy gate | Publish in Unified Agent Studio goes straight to live — there's no distinct UAT or manual-deploy step in between |
| Real Teams / Slack / ServiceNow integration behind the Tasks channel selector | Selector exists; no external delivery |
| KPI catalog for industries beyond Healthcare (Retail, Manufacturing, Financial Services, etc.) | Only Hospital / Clinic / Pharmacy chain are researched and seeded so far — the segment picker is ready to take more |
| Real Anaplan / Adaptive Planning API integration | Import returns the same canned drivers and budget lines regardless of what's actually in the connected workspace |
| Assessor agent runs automatically over time | The verdict and note are seeded on two ledger entries to show the pattern; there's no simulated time-passage that generates these from a live run |
| The standalone 12-screen click-through prototype shown earlier in chat | Reference only, its own sandboxed HTML/JS, never wired to real routes or data |

## v4 — branch `v4`: the agentic operating model

| Feature | Where |
|---|---|
| Public landing page with industry picker; every screen becomes industry-parameterized (FMCG / Healthcare / Manufacturing packs in `mock-server/v4data.js` + `v4content.js`) | `/` |
| Operating Picture — intents ← mandates ← senses graph, editable, with agent-proposed nodes/edges | `/build/picture` |
| Shadow Org — one agent per function stream + an org-level chief, temperament dial, SLA breaches | later renamed (v5) |
| Findings with the four dispositions (Accept / Act / Acknowledge / Abandon), SLA escalation, impact paths | findings screens |
| Closure — exit conditions with progress, trip-wires, closed loops | closure screen |
| KPI Library rebranded Mandate Library; editable mandates; assessor verdict on close | `/build/kpis`, Decision Ledger |
| Standalone story + demo launcher pages, Rewive branding | `public/story.html`, `public/demo.html` |

## v5 — branch `v5`: repositioned as the Decision Accountability Layer

The product's category, copy, and information architecture were repositioned; see `CLAUDE.md` → "Positioning".

| Change | Detail |
|---|---|
| Category and hero | "Agentic operating model" → **the Decision Accountability Layer**; hero: "Dashboards show you the number. Rewive makes someone answer for it." |
| "Shadow organization" retired from all user-facing copy | Agents are **counterparts** ("Planning counterpart", "counterpart to <owner>"); internal type/file names (`ShadowAgent`, `shadowOrg.ts`) unchanged |
| The loop's fifth stage | Learn → **Close** ("nothing is 'done' until the number is back"); landing gains a Decision Ledger proof section ("the company's memory of judgment") |
| Nav restructured around the loop | Operate = Command Center · Findings · Closure · Decision Ledger · Counterparts · Runs · Tasks; Insights = Outcomes · Performance · Agent Space; Build → **Foundation** (Operating Picture, Mandate Library, Data Connectors) |
| Agent-building screens off the nav | Create an Agent, Agent Studio, Unified Agent Studio, Solution Design stay routable, reached via a finding's **Act** disposition |
| People & Agents reframed | "Performance" — measures mandates and loop-closing speed, not humans-vs-agents ranking |
| Entry flow | Industry pick lands on `/command` (obligations first: findings, then decisions); old v4 URLs redirect |
| Manufacturing hidden from pickers | Pack still seeded; off `industryOptions` and the landing/story pages until it's as deep as FMCG (26) / Healthcare (22) — it has 11 mandates |
| Agent Space scoped to the operating context | Per-industry agent catalogs; filters by lifecycle/build-path instead of industry/function |

## Net effect

The full loop is real and runs end to end against the mock API, and now reads as one product: pick an industry → Command Center shows what's waiting on you → open a finding → disposition it (Accept sets an exit condition in Closure; Act opens a solution design that can flow into the agent studios) → the decision lands in the Decision Ledger and later gets an assessor verdict. Everything in the v3 "explicitly not built" table remains absent (no real integrations, no automatic assessor over time, canned agent-builder chat).

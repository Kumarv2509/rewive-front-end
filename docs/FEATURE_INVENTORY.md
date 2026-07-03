# Rewive feature inventory — v1 / v2 / v3

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
| **Tasks** (new) — every task from every approved solution in one place, with per-task feedback/comments and a status progression | `/operate/tasks` |
| Notification channel selector per task (In app / Teams / Slack / ServiceNow) | Tasks screen — **UI preview only, not wired to a real integration** |
| Command Center persona lens — locked to the signed-in user's role for regular users, admin-switchable (Store Manager / CFO / Operations Head / All) | Command Center |
| Persona-driven KPIs and pending-decisions filtering | Command Center |
| Agents tagged with persona | Agent Space cards + Agent Detail page |

### Explicitly not built — still just discussed or mocked up

| Feature | Note |
|---|---|
| Agent delegate configuration — tone, culture, communication style, response type, escalation temperament, working hours, "when it's unsure" | Not started |
| Solution-in-hand fast path — reviewer already has a fix → task breakdown → confirm with the solution provider → assign & notify | Explicitly scoped out early on |
| PII unmask-with-reason flow | Masked by default; no "request access" action exists |
| Restricted cross-group-company signal access request | Shown as a greyed "restricted" pill with no action behind it |
| UAT stage / separate manual production deploy gate | Publish in Unified Agent Studio goes straight to live — there's no distinct UAT or manual-deploy step in between |
| Runs & Actions exception log | Not started |
| Chase & escalate — SLA/timer-based (no response in N hours) and feedback-driven (user flags "too noisy") | Not started |
| Assessor agent — independent post-run impact assessment feeding a verdict back into the Decision Ledger | Distinct from the validation agent, which reviews the *plan*, not the outcome |
| Decision Ledger close-the-loop visual (verdict writing back to close the originating signal) | Not started |
| Real Teams / Slack / ServiceNow integration behind the Tasks channel selector | Selector exists; no external delivery |
| The standalone 12-screen click-through prototype shown earlier in chat | Reference only, its own sandboxed HTML/JS, never wired to real routes or data |

## Net effect

The signal → solution design → unified agent studio → publish loop is real and runs end to end against the mock API, including both the no-dev-needed and escalate/handback paths. Everything in the second table is genuinely absent from the running app — flagged here so the next round can pick items deliberately instead of assuming they already exist.

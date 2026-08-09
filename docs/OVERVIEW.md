---
doc: OVERVIEW
title: Rewive — project overview
type: orientation
status: draft
owner: Praveen
updated: 2026-08-04
tags: [overview, orientation, status, roadmap]
---

# Rewive — project overview

The one-page orientation: what we are building, the problem it solves, how it
works, what exists today, and what comes next.

> This document **orients**. [[BRIEF-001-project-brief|BRIEF-001]] holds the
> **doctrine** — the non-negotiables and language rules that decide whether a
> feature belongs. When they overlap, the brief is authoritative; keep the
> detail there and the orientation here.

---

## What Rewive is

**The system of record for operational decisions.** *Nothing drifts
unanswered.*

Dashboards show you the number. Rewive **holds every number twice** — a person
and an AI counterpart on the same mandate — so the moment it drifts, a decision
is demanded, watched to closure, and remembered.

The person decides. The counterpart never looks away. Silence escalates up the
real org chart on an SLA.

---

## The problem

Every operating company runs the same monthly rhythm: the period closes,
finance and the business spend **three to four days building the pack**, the
**Business Review Meeting** happens around the 7th to the 10th, and a list of
**action items** comes out of it. Then the month happens to everybody, and the
list waits for the next BRM.

The pack gets better every month. The follow-through does not. Five patterns
account for most of the drift:

| Pattern | What actually happens |
|---|---|
| **Market drift** | Something starts burning. Focus moves to the fire, and every item that isn't on fire silently loses its owner. |
| **Sales is up** | Growth becomes the story. Nobody wants to be the person interrogating margin while the top line is celebrated. |
| **Margin push** | The correction over-swings: protecting margin on one line cannibalises another, and no one is accountable for the net. |
| **Inventory optimisation** | "What did we produce against what actually sold?" spans planning, production and commercial — so it belongs to everyone and therefore to no one. |
| **Logistics and distribution** | Operational teams are measured on today's movement. A structural fix loses to today's trucks, every single day. |

Those are the ones customers name first. The same shape appears far more
widely, and it is worth grouping by **mechanism** rather than symptom — a
mechanism predicts drift in cases nobody has named yet.

| Mechanism | Looks like | What answers it |
|---|---|---|
| **Attention** — the fire wins | Market drift · launch fade · peak-season absorption | The clock belongs to the finding, not the meeting; a counterpart is never distracted or reassigned |
| **Ownership** — the metric and the lever sit with different people | Working capital · inventory optimisation · supplier performance · post-reorg vacuum | One accountable owner per mandate; matrix escalation; no mandate may be left ownerless |
| **Time** — feedback arrives after accountability dissolves | Trade-spend leakage · capex benefit realisation · compliance follow-ups | Recovery targets watched to closure, and an assessor verdict that returns long after attention moved on |
| **Narrative** — the story of the quarter makes a question unaskable | Sales is up · margin push · operational primacy | Mandates are held independently; a mandate is not un-watched because another number is good news |
| **Normalisation** — a bad number becomes the baseline | Scrap run-rate · forecast bias · agency-labour creep | A mandate is an explicit standing target; drift raises a finding however long it has been true |
| **Memory** — the org cannot recall what it decided | Re-raised as new · unassessed decisions | The Decision Ledger, and re-raise rate as a first-class measure |

The full catalogue sits in [[BRIEF-001-project-brief|BRIEF-001]] Entry 02.

The common shape across all of them: **people own some and disown a lot.** An
item without a clock, an owner of record, and a definition of done is not an
item — it is a sentence in a document.

**The gap is not visibility. It is accountability.** The fix is structural, not
disciplinary: give every number an owner who cannot quietly stop holding it,
and a counterpart that never looks away.

---

## How it works

**The loop — Sense → Find → Decide → Act → Close** — runs whether or not anyone
is watching.

1. **Sense** — each counterpart watches the live signals behind its mandates
   continuously, not on a reporting cadence.
2. **Find** — when reality drifts, it raises a **finding**, prices the impact,
   traces it up the P&L to the intent it threatens, and starts an SLA clock.
3. **Decide** — the owner must choose. Nothing proceeds without a decision, and
   silence escalates.
4. **Act** — a watched recovery target, a solution broken into tasks for agents
   and people, or a deliberate recorded pause.
5. **Close** — **nothing is "done" until the number is back.** Every decision
   lands in the ledger and gets a verdict later.

Four decisions are available, each a different instruction to the organization:
**Accept** (set a recovery target), **Act** (open a solution with tasks),
**Park** (known issue on a re-alert rule), **Dismiss** (not real — the reason
tunes the agent).

Everything in the product is one of **five primitives**: mandate · signal ·
counterpart (agent) · finding · Decision Ledger.

### What makes it different

| | What it does | Why that isn't Rewive |
|---|---|---|
| BI / dashboards | Show the number | A red number on a dashboard is nobody's obligation |
| Alerting | Notify someone | An alert can be ignored without consequence; a finding cannot |
| Task / project tools | Track work | Tasks exist only downstream of a decision someone owned |
| RPA / workflow | Execute steps | Rewive doesn't run the business; it makes sure the business answers |

The product's output is the **Decision Ledger** — auditable by a CFO, not
admired in a review meeting. Most companies can tell you what they measured.
Almost none can tell you what they decided, or whether it worked.

---

## What exists today

A working, industry-parameterized demo, deployed and demonstrable. React 19 +
TypeScript + Vite, with an Express mock server implementing the exact REST
contract the frontend expects.

- **Three tenants, three industries** — Americana Foods (FMCG), Medcare UAE
  (healthcare), Gulf Precision Industries (manufacturing). Org-branded sign-in;
  each team lands in its own role-scoped view.
- **The full loop is walkable** — Today queue, Findings with lifecycle tabs
  (open / watching / closed), a finding's thread from raised → decided →
  watching → closed + verdict, the Decision Ledger, Execution (runs, tasks,
  outcomes), Agents and Workforce, the Operating Picture, and Connectors.
- **Role-partitioned data** — personas are roles in a hierarchy, and the global
  lens filters every screen. An executive's queue is empty unless their
  organization went silent.
- **One genuinely live pipeline** — live mandate tracking: real numeric metrics
  → deterministic drift rules → agent-raised findings, flowing into the same
  findings / decision / closure path as the seeded content. Backed by Postgres,
  with Claude authoring the finding narrative and a deterministic template
  fallback, so a sweep never fails because authoring failed. Sweeps run on
  cron, on demand from Connectors, or on a dev interval.

**Honest status:** everything except live tracking is seeded demo content, and
there is **no production backend** — the mock server holds state in memory.
That is the gap the SaaS build closes.

---

## What is being built

Turning the demo into a multi-tenant SaaS product, without forking the codebase
for on-prem customers.

| Piece | What changes |
|---|---|
| **API** | Replace the mock server with a real stateless Express API on PostgreSQL |
| **Tenancy** | Pooled multi-tenancy enforced by Postgres row-level security, from day one — retrofitting it later is the expensive version of this project |
| **Worker** | A durable job runner owning SLA clocks, escalations, digests and LLM jobs. The queue lives inside Postgres, so the database restore point is also the escalation-state restore point |
| **Auth** | OIDC behind one abstraction — a hosted IdP for SaaS, the customer's own for dedicated deployments |
| **LLM** | One gateway module: provider resolution, per-tenant metering, rate limits, circuit breaker |
| **Packaging** | Containers for API, worker, migrations and the SPA — the same images whether Rewive runs them or a customer does |

### How it is delivered

Two modes, **one codebase and one artifact set**:

- **Pooled SaaS** — Rewive runs it for everyone on one home cloud. The default.
- **Dedicated / single-tenant** — the same product in the customer's cloud, or
  self-hosted, for data-residency or procurement reasons.

The moment on-prem becomes a fork, maintenance cost doubles and never comes
back down. Every environment difference is configuration, not code.

**Where it runs:** Azure is designed end to end
([[ARCH-003-azure-hld|ARCH-003]], [[ARCH-004-azure-lld|ARCH-004]]). AWS, Google
Cloud and Huawei Cloud are mapped against the same portable architecture
([[ARCH-002-multi-cloud-hosting|ARCH-002]]) so a dedicated deployment can land
wherever a contract demands.

---

## Sequencing

| Phase | What happens | Gate |
|---|---|---|
| **1** | Real API on Postgres; tenant-scoped data layer and RLS in place | The cross-tenant leak test passes in CI |
| **2** | Containerize; drop platform-specific dependencies | Images build and run identically anywhere |
| **3** | SaaS launch — OIDC, durable worker, billing, per-tenant subdomains | First paying tenant |
| **4** | Dedicated single-tenant tier | First enterprise pull |
| **5** | On-prem Helm chart, licensing, support bundle | Only against a signed on-prem deal |

Three abstractions decide whether this stays cheap: **tenant-scoped data
access**, **pluggable OIDC auth**, and a **wrapped LLM provider**. With those
right, SaaS versus on-prem is a packaging problem rather than an engineering
one.

---

## How success is measured

| Measure | Why it matters |
|---|---|
| Median time from finding raised to decision | The core promise: drift meets a decision fast |
| Decision win rate | Of assessed decisions, how many moved the number back |
| Findings closed by recovery target met | "Done" means the number came back, not that someone clicked |
| Escalations that reached the top | Should trend toward zero — a busy CEO queue means the org went silent |
| Mandate coverage with live signals | Blind mandates are honest but useless |
| Re-raise rate | The same drift returning measures decisions that did not stick |

---

## The principles that constrain every decision

Ten non-negotiables live in [[BRIEF-001-project-brief|BRIEF-001]] Entry 12. The
four that most often decide a design argument:

1. **Every mandate has exactly one accountable human owner** — never zero,
   never an agent, never a committee.
2. **Every finding demands a decision.** No state stops the clock without a
   recorded choice.
3. **Nothing is "done" until the number is back.** Closure is a measured
   recovery target, not a status.
4. **Accountability transfers, never bypasses.** To answer for a mandate you
   must first own it, and that transfer is itself a recorded event.

Day to day these are enforced by the `rewive-brief` skill in
`.claude/skills/`, which loads automatically when anyone designs or builds a
Rewive feature.

---

## Where to find things

| Document | What it answers |
|---|---|
| [[BRIEF-001-project-brief\|BRIEF-001]] | What Rewive is and refuses to be — the doctrine |
| [[DIAGRAMS-visual-walkthrough\|DIAGRAMS]] | Every architecture and flow diagram in one read |
| [[ARCH-001-productization-strategy\|ARCH-001]] | Why the product is packaged the way it is |
| [[ARCH-002-multi-cloud-hosting\|ARCH-002]] | Where it can run — one architecture, four clouds |
| [[ARCH-003-azure-hld\|ARCH-003]] | Azure design: components, security, HA/DR, cost |
| [[ARCH-004-azure-lld\|ARCH-004]] | Azure configuration: every resource, alert, runbook |
| [[PROD-001-access-control\|PROD-001]] | Who may see and do what inside a tenant |

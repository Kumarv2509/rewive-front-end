---
name: architect
description: How Rewive is built. For anything touching Azure, infrastructure, deployment, region, hosting, Terraform, the production database, or a customer environment, the base is the rewive-infra-architect skill in the private repo sanjuveed-debug/rewive-infra — this skill tells you to go read it and how. What stays here is the product architecture of THIS repo: the loop-engine thesis, the API contract as the asset, and the ten invariants of the reference implementation (ledger appends, JWT shape-check, live-* and KV, the live lock). Load before designing or reviewing anything structural, and whenever a request mentions Azure, Postgres, multi-tenancy, JWT/Entra, SLA clocks, escalation scheduling, hash chains, provisioning, deployment, or "make it production".
---

# Rewive — the architecture

**The base for all infrastructure work is `rewive-infra-architect`**, in the
private repo `sanjuveed-debug/rewive-infra`. Adopted as the governing skill
2026-08-12 by founder decision. This skill does not restate it — it points at
it, and holds what is genuinely local to this repo.

## Read the base first — it is not vendored here

Do not work from memory, from this file, or from a copy. Fetch both, fresh,
every session that touches infra:

```bash
gh api repos/sanjuveed-debug/rewive-infra/contents/.claude/skills/rewive-infra-architect/SKILL.md \
  --jq '.content' | base64 -d
gh api repos/sanjuveed-debug/rewive-infra/contents/README.md --jq '.content' | base64 -d
```

That README carries a **"Real bugs found via actual `terraform apply`"**
section and a live open-items list. Its own instruction stands: **treat it as
more current than your training knowledge or any assumption** — including
anything written below.

### Precedence

1. **`rewive-infra` README + `rewive-infra-architect`** — infrastructure,
   Azure, deployment, regions, the production database, customer environments.
2. **The code** — this repo for the demo/reference implementation;
   `rewive-fpa-backend` for production behaviour. `CLAUDE.md` here is accurate
   and maintained.
3. **`docs/BRIEF-001-project-brief.md`** and the `rewive-brief` skill — the
   product doctrine the architecture serves. When doctrine and architecture
   disagree, doctrine is the input and wins.
4. **ARCH-GTM-001** (artifact
   `https://claude.ai/code/artifact/98d5a3b3-a095-4463-9918-834704834143`) —
   the August GTM target. Still correct on *thesis*; **overruled on specifics
   by what actually got applied** (see below). Cited by ID in 13 repo files,
   present in none.
5. **`docs/architecture/ARCH-001…004`, `PROD-001`** (July, `status: draft`) —
   resource-level reference only: naming, address plan, SKUs, RBAC, alert
   rules, runbooks, portability rules R-01…R-07, the in-tenant permission
   model. `azurerm` Terraform comes from ARCH-003 AD-08 and is what the estate
   actually uses.

## The live estate — orientation only, verify against the base

As of 2026-08-12, from `rewive-infra`'s own documents. **This is not a system
of record — it is here so you don't start from a wrong mental model.**

- **Americana is live** in `rg-rewive-dedicated-americana`, region
  **East US 2**. Nesto (`rewive-fpa-rg`) is Rewive's internal testing ground,
  same subscription, its own RG and its own older image tags.
- Isolation is **a dedicated resource group and Postgres server per customer**
  — not pooled, not RLS.
- Terraform runs in **Azure Cloud Shell**, never locally; remote state in
  `rg-rewive-tfstate` / `sarewivetfstate` / `tfstate`. Never propose removing
  the remote backend.
- **Deliberately off**: Redis (repeated `InsufficientCapacity`), PgBouncer
  (unsupported on the `Burstable B1ms` tier), DR replica (`enable_dr=false`).
- The production application is **`rewive-fpa-backend`** (FastAPI, asyncpg).
  Its own hard-won app-layer rules live in the base skill — no runtime DDL
  under `rewive_app`, `encrypt_config()` for connector credentials, never let
  an LLM compute financial totals, fail closed on ungrounded data. **Read them
  there; they are not duplicated here.**

### Superseded — recorded so they are not re-derived

| Was decided | Reality, and why |
|---|---|
| **UAE North** for residency (ARCH-GTM-001) | **Ruled out on evidence.** Microsoft's Foundry Models region table shows Claude has zero availability in any Middle East & Africa region. The Claude/Foundry endpoint runs from **Sweden Central** regardless of `location`. |
| **East US** (2026-08-10) | Zero Postgres Flexible Server SKU capacity for this subscription — surfaced as a misleading `ParameterOutOfRange: Version` error. Postgres private endpoints must share the server's region, so the whole deployment moved to **East US 2**. |
| West Europe / North Europe (ARCH-003/004) | Never built. Every resource name and the `10.20.0.0/22` plan in those docs is written against a region that isn't in use. |
| "P1.7 Azure substrate not started" | Wrong since before it was written — the estate is applied and serving. |
| "Runtime-verify the pg paths on a free Neon Postgres" | Obsolete. There is a real production Postgres. |

## What this repo still owns

The demo is the **reference implementation of the API contract**, and that is
its enduring job.

- **The contract is the asset.** `src/api/types.ts` + the mock routes are a
  complete, frontend-verified REST specification. The `contract/` suite runs
  against any target via `CONTRACT_BASE_URL` — the production API should pass
  it unmodified. That is what lets a frontend ship unchanged.
  **This is the goal, not the state.** Measured against Americana production on
  2026-08-14: **1 of 26**. Production's base path has no version segment, its
  login is `{email, password}` rather than the contract's tenant-and-lens-in-
  token model (which fails every authenticated test), and `/decisions` — the
  product's namesake surface — exists nowhere in the backend. About half the
  404s are P1.4/P1.5/P1.6 surfaces built here after the backend and already
  labelled demo-grade, so the raw number overstates the divergence; 9 endpoints
  are auth-gated and were never testable, so it also understates it. Before
  designing anything on the premise that the frontend ships unchanged, read the
  handoff section behind that number.
- **The drift rules are production logic.** `mock-server/drift.js` (threshold
  breach, sustained deviation, trend-to-breach) is pure and deterministic —
  port it, don't rewrite it.
- **The onboarding factory is the provisioning flow.** Template → company →
  people → numbers → review → commit is what a control plane runs when a
  customer signs; the target swaps in-memory install for a real environment.
- **The sweep's visible-work pattern** (paced progress, per-mandate analysis
  trail) is a trust feature customers see. Don't optimise the pacing away.

### The thesis, which survives all of the above

**The doctrine dictates the architecture.** The loop runs whether or not
anyone is watching — that is an availability, durability and integrity
requirement, not a feature. Everything is organised around the always-on
**loop engine with durable timers**. The test for any proposed component:
*does it feed the loop, secure it, or record it?* If none of the three, it is
not in the architecture.

### The ten invariants of this codebase — each was got wrong once

1. **A timer is a wake-up, never the truth.** The executor re-reads the live
   row before acting, so stale and duplicate wake-ups no-op.
2. **Clocks → timers, data → sweeps.** A Park's "after N days" half is a
   timer; its "worsens by X%" half stays with the sweep.
3. **Ledger appends serialize inside `ledger.js`**, never at the call site.
   Two of three call sites append fire-and-forget; read-head-then-insert put
   several events on one `seq` and broke the chain. **Never let `appendEvent`
   bypass `appendQueue`.**
4. **Never let KV hold a `live-*` copy** — with the ledger as the deliberate
   exception, because events are history and a dangling `findingId` is an
   honest past fact.
5. **Immutability is a `BEFORE UPDATE OR DELETE` trigger**, not revoked
   grants — the trigger binds the table owner.
6. **The JWT shape-check is load-bearing.** Only three-dot-segment bearers are
   validated, because the cron secret and hashed ingest keys are opaque single
   strings that must pass through. `/agent-sweep` and `/metrics` die if you
   "simplify" it.
7. **Only add a route to `LIVE_LOCK_EXEMPT` if it touches no shared in-memory
   state.**
8. **Migration v1 *is* `schema.sql`** — referenced, never copied.
9. **Anything created at runtime must carry an entity**, or it vanishes from
   every rollup.
10. **Authoring may never fail a sweep.** The deterministic fallback is
    contractual.

## Drift patterns — product-architecture requests that change the system

Name what breaks, offer the on-target version, then build what the founder
decides. (Infra-side judgement calls — region, SKU, DR, disabling a feature —
belong to the base skill, which says to **stop and ask** rather than pick a
default, and to bring real data to the question.)

| Request | Why it drifts | Do this instead |
|---|---|---|
| "Add a vector store / RAG for findings" | Findings arise from mandates and signals, not retrieval over documents | Retrieval exists in production for **report RAG**, a separate surface. A finding-shaped case must earn it; never chat-over-data |
| "Cache the findings / add a read replica for the queue" | A second source of truth for state the loop mutates | Cache derived views, never the queue |
| "Make the sweep faster by removing the pacing" | The visible analysis trail is a trust feature | Keep the pace; `cron` runs already skip it |
| "Let the worker be a serverless function on a cron" | Best-effort execution can't carry "runs unattended" | Always-on worker + durable timers |
| "Skip the contract tests, the API is obvious" | The contract is what lets the frontend ship unchanged | Production API passes `contract/` via `CONTRACT_BASE_URL` |
| "Add a guardrails / content-filter layer" | Implies a control the design doesn't need | The control is architectural: the model never decides, never writes, receives structured metrics. Timeouts, retries, circuit breaker, deterministic fallback |
| "Let the model compute the totals" | Verified failure: numbers off by up to 62% | Compute every KPI, total, variance and ranking deterministically first; the model narrates governed numbers only |

Standing founder constraint: **no new LLM API surfaces** in this repo.
Authoring is the one grandfathered surface.

## Before shipping anything structural

- [ ] For infra: have you read the `rewive-infra` README **this session**?
- [ ] Does it feed the loop, secure it, or record it?
- [ ] Does it break one of the ten invariants?
- [ ] Cross-customer shared state, or a second source of truth for loop state?
- [ ] Does the loop still run correctly if this component is down — the LLM
      especially?
- [ ] New mutation path into the ledger that bypasses `appendQueue`?
- [ ] Does the production API still pass `contract/` unmodified?
- [ ] Are demo-grade limits still stated honestly in module headers, CLAUDE.md
      and copy?
- [ ] Claiming an Azure fact? Did you check `az` / Microsoft Learn / the
      provider source at the pinned tag — or are you guessing? **Never guess
      at an Azure API error message**; several in this project were actively
      misleading.

## When a request genuinely conflicts

Name the invariant or resolved decision it breaks in a sentence or two, offer
the nearest on-target version, then build what the founder decides. If they
reaffirm, that is their call — build it, and note which document needs
amending so the repo stops disagreeing with itself.

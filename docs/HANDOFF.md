# Handoff — the schema PR is merged, and the contract-as-asset premise is measured for the first time (2026-08-13 → 14)

## The one thing to act on

**The migrate job is now the only gate, and it must not be the first thing you
run.** `rewive-fpa` PR #1 is merged (`a1d8eaa`). Merging deployed nothing —
`018` and `019` have still never touched a database.

Run **`rewive-infra` PR #1 (Log Analytics) first.** It is the reason step 2
exists. Applying the migrations into an estate that emits no container logs
puts you straight back in the blind-estate failure the last two handoffs each
warned costs a session to diagnose — and the migrations now carry more surface
to fail on, not less.

**Standing sequence, one step shorter:**

| # | Step | State |
|---|---|---|
| 1 | Backend `000` provisioning fix | **merged, not applied** |
| 2 | `rewive-infra` PR #1 — Log Analytics | open |
| 3 | Run the migrate job | the step that makes any of it real |
| 4 | `rewive-infra` PR #2 — Americana C&S | open |

## What was delivered

PR #1 reviewed properly rather than merged on its own account of itself — and
the review found a second blocker, fixed on the same PR before merge.

| Commit | What |
|---|---|
| `918d4bd` | The three migrations as authored last session. |
| `40ab097` | The review fix: `findings.py`, the `019` grants, and a regression test. |
| `a1d8eaa` | Merge commit. |

## The review finding: a constraint is a claim about the code, not just the data

`NOT VALID` was the centrepiece of `019`'s design, and it was reasoned about
correctly but incompletely:

> `NOT VALID` exempts existing **rows**. It binds every new **write**
> immediately.

So a constraint the *running application* violates is a 500 on the next
request, not a migrate-job failure — and `NOT VALID` offers no protection from
that whatsoever. Two of the six constraints described a stricter product than
the code implemented.

**`POST /findings/{id}/re-alert` would have returned 500 on every call.**
`findings.py:357` set `status='open'` and left the disposition in place. The
route only accepts findings in status `acknowledged`, and per `status_map` that
is reachable only via `disposition='acknowledge'` — so the disposition is
always set, always left set, and `ck_findings_open_is_undecided` always fires.
**That is the Park half of the loop**, in production, on the first request
after the migrate job.

**And the obvious fix is also wrong** — this is the part worth carrying
forward. Clearing the disposition alone trips the *other* new constraint:

```
SET status='open'                                → ERROR: ck_findings_open_is_undecided
SET status='open', disposition=NULL              → ERROR: ck_findings_decision_whole
SET status='open', disposition=NULL,
    disposition_at=NULL, disposition_by=NULL     → UPDATE 1   ✓
```

The three decision columns move together or not at all. Semantically that is
right anyway: a re-alerted finding is back to needing a decision, so the one
that parked it is spent.

**Second, smaller:** `POST /findings/{id}/disposition` accepted `abandon` with
no reason — `DispositionRequest.reason` is `Optional` and only disposition
membership was validated — which `ck_findings_dismissal_has_reason` now
refuses. Rejected before the write, so it is a 400 rather than an unhandled
write error.

Two nits also fixed in `019`: the two append-only tables were granted `UPDATE`
and `DELETE` that their own trigger refuses, so they now get `SELECT, INSERT`
only; and the grants comment claimed to cover `shared`, which `018` grants
itself.

**The lesson, and it is the companion to "a clean parse is not a clean
apply":** adding a constraint without reading every writer moves the failure
out of the migration and into the running product, where it is far harder to
see. Both bugs were invisible to the mirror test that "proved" `019` safe last
session, because that test planted rows — it never replayed what the app does.

## What checked out, so it is not re-derived

- The `000` fix is correct, `format('%I', current_database())` included.
- **No `CREATE INDEX CONCURRENTLY` anywhere**, which matters: `runner.py:61`
  wraps each file in a single `conn.transaction()`, where it would be illegal.
- FK types line up — findings/users `UUID`, the four `shared` dimensions
  `BIGINT`.
- The `disposition` and `status` enums match `status_map` exactly; `severity`
  only ever receives `'high'`/`'medium'` anywhere in the app, both allowed.
- **`disposition_by` is already a UUID FK to `fpa_users` in production** — not
  the display name the mock carries, which is what the last handoff observed in
  the loop demo. `ck_findings_decision_whole` is satisfiable as written.
- `018` grants `USAGE` + DML on `shared` itself (lines 717–732), so there was
  never a grant gap there.

## Verification

- Full `000` → `019` applies clean to a **fresh** database with the amended
  `019` (`001_auth_and_rag.sql` skipped locally — pgvector has no PG16 build on
  Homebrew).
- Both bugs reproduced against `rewive_prod_mirror`, which already carries the
  constraints, by replaying the app's own SQL verbatim.
- The whole loop replays clean after the fix: raise → Park → re-alert →
  decide again.
- Grants land as intended (`INSERT,SELECT` on the two append-only tables).
- `backend/tests/test_loop_hardening_constraints.py` — six assertions in the
  repo's existing dependency-free style (static assertions over the migration
  files, no database). **Reverted against the pre-fix router it fails on
  exactly the two bugs**, which is the only reason to believe it is worth
  anything.

**On running the backend suite locally:** 8 tests fail collection with
`TypeError: unsupported operand type(s) for |`. That is this machine's Python
3.9.7 against the app's `python:3.11-slim` target, it reproduces identically on
untouched `main`, and it is not worth diagnosing again. The file-only tests
(the ones that don't import `app`) run fine on 3.9.

## Notion

**P1.8** updated: PR marked merged with both commits, the review finding
written up in the body, `Commits` carrying `a1d8eaa`. **Status deliberately
left `In progress`** — merging deployed nothing, and this item's own stated
convention is that Done means it has actually run.

## The contract suite, run against production for the first time

The premise in the architect skill — *"the production API should pass this
suite unmodified; that is what lets a frontend ship unchanged"* — had never
been tested. It has now. **It does not hold, and the gap is structural rather
than cosmetic.**

```
CONTRACT_BASE_URL=https://rewive-americana-dydwe2btf4brfsad.z02.azurefd.net/api \
CONTRACT_MUTATIONS=0 CONTRACT_INDUSTRIES=fmcg npm run test:contract
→ 1 of 26 passed
```

Read-only, per `contract/README.md`'s own rule for shared targets. **The base
path is `/api`, not `/api/v1`** — production has no version segment at all, so
the suite's default URL was wrong before any test ran.

### The failures, separated — "25 failed" on its own is misleading

Probing each endpoint unauthenticated splits them into two very different
categories:

**Exists, auth-gated (9, all 401):** `/industries`, `/org-profile`,
`/auth/login`, `/kpi-brain`, `/shadow-org`, `/findings`, `/closure-kpis`,
`/notifications`, `/pl-statement`. **Their behaviour is untested** — not
failing, unknown. This is why the result below is a floor on the divergence,
not a full picture.

**Missing entirely (13, all 404):**

| Group | Endpoints | Reading |
|---|---|---|
| **Decision Ledger** | `/decisions`, `/decisions/stats` | **The real gap.** No decision route exists in the backend under any name — checked; `/api/audit-log` is a generic audit trail, not a ledger with verdicts and provenance. The product's namesake surface has no production endpoint. |
| Live tracking / sweep | `/tracking-configs`, `/sweep-history`, `/sweep-progress`, `/agent-sweep`, `/metrics` | Production derives findings from `fpa_alerts`; there is no metric-ingest → drift-rule pipeline at all. |
| Evidence layer (P1.6) | `/ledger/events`, `/ledger/verify` | Built here *after* the backend, demo-grade by CLAUDE.md's own label. |
| Loop engine (P1.5) | `/loop-timers` | Same. |
| Control plane (P1.4) | `/control-plane/*` | Same. |
| Front door | `/tenants/resolve` | Arguably *should* 404 — production is one dedicated environment per customer, so tenant resolution has no job there. |

**Roughly half the 404s are not defects** — they are P1.4/P1.5/P1.6 features
this repo built after the backend and already labels demo-grade. Do not report
them as production gaps without that qualifier. The Decision Ledger is a
different matter.

### The blocker underneath all of it

Production's `LoginRequest` is **`{email, password}`**. The contract's
`login()` sends `{email, tenantId, industry, seat}` and expects `{token}`.
That is not a prefix mismatch: **the contract's model, where tenant and lens
live inside the token, does not exist in production.** Every authenticated test
dies there, which is why only one passed.

The one that did pass — *"a JWT-shaped but invalid bearer is refused with
401"* — is a genuine point of agreement on the auth seam, and the only thing
verifiable without a credential.

### To go further

An Americana credential is needed, and none was available. With one, the 9
auth-gated endpoints become testable and the picture stops being a floor.

## Still open

1. **The migrate job has never run.** Everything else below is downstream of it.
2. **The `NOT VALID` constraints still need validating.** They bind new writes
   the moment they land but have never inspected an existing row. Audit queries
   in section 6 of `019` first — a non-zero count is real customer data to
   decide about, not a schema problem — then `VALIDATE CONSTRAINT` per
   constraint.
3. **No backfill.** Nothing maps free-text `persona`/`entity`/`region` onto the
   new dimension rows, and nothing populates `period_id` / `owner_seat_id` /
   `entity_id` / `region_id` on existing findings. Needs Americana's own
   vocabulary.
4. **"Four contract domains have no production tables" needs revisiting — it
   is at least partly wrong.** It has been carried unchanged for two sessions.
   `fpa_tasks` is plainly there in `rewive_prod_mirror`, and `/api/tasks`,
   `/api/solutions` and `/api/agent-specs` all exist as routers. Someone should
   re-derive that claim against the real schema rather than carry it again;
   what is *actually* absent is a separate question from what was assumed to
   be.
5. **The contract suite has now run against production — the authenticated
   half remains.** Result and analysis above. What is still needed is an
   Americana credential, which unlocks the 9 endpoints that could only be
   observed returning 401. Until then the divergence measured is a floor.
6. **Decide what the contract suite is *for*, now that production visibly
   fails it.** Two honest readings, and they lead to different work: either the
   backend is brought to the contract (large, and the auth model is the hard
   part), or the contract is re-scoped to describe the subset production is
   actually expected to serve, with the demo-grade surfaces marked as such.
   Right now the suite asserts both at once, which is why a single number out
   of it (`1/26`) is not very meaningful. **This is a product decision, not a
   cleanup.**
7. **The loop demo has never been run on screen.** Driven through the API two
   sessions ago; no visual walkthrough and no GIF exist.
8. Carried, unchanged: `rewive-infra` PRs #1–#4 all open and MERGEABLE, the
   `diag-cae-*` cleanup, `ARCH-001` Entry 02's supersession banner,
   `ARCH-GTM-001` is cited by ID in 13 files and is a file in none, and nobody
   has said what `rewive-studio` is.

## State at close

Nothing is running locally — no mock server, no Vite. **The Americana C&S org
from the previous session is gone** (it was in-memory); rebuilding it is the
four-step sequence in the previous handoff, and note that the rebuild script
alone is not enough.

**PostgreSQL 16 databases on this machine**, all surviving the session:
`rewive_dev` (the dimensions), `rewive_prod_mirror` (000–017 + planted
violating rows + 018/019, and now the constraints), `newcustomer`,
`fresh_customer` (empty), and **`reviewtest`** — new this session, the
fresh-database apply of the merged series. `platform-schema/README.md` carries
the rebuild commands.

**Nothing in Americana production was mutated.** The contract run was
`CONTRACT_MUTATIONS=0` and every probe was a GET; the only writes anywhere this
session were to GitHub and Notion. The captured run output is in the scratchpad
and **will vanish** — the analysis above is the durable copy, and re-running it
costs one read-only pass.

The `rewive-fpa` clone is in the scratchpad and **will vanish** — re-clone.
Pushing worked first attempt this session, which is worth knowing only because
it means the flakiness is intermittent rather than gone; retry two or three
times before diagnosing.

`az` remains authenticated as Owner; read-only checks only. `terraform apply`
has still never run from this machine, and per the infra doctrine it runs in
Cloud Shell. `Architecture.png` is still deliberately untracked.

---

# Previous handoff — the backend repo opens, and two of our own assumptions turn out to be wrong (2026-08-13, later)

## The one thing to act on

**`rewive-fpa` PR #1 contains a fix for a bug that blocks provisioning any new
customer environment.** `backend/migrations/000_bootstrap_app_role.sql`
hardcoded `GRANT CONNECT ON DATABASE fpa_code`, and `fpa_code` was **dropped in
the 2026-08-12 production cutover**.

Americana never saw it: `000` is already recorded in `schema_migrations` there
and never re-runs. But a new customer environment applies **every** migration
from `000` against a fresh database, so the very first file raises
`ERROR: database "fpa_code" does not exist`, aborts its transaction, and fails
the whole migrate job.

**This blocks `rewive-infra` PR #2 (the Americana C&S environment).** That PR
is greenfield and `terraform validate` clean, so it would have applied
successfully — and then the migrate job would have failed, in an estate that
(PR #1 still unapplied) **produces no container logs at all**. That is exactly
the blind-estate failure the previous handoff warned costs a session to
diagnose.

Reproduced locally against a fresh database, fixed with `current_database()`,
and verified. The fix is independent of the other two migrations in the PR and
can be cherry-picked.

**Standing sequence, now with a third step:** apply `rewive-infra` PR #1
(logging) → merge/deploy the backend `000` fix → only then apply PR #2.

## What was delivered

**`sanjuveed-debug/rewive-fpa` PR #1** — three migrations, open, not merged,
**nothing applied** (merging deploys nothing; the migrate job is a separate
step):

| File | What it does |
|---|---|
| `000_bootstrap_app_role.sql` | The blocker above, fixed. |
| `018_platform_dimensions.sql` | The `shared` schema — 14 dimension tables. `shared-dimensions.sql` from this repo, verbatim design. |
| `019_loop_hardening.sql` | Strictly additive: `fpa_periods`, `fpa_user_sessions`, `fpa_finding_comments`, `fpa_finding_escalations`, `fpa_finding_leadership_actions`, nullable dimensional columns on `fpa_findings`/`fpa_users`, and six `NOT VALID` CHECKs on `fpa_findings`. |

In this repo, on `v5`, all pushed (`db45c09` → `888afcf`):

| Commit | What |
|---|---|
| `bb006f8` | `fpa-core.sql` + its constraint suite, and the first execution of any of this DDL. |
| `d1e006e` | `fpa-loop.sql` + suite; the append-only/cascade collision found by running it. |
| `31c0802` | `shared.agent` gains `temperament` / `last_sense_sweep_at`; derived agent-health view. |
| `fa20cec` | The reconciliation: `fpa-core.sql`/`fpa-loop.sql` and both suites **deleted**, `platform-schema/README.md` rewritten, `CLAUDE.md` corrected in three places. |
| `888afcf` | The org-reset procedure corrected, and the loop demo recorded. |

Note the shape of that: `bb006f8`–`31c0802` built a model that `fa20cec` then
deleted. The deleted design is preserved at `31c0802` and the reasoning is in
"The two assumptions that were wrong" below — it is worth reading before
rebuilding anything like it.

**Notion:** Build Tracker item **P1.8** updated (`Platform data model — the
customer's dimensions and the loop, as rows`) with the PR link, both
corrections, and the provisioning blocker. Its `Commits` field carries
`rewive-fpa PR #1 (918d4bd)` plus the five above. P1.7 was NOT touched, though
the `000` blocker arguably belongs there too — it is an Azure-provisioning
defect, not a data-model one.

## The two assumptions that were wrong

Backend access was granted mid-session. Reading `rewive-fpa` overturned two
things this repo had been asserting for three sessions. Both are worth not
re-deriving.

### 1. "The operating model has no tables" described the MOCK, not production

Production has had `fpa_findings`, `fpa_brain_nodes`, `fpa_brain_edges`,
`fpa_users`, `fpa_shadow_agents` and roughly thirty more **since migration
002**. The architecture review written earlier in this session said the
operating model and findings had no tables anywhere; that was true of
`mock-server/`, which was the only thing visible at the time, and false of the
deployed product.

Acting on it, an `fpa-core.sql` / `fpa-loop.sql` pair was written here first —
a clean model of the loop from scratch (`fpa.finding`, `fpa.brain_node`,
`fpa.mandate`, `fact_measure` with its grain CHECK). **It would have landed as
a second, parallel findings model beside the live one.** Deleted rather than
kept, so the repo does not hold DDL that must never be applied.

The replacement is additive and much smaller: harden what exists, add only what
is genuinely absent.

**The lesson: a model built against the demo is a model of the demo.** The gaps
it found were real — every one was confirmed in the production schema — but
their *shape* was wrong until the real thing was read.

### 2. The `sales_excellence` blocker is mostly not there

`backend/migrations/americana/001_domain_schemas.sql` says plainly what those
schemas are: `sales_excellence` and `sales_staging` are created
`AUTHORIZATION praveen` and granted `USAGE, CREATE` to that collaborator.
**No migration creates a single table in either.** They are a colleague's
workspace namespace, not a rival model of customer dimensions.

And `shared` **already exists** in the Americana database, owned by
`rewive_admin`, with no table ever created in it — so `018` lands with zero
name collisions.

Two sessions treated this as the hard gate on the entire platform schema. It
was not. Remaining honest caveat: tables may have been created inside
`sales_excellence` by hand and still cannot be enumerated without production
database access — but they are a separate namespace and cannot collide by name.

## The gaps, confirmed against the real schema

Everything the review claimed was wrong with the model held up — `fpa_findings`
is a near-literal transcription of the demo's TypeScript interface, weaknesses
included:

- `persona`, `entity`, `region` are free text with no foreign keys, at mixed
  grain.
- **Both `sla_hours_remaining NUMERIC` and `sla_deadline TIMESTAMPTZ`** — two
  representations of one clock, free to disagree.
- No constraint ties `disposition` / `disposition_at` / `disposition_by`
  together, so a decision can be recorded without a decider.
- `evidence` is JSONB; there is no impact-path, escalation-trail or
  leadership-log table at all. `escalation_level` counts transfers but records
  none of them, so nothing can answer "who was holding this on the 12th".
- `fpa_users` has `role VARCHAR(50) DEFAULT 'Viewer'` flat on the login, no
  person/seat model, no OIDC subject — consistent with `oidc_*` still empty in
  both Terraform environments.
- `fpa_task_comments` hangs off **tasks**, so the decision record — the finding
  — had nowhere to hold discussion.
- **No time dimension anywhere in 17 migrations.**

## Why every new constraint is `NOT VALID`

Americana carries real rows. A plain CHECK scans the table and fails the
migrate job outright if any legacy row violates it — and with no container
logs, that failure would be invisible.

`NOT VALID` binds every INSERT and UPDATE from the moment it lands and does not
inspect existing rows. Validation becomes a separate decision taken with the
numbers in hand (`ALTER TABLE ... VALIDATE CONSTRAINT`, which takes only a
`SHARE UPDATE EXCLUSIVE` lock and blocks neither reads nor writes). The audit
queries that count violations first are in section 6 of `019`.

**Proven, not asserted.** Rows were planted in a mirror to violate every new
constraint; `018` and `019` applied without error, the bad rows survived
untouched, new writes with the same defect were refused, and `VALIDATE`
correctly refused while the legacy rows remained.

## Verification, and what it cost to get it

`brew install postgresql@16` — PostgreSQL 16.14, the production major version.
This is what turned three sessions of "parses cleanly" into evidence.

- **New-customer path:** a fresh database applies `000` → `019` cleanly. On
  `main` it fails at `000`.
- **Upgrade path:** the mirror above.
- `001_auth_and_rag.sql` is skipped locally — `pgvector` has no PostgreSQL 16
  build on Homebrew (17 and 18 only). Untouched by the PR.

**The first execution of `shared-dimensions.sql` found a bug in thirty seconds
that two sessions of parse-checking had not.** `v_role_ancestry` had **two**
recursive branches — solid line and dotted line. PostgreSQL permits exactly
one, and with three `UNION ALL` arms reads the first two as the non-recursive
term, rejecting the second arm's reference to `walk`. Grammar-valid,
apply-fatal: it would have failed inside the migrate job in Azure. Fixed by
unioning the two edge kinds into an edge set first and walking that once.

A second design bug came out of the constraint suite rather than the DDL:
`ledger_event.finding_id` was `ON DELETE SET NULL` on a table with an
append-only trigger — and `SET NULL` is an UPDATE, so deleting a finding failed
from inside the cascade. Two correct features colliding. Resolved as *a finding
whose decisions are on the record cannot be deleted*.

**A clean parse is not a clean apply.** Standing rule now, with two findings
behind it.

## Where migrations actually live — settled, by reading

- `sanjuveed-debug/rewive-fpa` ("Rewive FP&A Platform — FastAPI + Next.js"),
  `backend/migrations/NNN_name.sql`.
- `runner.py` applies them in **filename order, once each**, recorded in
  `schema_migrations`, **each in its own transaction**, connecting as the
  admin/schema-owner role — never `rewive_app`.
- `MIGRATION_SET` selects a subdirectory; `americana/` is a per-customer set.
- `rewive-infra` has no `migrations/` directory and never did.

The long-inherited name `migrations/005-platform-schema.sql` was wrong on every
count: wrong repo, wrong directory, wrong numbering, wrong separator.

## Access, for the next session

`gh` is authenticated as **`rianpraveen`**. Two invitations were pending and
**had to be accepted** before anything was visible — `gh repo list` showed
nothing new until then:

```bash
gh api user/repository_invitations --jq '.[] | .id, .repository.full_name'
gh api --method PATCH user/repository_invitations/<id>
```

Now visible: `rewive-fpa` (the backend, private), `rewive-frontend-v5`
(private), `rewive-infra`. **The backend is `rewive-fpa`, not
`rewive-fpa-backend`** — that name appears in older notes and does not exist.

Note also that the backend repo holds a `frontend/` directory (Next.js)
alongside `backend/`. This repo is a **separate** React/Vite frontend; do not
assume the two are the same application or that a change here reaches the
deployed UI.

**Pushing was flaky and it is not a permissions problem.** `git push origin v5`
was rejected twice — once `Internal Server Error`, once a bare `failure` — and
succeeded on the third identical attempt, with no change in between. It did
this on two separate pushes this session. Retry two or three times before
diagnosing anything; the office-network interference noted in earlier sessions
presents exactly like a real error, and `gh auth status` will keep reporting
everything healthy throughout.

## Still open

1. **No backfill.** Nothing maps the existing free-text `persona` / `entity` /
   `region` values onto the new dimension rows, and nothing populates
   `period_id` / `owner_seat_id` / `entity_id` / `region_id` on existing
   findings. That needs Americana's own vocabulary and was deliberately not
   guessed at inside a schema migration.
2. **Four contract domains have no production tables**: Execution
   (runs/tasks/outcomes), agent-building (specs/studio/catalog), connector
   definitions, and Business Context (SKUs/customers/divisions). The last is
   `sales_excellence` territory and needs the customer's real data model.
3. Carried, unchanged: `rewive-infra` PRs #1–#4 all open and MERGEABLE, the
   `diag-cae-*` cleanup, `ARCH-001` Entry 02's supersession banner,
   `ARCH-GTM-001` is cited by ID in 13 files and is a file in none, and nobody
   has said what `rewive-studio` is.
4. **The loop demo is no longer unrun** — see below. What remains is running it
   *on screen*: the Chrome extension was not connected, so it was driven
   through the API instead. No visual walkthrough and no GIF exist yet.
5. **PR #1 is not reviewed, not merged, not applied.** Merging deploys nothing;
   the migrate job is a separate step, run from Cloud Shell. Nothing in this
   session touched a live database.
6. **The `NOT VALID` constraints still need validating.** They bind new writes
   today but have never inspected an existing row. Run the audit queries in
   section 6 of `019_loop_hardening.sql` against Americana first — if any
   return non-zero, that is real customer data to decide about, not a schema
   problem. Then `ALTER TABLE fpa_findings VALIDATE CONSTRAINT <name>;` per
   constraint.
7. **The contract suite has never run against the production API.** This is now
   the obvious next verification and it did not exist as an option before this
   session, because the API was not visible. `contract/` runs against any base
   URL via `CONTRACT_BASE_URL`, and the whole premise of the contract-as-asset
   is that the production API passes it unmodified. Expect failures — the
   backend was built to the same contract but nothing has ever checked that
   claim. Doing this would answer "does the backend support the views?"
   properly, where this session could only answer it by reading schemas.

## The loop demo, run end to end on Americana C&S

Driven through the real endpoints, so it exercised the actual pipeline rather
than the screens. The org has since been reset, so this is a record of what
happened, not of current state.

**Sense** — the first sweep returned `nodesEvaluated: 0, skipped: true`. That
is correct, not a failure: all five mandates already carried an open finding
and the double-raise guard refuses to re-raise drift already on someone's desk.

**Find** — took *E-commerce gross sales at AED 9.1M vs AED 12M*, raised by the
Commercial agent on `threshold_breach`, 24.2% adverse, with **2.6 hours left on
its SLA**.

**Decide** — Accept, with a reason. A recovery target was created
automatically: *"back within 4% of AED 12M for 3 consecutive readings."*

**Act → Close** — four recovered readings posted through the ingest API
(11.2 → 11.6 → 11.9 → **12.1M**); the next sweep advanced the recovery target
to 100%; closing it flipped the finding to `closed` with an assessor verdict of
**worked**. `GET /ledger/verify` stayed `ok` throughout, ending at
`checked: 16`.

### Three things it surfaced

1. **Closing is a deliberate act, not automatic.** `sweep.js` only ever updates
   `current` and `progressPct` — nothing in the sweep sets `status = 'closed'`.
   That happens in `POST /closure-kpis/:id/close` (`app.js:2357`), which the
   Close button calls, and which also closes the finding and writes the
   assessor verdict. So a recovery target sits at 100% indefinitely until a
   person confirms it. Defensible under the doctrine — a human confirms the
   number is back — but it reads as a stuck loop until you know. Whether the
   agent *should* auto-close at 100% is a live product question.
2. **The identity gap showed up in the running product.** The same decision was
   recorded two ways: the ledger event carried the token's `sub`
   (`ops@americana-cs.example`) while the finding row carried
   `dispositionBy: "Kumara Vijayan"`, a display name. Exactly what
   `019_loop_hardening.sql` binds to a real person.
3. **Display and evidence are written by different paths at close.** The close
   route sets `finding.assessorVerdict` inline but does not call
   `appendVerdictEvent`; the ledger's `verdict` event comes from the separate
   assessor pass (`app.js:1437`), which runs inside ledger reads. The Decisions
   screen shows the verdict correctly, so the effect is cosmetic — but it is a
   seam worth confirming rather than assuming.

Two API details that cost time and are not obvious: metric ingest wants
**`X-API-Key`** (`X-Ingest-Key` silently 401s), and findings only exist after a
sweep — a freshly rebuilt org has an empty queue.

## Servers / state at close

Mock API on :4000 and Vite on :5173, both restarted clean at the end of the
session. **The Americana C&S org is live in memory** — `custom-org`, 7
mandates, 5 live-tracked, **5 open findings** on `sales_supervisor`, all with
full SLA clocks (4h critical, 8h high). Sign in at
`http://localhost:5173/login?org=custom-org` (any password) **as Sales
supervisor** — a COO lens is empty until something escalates.

### Resetting the org — the script alone is NOT enough

`python3 scripts/rebuild-americanacs-org.py` rebuilds the **org**. It does not
touch the **tracking store**, and those are different things: metric points,
live findings and recovery targets survive a re-commit. Running the loop demo
then re-running the script leaves the org looking rebuilt while e-commerce
still reads the recovered `12.1 / 12` with 34 points and the closed finding is
still sitting there. Verified the hard way this session.

A real reset restarts the mock server first, so in-memory tracking state dies
with the process:

```bash
# 1. stop everything. concurrently RESPAWNS vite, so kill the parent, and note
#    that a browser tab holding :5173 makes the port look occupied after the
#    process is gone — check the pid owner, not just the port.
pkill -f "node.*concurrently" ; pkill -f "node.*bin/vite" ; pkill -f mock-server
for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p) 2>/dev/null; done

# 2. start clean
npm run dev:all

# 3. rebuild the org (in-memory: it starts with zero findings)
python3 scripts/rebuild-americanacs-org.py

# 4. raise the queue — findings only exist after a sweep
curl -s -X POST http://localhost:4000/api/v1/agent-sweep
```

Expect afterwards: e-commerce back at `9.1 / 12` with 30 points, five open
findings, zero closures, zero decisions, and `GET /ledger/verify` reporting
`checked: 0` at `rewive-ledger-genesis`. If any of those are non-zero the
tracking store did not actually clear, and step 1 did not do what you think.

Note the sweep reports `nodesEvaluated: 23` and raises ~15 findings — it walks
every industry's tracked mandates, not just C&S, which keeps its own five.
`authoredByClaude: 0` is correct and expected: there is no `ANTHROPIC_API_KEY`
in this environment, so the deterministic template fallback writes the finding
narratives. A sweep never fails because authoring failed.

**PostgreSQL 16 is now installed system-wide** (`brew services start
postgresql@16`), with roles `rewive_app` / `rewive_admin` and three databases:
`rewive_dev` (the dimensions), `rewive_prod_mirror` (000–017 plus the planted
violating rows), and `newcustomer` (the fresh-provisioning test). Unlike the
scratchpad, these survive the session. `platform-schema/README.md` carries the
commands to rebuild them.

A clone of `rewive-fpa` sits in the scratchpad and **will vanish** — re-clone
rather than looking for it. `az` remains authenticated as Owner; read-only
checks only, `terraform apply` has never run from this machine.

`Architecture.png` is still deliberately untracked.

---

# Previous handoff — the customer's dimensions become rows, and the record catches up with live Azure (2026-08-13, earlier)

## What was built

`platform-schema/` at the repo root — the `shared` schema, the customer's
initial dimensions: **14 tables, 66 statements**, plus a worked configuration
for Americana C&S and the checker that validates both.

**It is not applied.** Never executed against any database, live or local; not
wired into `npm run migrate`; not in `mock-server/migrations/`. It **stays
blocked on the same thing as the previous session's work** — reconciliation
with `sales_excellence` / `sales_staging` in the live Americana database, which
still cannot be inspected from here. A clean parse is not a clean apply.

**Correction to the previous entry: it does not land in `rewive-infra`.** Once
the network cleared, that repo was read directly rather than assumed. It has
**no `migrations/` directory** — root is `.claude`, `.gitignore`, `README.md`,
`environments/`, `modules/`, pure Terraform. The migration job
(`azurerm_container_app_job.migrate`) runs the **backend** image,
`rewive-backend:${var.backend_image_tag}`, with
`command = ["python", "-m", "migrations.runner"]`. So migrations are a Python
package inside the FastAPI backend (`rewive-fpa-backend`), and this DDL must be
adapted to whatever that runner expects. The inherited name
`migrations/005-platform-schema.sql` is therefore **doubly unverified** — wrong
repo, and a numbering convention nobody has checked. The backend repo is not
visible under the account in use (`sanjuveed-debug` holds only `rewive-infra`,
`bloom-juniors`, `rewive-frontend-v4`, `rewive-frontend-v2`), so confirm there
before renaming anything to fit a guess.

This replaces the lost `rewive-platform-schema.sql`. **The previous session's
scratchpad vanished exactly as that handoff predicted**, taking the 35-table
draft, `verify-americana-logs.sh`, `baseline-before.txt` and the pglast venv
with it. The artifact
(<https://claude.ai/code/artifact/3bff3bca-396e-4ea1-a16a-14eb91a1a15a>)
preserved the *narrative* — the marginals lesson, the schema layout, the
decisions — but **not one line of the SQL**. Hence this is in the repo, not the
scratchpad. Treat that as the standing rule: an artifact is not a backup.

## The founder decisions this session

| Question | Call |
|---|---|
| How far do "people" go? | **Template roles + real people.** Roles stay reference data per template; `person` and `seat` are real, and a seat is a person holding a role in an org unit for a period. A customer configures *who holds what*, not their own reporting line. |
| Rollup shape | **Adjacency** — `parent_id` self-FK, one pattern for every dimension, arbitrary depth, cycles blocked by trigger. Not fixed levels, not a closure table. |
| Where it lands | Written here, ready to land in `rewive-infra`. **Nothing applied.** |

## What the current-state map turned up

Before designing anything, the existing model was mapped. Three findings shaped
the work and are worth not rediscovering:

1. **The customer's business units are baked into the persona enum.**
   `protein_*`, `gi_*`, `fnv_*`, `ambient_*` are hardcoded role ids in two
   mirrored files (`mock-server/roles.js`, `src/screens/CommandCenter/personas.ts`).
   So "configure their business" is not a data operation today — a new
   customer's divisions need a code change. `BusinessDivision` exists as a type
   but is display-only seed copy, and onboarded orgs get `divisions: []`.
   `shared.org_unit` is where that finally becomes a join.
2. **Region is flat free text at mixed grain in one column.** The seeds carry
   `'GCC'`, `'UAE'`, `'Dubai'`, `'Sharjah & Northern Emirates'` and `'All'`
   side by side, and every rollup is a string `GROUP BY` that silently skips
   blanks. Nothing knows Dubai ⊂ UAE ⊂ GCC.
3. **Multi-entity orgs already collapse silently.** Onboarding collects a list
   of entities but `onboarding.js:480-481` assigns `entities[0]` to *every*
   tracked mandate — a customer with four legal entities gets a single-entity
   rollup and no error.

## Two things in the schema worth knowing before extending it

- **The seat exclusion constraint is the doctrine, enforced by Postgres.**
  `EXCLUDE USING gist (role_id WITH =, org_unit_id WITH =, validity WITH &&)`
  — one holder per role per org unit at any instant. Job-sharing a mandate is
  refused by the database, not by convention. Needs `btree_gist`.
- **`shared.dim_alias` uses an exclusive arc, not a polymorphic `target_id`** —
  five nullable typed FKs with `num_nonnulls(...) = 1`, so every alias keeps a
  real foreign key. A polymorphic target lets an alias outlive the row it
  points at, which is how ingestion starts misrouting quietly. The alias table
  is also the migration path for every existing free-text `entity`/`region`.
  Note the seed value `'All'` is deliberately **not** aliased: it is the
  absence of a slice (`grain='total'`, `region_id NULL`), and mapping it to a
  row would recreate the 496-vs-124 error by making the headline look like a
  fifth region.

## Found and fixed mid-build

**`shared.role` had no cycle guard.** The generic trigger walks by `id`, but
role's hierarchy is keyed by `key`, so it could not be reused — leaving
`v_role_ancestry`, a recursive CTE, able to spin forever on a cycle in the
escalation line. It now has its own statically-typed guard
(`assert_no_role_cycle`). The generic function was deliberately *not*
generalized to cover it: a text-cast comparison would quietly lose citext's
case-insensitivity, and a cycle that slips through does not raise — it hangs.

**`v_role_ancestry` can return the same pair twice**, once solid and once
dotted. Correct as ancestry, lethal as a rollup — joining a fact to it without
`DISTINCT` double-counts in exactly the way summing marginals does. Documented
in place. The four dimension ancestry views cannot duplicate (single parent,
single path) and need no such care.

## Verification — and its limits

Both files parse against the **real PostgreSQL grammar** (libpg_query via
`pglast` 8.4), no forward foreign keys. **The checker was proven to fail** on a
deliberate forward FK and a deliberately broken PL/pgSQL body, and to correctly
pass a self-FK — a checker that always passes is worse than none. If you change
`validate-sql.py`, re-prove those.

Two honest caveats:

- **pglast 8.4's `parse_plpgsql` cannot deserialize its own successful output.**
  Every body raises `JSONDecodeError`, including `BEGIN RETURN NEW; END`. The
  parser itself is fine — a real syntax error still raises `ParseError`. So
  `ParseError` is a failure and `JSONDecodeError` is a pass. Encoded explicitly
  in the script rather than swallowed.
- **Highest runtime risk: `assert_no_cycle` reads NEW's parent column
  dynamically** — `EXECUTE format('SELECT ($1).%I', parent_col) ... USING NEW`.
  Standard idiom, parses clean, **never executed**. If anything fails on first
  write, expect it there. Check 2 in the worked example exercises it; it must
  *raise*, not hang.

The Americana C&S example is marked `[EVIDENCED]` vs `[ILLUSTRATIVE]` line by
line. BU, channel, category and the Abu Dhabi key come from the real MTD work;
the region tree above Abu Dhabi, the legal entities and **every person are
invented**. No person in it is real — do not ship it as customer config.

## The network — blocked, then cleared mid-session

For the first half, `gh` and `git push` both died with
`x509: "*.github.com" certificate is not trusted` / `SSL certificate problem`
— the recurring FortiGate interception. That meant the `architect` skill's
first checklist item, *"have you read the `rewive-infra` README this
session?"*, **could not be satisfied**, so work was deliberately confined to
app-layer DDL, which does not depend on it.

**It cleared on the founder's prompt, and the block is intermittent — it came
back once mid-task and cleared again.** Everything is now pushed. Reading the
infra repo the moment it cleared immediately caught the wrong destination
recorded above, which is the argument for reading it early rather than
working from inherited notes.

Still true regardless of network: **no local Postgres, no Docker, no `psql`**
on this machine — hence parse-only validation of the DDL.

## Housekeeping

- The three artifacts were first written into `docs/architecture/`, which was
  **wrong** — `docs/` is an Obsidian vault of numbered markdown documents with
  frontmatter, one file per document. Raw `.sql`/`.py` broke that convention,
  so they were moved to `platform-schema/` with a README stating status.
- **Not done, offered:** an `ARCH-005` numbered document for the platform data
  model. Deliberately not written unasked — the repo's convention is that docs
  describe what deploys, and this does not deploy yet.

## rewive-infra PR #3 — the `terraform fmt` drift, raised and mergeable

<https://github.com/sanjuveed-debug/rewive-infra/pull/3> ·
`chore/terraform-fmt-drift` · commit `b90ca3a` · **+5/−5 across 3 files**.
Closes the carried item. `terraform fmt -check -recursive` was failing on
`main` — the README's *own first pre-apply step*, so the documented preflight
broke before `init` was ever reached.

Whitespace only: `patterns_to_match` over-indented in both `front_door.tf`
route blocks, two trailing comments misaligned in `redis.tf`'s
`default_database`, and `min_tls_version` over-indented by one in
`storage.tf`. **`git diff -w` is empty — that is the proof**, and it is also
why `terraform validate` was not re-run: a whitespace-only diff cannot change
its result, so re-deriving it would have downloaded the provider to learn
nothing.

**Nothing touches Azure** — `fmt` is a local formatter, no plan, no apply, no
state read. Run with Terraform **v1.15.8** (darwin_arm64), which satisfies the
repo's `required_version = ">= 1.7.0"`. `fmt -check` passes clean afterward.

**No conflict with the in-flight PRs**, checked rather than assumed: #1 touches
`container_apps.tf`, #2 touches `environments/americanacs/*`, and neither
overlaps these three files. #2's own files were confirmed `fmt`-clean when it
was raised, so merging it will not reintroduce drift. PR #3 can merge in any
order and **does not disturb the standing rule that #1 is applied before any
new environment apply.**

## rewive-infra PR #4 — two stale README claims, corrected against live Azure

<https://github.com/sanjuveed-debug/rewive-infra/pull/4> ·
`docs/readme-region-and-acr` · commit `df30724` · **+22/−5**, documentation
only. Both claims were **checked with `az` against the live subscription**,
not carried forward as assertions.

1. **The "Resolved" list still said `Region: East US`** while the bug list
   below it correctly recorded the move to East US 2. A reader hitting the
   bullet first and stopping got the wrong region. Verified live:
   `rg-rewive-dedicated-americana` and `rg-rewive-tfstate` are **eastus2**,
   `rewive-fpa-rg` (Nesto) is **eastus**. The UAE North reasoning is unchanged
   — still correct, still worth not relitigating.
2. **Open item 2, `acr_resource_group_name` "an assumption"** — `az acr list`
   returns `rewivefpa` in `rewive-fpa-rg` (Basic, eastus,
   `rewivefpa.azurecr.io`). The default is correct; marked resolved with the
   same `~~strikethrough~~` convention as items 1, 6 and 7.

**The same stale caveat also lived in code** — `environments/americana/
variables.tf`'s own `description` said "not independently re-verified against
live Azure state". Fixing only the README would have left the repo
disagreeing with itself. `environments/americanacs/` (PR #2) already carried
the verified wording, so nothing was needed there.

**A trap worth remembering: the README has mixed CRLF and LF line endings.**
A first attempt edited it with Python in text mode, which normalized
everything to LF and produced a **190-insertion/175-deletion whole-file
rewrite** for a six-line change. Redone at byte level preserving each line's
own terminator. Check `file README.md` before editing that file.

## The Americana C&S org, rebuilt — and `build-cs-mtd.mjs` is gone for good

`build-cs-mtd.mjs` only ever lived in a session scratchpad and **has now been
lost twice**. It is not recoverable. The org was rebuilt through the
onboarding factory instead, and that script is now **in the repo** as
`scripts/rebuild-americanacs-org.py` (`1d4aec0`) so this cannot happen a
third time.

It drives the same two endpoints `/onboard` does — `POST /onboarding/draft`
then `POST /onboarding/commit`. Two things it gets right that cost a wrong
attempt each:

- **The draft returns all 33 rows**, including every valueless mandate the
  fmcg template carries. Including them all fills the org with ~26 empty
  `needs_data` mandates that were never C&S's. Include only `source !==
  'template'`.
- **The commit route returns `{tenant, labels, industry, provisioning}` — not
  `trackingPlan`.** Reading that missing key reports a confident
  `0 tracked mandates` while the org is in fact fine. Ask
  `GET /tracking-configs?industry=custom` what actually landed.

**Only 7 of the original 18 mandates are recoverable** — the MTD gross-sales
headline plus one representative slice per breakdown, which is all the C&S
work evidenced. The other 11 are gone with the script. 5 of the 7 are
live-tracked (two were published without targets, and `tracked` requires a
non-zero target). The dev-server's interval sweep raised **5 findings**, all
on `sales_supervisor` — fresh, so nothing has escalated to COO yet.

Remember these are **marginals**: each breakdown sums back to the 124
headline, so summing every row counts the same sales several times.

## Live Azure inventory — what has actually moved, verified today

Enumerated with `az`, not from documents. **One customer estate:** Americana,
`rg-rewive-dedicated-americana`, **East US 2** — 3 Container Apps (`ca-api`
2 replicas, `ca-worker` 1, `ca-frontend` 1, all Running) plus `job-migrate`;
Postgres 16 on `Standard_B1ms` Burstable, 32 GB, **public access Disabled**,
database `americana`; Front Door + WAF at
`rewive-americana-dydwe2btf4brfsad.z02.azurefd.net`; Key Vault, 3 managed
identities, VNet with private endpoints for Postgres/Key Vault/Blob, Log
Analytics + App Insights, Storage. Supporting: `rg-rewive-tfstate` (eastus2)
and `rewive-fpa-rg` (eastus — Nesto, the shared ACR, and the AI Foundry
endpoint in **Sweden Central**).

**Three corrections to the record, all from live checks:**

| Recorded | Live |
|---|---|
| backend `v64` / frontend `v43` | **`rewive-backend:v91` / `rewive-frontend:v48`** — several deploys have happened since the notes were written |
| PR #1 possibly applied | **Not applied.** `appLogsConfiguration.destination` is still `""`, `logAnalyticsConfiguration` still `null` — **the estate still produces no container logs** |
| — | `rg-rewive-dedicated-americanacs` **does not exist** (`az group exists` → false). PR #2 is unapplied; C&S exists only in localhost memory |

**Confirmed deliberately off:** no Redis resource of either type, **no read
replicas** (`enable_dr=false`), PgBouncer unsupported on Burstable.

**Production-posture facts worth surfacing**, since "moved to Azure" implies
more than it should: Postgres HA is **Disabled**, geo-redundant backup
**Disabled**, retention **7 days**, on a Burstable B1ms — and PITR has never
been tested.

**Unexplained:** a `rewive-studio` resource group in eastus with its own
VNet, Postgres, gateways and an ACR `rewivestudio`. Rewive-named, but not in
`rewive-infra`'s Terraform at all. Nobody has said what it is or whether it
is still wanted.

**Not on Azure, to be unambiguous:** this repo (the deployed app is
`rewive-fpa-backend` + a separate frontend image, not the React demo or the
Express mock), the platform schema, and all four PRs. **Merging a PR still
deploys nothing** — `terraform apply` is a separate manual Cloud Shell step.

### Natural next steps

1. **Apply rewive-infra PR #1** — confirmed live today that the estate has no
   container logs. Do this **before any new environment apply**; pushing into
   a blind estate is what made the last failure take a session to diagnose.
2. **Reconcile with `sales_excellence` / `sales_staging`** — still the gate on
   the whole platform schema. Needs someone who can see inside the production
   database; it is VNet-only with public access disabled.
3. **Exercise the cycle guard** before trusting it — the one construct in the
   DDL that has never run.
4. The `fpa` half: `fact_measure` with its `grain` CHECK, `mandate` with
   `owner_seat_id NOT NULL` pointing at `shared.seat`, and the loop tables.
   The dimension vocabulary they slice against now exists.
5. **Merge/apply PRs #2, #3, #4** — all four are open and confirmed
   MERGEABLE; #3 and #4 are documentation/whitespace and carry no apply risk.
6. Carried and still open: the `diag-cae-*` cleanup, `ARCH-001` Entry 02's
   supersession banner, **the loop demo on Americana-C&S is still unrun**,
   and the offered-but-unwritten `ARCH-005` for the platform data model.
7. Ask the founder what `rewive-studio` is.

### Servers / state at close

**Both running**, started this session with `npm run dev:all`: mock API on
:4000, Vite on :5173. **The Americana C&S org is live and rebuilt** —
`custom-org`, 7 mandates, 5 live-tracked with 30 days of history each, 5 open
findings on `sales_supervisor`, entity "Americana C&S" / region "UAE".

Sign in at `http://localhost:5173/login?org=custom-org` (any password) **as
Sales supervisor** — a COO lens is empty until escalation moves findings up.
The org is in memory: a mock-server restart wipes it, and
`python3 scripts/rebuild-americanacs-org.py` brings it back.

Reset: `for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

**Tooling, all session-scoped and it will vanish:** a `pglast` venv at
`<scratchpad>/pgvenv` (Homebrew arm64 python 3.14 — the system python 3.9 is
x86_64 and the wheel will not load), a Terraform **1.15.8** binary at
`<scratchpad>/tfbin` for `fmt` only, and a clone of `rewive-infra`.
`platform-schema/README.md` carries the commands to rebuild the venv. `az`
2.89.1 remains installed system-wide and authenticated as Owner —
**read-only checks only; `terraform apply` has never run from this machine.**

`Architecture.png` is still deliberately untracked.

---

# Previous handoff — the infra repo becomes the base, and the documents catch up with what was built (2026-08-12 → 13)

## The decision

**Founder call, this session: `rewive-infra-architect` governs all
infrastructure work from now on.** It lives in the private repo
`sanjuveed-debug/rewive-infra` at
`.claude/skills/rewive-infra-architect/SKILL.md`, alongside a README that is
kept current with a *"Real bugs found via actual `terraform apply`"* section
and a live open-items list. **Both are to be read fresh each session that
touches infra — never from memory or a copy:**

```bash
gh api repos/sanjuveed-debug/rewive-infra/contents/.claude/skills/rewive-infra-architect/SKILL.md \
  --jq '.content' | base64 -d
gh api repos/sanjuveed-debug/rewive-infra/contents/README.md --jq '.content' | base64 -d
```

The stated direction: **start pushing the build to Azure for proper customer
hosting.**

## What that repo is, and what it overturned

Terraform (`azurerm`, per ARCH-003 AD-08). One reusable module
`modules/rewive-deployment/` (VNet + private endpoints, Key Vault, managed
identities, Postgres, Container Apps for backend/worker/frontend + a migration
job, Front Door + WAF, Managed Redis, Blob, Log Analytics + App Insights, NSG
egress allowlist) called once per customer under `environments/<customer>/`.

- **Americana is LIVE** in `rg-rewive-dedicated-americana`, region
  **East US 2**, images backend `v64` / frontend `v43`. **Nesto**
  (`rewive-fpa-rg`) is Rewive's own internal testing ground — same
  subscription, own RG, own much older tags; don't touch them as a side effect.
- Isolation is **a dedicated resource group and Postgres server per customer**.
- DB `americana` on `psql-rewive-americana-prod`; schemas `fpa`,
  `sales_excellence`, `sales_staging`, `shared`, `audit`, `rag`, `public`;
  `search_path=fpa,shared,audit,rag,public`. `fpa_code` no longer exists — a
  full production cutover happened 2026-08-12. Roles: `rewive_admin` (migrate
  job only, the sole DDL path), `rewive_app` (no DDL at all), plus
  individually-attributable collaborator roles — **`sales_excellence` /
  `sales_staging` are Praveen's**.
- **Terraform runs in Azure Cloud Shell, never locally.** Remote state in
  `rg-rewive-tfstate` / `sarewivetfstate` / `tfstate` — set up after a Cloud
  Shell disconnect destroyed local-only state mid-`apply` on 2026-08-11. Never
  propose removing the remote backend.
- Deliberately off: **Redis** (`InsufficientCapacity`, four failed allocation
  attempts across SKUs), **PgBouncer** (Azure doesn't support it on the
  `Burstable B1ms` tier — found mid-`apply`, `plan` can't catch it), **DR
  replica** (`enable_dr=false`).
- The production application is **`rewive-fpa-backend`** (FastAPI, asyncpg),
  not this repo's Express mock.

**Decisions now recorded as superseded** — so nobody re-derives them:

| Was decided | Reality |
|---|---|
| **UAE North** for residency (ARCH-GTM-001) | **Ruled out on evidence** — Microsoft's Foundry Models region table shows Claude has *zero* availability in any Middle East & Africa region. The Claude/Foundry endpoint runs from **Sweden Central** regardless of `location`. |
| **East US** (2026-08-10) | Zero Postgres Flexible Server SKU capacity for this subscription, surfaced as a misleading `ParameterOutOfRange: Version`. Postgres private endpoints must share the server's region → whole deployment moved to **East US 2**. |
| West Europe / North Europe (ARCH-003/004) | Never built. Those docs' resource names and the `10.20.0.0/22` plan target a region not in use. |
| "P1.7 Azure substrate not started" (previous handoffs) | Wrong before it was written — the estate is applied and serving. |
| "Runtime-verify pg paths on a free Neon Postgres" | Obsolete; there is a real production Postgres. |

## Also this session

- **`.claude/skills/architect/SKILL.md` written, then rewritten to obey the
  above.** It is deliberately a **pointer, not a copy** — a vendored 18 KB
  duplicate would drift within a session. It now holds only what is local to
  this repo: the loop-engine thesis, the contract-as-asset, the ten invariants
  (ledger `appendQueue`, the JWT three-segment shape-check, `live-*` never in
  KV, `LIVE_LOCK_EXEMPT`, migration v1 *is* `schema.sql`, …), the
  product-architecture drift patterns, and the superseded table. Sibling to
  `rewive-brief`; doctrine still wins over architecture.
- **ARCH-GTM-001 recovered from its artifact** and its substance captured. It
  is cited by ID in 13 repo files and is a file in none — landing it as
  `docs/architecture/ARCH-GTM-001-gtm-architecture.md` remains outstanding.
- **Both new/changed files are UNCOMMITTED** (`.claude/skills/architect/`,
  this handoff). `Architecture.png` still deliberately untracked. `v5` was
  level with `origin/v5` at `f6a3988` at session start.

## The urgent open item, from the base repo (dated 2026-08-12)

**The Container App Environment was never linked to a Log Analytics workspace
at the environment level** — a different, more direct binding than the
`azurerm_monitor_diagnostic_setting` that exists and reports `enabled: true`.
Effect: **no container logs at all.** `az containerapp logs show` connects and
returns nothing (even `--follow`, even against a container printing
continuously); `az containerapp exec` fails with `ClusterExecFailure`;
`ContainerAppConsoleLogs` queries come back empty. A worker crash-looped to
`restartCount=112` while the revision still reported *Healthy* — **revision
health does not reflect replica restart cycles.** The base skill's guess was
`log_analytics_workspace_id` on `azurerm_container_app_environment`; it is
that **plus `logs_destination`**, which are required together — see the PR
section below, where the root cause is stated exactly and confirmed against
live Azure. **Fix raised as rewive-infra PR #1, not yet applied.** Until it
is, don't burn time on CLI log tooling — a prior session lost an hour there.

Other open in that repo: `acr_resource_group_name` still an unverified
assumption · Key Vault IP-restricted rather than private-endpoint-only (no
in-VNet CI runner exists; `deployer_allowed_ips` is the interim control, and a
stale value makes a full plan want to alter Key Vault ACLs — prefer targeted
plans) · Front Door `/api/*` vs `/*` precedence unverified · Americana's Entra
tenant/client IDs still empty · managed-identity auth for Postgres/Foundry not
wired.

## The fix: rewive-infra PR #1 — raised, NOT applied

<https://github.com/sanjuveed-debug/rewive-infra/pull/1> ·
`fix/container-app-env-log-analytics` · commit `175661f` · 24 insertions, one
file. **Nothing has been applied to Azure. Merging the PR does not deploy it
either** — `terraform apply` is a separate manual step in Cloud Shell.

Root cause is **not** only the missing workspace id. The environment set no
log destination at all, and per the `azurerm` docs at the pinned version,
omitting `logs_destination` *"will result in logs being streamed only"* —
nothing is persisted, so the existing `diag-cae-*` diagnostic setting had
nothing to carry, which is why it showed `enabled: true` while no logs
arrived. The two arguments are required together (`log_analytics_workspace_id`
is mandatory when `logs_destination = "log-analytics"`, forbidden when it is
`"azure-monitor"`).

Verified against the **provider source** at `v4.50.0`, not the docs alone:
neither argument is `ForceNew` (both plain `Optional`, unlike
`internal_load_balancer_enabled`), so this updates the live environment **in
place** — it does not recreate the environment or the container apps inside
it. `Update()` genuinely handles the change rather than silently no-oping, and
it calls `getSharedKeyForWorkspace()`, so the deployer needs
`Microsoft.OperationalInsights/workspaces/sharedKeys/action`.

Apply, targeted so a stale `deployer_allowed_ips` doesn't drag Key Vault ACLs
into the plan:

```bash
terraform plan -target=module.americana.azurerm_container_app_environment.main
```

**Expect exactly one in-place update. If the plan proposes destroy/replace,
stop** — that contradicts the provider source.

## Live Azure verification (this session)

`az` 2.89.1 installed via Homebrew + the `containerapp` extension; signed in
as `admin@agilitegroupae.onmicrosoft.com`, subscription `Azure subscription 1`
(`d117ff47-…`), which is **Owner at subscription scope**. Read-only script
`verify-americana-logs.sh` + `baseline-before.txt` are in this session's
scratchpad — **rerun after the apply and diff**. Confirmed live:

1. **The bug is real in production**, no longer a code-reading argument:
   `properties.appLogsConfiguration` = `{"destination": "",
   "logAnalyticsConfiguration": null}`. The workspace itself is healthy and
   simply unbound — `log-rewive-americana-prod`, customerId
   `ba7dece9-53e6-4875-abd4-c5f338dd3b35`, PerGB2018, 90-day retention.
   Section 1 flipping to `log-analytics` with that customerId is the proof the
   apply worked.
2. **Nothing is currently crash-looping** — `ca-api` 2/2, `ca-worker` 1/1,
   `ca-frontend` 1/1, **0 restarts on every replica** (revisions
   `--foods260812` / `--outcome260812`). The `restartCount=112` worker loop is
   resolved; this closes a blind spot rather than chasing a fire.
3. **`az monitor log-analytics query` returns `InsufficientAccessError`** —
   including `Usage | take 1`, which exists in every workspace, so it is not
   the missing tables and not ARM RBAC (the account is Owner). It is the
   separate **data-plane** path (`api.loganalytics.io`), likely token-audience
   or conditional access. **This will still fail after the apply and must not
   be read as the fix failing.** Verify with `az containerapp logs show` (the
   path that was broken) or the Portal Logs blade instead. Deliberately not
   chased further — that is the never-guess-at-an-Azure-error rule.
4. **The diagnostic-setting redundancy is confirmed, not theoretical** —
   `diag-cae-rewive-americana-prod` has `ContainerAppConsoleLogs` +
   `ContainerAppSystemLogs` enabled against that same workspace, carrying
   nothing today. Once the environment is set to `log-analytics`, those two
   categories are the other path. Dropping them (keeping `AllMetrics`) is a
   second targeted change, deliberately kept out of PR #1.

Also confirmed against live Azure: `rg-rewive-dedicated-americana` is in
**eastus2**, `rewive-fpa-rg` (Nesto) in **eastus**, `rg-rewive-tfstate` in
eastus2 — matching the committed config.

## rewive-infra PR #2 — the Americana C&S environment, raised NOT applied

<https://github.com/sanjuveed-debug/rewive-infra/pull/2> ·
`feat/americanacs-environment` · `environments/americanacs/`, 5 files.
Founder decisions taken before building: **rewive-fpa as a real customer
environment** (which also answers the `v43` question — the deployed frontend
is the rewive-fpa one, not this repo's SPA), customer key **`americanacs`**,
**full estate** matching Americana.

**`americana-cs` would have failed at apply**, checked before writing rather
than discovered: storage accounts are `st${customer}${environment}` and allow
no hyphens (`stamericana-csprod` is rejected), and the key vault
`kv-americana-cs-prod-eus2` is 25 chars against a 24 limit. `americanacs`
fits everywhere — but **the key vault lands at exactly 24/24**, and the
`-eus2` suffix only exists because purge protection held the original eastus
name, so if that suffix ever changes the name overflows. `amcs` (17/24) was
offered as the headroom option.

Verified live before committing: `stamericanacsprod` globally available ·
`rg-rewive-dedicated-americanacs` absent (genuinely greenfield) · **ACR
`rewivefpa` really is in `rewive-fpa-rg`** (Basic, eastus) — which closes the
infra README's open item #2, "an assumption, not independently verified".
Verified locally: `terraform fmt -check` clean and **`terraform validate`
passes**. Only warnings are pre-existing module deprecations
(`enable_rbac_authorization` → `rbac_authorization_enabled`, removed in
provider 5.0) that support the existing `< 5.0.0` cap.

**Found in passing:** `terraform fmt -check -recursive` **currently fails on
`main`** for three pre-existing files — `front_door.tf`, `redis.tf`,
`storage.tf`. That is the infra README's own first preflight step, so it fails
before `init`. Left alone to keep the PR scoped.

Before applying: **`connector_encryption_key` must be generated FRESH** — one
environment's key must never decrypt another's connector credentials. `oidc_*`
remain empty, same as Americana. The estate includes **Front Door Premium,
~$330/month base per environment** before compute or traffic.

## The platform data schema — written, validated, not landed

`rewive-platform-schema.sql` in this session's scratchpad: **35 tables across
`shared` / `fpa` / `audit` / `staging`**, worked against Americana C&S.
Explained in an artifact:
<https://claude.ai/code/artifact/3bff3bca-396e-4ea1-a16a-14eb91a1a15a>

**The modelling error worth remembering.** The first draft treated
`fact_measure` as a full cube — every row a complete BU × channel × region ×
category coordinate. Americana C&S does not publish a cube; it publishes a
**headline plus four independent breakdowns, each summing to it** —
*marginals*. Loaded naively into one table, `SUM(value)` returns **496 against
a true 124**: the same sales counted four times. Every row therefore declares
a `grain`, and a CHECK makes a row unable to lie about it; no correct
aggregate over that table omits `grain`, and `v_slice_reconciliation` compares
each breakdown against the headline.

Also caught by self-audit before shipping: a **forward foreign key**
(`legal_entity` → `dim_country`, created 70 lines later — fails at apply, not
review) and a missing `citext` extension.

Verified: **all 61 statements parse against the real PostgreSQL grammar**
(libpg_query via `pglast`, PG 18.4 — venv in scratchpad, needs Homebrew's
arm64 python, the system 3.9 is x86_64), and no forward FKs remain. **Never
run against a live PostgreSQL** — production Postgres is VNet-only with public
access disabled, so it cannot be reached from a laptop.

**Open before it lands:** it must be reconciled with whatever already exists in
`sales_excellence` and `sales_staging` (Praveen's schemas in the live Americana
database), which this design could not inspect. Then it lands as
`migrations/005-platform-schema.sql` in `rewive-infra`.

## The Notion scope — read, and it disagreed with what was proposed

**Founder instruction: read the full project scope in Notion BEFORE proposing
an Azure architecture or DB schema.** Saved as memory
`read-notion-scope-before-architecture`. Most Notion pages mirror `docs/` (the
root page states the repo is source of truth and Notion edits do not flow
back), but **two exist only in Notion**: **Project Overview** and the **Build
Tracker**, and both carried decisions that change architecture work.

Four contradictions surfaced, all resolved in favour of what is deployed
(founder call: *"scope is overtaken by whats deployed"*):

| Topic | Notion scope said | Deployed reality |
|---|---|---|
| **Tenancy** | Pooled + **RLS** "from day one"; Phase 1 gate = cross-tenant leak test in CI | Dedicated RG + Postgres **per customer** |
| **API** | Stateless **Express** | **FastAPI** (`rewive-fpa-backend`) |
| **Region** | UAE North | **East US 2** |
| **RAG** | "Cut from the GTM path deliberately" | **Built** — pgvector, HNSW + full-text hybrid, chunking, citations |

The schema above assumes the database *is* the tenant boundary, which matches
reality but contradicted the written scope — reading it first would have
raised that before 35 tables were written.

**Both Notion pages updated to match** (nine edits to Project Overview, four
plus a database row to the Build Tracker): tenancy, API, region with the
evidence for both rejected regions, the demo reframed as *the reference
implementation of the contract*, Phase-1 gate rewritten, four tenants not
three, and the RAG divergence flagged rather than absorbed. **Build items
row P1.7 moved Not started → In progress**, not Done — Entra is unwired,
PITR untested, managed-identity auth still secret-based, DR gated off.

**One schema gap the scope exposed and fixed:** of its six success measures,
five were already answerable, but **re-raise rate** — *"the same drift
returning measures decisions that did not stick"* — was not, because nothing
linked a repeat finding to the closed one it repeats. Added
`finding.re_raise_of_id` + partial index.

**Product input, not acted on:** the scope classifies drift by six
**mechanisms** — attention / ownership / time / narrative / normalisation /
memory. A candidate dimension on `finding`; would make "which mechanism costs
us most" answerable. Founder's call whether it is real.

## ARCH-003 / ARCH-004 marked superseded in part (`c46d8f8`)

Both described a July design that **was never deployed**. Entries are **not**
rewritten in place — `docs/README.md`'s own convention is that entry numbers
are stable because other documents cite them (`ARCH-003 Entry 06`) — so each
file gains a banner naming what no longer holds, plus corrected frontmatter
(ARCH-003's `region:` field was flatly false).

ARCH-004 also flags two things so they are not copied forward: **Entry 09
mandates an RLS cross-tenant leak test** that has nothing to test, and
**Entry 04's Redis / connection-pooling guidance is not in effect** (Redis
gated off after repeated `InsufficientCapacity`; PgBouncer unsupported on the
Burstable B1ms tier). Both banners state what is *still* good — naming,
segmentation, SKU reasoning, RBAC, alert rules, runbooks, and `azurerm` as the
IaC choice (AD-08), which the deployed Terraform follows.

`superseded-in-part` was added to README's documented status vocabulary rather
than overstating these as fully superseded or silently breaking the
`draft → reviewed → approved → superseded` scheme.

**NOT touched: `ARCH-001` Entry 02** — the *origin* of the pooled/RLS
decision, still asserting it, including "introduce the tenant-scoped data
layer plus RLS from day one". It is now the last place in the repo asserting
the superseded model. Deliberately left; it was not in scope.

### Natural next steps

1. **Apply rewive-infra PR #1** (Cloud Shell, targeted plan above), then rerun
   `verify-americana-logs.sh` and diff against `baseline-before.txt`. Do this
   **before** any new environment apply — pushing into an estate with no logs
   is how the last failure took a session to diagnose. Remember
   `az monitor log-analytics query` will **still** fail with
   `InsufficientAccessError` afterwards; that is not the fix failing.
2. **Reconcile the schema with `sales_excellence` / `sales_staging`** before
   landing it as `migrations/005`. Requires someone who can see inside the
   production database.
3. PR #2 apply, once the connector encryption key is generated and the naming
   choice (`americanacs` at 24/24 vs `amcs`) is confirmed.
4. The `diag-cae-*` cleanup, and the `terraform fmt` drift on `main`, each as
   its own targeted change.
5. **`ARCH-001` Entry 02** — same supersession banner, if wanted.
6. Carried: **the loop demo on Americana-C&S is still unrun**, PROD-002
   capture, actions board, hero action seeds, palette follow-ons.

### Servers / state at close

**Mock API still running from the previous session** — `node
mock-server/server.js` on :4000, PID 11168, up 1d 11h at session start (this
is *not* `dev:all`). **Vite started this session** on :5173. The
**Americana-C&S runtime org survived**: `GET /tenants/resolve?q=americana`
resolves `custom-org`, 8 open findings (all escalated to `coo` by a day of
heartbeat ticks — sign in as **COO**, a sales-supervisor lens is now empty),
zero closures.

**The `afd397d` ledger fix is proven in the wild:** `GET /ledger/verify` →
`ok:true, checked:69` after a full day of heartbeat escalations (57 `transfer`
events). The loop demo is confirmed unrun **at the evidence layer** — the
ledger's 8 `decision` + 4 `verdict` events are all `fmcg`; custom-org has none.
The org is in-memory: a mock-server restart wipes it, rebuild with
`build-cs-mtd.mjs`.

Reset: `for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

**Tooling installed this session** (previous sessions had none of it):

- **`az` 2.89.1** via Homebrew at `/opt/homebrew/bin/az`, plus the
  `containerapp` extension. Authenticated as
  `admin@agilitegroupae.onmicrosoft.com`, subscription `Azure subscription 1`
  (`d117ff47-…`), **Owner at subscription scope**. This makes **read-only**
  live checks possible for the first time — SKU capacity, replica health,
  resource state — so live facts no longer have to be guessed. **Terraform
  still runs in Cloud Shell**; installing `az` locally does not change that,
  and `apply` was never run from this machine.
- **Terraform 1.15.8** as a plain binary in the scratchpad (`tfbin/`), for
  `fmt` and `validate` only — neither touches Azure. Homebrew's formula wanted
  a Command Line Tools reinstall, so the binary was downloaded directly.
- **`pglast`** (libpg_query, PG 18.4) in a scratchpad venv for real
  PostgreSQL-grammar parsing. Must use Homebrew's **arm64** python3.14 — the
  system python 3.9 is x86_64 and the wheel will not load.

Scratchpad artifacts worth keeping: `verify-americana-logs.sh` (read-only,
five checks), `baseline-before.txt` (pre-apply state), `cae-logs.patch`,
`rewive-platform-schema.sql`. All session-scoped — **they vanish with the
scratchpad**; the verify script arguably belongs in `rewive-infra` beside the
Terraform it checks.

---

# Previous handoff — the two traps closed: wrong-company sign-in and a self-accusing ledger (2026-08-11)

## Where things stand at close

- **Both open engineering items from the last handoff are built, verified and
  pushed.** Two commits on `v5`:
  1. `69a421e` **the front door can't sign you into the wrong company** — the
     fourth review finding, and the sharpest. `GET /tenants/resolve`
     (`resolveRuntimeTenants` in `app.js`) answers for the runtime org only and
     never enumerates; `/login` step 1 unions it with `findTenants` before
     calling found / ambiguous / unknown. "Americana" is now *ambiguous* — the
     honest answer — instead of a silent sign-in to Americana Foods. A single
     server match hydrates `rewive.customTenant` before step 2 (RequireTenant
     stays synchronous); `?org=` deep links resolve server-side, so an invite
     link works in a browser that has never seen the org; both matchers gained
     a punctuation-blind fallback ("Americana C&S" → "Americana-C&S").
     New contract file `contract/10-front-door.test.mjs`.
  2. `afd397d` **the evidence layer can't report itself tampered** — the
     `ledger/verify brokenAt:2` observation, root-caused and fixed.
     `appendEvent` read the head then inserted; two of three call sites append
     **fire-and-forget** (the assessor pass, escalation transfers), so one
     assessor pass delivering two verdicts — or one heartbeat tick escalating
     several findings — had every append read the same head and land on the
     same `seq`. The chain was honest; the writer was wrong. Appends now
     serialize inside `ledger.js` (`appendQueue`). The contract test
     reproduces it through the assessor pass and **fails on the old code**.
- **`git push` SUCCEEDED — `v5` and `origin/v5` are level at `afd397d`.** The
  FortiGate block was not active this session (it had blocked the previous
  three). 20 commits went up, including the whole previous session's work.
- **Verification:** contract suite 52 pass / 0 fail / 3 skipped
  (CONTRACT_SWEEP-gated); `npm run lint` and `npm run build` clean; and a
  headless run from a **virgin browser profile** — the exact founder trap —
  9/9 with zero console errors: finds the org by name, hydrates it, ambiguity
  on the bare prefix, deep link, full sign-in landing on the org's own findings
  with `tid=custom-org`, seeded tenant unchanged. Script:
  `tenant-resolve-e2e.mjs` in this session's scratchpad (needs the
  `playwright-core` symlink it documents — `node_modules` is linked from the
  `fa1d62b9` scratchpad).
- **Notion is current**: DEMO-FRONTDOOR extended (+`69a421e`), P1.6 extended
  (+`afd397d`), new **DEMO-CS-ORG** row covering the previous session's six
  commits (the gap the last handoff flagged), and the Build Tracker's
  "Current state" rewritten as of 2026-08-11.
- **The Americana-C&S org is rebuilt and live** (18 mandates, 9 agents, 8 open
  findings, empty ledger) — same in-memory caveat: a mock-server restart wipes
  it, rebuild with `node <scratchpad>/build-cs-mtd.mjs` (~40s, both that script
  and the founder-uploadable CSV are copied into this session's scratchpad).
- **The loop demo is still unrun** — it needs the founder in the browser. It is
  now reachable the normal way: go to `/login`, type **"Americana C&S"** (the
  full name, not "Americana"), any password. No console snippet, no original
  profile required. Then: accept the MTD finding → ingest improving readings →
  watch recovery climb → close at 100% → assessor verdict.
- **Still unwalked in review:** Operating Picture, Execution, Performance,
  theme spot-check (Classic/Terminal), landing.
- **Chrome extension not attempted** — it has failed nine sessions running.
  Headless playwright-core did the job instead and is the better tool here.

### Natural next steps

1. **Finish the loop demo on Americana-C&S** (founder, browser — the path is
   clear now).
2. P1.7 Azure + the Neon pre-step (Postgres-mode runtime verification of
   P1.4–P1.6 — note the ledger's cross-process ordering caveat: `bigserial`
   keeps `seq` unique, but ordering across instances would want an advisory
   lock).
3. Carried: PROD-002 capture, actions board, hero action seeds, palette
   follow-ons.

### Servers / state at close

Mock API on :4000 (`node mock-server/server.js`, plain flags — note this is
**not** the old `dev:all` task; that mock process was replaced when the new
routes needed loading) and the original vite on :5173. Americana-C&S installed.
The previous session's `[req]` wire monitor is gone with its mock process.
Reset: `for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

---

# Previous handoff — Americana-C&S built live: the onboarding review session (2026-08-10 → 11)

## Where things stand at close

- **This session was the founder building a real org through the product** —
  Americana-C&S, a sales-only Americana entity, onboarded live and iterated
  three times (meat cluster → generic sales scorecard → the founder's real
  cadence: **MTD Gross Sales, actual vs projection vs target vs LY, in
  BU / channel / region / category views** — 18 mandates whose views each
  sum to the headline: target AED 135M MTD, actual 124). Six commits on
  `v5`, all founder-review findings, in order:
  1. `6aff991` **the decide bar can't silently evaporate a decision** —
     header reads "chosen, not recorded yet" on selection; confirm is a
     full-size "Record decision — Accept" with a Recording… state.
  2. `d0af183` **onboarding can't silently produce a numberless org** —
     the founder's CSV upload never landed and the org committed with zero
     live-tracked mandates, no warning. handleFile try/catch surfaces parse
     failures; the draft button counts its numbers; Review warns and the
     commit button owns it ("Create X — with no live numbers").
  3. `2835b0f` **Business screens survive an onboarded org** — the overview
     WHITE-SCREENED for custom orgs (onboarding omitted `actGuide`, typed
     required, rendered unguarded — now seeded in onboarding.js AND guarded);
     P&L/SKU/customer tabs get honest empty states instead of skeleton
     tables.
  4. `e86c2e8` **onboarded agents hold the org's actual mandates** — stream
     agents pick up their stream's included mandates, empty-handed template
     agents are dropped, the chief absorbs orphans.
  5. `feb3827` **holder agents by sales channel** — `/onboarding/commit`
     accepts an optional `agents: [{name, persona?, watch:[mandateId…],
     owner?}]` roster (API-first, no UI step yet); Americana-C&S runs 9
     agents (Sales performance / 4 channels / BUs / regions / categories +
     chief), findings attribute to the right channel agent via
     `findCounterpart`'s watch-list-first order. **Plus a latent bug fixed:**
     the shadow-org rollup counted findings BY STREAM — all 8 channel agents
     showed "8 open" each, and the four seeded FMCG finance-stream agents
     had double-counted forever. Now by `raisedByAgentId`, stream fallback
     only for unknown raisers.
  6. `4ba8ae7` **mutation log on the mock API** (`[req] METHOD path ->
     status`, non-GETs only) — the instrument that cracked the mystery below.
- **THE ACCEPT MYSTERY — root cause found, fix NOT yet built.** The founder
  accepted findings four times; zero requests ever reached the server
  (proven: tokenless AND minted-JWT API accepts land instantly; the `[req]`
  wire monitor caught the founder's clicks signing into **Medcare** and then
  **Americana Foods (fmcg)** instead). Root cause: **the custom tenant is
  client-side** (`rewive.customTenant`) — the browser profile receiving
  `open`ed tabs never had it, so RequireTenant bounced to /login, where
  "Americana" resolves only to the seeded FMCG org. The founder was decades
  of clicks deep in the wrong org. The known "demo-grade limit" is a real
  trap. **Product fix proposed, not started:** server-side tenant resolution
  for the front door (the onboarding commit already returns the tenant; the
  server should answer for unknown org names before /login gives up).
  Interim: sign in from the original browser profile, or the console
  snippet in the conversation (sets `rewive.customTenant`, then
  `/login?org=custom-org`).
- **At close no founder accept has landed**; the org has 8 open findings,
  ledger empty. A persistent wire monitor (task `bcygfguux`) tails the
  `[req]` log. **The full loop demo remains unrun**: accept → ingest
  improving readings (play the outside world) → watch recovery climb →
  close at 100% → assessor verdict. All machinery verified server-side.
- **The org is IN-MEMORY and scripted**: every mock-server restart wipes it.
  Rebuild = `node <scratchpad>/build-cs-mtd.mjs` (drafts the 18 KPIs,
  commits with the 9-agent roster + entity "Americana C&S — UAE", sets
  per-region configs on the 3 region mandates, triggers a sweep; ~40s to 8
  findings). The founder-uploadable CSV is `americana-cs-sales-kpis.csv` in
  the same scratchpad. **Each rebuild mints fresh finding ids** — stale-tab
  accepts 404 (this misled the investigation for an hour).
- **PUSH STATE: `v5` ahead 17** (11 carried + 6 this session; the handoff
  commit makes 18). FortiGate confirmed live again (github curl 000;
  **vercel and Notion ARE reachable** — the deployed app answered, which is
  how the "founder is on the deployed app" theory was killed). First action
  on a clean network: `git push`.
- **Open observation, uninvestigated:** mid-session `GET /ledger/verify`
  returned `{"ok":false,"checked":4,"brokenAt":2}` on the pre-rebuild
  in-memory chain (events: 2 decisions + escalation transfers from the
  heartbeat). State was wiped by later rebuilds before it was chased. If the
  evidence layer's chain can break in normal memory-mode operation, that is
  a real P1.6 bug — repro: boot, accept a live finding via API, let the
  heartbeat escalate something, then verify.
- **The Chrome extension failed to connect an EIGHTH time** (tried because
  reading the founder's console/network would have shortcut the whole accept
  investigation). Keep using `open` + the `[req]` log + API-level probes.
- **Notion tracker NOT updated this session** — the six commits above have
  no rows; P1.1–P1.6 statuses unchanged and still accurate. The 2026-08-10
  morning session's four review fixes also remain rowless. Add DEMO-* rows
  (or one "DEMO-CS-ORG" row) if the founder wants the tracker exhaustive.
- **Review coverage after this session:** onboarding flow, Agents screen,
  Business screens, and the decide bar are now founder-exercised (via the
  C&S build). Still unwalked: Operating Picture, Execution, Performance,
  theme spot-check (Classic/Terminal), landing.

### Natural next steps

1. **Finish the loop demo on Americana-C&S** — get the founder into the
   right org (path A: original browser; path B: console snippet), accept
   the MTD finding while the wire monitor confirms, then ingest improving
   readings and walk Watching → close → verdict.
2. **Build the server-side tenant fix** for the client-side-custom-org trap
   (the fourth review finding — arguably the sharpest one).
3. `git push` on a clean network (18 commits).
4. Investigate the `ledger/verify brokenAt:2` observation (repro above).
5. Notion rows for this session's commits; P1.7 Azure + the Neon pre-step;
   carried: PROD-002 capture, actions board, hero action seeds, palette
   follow-ons.

### Servers / state at close

**`dev:all` RUNNING** (background task `bfjiqedx1`): vite :5173 + mock
:4000, default flags, `[req]` mutation log active. **Persistent monitor
`bcygfguux`** tails it for non-GET requests — stop with TaskStop when the
accept test concludes. State: Americana-C&S installed (18 mandates, 9
agents, 8 open findings, empty ledger) + whatever the founder's two
wrong-org sign-ins touched in fmcg/healthcare. A restart loses the org —
re-run `build-cs-mtd.mjs`. Reset:
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

---

# Previous handoff — the founder review session: 7 commits of asks, P1.1/P1.2 Verified (2026-08-10, later session)

## Where things stand at close

- **This session was a live founder review** — screen by screen, every ask
  built, verified and committed on the spot. Seven commits on `v5`, in
  order:
  1. `df128b7` **the friendliness pass + warm terracotta** — "more ui
     friendly" then "dont keep the coral": row-level Decide/Approve became
     `.btn.decide` (quiet accent outline, fills on row hover — filled
     `.btn.primary` stays for singular page actions), Signal radii
     softened (4/6/10px, pills 99px), roomier `.dec-item` rows, impact
     figures emphasized in meta lines; then the whole Signal accent family
     went terracotta: `--accent #C05B41` / deep `#9C452F` / soft
     `#F8EEE9`, red → brick `#AE3B2A`, favicon + story.html + demo.html
     hex-swapped. CLAUDE.md + the `paper-ledger-rebrand` memory updated —
     Signal is no longer "alarm orange" or "near-square".
  2. `9aa8cbe` **decision notes** — Accept and Act no longer commit
     instantly: an optional note (rides the existing `reason` field)
     lands on the finding thread ("The call, in their words"), the ledger
     row subtitle, and for Act becomes the fix's brief.
  3. `f9e94de` **the time dimension on Findings** — mono age stamp on
     every row (`timeAgo` promoted to `src/components/shared/`), the Open
     queue grouped Aging (7d+, first, red count) → This week → Last 24h,
     and `LoopSpeedStrip` ("The loop, over time") at the screen's foot.
  4. `84c7d71` **the re-alert parser understands people** — "review after
     2 weeks" used to silently become the 14-day default;
     `parseReAlertCondition` now reads days/weeks/months, digits or word
     numbers. Verified end-to-end: 2 weeks→14d, 3 weeks→21d, a month→30d
     timers. New CONTRACT_SWEEP-gated test pins phrasing→clock.
  5. `fc7c06a` **closure is measured, not declared** — the close button
     appears only at `progressPct >= 100` ("Number is back · close
     loop"); UI gate only, the close API is unchanged (contract + seeds
     close programmatically; server enforcement is a production-API
     decision, flagged for P1.7-era). Plus the "Re-alerts when ·
     Re-alert if" copy dupe and the Guide's honor-system line.
  6. `dc2eb40` **the Closed tab finishes its story** — assessor verdict
     pill (note as hover title) + mono "closed in Nd" on every closed
     card; verdict passed in from the finding, phantom findingIds get no
     badge.
  7. `ab5a811` **Decisions-screen review** — the seeds finally speak the
     July vocabulary (Park/Dismiss/re-alert rule/recovery target across
     data.js, v4content.js, v4data.js, sweep step details,
     businessdata.js, the authoring prompt — API values and identifiers
     untouched); ONE median time-to-decide (the Findings strip now reads
     `/decisions/stats` like the Decisions tiles — was 14h vs 24.0h on
     two screens); parked/dismissed ledger rows get honest impact text
     instead of "measuring…".
- **P1.1 and P1.2 are VERIFIED** — founder browser walk + the p12-e2e
  rerun (10/10, zero console errors; script copied from the `9c221393`
  scratchpad, adapted playwright→playwright-core + executablePath).
  Notion rows flipped, Build Tracker "Current state" updated.
- **PUSH STATE: `v5` is ahead 10** (35467c7 + 1037690 from the previous
  session, the seven above, plus this handoff commit) — the FortiGate
  block was confirmed live this session (issuer FG201FT922921744; curl
  000). **Notably: Notion and the npm registry ARE reachable — the block
  is github-scoped, not general.** First action on a clean network:
  `git push`.
- **The Notion tracker is current**: new rows DEMO-FRIENDLY, DEMO-NOTES,
  DEMO-TIME (Done, with commits); P1.1/P1.2 Verified. The four review
  fixes (84c7d71, fc7c06a, dc2eb40, ab5a811) have no rows of their own —
  add them or fold into the DEMO rows if the founder wants the tracker
  exhaustive.
- **Contract suite is now 50 tests** (notes assertions in 04, the park
  phrasing test in 08), all green including CONTRACT_SWEEP=1. Pattern
  worth keeping: run mutations against a THROWAWAY server on :4001
  (`PORT=4001 REWIVE_SWEEP_MS=0 REWIVE_ENGINE_MS=0 REWIVE_SWEEP_PACE_MS=0`)
  so the founder's live review session on :4000 stays clean.
- **The Chrome extension failed to connect a seventh time** — keep using
  headless + `open`. Playwright setup this session: symlink
  `node_modules` from the `54e89aad` scratchpad (playwright-core) + the
  chromium_headless_shell-1228 cache; screenshot scripts live in this
  session's scratchpad (`shoot-ui.mjs`, `shoot-findings.mjs`).
- **Review coverage:** Findings (all three tabs), Decisions, and the auth
  chain are founder-reviewed. NOT yet reviewed: Today, Agents, Operating
  Picture, Execution, Performance, the theme spot-check (Classic/
  Terminal), landing/login. Offered but not requested: restructuring the
  row meta lines; server-side close enforcement.

### Natural next steps

1. `git push` on a clean network (10 commits).
2. Continue the founder review on the remaining screens (list above).
3. **P1.7 Azure substrate** — still needs founder cloud decisions; the
   Neon/Docker Postgres pre-step still unblocks P1.4–P1.6 runtime
   verification first.
4. Carried: PROD-002 capture, actions board, hero action seeds, palette
   follow-ons.

### Servers / state at close

**`dev:all` RUNNING** (background task `bcb4l03sj`, started ~09:00 UTC
after the vocabulary-seed restart): vite :5173 + mock :4000, default
flags. State: clean boot + the founder's auth-chain walk + interval
sweeps (live-* findings will have accumulated). Reset:
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

---

# Previous handoff — the Signal redesign: switchable appearance themes (2026-08-10)

## Where things stand at close

- **This session was the visual redesign.** The founder found the July
  look "boring for a data game"; three directions were mocked as an
  artifact (Trading desk / Control room / Signal —
  https://claude.ai/code/artifact/75c9eb1b-87fc-4176-9509-8319b954d824)
  and the founder chose **Signal**, delivered as **three switchable
  appearance themes**: `signal` (new default — Swiss data-poster,
  alarm-orange `#FF3E00` reserved for drift, hard 2px ink rules,
  Archivo display/figures), `classic` (the July zinc+indigo look
  preserved verbatim), `terminal` (dark trading desk, periwinkle
  accent, mono figures).
- **Commits, in order:** `0fa8924` (theme system: globals.css token
  blocks per `data-theme`, `src/theme.ts` + `rewive.theme`, pre-paint
  script in index.html, `ThemeMenu` in TopNav + `Appearance:` ⌘K
  verbs, ~40 literal-color fixes across components incl. the Landing
  loop SVG) · `4295c5f` (story.html + demo.html restyled to Signal;
  their stale routes and pre-vocabulary copy fixed —
  Park/Dismiss/recovery target/re-alert) · `35467c7` (favicon bolt
  flattened to solid Signal orange; purple original backed up only in
  the session scratchpad — it IS in git history if ever needed).
- **PUSH STATE: `0fa8924` and `4295c5f` are on `origin/v5`;
  `35467c7` is NOT PUSHED** — the office FortiGate TLS interception
  returned mid-session (confirmed by cert issuer, see the
  `fortinet-git-push` memory; do NOT disable SSL verify, do NOT trust
  `gh auth status`). First action on a clean network: `git push`.
- **The Notion tracker is current**: new row **DEMO-THEMES** in the
  Build items DB, Done, commits `0fa8924, 4295c5f, 35467c7`.
- **CLAUDE.md Styling section rewritten** for v7 (the theme
  architecture + the never-fork-component-rules rule); the
  `paper-ledger-rebrand` memory updated to match.
- **Where to look before touching styles:** everything is a token in
  `src/styles/globals.css` (three `:root[data-theme=…]` blocks, one
  vocabulary). New tokens: `--on-emphasis`, `--scrim`,
  `--rule-w/-c`, `--radius-pill`, `--font-figures`, `--w-display`,
  `--track-display`, `--card`. Tints are
  `color-mix(in srgb, var(--x) N%, transparent)`; SVG colors go in
  `style` props (presentation attributes can't resolve `var()`).
- **Known leftovers, all deliberate:** server-seeded sparkline hexes
  in `mock-server/data.js` don't retint (legible in all themes);
  AgentTeams function hues + avatar/tenant accents stay literal
  (identity colors, data); the bundle-size chunk warning predates
  this work. Verification was headless (Playwright cached Chromium,
  scratchpad `shoot.mjs` — playwright-core npm-installed in the
  scratchpad; the Chrome extension was NOT connected this session):
  Today/Findings/Decisions/Landing screenshotted in all three themes,
  build + lint clean.
- **Still open from the previous handoff:** founder review feedback on
  P1.1/P1.2 (flip to Verified in Notion on a clean pass) and P1.7
  Azure substrate (needs founder cloud decisions).

### Servers / state at close

**`dev:all` RUNNING** (:5173 vite, :4000 api) from the redesign
verification. Reset:
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

---

# Previous handoff — session close (2026-08-09, evening)

## Where things stand at close

- **Everything committed, pushed, and MERGED**: `v5` = `origin/v5` at
  `31273bf`; **PR #5 merged to `master` at `4be1088`** (retitled +
  full description first). Working tree clean except `Architecture.png`
  (founder's file, deliberately untracked). One session arc delivered
  **P1.2 → P1.6** — everything in Phase 1 buildable in-repo is built:
  claims-driven tenancy, the contract harness (49 tests), the control
  plane, the loop engine, the evidence layer. Details in the sections
  below, one per item.
- **The Notion tracker is current and is the status-of-record**
  (rows P1.1–P1.6 Done with commits; page "Current state" rewritten
  clean — an earlier stale-sentence accumulation was found and fixed;
  convention in the `notion-build-tracker` memory).
- **Founder product review IN PROGRESS at close**: dev:all was
  restarted CLEAN (contract-suite residue wiped) and the browser
  opened at `/` via `open` (Chrome extension untried this session —
  historic failures). The founder was given the full walk: front door
  (find-org: ambiguous "gulf" case, unknown-org case), auth chain,
  industry switch on the Operating Picture (the P1.2 fix), live
  strip, the bell, switch-org. **No feedback had arrived when this
  handoff was written — expect asks next session.** A clean pass
  flips P1.1/P1.2 to Verified in Notion.
- Next build item: **P1.7 Azure substrate** (needs founder cloud
  decisions). Cheap pre-step: free Neon/Docker Postgres to
  runtime-verify P1.4–P1.6 pg paths (contract suite against a real
  `DATABASE_URL`).

### Servers / state at close

**`dev:all` RUNNING, default flags, clean boot** (:5173 vite, :4000
api) — started fresh for the founder's review; interval sweeps will
have raised live findings since. Reset:
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

---

# Previous handoff — commits landed, the Notion tracker, P1.2 (2026-08-09, later session)

## Where things stand

- **ALL COMMITTED AND PUSHED**; `v5` in sync with `origin/v5` at
  `bdb3163`. This session: the previous handoff's three commits landed
  (`a3e9b5b` auth seam, `3f5dd09` front door, `a60e277` docs — auth
  seam committed FIRST, see the order note in the previous handoff's
  updated "Where things stand"), then `1012472` (handoff: Notion
  tracker live), then **`bdb3163` — P1.2 claims-driven tenancy**.
- **The Notion build tracker is live and is the status-of-record**:
  Build Tracker page + Build items DB under the founder's Rewive
  Project page. P1.1 and P1.2 are Done there; P1.3 is named next. IDs
  + update convention in the `notion-build-tracker` memory — flip a
  row to In progress when starting, Done with commits when landing.
- `npm run build` + `eslint .` clean; network was clear both pushes.

## This session: P1.2 — claims-driven tenancy (`bdb3163`)

- `getAuthClaims()` in `src/api/client.ts`: decodes the held JWT
  (display/derivation only — server verifies signatures), self-prunes
  expired/garbage tokens on read.
- `getActiveTenant()` (`src/tenants.ts`) is **claims-first**: claims'
  `tid` names the org; `rewive.tenant`/`rewive.industry` are demoted
  to caches synced from claims. Unresolvable `tid` (custom org whose
  client session was cleared) drops the token and falls back. The
  legacy tokenless path is byte-for-byte the old behavior.
- `useSetIndustry` (`src/api/shadowOrg.ts`) **re-mints the token** for
  the tenant owning the new industry when one is held — P1.1 had made
  claims outrank `?industry=`, which silently broke the Operating
  Picture's industry switch under a token (data kept the old org).
  No owning tenant → clearAuthToken (tokenless demo mode), never a
  stale token. Also fixes the onboarding commit (switch to `custom`).
- CLAUDE.md tenancy paragraph now documents the whole seam
  (P1.1+P1.2, cron/ingest passthrough, Entra-swaps-the-issuer).
- **Verified headless** (scratchpad `p12-e2e.mjs`, Playwright via the
  global omniroute install — `ln -s` its node_modules into the
  scratchpad; ESM ignores NODE_PATH): 10 checks green, zero console
  errors — mint, stale-cache resync, re-mint on industry switch with
  fmcg data actually served, expired-token prune + fallback, switch-org
  full sign-out. Fresh profiles land on `/guide` first — seed
  `rewive.guideSeen=1` in tests.

## Also this session: P1.3 — the contract test harness (`fa8912a`)

- **`contract/`** (zero deps, `node:test` + fetch; `npm run
  test:contract`; docs in `contract/README.md`): 36 behavior tests,
  runnable against any target via `CONTRACT_BASE_URL` — the mock is
  the reference implementation, a production API must pass unchanged.
  `CONTRACT_MUTATIONS=0` for shared targets; `CONTRACT_SWEEP=1` gates
  the slow live-sweep test (verified once: 16s, paced). Discovery-
  driven — tests find "an open finding" at run time, never seed ids.
- Covers: context + `?industry=` scoping; the auth seam (claims >
  query cross-checked on content, opaque-bearer passthrough, 401);
  world-model referential integrity (edges/watchers resolve, per
  industry); the loop (Accept → recovery target → close → assessor
  verdict upgrades the ledger row; ledger written at decision time
  with UI-verb titles; Park carries a re-alert rule; Dismiss refused
  without a reason; double-decide refused; escalation delivers a
  notification to the new owner; actions CRUD); surfaces (persona on
  every collection — catalog rows key on `agentId`); live tracking
  (configs, metrics, ingest keys 201 + plaintext-once, sweep history).
- **Contract discoveries the suite already paid for**: `Finding.
  streamKey` was typed non-nullable but `fmcg-f-group-mix` (org-level)
  is null — `types.ts` corrected + `streamName()` widened; the solo
  persona lens legitimately includes `dottedPersona` matches; creates
  answer **201**.
- CLAUDE.md: Commands + Conventions now name the suite ("no test
  suite" claim removed).

## Also this session: P1.4 — the control plane, demo-grade in-repo (`20826d1`)

Founder's call: "lets start P1.4 demo-grade in-repo" (over waiting for
Azure). What shipped:

- **`mock-server/control-plane.js`** (`/api/v1/control-plane/*`,
  API-only, no UI): tenant catalog + per-tenant store provisioning +
  migration fan-out. Postgres mode = dedicated **schema** per tenant
  (`tenant_<id>`, per-schema `schema_migrations`, `SET LOCAL
  search_path` inside a transaction; catalog durable in `cp_tenants`).
  Memory mode = same lifecycle, real version ledger (tables parsed
  from the actual SQL), rides the KV snapshot (`controlPlaneState`).
- **Migration series**: v1 IS `schema.sql` (referenced, zero drift
  with `npm run migrate`); v2 `migrations/002-decision-ledger.sql`
  (append-only ledger table — P1.6 hardens with grants + hash anchor).
- Boot provisions the four demo tenants idempotently
  (`seedControlPlane` from `server.js` + `api/handler.js` — the
  handler's `seedOnce` is now a `Promise.all` of both seeds).
- **`/onboarding/commit` walks the real lifecycle** via
  `provisionOnboardedTenant` (replace-on-recommit verified: one
  onboarding row after double commit) and returns a `provisioning`
  block. Onboarding UI unchanged (doesn't show it yet).
- Seed tenants refuse deprovisioning (400); unknown 404.
- **contract/07-control-plane.test.mjs** (5 tests): series ordered,
  seeds ready at latest, provision validates/409s duplicate, fan-out
  converges + idempotent second run, deprovision guards. Suite
  **41/41 green**. CLAUDE.md gained a control-plane paragraph.
- **Honest limits, stated in the module header**: schema-per-tenant
  stands in for DB-per-customer; the data plane does NOT yet read
  from tenant stores (that rewire is the production step); **the
  Postgres path is runtime-unverified** — no Postgres/Docker on this
  machine. First session with a DATABASE_URL: run the contract suite
  and watch `cp_tenants` + `tenant_*` schemas appear.

## Also this session: P1.5 — the loop engine (`4d4b8c6`)

Escalation is now a **scheduled event, not a query someone has to
run** — the doctrine line ARCH-GTM-001 demanded.

- **`mock-server/timers.js`**: durable timer queue — `loop_timers`
  claimed with `FOR UPDATE SKIP LOCKED` (pg) / exact-semantics memory
  mirror. One pending timer per (kind, subject) — scheduling replaces.
  Memory timers deliberately NOT in KV (live-* convention).
- **A timer is a wake-up, never the truth**: `executeLoopTimers`
  (app.js) re-reads the live row before acting — stale/duplicate
  wake-ups no-op. This is what makes the engine + the hydrate lazy
  backstop (kept, serverless) + the sweep coexist without
  double-firing: all act on the same `slaDeadlineAt`/status.
- **Factoring — clocks → timers, data → sweeps**: `sla_escalation`
  (armed at sweep-raise via `sweepCtx.scheduleLoopTimers`, re-armed by
  every deadline move — the write-point is inside `syncLiveDeadline`,
  no per-site code — cancelled on decision) and `re_alert_window`
  (the "or after N days" half of a Park, armed at disposition). The
  "worsens a further X%" half and recovery progress stay sweep-driven.
- Worker: `runLoopEngineTick` (hydrate → execute → persist) on a
  dev-server interval `REWIVE_ENGINE_MS` (default 15s, 0 off);
  `POST /loop-engine/tick` (in-request, middleware does
  hydrate/persist); `GET /loop-timers`. `REWIVE_TIMER_TEST=1` unlocks
  `asOf` time travel on the tick route — dev/test lever.
- Migration **003-loop-timers** joins the control-plane series;
  `migrate.js` now applies the WHOLE series ("the shared store is
  tenant zero"). `timers.js` also lazily ensures its table.
- **Verified end-to-end via time travel** (REWIVE_TIMER_TEST=1,
  sweeps/engine intervals off, all through HTTP): sweep raised 10
  live findings each born with an armed wake-up → +26h tick claimed
  all 10, escalated 5, correctly zeroed 5 whose persona is already
  the top of the role tree → parked one (SLA timer cancelled, 14-day
  window armed) → +15d tick re-opened it one level up
  (coo → group_ceo, level 2), bell-notified the new owner, re-armed
  a fresh SLA wake-up. contract/08 added (3 tests, one
  CONTRACT_SWEEP-gated); suite 44 tests 0 fail; build+lint clean.
- Same pg caveat as P1.4: SKIP LOCKED path code-reviewed, not
  runtime-verified (no local Postgres/Docker).

## Merged to master (2026-08-09)

**PR #5 (`v5` → `master`) was retitled, given an accurate description,
and MERGED at `4be1088`** — master now carries the whole build: the
product (live tracking, four industries, v6 redesign, onboarding
factory, front door) and the Phase-1 SaaS foundations (P1.1–P1.6).
`v5` remains the working branch, now even with master.

## Also this session: P1.6 — the evidence layer (`72dda78`)

- **`mock-server/ledger.js`**: append-only sha256 hash-chained event
  log — `decision` (awaited in the disposition route; actor = signed
  claims' `sub` when a token is held), `verdict` (appended exactly
  once by the assessor pass — events, never edits; the row mutation is
  the display catching up), `transfer` (inside `escalateFindingUp` —
  one accountable owner, transfers are events).
- Routes: `GET /ledger/events` · `GET /ledger/verify` (recomputes the
  whole chain; any historical edit breaks every hash after it) ·
  `POST /ledger/anchor` (records the verified head; 409s a broken
  chain) · `GET /ledger/anchors`.
- **Postgres**: `ledger_events` via migration **004** (fan-out takes
  tenant stores to v4); immutability is a `BEFORE UPDATE OR DELETE`
  trigger — binds the table owner, stronger than revoked grants;
  per-role grant hygiene lands with the Azure substrate. Memory mode
  rides the KV snapshot UNSTRIPPED — events are history, not
  re-raisable state; dangling live-* findingIds are honest past facts.
- The screen's `decisionLedgerState` stays the display surface;
  `decision_ledger` (002) stays for derived views, superseded as the
  write target.
- **contract/09** (5 tests): chain ordering, decision + transfer +
  verdict all land as events, verify + anchor (anchor assertion
  tolerant of background-sweep appends). Suite **49 tests, 0 fail**;
  build + lint clean. Same pg caveat: trigger/insert path
  runtime-unverified locally.

### Natural next steps

1. **Phase 1's in-repo work is complete (P1.1–P1.6).** What remains is
   **P1.7 — the Azure substrate** (UAE North, Entra External ID
   swapping the JWT issuer, Key Vault, App Insights, PITR): every step
   needs real cloud decisions — subscription, tenant, resource names.
   A cheap intermediate: a free Neon Postgres to runtime-verify the
   P1.4–P1.6 pg paths (schemas, SKIP LOCKED, the immutability
   trigger) via the contract suite before any Azure work.
2. Founder browser review of front door + auth (dev:all running).
3. Carried: /onboard founder review, PROD-002 capture, actions board,
   hero action seeds, palette follow-ons.

### Servers / state at handoff

**`dev:all` RUNNING** (default flags, started this session): vite
:5173 + mock :4000. State: clean boot + the p12-e2e login sweeps (a
live-* fmcg finding may exist from the seeded sweep). Restart for a
pristine demo. Reset: `for p in 4000 5173 5174; do kill $(lsof -ti
tcp:$p); done`.

---

# Previous handoff — the GTM architecture + the auth seam (2026-08-08→09)

## Where things stand

- **COMMITTED (2026-08-09), NOT YET PUSHED.** Three commits on `v5`
  on top of `origin/v5` at `fccf0bb`:
  1. `a3e9b5b` `feat(saas): the auth seam — sign-in mints a JWT,
     claims outrank query params` — `mock-server/auth.js` (new),
     `mock-server/app.js`, `src/api/auth.ts` (new), `src/api/client.ts`,
     `src/api/types.ts`.
  2. `3f5dd09` `feat(v5): single front door — tenants resolved by name,
     never listed` — `Login/index.tsx`, `tenants.ts`, `Landing`,
     `TopNav`, `CommandPalette`, `globals.css`, `CLAUDE.md` — the
     front-door rewrite + the ten code-review fixes + the login chain.
  3. The docs-session files + this handoff.
  **Order deviates from the plan the previous handoff wrote** (front
  door first): `Login/index.tsx` interleaves the front door with the
  auth chain (`signIn` calls `login.mutate`), so a front-door-first
  split needed a fabricated intermediate file. Auth-seam-first means
  every commit is honest and builds — verified: `npm run build` +
  `eslint .` clean at each of the two feature commits.
- **Push pending** — test the network first per the standing
  FortiGate rule further down this file.
- `Architecture.png` in the repo root is the **founder's** Azure
  target diagram — deliberately left untracked; don't commit it
  without asking.

## This session, part 1: /code-review on the front door — 10 findings, all fixed

The founder ran `/code-review` on the front-door diff; 10 verified
findings, then asked for all of them fixed:
- `findTenants` now normalizes the **query** with the same `norm()`
  (typing "Medcare UAE (demo)" — the name the product displays — used
  to dead-end); `@`-queries get subdomain suffix matching plus a
  domain-stem→org-name fallback (an onboarded founder's real email
  used to hit "set up a new one", which would overwrite their org).
  Genuinely unknown domains still return nothing.
- `changeOrg` resets email/emailEdited/password/orgQuery and both
  mutations (previous org's credentials leaked into the next org's
  form); deletes ONLY the `org` param (was wiping the whole query).
- `findOrg` writes `?org=` back so step 2 survives refresh; only
  prefills full mailbox addresses (a bare "@medcare.ae" used to jam
  the type=email input); role guard now uses `lensOfferedForIndustry`
  instead of hand-rolling it.
- `signIn` persists tenant/lens and navigates in `onSuccess` only
  (was `onSettled` — a dead server still landed you on /command);
  failure shows the shared `ErrorMessage` atom (`.login-err` CSS
  deleted, `.login-card .state-msg` override added).
- Brand panel + footer de-duplicated (they had already diverged);
  CLAUDE.md's stale "?org= minted by landing CTAs" + missing GulfMart
  fixed in both CLAUDE.md and the Login docblock.

## This session, part 2: the GTM architecture (ARCH-GTM-001)

The founder dropped `Architecture.png` (an Azure "Current Build"
diagram) and asked for alignment feedback, then for the target
architecture. Delivered:
- **Feedback:** the diagram's green "Built and Live" boxes describe a
  system that isn't this repo (FastAPI+JWT, per-customer Postgres,
  AI Foundry, Blob/Key Vault — none exist here; the build is Vercel +
  Express mock + KV + one optional shared Postgres + direct Anthropic
  SDK, zero auth). The diagram also misses the one real live path —
  the cron sweep pipeline. Full audit in the conversation.
- **ARCH-GTM-001**, the go-to-market architecture, published as an
  artifact: https://claude.ai/code/artifact/98d5a3b3-a095-4463-9918-834704834143
  Thesis: the doctrine dictates the architecture — the centerpiece is
  an always-on **loop engine** (sweep worker + durable Postgres
  timers). Azure UAE North; Entra OIDC; API built to the existing mock
  contract; DB-per-tenant + a control plane; append-only ledger; LLM
  kept to the one authoring surface. Cut from GTM: RAG/vector store,
  shared-Redis token budgets. Phases: P1 Sellable / P2
  Enterprise-ready / P3 Compounding.
- **Notion tracker: SET UP (2026-08-09, later session).** OAuth
  completed; a "Build Tracker" page + "Build items" database now live
  under the founder's Rewive Project page — shipped history (DEMO-*),
  P1.1 Done, P1.2–P3.2 planned. IDs + update convention are in the
  `notion-build-tracker` memory. Keep statuses current as work lands;
  Notion is status-of-record, the repo stays source of truth for code.

## This session, part 3: P1.1 shipped — the auth seam

"lets write to handoff and start this overall architecture saas
working" → the first Phase-1 item, fully in-repo, demo-compatible:

- **`mock-server/auth.js`** (new): HS256 JWT via node `crypto` (zero
  new deps; secret `REWIVE_AUTH_SECRET`, dev fallback constant).
  `POST /api/v1/auth/login` {email, tenantId, industry, seat} — any
  password, demo parity — mints a 12h token. `authMiddleware`
  validates **JWT-shaped bearers only** (three dot-segments): the
  cron secret and hashed ingest keys are opaque single strings and
  pass through untouched — that shape-check is what keeps
  `/agent-sweep` and `/metrics` working, don't "simplify" it away.
  Invalid/expired JWT → 401; no token → legacy demo mode.
- **Precedence, everywhere context is resolved:** signed claims >
  `?industry=` > stored profile — in `v4Industry` AND the org-profile
  route (which reads the query directly; the first test pass caught
  it bypassing the seam).
- **Client:** `rewive.token` in localStorage; request interceptor
  attaches the Bearer; a 401 response clears the token so the app
  falls back to demo mode instead of wedging. `useLogin` in new
  `src/api/auth.ts` (types in `types.ts`). Login chains
  login → setIndustry → persist+navigate, errors surfaced on the
  form. "Switch organization" (`clearActiveTenant`) clears the token —
  the old org's claims must not outrank the next org's context.
- **Verified by curl chain** (mock server, CRON_SECRET set): token
  minted; healthcare claims beat `?industry=fmcg` on org-profile AND
  findings (`hc-f-*` returned); tokenless legacy unchanged; garbage
  JWT → 401; cron bearer → 200; unknown industry rejected at login.
  NOT yet walked headless in the browser — the login UI chain is
  typechecked but unexercised visually.
- **The seam's point** (keep this framing): Entra OIDC later replaces
  the *issuer* (HS256 dev secret → JWKS verify), not the middleware
  contract, the claim names, or the client plumbing.

### Natural next steps

1. Push the three commits (network test first); founder review of the
   front door + auth flow in a browser is still pending.
2. **P1.2** — claims-driven tenancy: `RequireTenant`/`getActiveTenant`
   read the token claims, localStorage demoted to cache.
3. **P1.3** — contract test harness (mock as the spec, runnable
   against any base URL) — unblocks the production API build.
4. Notion OAuth if the founder wants the tracker in Notion.
5. Carried: /onboard founder review, onboarding follow-ons, PROD-002
   capture, actions board, hero action seeds, palette follow-ons.

### Servers / state at handoff (2026-08-09)

**Nothing running.** The previous session's `dev:all` (task
`b7xev2hhy`) was stopped; this session's bare mock server (used for
the curl verification, started with `CRON_SECRET=testcron`) was
killed after the test. Start fresh with `npm run dev:all`. Reset:
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

---

# Previous handoff — the single front door (2026-08-05, later session)

## Where things stand

- **THIS SESSION'S WORK IS UNCOMMITTED.** `v5` is in sync with
  `origin/v5` at `fccf0bb`; on top sit the front-door changes, all in
  the working tree: `src/screens/Login/index.tsx` (rewritten),
  `src/tenants.ts` (+`findTenants`), `src/screens/Landing/index.tsx`
  (industry cards removed), `src/components/layout/TopNav.tsx` +
  `CommandPalette.tsx` (switch-org retarget), `src/styles/globals.css`
  (picker CSS swapped for found-row/error), `CLAUDE.md` (tenancy
  paragraph). Suggested commit: `feat(v5): single front door — tenants
  resolved by name, never listed`. `npm run build` + `eslint .` clean.
- **The parallel docs-session files are STILL uncommitted** (unchanged
  from the previous handoff): `.gitignore`, `docs/README.md`,
  `docs/BRIEF-001-project-brief.md`, `docs/OVERVIEW.md`, `.claude/`.
  Keep them out of the front-door commit.

## This session (2026-08-05): the single front door

The founder's call, made in two steps: *"the landing page which has
multiple organization should be removed as per architecture the tenant
name should bring the right login org"* → then *"remove the landing
cards also, just one sign in."* The architecture now: **no surface
anywhere lists the tenants** — a multi-tenant product doesn't show one
customer the others.

- **`/login` is two steps.** Step 1 "Find your organization": one input
  accepting org name, workspace id, or work email. `findTenants(query)`
  in `src/tenants.ts` resolves it and distinguishes found / ambiguous
  ("gulf" matches GulfMart + Gulf Precision → asks for the full name) /
  unknown (points at /onboard). A work email resolves by domain AND is
  carried into the sign-in form. Step 2 is the org's branded sign-in
  as before, org shown as a fixed row + "Change" (which also drops a
  `?org=` param so refresh doesn't resurrect the org just left).
- **`?org=<id>` deep links skip straight to step 2** — kept for
  invite-style links. Nothing mints them anymore except tests.
- **"Switch organization"** (TopNav + ⌘K palette) now navigates to
  plain `/login` — there is no picker to preselect the old org in.
- **Landing (`/`) lost the three industry cards** (`IndustryPicker`,
  `INDUSTRIES`, `useEnter`, all `.ind-*` CSS deleted): hero has one
  "Sign in to your organization →" CTA + a quiet "Set up a new
  organization" sub-link (`.cta-row`/`.cta-sub`), header pill and the
  closing CTA both go to `/login` (the `#start` anchor is gone).
- The custom onboarded org resolves by name like any tenant
  (`findTenants` reads `allTenants()`), client-side-tenant caveats
  unchanged.
- CLAUDE.md's Tenancy paragraph rewritten to describe the two-step
  front door.

Verified headless (scratchpad `login-e2e.mjs`, `landing-shot.mjs`):
find-by-name, find-by-email, ambiguous + unknown errors, deep link,
full sign-in landing on /command with the right org chip, switch-org
returning to step 1, landing CTA routing — zero console errors.
**Non-bug worth knowing:** `.login-brand` has a `.35s` background
transition, so a screenshot taken the frame after resolving an org
shows the default indigo, not the org accent — probe after ~500ms.

Demo note: step 1 deliberately does NOT hint the demo org names (that
would re-list the tenants). The ids that work: "Americana", "Medcare",
"GulfMart", "Gulf Precision", or any `you@<org-domain>` email; any
password; roles via "Sign in as".

### Founder review

The Chrome extension failed to connect a **fifth** time; the page was
opened with plain `open http://localhost:5173/` instead and the founder
walked it themselves (asked for the login ids — table above was
provided). **No styling asks had landed when this handoff was
written.** The /onboard visual review from the previous handoff is
ALSO still pending.

### Natural next steps

1. Commit the front-door work (message above) once the founder is done
   reviewing; push per the standing network-test rule.
2. Previous handoff's list still stands: /onboard founder review,
   onboarding follow-ons (P&L cascade edges, in-app re-onboard entry,
   People-step humanOwner seeding), PROD-002 capture, actions board,
   hero action seeds, palette follow-ons, docs-session commit.

### Servers / state at handoff (2026-08-05, later session)

**`dev:all` RUNNING with default flags** (background task `b7xev2hhy`):
vite :5173 + mock API :4000. State: clean boot + the headless login
sweeps + whatever the founder clicked reviewing; no custom org exists
(the earlier Falcon test org died with the previous session's server).
Reset: `for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

---

# Previous handoff — the onboarding factory (2026-08-05)

## Where things stand

- **COMMITTED AND PUSHED.** `v5` in sync with `origin/v5` at `6ff5dee`.
  Two commits this session: `5477681` (the Agent Teams nested-link fix —
  found already implemented but uncommitted in the working tree, verified
  headless, then committed) and `6ff5dee` (**the onboarding factory**,
  below). `npm run build` + `eslint .` clean. Network was clear both
  pushes (github 200, Sectigo cert).
- **A parallel docs session's work is in the tree, deliberately NOT
  committed here**: `.gitignore` (+`.claude/skills/` sharing),
  `docs/README.md`, new `docs/BRIEF-001-project-brief.md`,
  `docs/OVERVIEW.md`, `.claude/`. Diffed, looks like a docs/skills
  setup — leave it to its own session or commit it separately.

## This session (2026-08-04→05): the onboarding factory

The founder picked gap #2 (the #1 structural blocker) and made two
shaping calls in the design conversation:
1. **Hybrid shape**: template + adaptation + review (over pure wizard /
   pure LLM-drafted).
2. **NO new LLM API surface** — "i dont want to get into API ecosystem
   yet as i am only creating the SAAS." The adapter is fully
   deterministic; `authoring.js` keeps its grandfathered optional key.
   Saved as memory `no-llm-integrations-yet` — don't re-propose.

What shipped (detail in CLAUDE.md's new "onboarding factory" section):
`/onboard` (public route, linked "Set up a new organization" on
/login) → Template → Company → People → Your numbers → Review →
commit installs a fifth org under industry key `custom`. Server:
`mock-server/onboarding.js` (draft/artifacts/series, all pure) +
`customOrgState`/`installCustomOrg()` in `app.js` (+ KV snapshot
round-trip), `'custom'` in `roles.js` LEGACY_INDUSTRIES. Frontend:
`src/screens/Onboarding/index.tsx`, `src/api/onboarding.ts`,
`IndustryKey` union + onboarding types, custom-tenant session in
`tenants.ts` (`rewive.customTenant` localStorage), label overrides in
`personas.ts`, `.onb-*` CSS block.

Design decisions worth keeping:
- **Template numbers are never the customer's**: unclaimed template
  mandates keep structure, numbers blanked. Content pack/business
  context seeded EMPTY — the loop fills the ledger/runs of a real org.
- **One upload parser** for KPI scorecards AND P&L exports
  (name|kpi|label|line + target|budget + current|actual columns).
- Matching: containment-blended token overlap, threshold 0.55
  ("OEE — overall equipment effectiveness" claims template "OEE";
  "Order fill rate" does NOT claim "Scrap rate"); `STREAM_HINTS`
  vocabulary routes unmatched KPIs to a stream.
- Tracking gets a **flat** 30-day synthetic series ending at the real
  current value — the first sweep judges the org's true present gap,
  no manufactured drama. Verified: DSO 61 vs 45 and OEE 78 vs 85
  raised with correct persona/agent/entity; order fill 96.5 vs 97
  (inside warn) stayed clear.
- FMCG-template agents remap to the seven legacy roles
  (`LEGACY_PERSONA_REMAP`); the chief lands as `coo`.

Verified headless end-to-end (scratchpad `onboard-e2e.mjs`): full flow,
zero console errors, lands on the Operating Picture, org chip/brand
correct, live analysis strip shows the custom mandates, seeded
industries untouched, org-profile orgName follows the org both ways,
snapshot export→import keeps the org.

Known demo-grade limits (all deliberate): one custom org at a time
(fixed `custom` key; re-commit replaces it); the tenant is client-side
(another browser won't list it on /login — the server org exists, the
card doesn't); dev-server restart loses the org (in-memory), KV keeps
it on serverless; added mandates have a single-node impact path (no
edges yet — honest, but the Picture shows them unconnected to the
cascade).

### Natural next steps

1. **The founder has NOT visually reviewed the flow yet.** They asked to
   open it ("open lets check") but the Chrome extension failed to
   connect — again, same as the four failures the 2026-07-21 handoff
   records; keep using headless Playwright and just hand the founder the
   URL. They were given http://localhost:5173/login → "Set up a new
   organization" and the walk-through. **Expect styling asks next
   session; the review grid is dense.**
2. Onboarding follow-ons if wanted: wire added mandates into the P&L
   cascade (an edge-drafting step), a "Start over" / re-onboard entry
   point in-app (currently only /onboard), letting the People step
   seed `humanOwner` on ALL agents (today only exact-persona matches).
3. Carried: PROD-002 capture; actions board `?view=actions`; light
   action seeds for FMCG/Healthcare heroes; `hm-f-h1/h2` phantoms;
   palette follow-ons (ledger/agent search, "Decide this finding").
4. The parallel docs-session work (BRIEF-001 etc.) needs its own commit.

### Servers / state at handoff (2026-08-05)

**`dev:all` LEFT RUNNING with default flags** (background task
`bmcwjkm2e`): vite :5173 + mock API :4000. State: clean boot + one
Falcon Foods Trading org onboarded via curl (manufacturing template,
one DSO mandate) + an org-profile switch exercised back to fmcg. The
founder may be walking /onboard right now — creating their own org
replaces the Falcon test org (one custom org at a time, by design). A
restart clears the custom org — re-run /onboard for a demo. Reset:
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.

---

# Previous handoff — the ⌘K palette (2026-08-02)

## Where things stand

- **COMMITTED AND PUSHED.** `v5` in sync with `origin/v5` at `1ce56a8`
  (`feat(v5): the ⌘K palette — the command bar does something now`),
  working tree clean except this handoff edit. Network was clear
  (github 200, Sectigo cert) — re-test before your own push anyway.
- `npm run build` + `eslint .` clean. Verified headless (Playwright) at
  1440/1280/1024, zero console errors on the touched screens.
- **The previous handoff's "servers at handoff" note was wrong about
  what was running.** A `dev:all` from that session was still alive on
  :4000/:5173 — the first port check here used bad `lsof` syntax
  (`lsof -ti tcp:4000 tcp:5173` only queries the first; the second is
  read as a filename) and reported nothing. Use the per-port loop the
  reset line uses. Everything was killed and restarted plain, so the
  dirty test state that handoff warned about is gone.

## This session (2026-08-02): the ⌘K palette

Gap #7's first small, and the one a viewer notices in 30 seconds: the
top bar said "Ask Rewive to do something…" and was a bare `<div>`.

- **`src/components/layout/CommandPalette.tsx`** (new).
  `CommandPaletteProvider` wraps the whole of `AppLayout` (so it is
  inside `RequireTenant`), owns the ⌘K/Ctrl-K hotkey, and exposes
  `useCommandPalette().open()` — `TopNav`'s `.cmdbar` is now a
  `<button>` calling it. Esc / backdrop-click close, ↑↓ move with
  `scrollIntoView`, Enter runs, hover sets the active row.
- **Three groups.** *Go to*: a hand-written `DESTINATIONS` array,
  deliberately NOT derived from `NAV_GROUPS` — the palette wants the
  tab-level destinations the rail hides (`?tab=watching`,
  `?view=agents`, Business — P&L, Workforce, the Guide) and their
  plain-language names, each tagged with its loop stage. *Findings*:
  `useFindings` at the **effective lens** (`useEffectiveLens`), so the
  palette can never show what the queue does not; the footer states the
  lens out loud. Matches title, id, summary, agent, entity, severity.
  *Do*: run an agent sweep, set lens (admin-only — a locked non-admin
  cannot change what they see), toggle team scope, switch organization.
- **Empty query is a standing menu**, not 200 rows: the findings
  actually needing a decision (4), then main screens (6), then verbs.
- **Matching** is a small multi-word scorer (`score()`): word-start and
  earlier hits rank higher, word order is forgiving, non-matching query
  returns null. Cap 12 results.
- **Two react-compiler lint rules bite here, both worth knowing:**
  `setState` inside an effect is barred (reset the active row in the
  input's `onChange`, not a `[query]` effect), and reassigning a
  render-scoped cursor inside JSX is barred (group headers are computed
  in a `useMemo` off `results[i-1]`, not a `let lastGroup` walked while
  mapping).
- **CSS**: `.cmdk-*` block in `globals.css` (backdrop z-index **200** —
  above `.menu` 60, help 70, tour 80, toast 99). The bar itself is
  fixed too: with a `flex:1` spacer either side, `.cmdbar{flex:1}` won
  only a third of the free space and wrapped its own placeholder onto
  two lines, rendering 55px tall inside the 56px bar. Now
  `flex:0 1 520px` + `white-space:nowrap;overflow:hidden`. Measured
  identical for a `<div>`, so this was pre-existing, not the button.
  Note `.cmdbar` needed an explicit `font:inherit;text-align:left`
  reset — there is still no generic button-reset class (same trap the
  bell hit).
- CLAUDE.md gained the palette convention under Styling: add a screen →
  add a `DESTINATIONS` row; new verbs go in the `items` memo and must
  close the palette themselves.

### Found but NOT fixed — a real console error on Agent Teams

`/operate/agent-teams` throws React's *"`<a>` cannot be a descendant of
`<a>`"*: `WorkerRow` wraps its whole row in a `<Link to="/insights/…">`
and then renders `MandateChip`, itself a `<Link to="/build/picture…">`,
inside it. Pre-existing, unrelated to this work, but it is a genuine
hydration-class error and the nested link is unclickable. Small fix
(make the row a div with an explicit link, or lift the chip out).

### Natural next steps

1. **The onboarding factory design conversation** — still the one that
   changes the economics of every future customer, and still needs the
   founder to pick a shape (wizard vs LLM-drafted) before any code.
2. The Agent Teams nested-link fix above.
3. Capture the product-structure reframe as **PROD-002** (offer open
   from last session).
4. Carried: actions board behind `?view=actions`; light action seeds for
   the FMCG/Healthcare hero findings; `hm-f-h1/h2` phantom closures.
5. Palette follow-ons if wanted: search the Decision Ledger and agents
   too, recent-destination memory, and a "Decide this finding" verb that
   opens the disposition bar directly.

### Servers / state at handoff (2026-08-02)

**`dev:all` LEFT RUNNING with default flags** (background task
`b0mvosmtl`): vite :5173 + mock API :4000, sweep every 60s, heartbeat
on. State is a clean boot plus **one manual sweep** fired from the
palette while testing (it may have raised `live-*` findings) and a
handful of lens switches. Restart for a pristine demo. Reset ports:
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done` — the loop
form matters, see the lsof note above.

---

# Previous handoff — the product-structure reframe + three gaps made real (2026-08-01)

## Where things stand

- **EVERYTHING COMMITTED AND PUSHED** except this handoff edit. `v5` is
  in sync with `origin/v5` at `c167da6`. The network was clear the whole
  session (GitHub 200, no FortiGate) — but per this file's standing
  lesson, re-test before every push, don't inherit the claim.
- Six commits went up across this session (2026-07-31 → 08-01):
  1. `282ecfb` **feat(v5): hypermarket industry pack — GulfMart demo**
  2. `92fdf7f` **feat(v5): finding action tracker**
  3. `77f924a` docs(v5): the previous handoff
  4. `0da9eb3` **docs: architecture & product doc set — the docs/
     Obsidian vault** (ARCH-001…004 + DIAGRAMS + PROD-001, `.obsidian/`
     gitignored — untracked work from a parallel docs session the
     previous handoff didn't mention; committed separately)
  5. `504f951` **feat(v5): the ledger writes itself + the assessor agent
     delivers verdicts** (gaps #1 + #5, below)
  6. `c167da6` **feat(v5): escalations leave the app — the notification
     outbox at the bell** (gap #3, below)
- `npm run build` + `eslint .` clean after every commit. Everything was
  smoke-tested against a running mock server (curl chains) and the bell
  was screenshotted headless (zero console errors).
- Commits 1–2 were the previous session's uncommitted work, **split into
  the two commits its handoff prescribed** even though three files
  (`types.ts`, `app.js`, `v4data.js`) carried both features. Technique
  worth keeping: `git diff <file> | sed` to drop unwanted hunks →
  `git apply --cached` for whole-hunk splits; for the one mixed hunk,
  temporarily delete the other feature's block from the working file,
  `git add`, restore from a scratchpad backup. Verify the staged blob
  with `git show :file | node --check` before committing.

## This session (2026-08-01, part 1): the product-structure reframe

The founder: *"the product is evolved so much … can we reframe the
overall product structure and understand what is missing and how to
scale?"* Delivered as an analysis in chat — **NOT yet captured as a
doc.** The offer to write it up as `PROD-002 — Product structure &
scaling map` in the docs vault is open; the founder chose "lets start
the missing ones" instead. If they ask for it, the material is in this
section.

**The reframe — three planes** (the v6 nav already reflects this):
1. **The world model** — what we watch: Operating Picture graph,
   tracking configs, connectors, datasets, KPI library (Foundation).
2. **The loop engine** — what happens when a number drifts: findings →
   4-A decision → actions/workers → recovery targets → ledger +
   assessor verdict (Today / Findings / Decisions / Execution).
3. **The accountability fabric** — who answers: persona hierarchy, dual
   ownership, SLA escalation, entities/regions, tenancy, and (spec'd in
   PROD-001, unbuilt) roles/permissions.
The agent layer (holders / workers / assessors) is the machine half of
the fabric, one agent per loop stage — not a fourth plane.

**The honesty map:** Sense → Find is genuinely real (the live
pipeline); Close is half-real; Decide and Act were real *state
machines* wearing seeded *evidence*. Sharpest discovery: **the
disposition route never wrote the Decision Ledger** — every ledger row
on screen was seeded. The category claim ("system of record for
operational decisions") didn't record decisions. Fixed this session.

**The ranked gaps** (as delivered to the founder):
1. The ledger write — **DONE** (`504f951`).
2. **The onboarding factory** — the #1 structural blocker: all four
   industries were hand-seeded; a customer can't do that. Seeds must
   become templates + an authoring path (likely LLM-assisted: upload
   KPI tree / org chart / P&L → draft Operating Picture). Needs a
   design conversation before building (wizard vs LLM-drafted).
3. Escalation that leaves the app — **DONE demo-grade** (`c167da6`);
   real email/Slack is moot while tenants have fake domains.
4. The real substrate — ARCH-001…004 sequence it; none of it built.
5. The assessor agent — **DONE** (`504f951`).
6. Real workers — most expensive, rightly deferred; the action tracker
   makes Act real with humans first.
7. Smalls: **⌘K bar is decorative** (no search behind it — confirmed),
   no thread comments, no exports, drift detection is 3 deterministic
   rules.

**Scaling phases:** P1 make the loop honest (design-partner ready), P2
onboarding factory, P3 agent ladder (assessor first, then narrow
workers), P4 enterprise per ARCH-001. Compass metrics:
time-to-first-finding, % decided within SLA, % decisions with verdicts.

## This session (2026-08-01, part 2): gaps #1 + #5 — the ledger writes itself

`504f951`, all in `mock-server/app.js` + one hook edit:

- **`decisionLedgerState`** — mutable per-industry state seeded from
  `opContent[k].decisionLedger`; both ledger routes (`/decisions`,
  `/decisions/stats`) now read it instead of the static pack.
- **The write**: the disposition route appends a row the moment the
  decision is made — title `«Accept|Act|Park|Dismiss» — «finding
  title»` (the UI vocabulary, deliberately), subtitle set per branch
  (`ledgerSubtitle`: recovery target / "Fix opened" / re-alert rule /
  dismissal reason), `verdict: 'too_early'`, impact "measuring…",
  `function`: finance stream → 'finance', else 'operations', persona /
  entity / region / findingId inherited from the finding, `madeBy` =
  `currentUser`, `informedBy` = the raising agent. `date` is a display
  string (`'01 Aug'`) matching seeds — NOT ISO.
- **`runAssessorPass(industry)`** — runs lazily at the top of both
  ledger reads. For each `too_early` row with a `findingId`: closure
  `closed` → verdict `worked`, impact `baseline → current`, authored
  `assessorNote`, audited; `regressed` → `not_worked`; `tracking` →
  keeps the "measuring… X of a Y exit condition" text honest. **All
  three branches skip rows that already carry an `assessorNote`** — so
  hand-written seed narratives are never clobbered by the template.
  The existing `POST /closure-kpis/:id/close` route is what flips a
  closure closed, so the chain works from the UI's close-loop button.
- KV snapshot: `decisionLedgerState` in `exportState`/`importState`,
  rows with `findingId?.startsWith('live-')` stripped (the standing
  convention). Consequence, accepted demo-grade: **a decision on a
  live-* finding survives in-memory only** — on serverless it vanishes
  with the next cold start (the proper fix is Postgres persistence).
- `useDisposeFinding` (`src/api/shadowOrg.ts`) now also invalidates
  `['decisions']`.
- Verified: accept `fmcg-f-protein-fill` → ledger row with recovery
  target + "measuring… 84% of a 96% exit condition" → close the loop →
  verdict `worked`, impact "84% → 96%", authored note. Dismiss writes
  its reason. Stats stay derived and healthy.

## This session (2026-08-01, part 3): gap #3 — the notification outbox

`c167da6`. Framing that made this honest: real SMTP is pointless while
tenants have demo email domains, so the bell IS the delivery channel —
each row is "what an email would have carried".

- **`notificationsState`** — per-industry, **seeded empty, always**:
  only the real engine writes it (that's the point). Ring buffer at
  100. `pushNotification(industry, {type, persona, findingId, title,
  body})`.
- **The write-point is inside `escalateFindingUp`** — so all four
  escalation paths deliver with no per-site code: manual escalate, the
  SLA heartbeat, re-alert trip-wires (custom note via the new third
  param `deliveryNote`), and the live-deadline sweep. Recipient =
  `finding.persona` AFTER the walk (the new owner). When the walk forks
  to the dotted line a second `dotted_flag` delivery goes to that role.
- Routes: `GET /api/v1/notifications` (lens-scoped via the same
  `filterByPersona` as every surface), `POST /notifications/read`
  ({ids}). NOT in `LIVE_LOCK_EXEMPT` (touches shared state). In the KV
  snapshot with live-* stripping.
- **Frontend**: `src/api/notifications.ts` (`useNotifications` polling
  30s, `useMarkNotificationsRead`);
  `src/components/layout/NotificationsBell.tsx` replaces the decorative
  bell in `TopNav` — unread dot, `.menu` popover (type eyebrow, title,
  body, age), click-through to the finding thread, mark-all-read.
  Gotcha: there is **no generic `.as-btn` reset class** in globals.css
  (`.topnav-tenant.as-btn` is specific) — buttons got inline resets.
- Verified by curl: escalation → coo delivery; re-escalate → group_ceo;
  `fmcg-f-protein-tradespend` → `dotted_flag` to cfo; lens scoping (coo
  lens sees it, cfo lens doesn't); mark-read sticks. Headless
  Playwright screenshot of the open popover on `/command`: renders
  correctly, zero console errors.

### Natural next steps

1. **⌘K command palette** — recommended next: small, contained,
   visible. The bar in `TopNav` says "Ask Rewive to do something…" and
   does nothing.
2. **The onboarding factory design conversation** — the one that
   changes the economics of every future customer. Don't start building
   before the founder picks a shape.
3. Capture the reframe as **PROD-002** in the docs vault (offer open).
4. Carried from the previous handoff, still open: actions board behind
   `?view=actions`; light action seeds for FMCG/Healthcare hero
   findings; the `hm-f-h1/h2` phantom-closure references (fine for
   demo).
5. Notion MCP was added to local config (2026-07-30, HTTP transport) —
   it loads on session start and needs OAuth via `/mcp` on first use.
   Purpose not yet stated by the founder.

### Servers / state at handoff (2026-08-02)

**`dev:all` LEFT RUNNING with non-default flags**: started as
`REWIVE_SWEEP_MS=0 REWIVE_SLA_HOURS_PER_TICK=0 npm run dev:all` (no
auto-sweep, frozen SLA clocks — used for deterministic testing). The
in-memory state carries this session's test residue: the fmcg hero
finding is **escalated to group_ceo** and dispositioned state from the
curl chains. **Restart with plain `npm run dev:all` before demoing.**
Reset ports: `for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p);
done`.

---

# Previous handoff — the Hypermarket industry pack + the finding action tracker (2026-07-28)

## Where things stand

- **ALL UNCOMMITTED.** `v5` is still ahead of `origin/v5` by 2 (the v6
  redesign + its handoff, see the previous handoff below); on top of
  that this session's work sits in the working tree, uncommitted:
  the full **hypermarket industry pack** and the **finding action
  tracker**. Two natural commits: `feat(v5): hypermarket industry pack
  — GulfMart demo` and `feat(v5): finding action tracker — the fix in
  motion on the thread`. Before pushing, the FortiGate warning further
  down still applies (office network MITMs github.com; `gh auth status`
  lies — test the network first).
- `npm run build` and `npm run lint` both pass. Everything below was
  smoke-tested against a running mock server (endpoints, sweep,
  actions CRUD, KV snapshot shape) — not just type-checked.

## This session (2026-07-28, part 1): the fourth industry — Hypermarket retail

The founder: *"i want to build one for a hypermarket chain the same
solution."* A fourth fully-seeded industry, `hypermarket`, wired
through every screen exactly like FMCG/Healthcare/Manufacturing. The
tenant is **GulfMart Hypermarkets (demo)** (`gulfmart`, `gulfmart.ae`,
accent `#1D6F42`, currency **AED**): three UAE sites + online —
entities `GulfMart Ibn Battuta` (Dubai), `GulfMart Al Wahda — Sharjah`,
`GulfMart Yas Mall — Abu Dhabi`, `GulfMart Online — UAE`.

### The extension checklist (what "add an industry" actually touches)

An Explore pass mapped every branch point first; the full list, all now
carrying a `hypermarket` key (id prefix `hm-`):

- `src/api/types.ts` — `IndustryKey` union (line ~994). NOTE: nothing
  in the type system forces the seed maps to gain the key — they are
  all `Record<string,…>` with silent fallbacks, so omissions fail at
  runtime, not build time.
- `src/tenants.ts` — GulfMart tenant (login screen + landing CTA pick
  it up automatically; `tenantForIndustry` assumes one tenant per
  industry).
- **The two mirrored legacy-industry gates — the biggest trap:**
  `isLegacyIndustry()` in `src/screens/CommandCenter/personas.ts` AND
  `LEGACY_INDUSTRIES` in `mock-server/roles.js` both now include
  `'hypermarket'`. An industry missing from these silently inherits the
  FMCG division tree (Protein/G&I/F&V lens picker). Labels via new
  `HYPERMARKET_LABEL_OVERRIDES`: operations_head → "Store operations
  head", sales_supervisor → "E-commerce supervisor", commercial_finance
  → "Merchandising finance" (store_manager's base label already fits).
- **The two disagreeing currency maps:** `app.js` ~line 271 (hypermarket
  falls to the AED default — comment updated) and
  `tracking.js` `CURRENCY_BY_INDUSTRY` (explicit `hypermarket: 'AED'`).
- `mock-server/v4data.js` — `industryOptions` entry; brain (6 streams:
  store_ops / merch / supply / ecom / customer / finance; 33 nodes = 3
  intents + 5-line AED P&L cascade + 19 mandates + 6 signals; 40 edges
  with causal rationales like DC fill → shelf gaps, overstock →
  markdowns); `shadowOrgs.hypermarket` (8 agents incl. the
  healthcare-style CFO split: FP&A `hm-sa-finance` holds the plan,
  Loss prevention `hm-sa-lossprev` (persona `cfo`) holds shrink);
  `findingsSeed.hypermarket` (7 findings covering ALL seven legacy
  personas and the 4-A states — hero is `hm-f-1` fresh waste / late
  markdown sweep; `hm-f-4` shrink is accepted → closure `hm-c-1`;
  `hm-f-5` Friday online fill is parked with a re-alert rule);
  `closureKpisSeed` (1 tracking + 2 closed-history); `plImpactSeed`.
- `mock-server/v4content.js` — full `opContent.hypermarket` pack
  (dashboard, 3 pending decisions, pulse, runs + one live runDetail,
  exceptions, chases, 6-row decision ledger with assessor notes incl. a
  **Dismiss that retuned the agent**, leaderboard, loopSpeed, outcome
  report, 6-worker `agentCatalog` with `industry: 'retail'` — that's
  the *AgentIndustry* union, a different type that already had
  'retail').
- `mock-server/businessdata.js` / `pldata.js` / `datasetsdata.js` —
  business context (Category × Store dims), P&L statement (3 anomalies
  deep-linking findings `hm-f-1`, `hm-f-2`, `hm-f-3`), 6 datasets.
- `mock-server/seed-tracking.js` — 4 live-tracked mandates. **Gotcha
  learned the hard way:** the "improving" (reads-clear) mandates must
  have their *current* gap to target inside the warn band, or the
  threshold rule raises regardless of the improving slope. First picks
  (ecoshare 18% gap, loyalty 6.7%) raised; swapped to `hm-k-dcfill`
  (3.6% gap, warn 5) and `hm-k-basket` (6.3% gap, warn 8). Verified on
  a real sweep: dcfill + basket → `clear`, osa + freshwaste → `raised`
  with correct entity/persona/counterpart.
- `src/screens/Landing/index.tsx` — third card, grid to
  `repeat(3,1fr)`/max-width 880, copy line "seeded for FMCG, Healthcare
  and Hypermarket retail".
- `src/screens/KpiLibrary/SelectKpisTab.tsx` — hypermarket **reuses**
  the existing `retail_trade`/`distribution` catalog segments (labeled
  "Stores & trade" / "Supply chain") rather than minting new
  `KpiSegment` members — new segment keys would have empty catalogs.

Left alone deliberately: `public/story.html` / `demo.html` (static
marketing prototypes, still say "FMCG · Healthcare"), and the
`AgentTeams` `FN_STYLE` map (new stream keys fall to `DEFAULT_STYLE`).

## This session (2026-07-28, part 2): the finding action tracker

The founder wanted "an action tracker like a ticketing system to track
findings on top of Agent Findings", asked for a view first. The agreed
shape (this is doctrine, keep it): **a child of the finding's thread,
not a standalone ticket system** — a ticket closes when the *work* is
done, a finding closes when the *number* is back, and collapsing that
distinction would dissolve the product's differentiator. Built
**generic, seeded only for hypermarket** (industries swap content,
never features). Completing every action never closes the finding.

- **Type** (`src/api/types.ts`): `FindingAction` — `findingId`, title,
  `owner` (display name), `source: 'human' | 'worker'`, `status:
  'open' | 'in_progress' | 'blocked' | 'done'`, nullable note/dueAt,
  createdAt/updatedAt. Plus `FindingActionInput`/`FindingActionUpdate`.
- **Server** (`mock-server/app.js`): `findingActionsState` (per-industry,
  seeded from `findingActionsSeed` in `v4data.js`); routes
  `GET/POST /api/v1/findings/:id/actions` (industry resolved via
  `findFinding`, so **live sweep-raised findings carry actions too** —
  verified), `PATCH /api/v1/finding-actions/:actionId` (status
  validated against the four values). List sorted done-last. In
  `exportState`/`importState`, and rows whose `findingId` starts with
  `live-` are **stripped from the KV snapshot** — same convention as
  live findings (the parent is re-raised from Postgres with a fresh id;
  a KV copy would orphan them). NOT in `LIVE_LOCK_EXEMPT` — the routes
  touch shared in-memory state. No save call needed in routes:
  `api/handler.js` persists per request (there is no
  `scheduleStateSave()`; a first draft invented one and it broke).
- **Hooks** (`src/api/shadowOrg.ts`): `useFindingActions`,
  `useAddFindingAction`, `useUpdateFindingAction` (query key
  `['finding-actions', findingId]`).
- **UI** (`src/screens/Findings/ActionsBlock.tsx`, mounted in
  `Detail.tsx` on the thread spine between **Decided** and
  **Watching**, styled like the "From above" block): eyebrow "Actions —
  the fix in motion", per-row inline status `<select>`, owner,
  "proposed by a worker" tag, due date with overdue-in-red, notes, an
  add form (title/owner/date), "n of m done" counter, and the footer
  doctrine line **"Done here ≠ closed — the finding closes when the
  number is back."** Hidden on undecided/dismissed findings with no
  rows; dismissed findings are read-only (status shown as a Pill).
  Lint gotcha: the react-compiler rule bars `Date.now()` in render —
  captured once via `useState(() => Date.now())` for overdue checks.
- **Seeds** (6 rows, hypermarket only): `hm-f-4` (accepted shrink)
  carries the demo beat — retagging + locked displays **done**, evening
  exit coverage **in progress** (due in 5 days), an agent-proposed loss
  re-check **open**, while the recovery target sits at 45%: *work
  finished ≠ number back*. `hm-f-5` (parked) holds the dark-store pilot
  (**in progress**, due ~3 weeks) and a **blocked** worker action
  citing the failed ratings export.

### Natural next steps

- Commit the two features (see "Where things stand").
- Optional: a compact board view behind `?view=actions` on Findings
  (columns by status) — deliberately NOT a nav item, and overdue
  actions must not grow a second badge (Today is the only "waiting on
  you" count in the product).
- Optional: seed a light action set for the FMCG/Healthcare hero
  findings so the block isn't hypermarket-only on screen.
- Optional cleanup: the closed-history closures reference
  `hm-f-h1`/`hm-f-h2` findings that don't exist in the seed — same
  pre-existing pattern as `mfg-f-h1/h2` (persona filter fails open),
  fine for the demo.

# Previous handoff — the v6 "clean modern SaaS" redesign (2026-07-28)

## Where things stood

- **COMMITTED, NOT PUSHED.** `v5` is **ahead of `origin/v5` by 2**,
  working tree clean (except this handoff):
  1. `54c9bb5` **docs(v5): handoff** — the previous session's handoff
     write-up (the worker→agent link section below).
  2. `12fe8e9` **feat(v6): clean modern SaaS redesign — the product
     explains itself** — THIS session's work, detail directly below.
  Before pushing, remember the FortiGate lesson further down this file:
  the office network intermittently MITMs github.com (`curl
  https://github.com` → self-signed Fortinet cert / HTTP 000) and `gh
  auth status` lies about it — test the network first.

## This session (2026-07-27→28): the full UI redesign

The founder: *"the product seems to be very hard to understand and i
want to change the UI to best in class SAAS easy to understand"* —
clarified to: **all four pain points at once** (invented vocabulary,
navigation, density, invisible loop), **full redesign**, **clean modern
SaaS** (Linear/Stripe caliber, "modern and minimalistic for a CEO
navigation"), and — the big call — **"keep it unique but easy to
understand, i am ok to change the product identity."** One commit,
55 files, +1031/−1077 (net −211 lines), `mock-server/` untouched.

### What changed (the four phases)

1. **Design system** (`globals.css` rewritten in place): zinc neutrals
   (`--bg #FAFAFA`, `--ink #18181B`, solid hairline `--border #E9E9EC`),
   one indigo accent `#4F46E5`, spacing scale `--sp-1…7`, type scale
   `--text-xs…2xl`. **Every legacy CSS var NAME kept** — the ~785 inline
   `style={{}}` objects reference vars, so the retint was CSS-only.
   Serif retired: `--font-display` now aliases `--font-body`. Inter is
   REALLY loaded now — `@fontsource-variable/inter` imported in
   `src/main.tsx` (bundled same-origin; never swap for a Google Fonts
   link, demos run offline). Eyebrows are sans; mono only for
   figures/clocks/IDs. New primitives: `.menu`/`.menu-item` popovers,
   `.select`, `.page-header`/`.subtitle`, `.seg` as a gray-track/white-
   thumb view toggle, `.q-hero`, `.loop-strip`.
2. **Chrome**: `Topbar.tsx` DELETED — one 56px `TopNav` now carries
   logo · org chip (popover holds "Switch organization") · ⌘K bar ·
   **`LensMenu`** (`src/components/layout/LensMenu.tsx`, custom popover
   that ports the native-select lens logic verbatim: locked non-admins,
   held-lens-not-in-list fallback, "+ their team" via `ROLE_CHILDREN`) ·
   help · bell · avatar (moved up from the rail foot). The rail
   (`NAV_GROUPS` in `areas.ts`) is grouped **Today / "The loop"
   (Findings·Find, Decisions·Decide, Execution·Act) / The org / Setup**
   with quiet right-aligned stage words. `crumbTitle`/`SPECIAL_TITLES`
   deleted with the crumb. New `LoopStrip` atom
   (`src/components/shared/LoopStrip.tsx`): Sense → Find → Decide → Act
   → Close, current stage lit — mounted on Today's header and the
   finding thread (`stage` = Decide/Act/Close by finding status).
3. **Vocabulary + core screens** (UI copy ONLY — identifiers, routes,
   API values untouched; the four API dispositions are still
   `accept/act/acknowledge/abandon`): Disposition→**Decide**,
   Acknowledge→**Park**, Abandon→**Dismiss**, exit condition→**recovery
   target**, trip-wire→**re-alert**, senses→**signals**, "held twice"
   in-app→"every number has two owners" (the verbatim line survives
   ONLY on Landing + Guide finale). Today: `TodayStats.tsx` DELETED —
   its numbers folded into the `UnifiedQueue` header as one hero count
   (`q-hero`), rows carry ≤2 badges + a **Decide** CTA. Findings:
   **default view flipped to Lifecycle** — `byAgent` is now
   `?view=agents` only (audited: nothing linked `?view=`; `?tab=` links
   unchanged). Thread steps renamed Detected / Decided / Watching /
   Closed. `PageHeader` (`src/components/shared/PageHeader.tsx`)
   replaced `h1.page + Intro` on EVERY routed screen; the Intro help
   modals are gone (doctrine lives in subtitles + Guide); `Intro.tsx`
   survives as a deprecated shim used only by unrouted `SignalStudio`.
   Landing hero pitches plainly first; its SVG hexes updated to the new
   palette. Guide cut from 10 steps to **5 slides = the 5 loop words**.
4. **Consistency sweep**: ShadowOrg agent cards simplified
   (TemperamentDial + per-card stat grid REMOVED — `agent.temperament`
   is now unused by the UI); Connectors split into a `.seg` toggle
   **Live tracking / Connections** (deep links `?forKpi`/`?status` land
   on Connections; every live-tracking surface kept working);
   "Mandate Library" label → **"Mandates"** (route `/build/kpis`
   unchanged). CLAUDE.md rewritten: new Styling section + the
   vocabulary table under Positioning — **CLAUDE.md is the source of
   truth for the new conventions.**

### Verified

`npm run build` (tsc) + `eslint .` clean after every phase. Vocabulary
sweep grepped to zero in UI strings. Tour `data-tour` anchors all live
on screens (none were on the deleted chrome) — checked. Mock server
`git diff --stat` empty. NOT visually walked — the Chrome extension
was not connected this session, so nobody has SEEN the new UI yet.

### Still open / next

- **Founder has not reviewed the redesign visually.** The dev server
  was stopped right after the commit. First move next session:
  `npm run dev:all`, clear `rewive.*` localStorage for the fresh
  5-slide Guide, walk all three tenants + a locked non-admin persona +
  the LensMenu popover. Expect styling asks.
- `public/story.html` / `public/demo.html` still hardcode the OLD paper
  palette — update manually if they feature in a demo.
- `SignalStudio` is unrouted dead code on the deprecated `Intro` shim —
  delete or leave.
- Push the 2 commits when the network allows.

### Servers / state at handoff (2026-07-28)

**Nothing running** — the `dev:all` task from the previous session was
stopped. Start with `npm run dev:all`. In-memory mock state resets on
boot (seeded tracking re-seeds itself).

---

# Previous handoff — the worker→agent reporting link, bound in Agent Studio (2026-07-27)

## Where things stood

- **PUSHED (2026-07-27) — everything this session is committed AND up;
  `v5` is fully in sync with `origin/v5` at `df6caa8`, working tree clean
  (except this handoff).** Network was clear both pushes (`curl
  https://github.com` → 200, Sectigo cert — no FortiGate block). **PR #5**
  (`v5` → `master`) carries all of it. Three commits went up, in order:
  1. `ee0e286` **feat(v5): live findings name a suspected cause, not just
     a cost** — the 2026-07-23 sense→mandate reasoning fix
     (`mock-server/sweep.js`, `mock-server/authoring.js`,
     `src/screens/Findings/Detail.tsx`).
  2. `92a95d8` **feat(v5): Agent Teams view — the loop as a team
     hierarchy** — the 2026-07-23 Teams tab
     (`src/screens/AgentTeams/index.tsx`, `src/App.tsx`,
     `src/components/shared/SectionTabs.tsx`).
  3. `df6caa8` **feat(v5): a worker reports to one holder agent, bound in
     Agent Studio** — THIS session's work. Detail in "This session
     (2026-07-27)" directly below.
  Commits 1–2 were the 2026-07-23 work carried in uncommitted; commit 3
  answered the founder's "something is not connecting" on the Teams view.
  **The paused Agents detail-page work stays reverted** — the founder
  pivoted to Teams; don't go looking for it.

## This session (2026-07-27): the worker→agent reporting link

The founder opened the just-committed Agent Teams view and hit the real
problem: *"why [are] agent and workers … not able to link … both are
getting the findings … something is not connecting."* The diagnosis, then
the fix the founder chose.

### The diagnosis — no stored link, so the view was guessing

A worker (`AgentCatalogEntry`) had **no field pointing to its holder
agent or origin finding** — only `mandateIds`. The Teams view inferred
the link two ways, and **both are many-to-many**, which is why it looked
broken:
- **worker ↔ agent = shared mandate node.** Several agents watch the same
  node, so one worker was claimed by many: **Trade-Spend ROI Worker
  (troi, tradepct) → 3 agents** (Commercial · Finance · Commercial
  finance·Protein); **OTIF (fill) → 2** (Planning · Supply chain·Protein).
- **agent ↔ finding = same `streamKey`.** `streamKey` is NOT unique:
  **6 agents share `finance`**, 2 share `planning`, 2 share
  `manufacturing`. So the *same findings* rendered under every agent
  sharing the key — the founder's "both are getting the findings."

Proof lives in the data: `(streamKey, persona)` IS unique across all 16
fmcg agents, and `finding.raisedByAgentId` already names the exact
raising agent — the causal material for a real link was one field away.

### The fix the founder chose — "do a blend on Agent Studio when we build"

Not a hierarchy inference — an **explicit stored link, set at build
time**, defaulted from the finding and editable. Chose **"Auto from
finding, editable."** Shipped as `df6caa8`:

- **`types.ts`** — `reportsToAgentId` + `reportsToAgentName` on both
  `AgentSpec` and `AgentCatalogEntry`.
- **`mock-server/app.js`** — the Act disposition writes the finding's
  `raisedByAgentId`/`Name` onto the solution as `holderAgentId`; `POST
  /agent-specs` defaults `reportsToAgent*` from it; **new `PATCH
  /agent-specs/:id/reports-to`** edits it; publish copies it onto the
  catalog worker's `catalogMeta`. (Note: publish already dropped
  `mandateIds`, so new workers had NO join at all before this — the
  explicit link is the only thing that places a freshly-built worker.)
- **`src/api/agentSpec.ts`** — `useSetReportsTo` mutation.
- **`UnifiedAgentStudio`** — a **"Reports to"** card (after the delegate
  panel): a `<select>` of all agents via `useShadowOrg('all','team')`,
  defaulted from the finding, **locked once `status === 'published'`**.
- **`AgentTeams/index.tsx`** — full rebuild: prefers the stored
  `reportsToAgentId` (falls back to shared-mandate inference only for
  pre-existing/seeded workers), so **each worker lands under exactly ONE
  team**; findings de-duped by `streamKey` **AND** `persona`; a
  **per-function colour + icon** (📦 planning, 💳 finance, 🏭
  manufacturing, 🚚 logistics, 🔬 quality, 📈 commercial, 📣 marketing,
  👥 people — muted paper-ledger hues, colored left stripe + icon badge);
  workforce-less agents fold into a **"Watching · no workforce yet"**
  strip instead of 10 empty blocks; every worker row states **"reports to
  «agent»"**. The single-owner tie-break, when no explicit link:
  exact-persona claimant → greatest mandate overlap → most-specific agent
  (fewest watched) → id.

**Verified end to end against the running mock server** (curl chain): Act
on `fmcg-f-protein-fill` → spec defaulted `reportsToAgentId =
fmcg-sa-protein-supply` → PATCH retargeted to `fmcg-sa-planning` →
publish → catalog worker carried `fmcg-sa-planning / Planning agent`.
Build (`tsc -b && vite build`) + `eslint .` clean.

### Still open / next

- **Seeded workers still resolve their team by INFERENCE**, not the
  stored link (they predate the field). It renders identically, so no
  visual difference — but if you want the seeds to carry an honest
  `reportsToAgentId`, add it per-industry in `v4content.js` (map each of
  the 6 fmcg workers + the healthcare/manufacturing sets to their agent
  id). Deferred — the fallback covers them.
- The founder was mid-review of the rebuilt view when this handoff was
  written; no styling asks landed yet.

### Servers / state at handoff (2026-07-27)

`npm run dev:all` running (task `bpg7g4zy3`): vite `:5173` + mock API
`:4000`, **freshly restarted so in-memory state is clean** (the
end-to-end test worker was cleared by the restart). Reset ports with
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`. Note:
killing `:4000` alone takes down the `concurrently` vite child too —
relaunch the whole `dev:all`, don't patch one port.

- **PUSHED (2026-07-22) — `v5` is fully in sync with `origin/v5` at
  `98c52e9`; working tree clean.** The 4 commits the previous handoff
  left unpushed (`a8c19fc` disposition fixes, `17c505b` FortiGate doc,
  `550a72d` live-sweep fix, `98c52e9` server-flags doc) went up in one
  clean fast-forward (`76c710d..98c52e9`). **PR #5** (`v5` → `master`)
  now carries them too. Confirming the file's own lesson: the FortiGate
  block **was live on the office network at the start of the session**
  (`curl https://github.com` → self-signed Fortinet cert, HTTP 000) and
  cleared the moment the founder moved off it (→ HTTP 200), after which
  plain `git push` just worked. Zero unpushed at handoff.


- **THE LIVE SWEEP IS NOW EXERCISED, AND IT WAS BROKEN IN THE UI.** The
  last unexercised piece of the loop turned out to hide a real defect:
  the live analysis strip **never rendered a live state at all** when
  you pressed its own button — the whole point of the feature. Fixed and
  verified walking `1 of 4 → 2 of 4` at 25% → 50%. Detail in "This
  session (2026-07-21, latest)" below.

- **THE LATEST SESSION CHANGED NO CODE.** It opened the running product
  and read both tabs under the Agents rail item, ending on a design
  question the founder had not yet answered. Five observations came out
  of the read — two of them structural (the tabs share a rail item but
  not a design vocabulary; only one of the two has a detail page).
  Detail in "This session (2026-07-21, latest)" directly below. If you
  are picking up work, **that unanswered question is the live thread.**

- **[ANSWERED — the two "unexplained" dirty files were the live-sweep
  fix, and they are now committed.]** A concurrent session saw
  `src/api/tracking.ts` and `src/screens/Findings/LiveAnalysisStrip.tsx`
  dirty, could not account for them, and flagged them as mystery edits
  from "an earlier session". They were neither mystery nor earlier: a
  session running **at the same time** was mid-way through fixing the
  live analysis strip (see "This session (2026-07-21, latest)" below).
  Its instinct — *diff before committing, do not sweep unexplained work
  into an unrelated commit* — was exactly right and is worth keeping.
  **Two sessions edited this file concurrently on 2026-07-21**; the same
  hazard the website sections warn about ("the file changes out from
  under sessions, re-read before every edit") now applies to THIS file.
  Re-read before editing, and prefer targeted edits over rewrites.

- **THE FOUR-A DISPOSITION FLOWS ARE NOW EXERCISED INTERACTIVELY** — the
  open thread the previous session named as "the natural next piece of
  work" is closed. Accept / Act / Acknowledge / Abandon all driven
  through the real UI with headless Playwright, plus the full Act chain
  (solution design → validation → approval → approve → Worker Studio)
  and the escalate button. **Two defects found and fixed**; one
  authority gap found and deliberately left for a founder call. Full
  detail in "This session (2026-07-21, later)" directly below.
  **UNCOMMITTED at the time this section was written** — two files,
  `DispositionBar.tsx` and `SolutionDesign/index.tsx` — committed
  together with this handoff at the end of the session.

- **A PR IS OPEN; check whether the latest commits are pushed.**
  **PR #5** is open, `v5` → `master`:
  https://github.com/Kumarv2509/rewive-front-end/pull/5 — it was
  43 commits / 112 files / +10,911 −1,397 when opened, and has grown
  since. The 2026-07-21 commits are `e5a79ae` (three CSS fixes),
  `79b7cbf` + `76c710d` (handoffs), then this session's
  disposition-fixes commit. **Push state was last verified when PR #5
  was opened — re-check with `git status -sb` rather than trusting this
  line**, which is exactly the kind of claim this file's push saga is a
  warning about. HTTPS is the right remote, but see the next bullet —
  **pushing was blocked again later on 2026-07-21** from the office
  network. `a8c19fc` is committed locally and unpushed.

- **THE FORTIGATE BLOCK IS LIVE AGAIN (confirmed 2026-07-21, later).**
  `git push` failed with *"SSL certificate problem: self signed
  certificate"*. This is **network location, not credentials** — and
  this time it is not even MITM inspection: the certificate presented
  for `github.com` is issued by `O = Fortinet, CN = Fortiguard SDNS
  Blocked Page`, i.e. GitHub is **category-blocked** outright.
  Reproduce in two seconds:

  ```
  curl -sS -o /dev/null -w "%{http_code}" https://github.com   # -> 000
  echo | openssl s_client -connect github.com:443 -servername github.com 2>/dev/null \
    | openssl x509 -noout -issuer                              # -> O = Fortinet ...
  ```

  **`gh auth status` LIES about this, and the lie is the same shape as
  the SSH dead end above.** It reports *"The token in keyring is
  invalid — run `gh auth refresh`"*. It is not invalid: `gh` cannot
  complete the TLS handshake, so it never validates the token at all,
  and it reports a network failure as an auth failure. **Do NOT run
  `gh auth refresh` or `gh auth logout`** — that would discard a
  working credential chasing a phantom, which is precisely how three
  sessions were lost to the SSH-key theory.

  **The fix is to move off the office network** (home, or a phone
  hotspot); then plain `git push` fast-forwards. **Never** disable TLS
  verification (`GIT_SSL_NO_VERIFY`, `http.sslVerify=false`) to get
  around it — you would be trusting whatever the block page returns.
  Memory `fortinet-git-push` carries the same rule.

  **The sibling WEBSITE repo is the exception** — still entirely
  uncommitted, deliberately deferred by the founder ("we will push
  later"). **Do not push it without asking**: the founder has a second
  clone of it in another folder, so the two copies may have diverged.
  Establish which is newer before pushing either — a force-push from the
  wrong folder silently destroys the other's work. Its `origin` is still
  the retired SSH URL and its GitHub repo may not exist yet; now that
  HTTPS + `gh` work, both are fixable in minutes when the founder asks.

- **This session (2026-07-20, latest) is COMMITTED — `7783839`**, and it
  swept up the previously-uncommitted work with it. One commit, 77 files
  (+2286 −675), including the 2 files that had been untracked for several
  sessions (`mock-server/seed-tracking.js`,
  `src/screens/Findings/LiveAnalysisStrip.tsx`). Working tree clean.
  The work: **rebrand the healthcare pack to Medcare UAE (demo)**, a UAE
  private hospital/clinic network, and seed it deeply enough to pitch the
  whole loop to a CFO — plus four real bug fixes found on the way. Full
  detail in the "This session (2026-07-20, latest)" section directly below.

- **The counterpart → agent rename is now committed too**, inside
  `7783839`. It could not be split out: ~65 files were rename-only, but 10
  more (`v4data.js`, `v4content.js`, `personas.ts`, `CLAUDE.md`, …) carried
  both the rename and this session's Medcare edits, and interactive
  staging is unavailable in the Claude Code environment. The user chose
  one honest commit over a partial split where neither half would
  typecheck. **The commit message says so explicitly** — don't be
  surprised by 65 files of renames inside a tenant-rebrand commit.

- **VISUALLY VERIFIED AT LAST (2026-07-21)** — the four-session-old open
  thread is closed. The Chrome extension failed to connect for a **fourth**
  time; stop waiting on it and use **headless Playwright** instead
  (chromium via the npx cache at
  `~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`, imported as
  `index.mjs`). Seed the session by `addInitScript`-ing four localStorage
  keys — `rewive.tenant`, `rewive.industry`, `rewive.personaLens`,
  **`rewive.guideSeen='1'`** (without the last one `/command` redirects to
  `/guide` on every fresh context — that redirect is intentional,
  `CommandCenter/index.tsx:23`, not a bug). Scripts are reusable in this
  session's scratchpad (`shots.mjs` screenshots, `probe.mjs` overflow,
  `links.mjs` a 13-route link/overflow sweep).
  **13 routes swept across 3 viewport widths: 0 console errors.**
  Three real visual defects found and fixed — see "This session
  (2026-07-21)" directly below.

- **The earlier session that day (2026-07-20) worked in the PRODUCT repo and COMMITTED
  everything** — two commits, `814ab8e` (senior-leadership findings view)
  and `fbefa56` (counterpart view, screen help, hierarchy default), plus
  this handoff. Working tree clean at handoff. Full detail in the
  "Previous session (2026-07-20, earlier)" section below. Not visually
  verified either.

- **The previous session touched ONLY the sibling website repo**
  (`../rewive-front-end_website`), which is **entirely UNCOMMITTED on top
  of its single `init` commit `9c195e7`** — every file changed or added
  (`index.html`, `preview.html` NEW, `story.html`, `demo.html`,
  `fonts.css` NEW, `README.md`). Nothing in this product repo changed
  this session except this handoff. Full detail in the
  "This session (2026-07-19/20)" section below.

- **PUSHED (2026-07-21) — `v5` is fully in sync with `origin/v5` at
  `e5a79ae`.** All 41 accumulated commits went up in one clean
  fast-forward (`45378ac..e5a79ae`). Zero unpushed. No PR opened yet.

  **The multi-session "push is blocked" saga is OVER, and the diagnosis
  in it was stale, not wrong-at-the-time.** HTTPS and `gh` work fine now
  — the FortiGate MITM was a property of the OFFICE network, not the
  machine. A `rianpraveen` token with `repo` scope was in the gh keyring
  the entire time; `gh api repos/Kumarv2509/rewive-front-end` confirms
  `"push": true` via collaborator access (Kumarv2509 is the owner
  account, rianpraveen is the founder's). The remote is now
  **HTTPS** (`https://github.com/Kumarv2509/rewive-front-end.git`) with
  `gh auth setup-git`, so plain `git push` just works.

  **The lesson worth keeping**: a previous session switched the remote to
  SSH to route around the firewall, and that workaround outlived the
  problem it solved — leaving SSH as the ONLY path, gated on a key nobody
  ever registered. Several sessions then inherited "push is blocked" as
  settled fact and never re-tested it. **Re-test environment assumptions
  before repeating them** — network conditions change between sessions.
  The SSH key thread (`id_ed25519_rewive`, github.com/settings/keys) is
  now MOOT; don't chase it. If HTTPS ever fails again, check whether
  you're on the office network before concluding anything.

  The numbered list below is older and undercounts — trust the `git log`,
  not the count. Commits since the merge point:
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
  29. `814ab8e` — **senior-leadership findings view** (2026-07-20,
      documented below): roll-up by direct report, cross-division
      themes, escalation trail, leadership actions.
  30. `fbefa56` — **counterpart view + screen help + hierarchy default**
      (same session): Findings grouped by the agent that raised each
      finding (now the default view), help moved into one popup, the
      lens picker trimmed to Group + Protein.
  31. this handoff commit.
- **UNCOMMITTED at handoff (deliberate — founder hasn't picked what to
  keep):**
  (a) **Manufacturing at parity + Gulf Precision tenant** — `v4data.js`,
  `datasetsdata.js`, `tenants.ts`, `CLAUDE.md`, one card in `site.html`;
  verified end-to-end, build+lint clean; documented below. Safe to commit
  as `feat(industry): manufacturing at parity`.
  (b) **MOVED OUT (2026-07-19): the marketing site now lives in its own
  sibling repo `~/Developer/rewive-front-end_website`** (founder's ask:
  "split the website build from the core product"). `public/site.html`
  → `index.html` there (root commit `9c195e7`, branch `master`, no
  remote yet); `story.html`/`demo.html`/`favicon.svg` were COPIED (the
  product keeps its originals — nothing in the app referenced site.html,
  verified by grep). Links rewritten for standalone serving (favicon +
  story relative; the 5 "Enter the live demo" CTAs →
  `http://localhost:5173/`, same convention as story.html). Its README
  carries the copy rules, the gradient exception, and the placeholder
  list. Preview: open `index.html` directly (fully self-contained) —
  `:5173/site.html` no longer serves it (vite's SPA fallback answers
  200 with the app shell; don't be fooled).
  **GitHub (2026-07-19, founder ask "create a repo in github also as
  a seperate under the sames git")**: `origin` is wired to
  `git@github.com:Kumarv2509/rewive-front-end_website.git` (same
  account + ssh.github.com:443 path as the product). Repo does NOT
  exist on GitHub yet and CANNOT be created from this machine (repo
  creation needs web UI/API; FortiGate breaks GitHub HTTPS; `ssh -T`
  re-tested this day: still *Permission denied (publickey)*). Two
  founder actions unblock it: (1) register
  `~/.ssh/id_ed25519_rewive.pub` under **Authentication keys** at
  github.com/settings/keys (`pbcopy < ~/.ssh/id_ed25519_rewive.pub`;
  success = key visible at `github.com/<username>.keys`) — this also
  unblocks the product's `git push origin v5`; (2) create an EMPTY
  repo (no README/license) named `rewive-front-end_website` under
  `Kumarv2509` at github.com/new. Then `git push -u origin master`
  from the website folder. History of how it was
  built (both sessions' passes below) remains valid — the file is the
  same, just relocated. **The site sections below say
  "`public/site.html`, UNTRACKED" — read that as the new repo now.**
  Original pre-split description, for context — the site was built and
  iterated by TWO sessions concurrently on 2026-07-18/19
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
- **[RESOLVED 2026-07-21 — kept for the lesson only.]** Three sessions
  recorded an SSH push failure here and concluded the founder had to
  register `~/.ssh/id_ed25519_rewive` at github.com/settings/keys. That
  conclusion was a dead end: the key was never the path. The remote had
  been switched to SSH purely to dodge the office FortiGate, and once
  off that network plain HTTPS + the existing `gh` keyring token pushed
  first try. See the PUSHED bullet at the top. **Do not resurrect the
  SSH-key thread.**
- **Escalation demoed live to the founder (2026-07-17)**: at stage speed
  the hero finding walked `protein_supply_chain → coo` on its own ~2 min
  after boot, watched in the browser (queue pill flipped, 12h reset,
  audit entry by 'Rewive (system)'). Server was then reset to the
  default 12x speed — that's what is running at handoff.
- **[RESOLVED 2026-07-21 — but NOT permanently; see the FortiGate bullet
  near the top, it fired again the same day.]** The FortiGate diagnosis
  in this bullet was accurate ON THE OFFICE NETWORK but was wrongly
  generalized into a permanent property of the machine. `gh` and HTTPS
  work fine elsewhere. The honest framing is that **this alternates with
  your location** — neither "push is blocked" nor "push works" is a
  durable fact about this repo, so **test, don't inherit either claim**.
  Memory `fortinet-git-push` still applies when actually on that network
  — never disable TLS verification to get around it.
- **Processes at handoff (2026-07-19, later): ALL DEV SERVERS DOWN** —
  session B's background `dev:all` task was stopped and this time the
  kill DID release :5173, :4000 and :5174 (verified by port probe;
  the old lingering-children gotcha didn't bite, but keep the
  kill-by-port reset handy: `for p in 4000 5173 5174; do kill $(lsof
  -ti tcp:$p); done`). Session A's :4000 API went down with it. Start
  fresh with `npm run dev:all`. Mock server still has
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

## This session (2026-07-23): agent reasoning names a cause + the Agent Teams view

Two asks in sequence, each after seeing the last in the running product:
*"i have a disconnect between the Senses and mandate on how the Agents
will interpret the reasoning"* → (built + shown) → *"can we build a clear
Agent vs Agent workforce team hierarchy which interconnects to run …
that was the initial concept."* Verified visually with **headless
Playwright** again — the Chrome extension failed a **7th** time
(`tabs_context_mcp` → "not connected"); stop trying it. Scripts live in
the session scratchpad (`test-cause.mjs` a pure-function harness for the
reasoning, `shot-reasoning.mjs` / `shot-strip.mjs` / `shot-teams.mjs`
screenshotters). Seed localStorage the usual four keys (`rewive.tenant`
='americana', `rewive.industry`='fmcg', `rewive.personaLens`='all',
`rewive.guideSeen`='1').

### 1. The reasoning gap — the agent reasoned to a COST but never a CAUSE

**The diagnosis is the valuable part.** The Operating Picture is a graph
`sense (driver) → mandate (stream_kpi) → P&L line → intent (target)`,
and 24 edges even carry a written `rationale`. But the LIVE finding
pipeline only ever walked *downstream*:

- **Detection** (`drift.js`) reads only the mandate's own metric — no sense.
- **Impact path** (`sweep.js` `computeImpactPathNodes`) walked edges *up*
  from the mandate to the intent; it never descended to the sense, and
  threw the edge `rationale` away.
- **Narrative** (`authoring.js`) was handed `[mandate, P&L, intent]` names
  only — so even the prose author could not name a cause.

The tell: SEEDED findings look complete only because a human hand-wrote
the cause into their `evidence` rows; LIVE findings' evidence just
restated the mandate's own number three ways. **The agent quantified
consequence and was blind to cause, with the causal material one hop
away, unused.** (The founder chose the cheapest of three fix layers —
narrative + impact path — over touching detection.)

**The fix (view-pipeline only, no schema change):**
- `sweep.js` — renamed `computeImpactPathNodes` → `computeImpactPath`,
  now returns `{ nodes, upstreamSignals }`. It **prepends the strongest
  SENSE (a `driver`) feeding the mandate as the leaf step** (falls back
  to the strongest leading indicator; if the mandate has no upstream edge
  at all, no prepend — graceful) and collects up to 3 upstream
  contributors + their edge rationales as `upstreamSignals`. Also fixed a
  latent bug found on the way: the downstream walk now **prefers a hop
  that lands on the intent** (target-kind), so the chain actually reaches
  the org target instead of wandering into P&L lines and stopping short.
  `assembleFinding` now takes `pathNodes` as a param instead of
  recomputing. `computeImpactPath` is `export`ed for the test harness.
- `authoring.js` — `upstreamSignals` go into both the Claude payload and
  the template; system prompt instructs "step 0 is the suspected cause,
  cite ONLY provided signals, never invent one." The template weaves the
  cause into the summary and adds an `Upstream signal · …` evidence row,
  keyed off `impactPathNames.indexOf(node.name)` so the mandate's reading
  lands on the mandate step (no longer index 0).
- `src/screens/Findings/Detail.tsx` — a **Suspected cause** callout
  (accent left-border box, paper-ledger tokens) renders under the summary
  **only when `impactPath[0].kind === 'driver'`**. It names the sense and
  its "why" (from the upstream-signal evidence row). This is the visible
  marker that the reasoning fired.

**The renderer was already ready:** `ImpactPath.tsx` has always had
`kindLabel = { driver: 'sense', … }` — no finding, seeded or live, had
ever populated a `driver` step. This is the first thing that does.

**Verified in a real sweep** (template path — no `ANTHROPIC_API_KEY`):
`fmcg-k-fill` → path `[sense] DC stock snapshots → [mandate] Case fill →
[mandate] On-shelf availability → [intent] Market share`; summary ends
"Upstream, dc stock snapshots is the signal most likely behind it";
evidence has the upstream row; the callout renders.
**The honest gap:** it can only cite a cause where the graph HAS a
sense→mandate edge. `fmcg-k-cpc` (cost per case) has none, so it shows
cost-only — no fabricated cause. Wiring senses into those mandates is a
**seed-data** task (add `driver → mandate` edges in `v4data.js`), not
pipeline; flag it if every live finding must name a cause.

### 2. The Agent Teams view — the loop as a team hierarchy

The founder's "initial concept": holder **agents** each command a
**workforce** of workers, interconnected to **run**. Ground truth found
in the data model: the three roles are narratively described but only
half-wired — a worker (`AgentCatalogEntry`) has **no** link to its holder
agent or origin finding, and a run links to a worker only by a loose
`agentName` **string**. BUT the **mandate node is already the pivot**: a
holder agent `watchesNodeIds` a mandate, and a worker `mandateIds` the
same node. Founder chose **spine = holder-agent org tree** and **depth =
view-only (infer joins, no schema change).**

`src/screens/AgentTeams/index.tsx` (NEW, self-contained — deliberately
does not re-extract from ShadowOrg) assembles from `useShadowOrg` +
`useAgentCatalog` + `useKpiBrain` + `useFindings`, all lens-scoped:
- chief banner (org level) → each function agent as a team block → its
  workforce nested under it. The join is **`worker.mandateIds ∩
  agent.watchesNodeIds`** — persona is NOT the key (Planning /
  Manufacturing / Logistics / Quality all share `operations_head`; only
  the mandate overlap disambiguates). Each worker row shows the **shared
  mandate chip** (the visible thread), its ROI, and runs + last-run.
- Route `operate/agent-teams`; **Teams** added as the FIRST tab in
  `AGENTS_TABS` (so order is Teams · Agents · Workforce). The rail item
  still lands on `/operate/counterparts` — flip the rail target in
  `areas.ts` if Teams should be the default landing (not done — founder
  call).
- Workers whose mandate no agent watches fall into an "Unaffiliated
  workers" bucket (empty in fmcg seed — all 6 workers join cleanly).
- Gotcha fixed: `AgentCatalogEntry.lastRunAt` is **already a display
  string** ("1h ago"), NOT an ISO date — do not run it through a relTime
  helper (that printed "NaNd ago"). Rendered directly.

**Open judgment calls (left for the founder):** (a) it lists all 15
function agents, so it's a long page — many have 0–1 workers; could
collapse empty agents into a strip. (b) runs are a count only; deeper
run→worker linking was the "harden the joins" option deliberately
deferred.

### Servers / state at handoff (2026-07-23)

**LEFT RUNNING, non-default config** — `npm run dev` (vite :5173) plus a
separate mock server on :4000 started as
`REWIVE_SWEEP_MS=0 REWIVE_SLA_HOURS_PER_TICK=0 REWIVE_SWEEP_PACE_MS=0
node mock-server/server.js` (frozen SLA, no auto-sweep, zero pace). **A
sweep was run manually**, so live findings exist in memory (no
`DATABASE_URL` — all in-memory); the demoed one is
`live-f-fmcg-k-fill-<ts>` (id is timestamped — re-fetch from
`/findings?persona=all` if you need it, or re-run a sweep). Restart with
plain `npm run dev:all` for normal demo behaviour. Reset ports with
`for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`. Build
(`tsc -b && vite build`) and `eslint .` both clean at handoff.

## This session (2026-07-21, latest): the live sweep — the strip never went live

Closes the last "unexercised interactively" item. The sweep **worked
server-side all along** (14 mandates walked, findings raised, outcomes
correct); what had never been checked was whether the UI shows any of it.
It did not.

### The defect — the live analysis strip never went live

Pressing "Run sweep now" on the Findings strip left the header reading
**"Agents idle · last swept 15s ago"** for the entire ~13s run. The
progress bar never rendered. The new run's data only landed ~18s in,
long after it finished. A feature built to make agent work watchable —
and deliberately paced at 900ms/mandate so it *reads* rather than
flashes — showed nothing.

**Root cause: a chicken-and-egg in the poll interval.**
`useSweepProgress` polled fast only when the cached data already held an
unfinished run: `data && !data.finishedAt ? 1_200 : 20_000`. Starting
from idle the cache holds the *previous, finished* run, so it sat on the
**20s** interval — longer than the ~12.6s sweep. The next poll therefore
always landed after `finishedAt` was set, so an in-flight run was never
observed and the live branch never rendered.

`useRunSweepNow` could not rescue it: **`POST /agent-sweep` is
synchronous**, holding the request for the whole run (measured: 12.6s),
so `onSuccess` fires after the sweep is already over — and it did not
invalidate `sweep-progress` at all.

**Fix** (`src/api/tracking.ts`, `LiveAnalysisStrip.tsx`):
`useSweepProgress(sweeping = false)` also polls at 1.2s while a trigger
mutation is in flight, and the strip passes `runSweep.isPending`. Plus
`sweep-progress` added to the mutation's invalidation so the finished
run lands at once. **Verified**: polls now tick steadily every ~1.2s
through the run and the strip walks `25% "1 of 4" → 50% "2 of 4"`.

Why it survived: the previous session verified mid-sweep polling
**against the API with curl**, which works fine — the bug lives entirely
in the client's polling schedule. Same lesson as the CSS defects: an
API-level check cannot see it.

### Two behaviours that are correct — do not "fix" them

1. **The strip settles at ~3.9s, before the run ends at ~12.7s.** That
   is intended: it settles when **your** industry's 4 mandates are done,
   not when the global 14-mandate run finishes. Verified deliberate in
   the earlier handoff section.
2. **Cold start renders no strip at all.** With no run ever recorded,
   `/sweep-progress` returns `null` and the strip — *including its
   button* — does not exist. You must trigger the first sweep from
   **Connectors**; only then does Findings gain a strip. Worth knowing
   for a deployed demo cold start, and it is why a test that clicks the
   strip's button must seed a run first.

### Minor, unfixed

- The bar never reaches 100%: it goes `2 of 4` → settled, because `live`
  turns false the instant `done === steps.length`. You never see a
  completion state.
- While settled-but-still-running the header says "Agents idle" whilst
  the button still reads "Sweeping…". Defensible (idle *for your
  mandates*) but it reads oddly next to a spinner.

### Test mechanics that cost time — reuse these

- **Sample the DOM with `page.evaluate`, never `locator.innerText()`.**
  On a missing selector Playwright's locator blocks for its full 30s
  timeout — longer than the sweep — so the first three samples burned
  90s and the entire live window was missed. `evaluate` returns `null`
  instantly.
- **Disable the dev sweep interval** (`REWIVE_SWEEP_MS=0`) or a
  background sweep fires every 60s mid-test and holds the `liveLock`.
- The strip's own button and the Connectors button are different paths:
  triggering from Connectors leaves an idle Findings tab on its 20s
  poll, so it still will not see the run. Only the strip's own button
  now goes live.

## This session (2026-07-21, Agents rail survey): read but not touched

A short session. The founder asked to open the product, then to "work on
the Agent page", chose **both tabs** and **"show me it first"** — so this
was a read, and it stopped at the point where the next move needed a
decision that hadn't been made. **No files were changed.**

### Mechanics worth keeping

- **Both servers were already up** from a previous session (mock API
  :4000 pid 31068, vite :5173 pid 31093). Check before launching —
  `lsof -i:5173 -i:4000 -sTCP:LISTEN -P`. The stale-port trap in the
  section below is real; a second `dev:all` would have drifted vite to
  :5174 and served stale code.
- **The Chrome extension failed for a SIXTH time** —
  `tabs_context_mcp` returned "Browser extension is not connected".
  Fell back to `open http://localhost:5173/`, which works but gives you
  no way to read the page back. **The product was never visually
  verified this session** — everything below comes from reading source,
  not from looking at pixels. If you need to see it, use headless
  Playwright as the earlier sessions did.

### The two tabs, as they actually are

`AGENTS_TABS` in `src/components/shared/SectionTabs.tsx` binds them.

**Agents (mandate holders)** — `/operate/counterparts` →
`src/screens/ShadowOrg/index.tsx`, 230 lines, everything in one file.
A chief banner (the agent with `reportsToAgentId === null`) carrying
three roll-ups, then a 3-column grid of per-stream cards. Each card:
health pill, an "agent to" human block (the *held twice* pairing),
three stats, mandate chips deep-linking to `/build/picture?focus=<id>`,
the temperament dial with its consequence hint, and a footer that
expands the agent's open findings inline. Data via
`useShadowOrg` / `useFindings` / `useKpiBrain`, all lens-scoped.

**Workforce (workers)** — `/insights/agents` →
`src/screens/AgentSpace/`, 5 files, ~140 lines total. FilterBar
(status chips, build-path chips, search) → AgentGrid → AgentCard
(pills + ROI / token cost / runs), plus a detail route at
`/insights/agents/:agentId` rendering a `.card.preview` spec sheet.

### Five observations — the raw material for whatever comes next

1. **The two tabs are stylistically unrelated.** ShadowOrg is
   hand-built with ~40 inline style objects; AgentSpace uses CSS
   classes (`.agent-card`, `.ac-name`, `.ac-stats`). Same rail item,
   two design vocabularies — the stat tiles in particular render
   completely differently on each tab. This is the biggest finding.
2. **Asymmetric depth.** Workforce has a detail page; Agents has none.
   Clicking a worker navigates, clicking an agent does nothing.
3. **`ShadowOrg/index.tsx:50` uses `var(--accent-grad)`** on the
   temperament dial fill. It *renders correctly* — the token is a
   same-colour `linear-gradient(135deg,#3B3BC4,#3B3BC4)`, verified in
   `globals.css:7` — but per the paper-ledger rules `var(--accent)`
   would say what is meant. Cosmetic, not a bug.
4. **Hardcoded colours bypass the tokens**: `#fff` on the dial knob
   (`:51`), `rgba(59,59,196,.28)` on the chief card border (`:209`).
5. **The Agents grid is fixed at `repeat(3, 1fr)`** with no responsive
   fallback, unlike Workforce's `.agent-grid` class.

### The open question this session ended on

The founder was asked to choose between **unifying the two tabs' visual
language**, **giving Agents a detail page**, or something else — and the
session ended before an answer. Do not guess: (1) and (2) are different
sizes of job and (1) in particular means deciding whether ShadowOrg
moves to classes or AgentSpace moves to inline styles. That is a
founder call about where this codebase's styling convention is heading,
not a cleanup you can infer.

## This session (2026-07-21, later): the disposition flows, driven for real

The previous session ended with "Nothing was clicked." This one clicked
everything in the four-A loop. Verification was again **headless
Playwright** — the Chrome extension failed for a **fifth** time. Stop
trying it; the mechanics in the bullet near the top of this file are the
supported path. Scripts live in the session scratchpad (`dispo.mjs` the
four-A driver, `actchain.mjs` the Act chain, `escalate.mjs` escalate +
the error path, `overflow.mjs` the reachability probe) — they are
throwaway but worth rewriting the same way.

### Two methodology traps that cost real time — read before writing UI tests

1. **A finding's persona DRIFTS out from under you.** The first run was
   built on personas read from a mock server that had been running for
   hours, and the demo heartbeat had walked the entire queue up to the
   Group CEO. Three of four cases then rendered `LeadershipBar` instead
   of `DispositionBar` and found nothing to click. **Never hardcode a
   lens** — read the owner from the API at run time, and run the mock
   server frozen (`REWIVE_SLA_HOURS_PER_TICK=0`, i.e.
   `npm run mock-server:frozen`) so nothing escalates mid-test. This is
   the same "restart to reset" hazard the heartbeat bullet already
   warned about, in a new disguise.
2. **`LeadershipBar` and `DispositionBar` both use `.dispo-opt`.**
   Counting that selector tells you nothing about which component
   rendered — the leadership actions (Ask / Reassign / Raise priority /
   Take it) carry the identical class. Key off the heading string
   **"This finding needs a disposition"** instead.

Each finding must be driven under a lens that OWNS it (`isOwner` in
`Detail.tsx:58`), or you get the leadership bar by design.

### What passed

All four dispositions, end to end, correct toast, and the bar retiring
into a decided thread step afterwards:

- **Accept** → closure KPI created. One run landed on a `live-*`
  finding and correctly produced a `live-c-*` closure — the
  Postgres-routed branch, covered by accident but worth keeping.
- **Act** → solution design, seeded from the finding's own narrative,
  and onward through the whole chain: Run validation → Send for
  approval → Approve (as reviewer) → **Design worker →** →
  `/build/agent-studio/agt-*`. Note the final CTA says **worker**, not
  "agent spec" — the rename landed here.
- **Acknowledge** → custom re-alert condition persisted verbatim.
- **Abandon** → the reason guard genuinely works: Confirm is disabled
  with an empty reason and enables on input.
- **Escalate** ("Not mine — escalate ↑") → ownership moved
  `protein_supply_chain → coo` with the trail recorded.

Also probed: the finding-thread impact path overflows horizontally but
is **`overflow-x:auto` and genuinely scrollable** — it is NOT a
recurrence of this file's defect #1 (which was clipped-and-unreachable,
`scrollWidth === clientWidth`). Document never overflows at 1440 /
1280 / 1024.

### Defect 1 (fixed) — every Act navigation fired two 404s

`SolutionDesign/index.tsx` called `useSignalDetail(solution.signalId)`,
but a solution opened by Act carries the **finding** id as `signalId`
(`app.js`: `signalId: finding.id`), and `/signals/:id/detail` only knows
legacy v1 signals. Result: `404 GET /api/v1/signals/<findingId>/detail`
twice on every Act, console noise on a demo path.

Not a crash — `signalDetail` feeds only `matchesWithSolutions`, guarded
with `?? []`. The real consequence is quieter and worse: the **"copy
from a prior solution" affordance is permanently dead for anything
reached through Act**, which is the only way findings enter the build
loop. Fixed by not making the request: the `/-f-/` test that already
existed for the back link is now a named `isFindingId` helper used in
both places.

### Defect 2 (fixed) — the disposition error toast lied

`DispositionBar`'s `onError` was a single hardcoded string, so **every**
failure — 400, 404, network drop — told the user *"Could not record the
disposition — abandon needs a reason"*. Reproduced with two tabs on one
finding: tab 1 accepts, tab 2 is stale, its click returns
`400 This finding already has a disposition`, and the user is told to
write an abandon reason for a disposition they never chose.

Now surfaces the server's own message, falling back to a neutral line.
There was **no existing convention** for this in the codebase (every
`onError` is a hardcoded string), so the extraction is deliberately
local and inline rather than a new shared error layer — if a second
screen needs it, that is the moment to lift it.

**Cosmetic, not fixed**: the `.toast` component renders a ✓ glyph even
for errors. It has no error variant; adding one touches every toast in
the app, so it wants a deliberate pass rather than a drive-by.

### Found and NOT fixed — a founder call: disposition has no authority check

`POST /findings/:id/disposition` (`app.js:1611`) checks only
`status === 'open'`. It never checks **who** is deciding — no actor is
even sent. Verified: escalate a finding two levels up to `group_ceo`,
then POST a disposition as the original owner → **HTTP 200**. The UI
agrees: after clicking "Not mine — escalate ↑", the four-A buttons are
still offered to the person who just disowned it (lens is below the new
owner, so `leadsOwner` is false and `DispositionBar` renders).

This is **asymmetric with the leadership route**, which enforces
authority server-side (403 if not strictly above the owner, 400 for an
out-of-subtree reassign) and where this file records a deliberate
property: *"Take it transfers ownership and thereby forfeits the
leadership actions, so you cannot push a finding around forever."*
Escalation has no equivalent — you can disown a finding and still
decide it.

Left alone on purpose: tightening it is a product decision, and it could
change demo behaviour. **Decide whether escalating should forfeit the
disposition** the way Take it forfeits the leadership actions.

## This session (2026-07-21, earlier): first visual verification — three CSS defects fixed

Servers were down at start; `npm run dev:all` brought both up clean. The
extension refused a fourth time, so verification moved to headless
Playwright (mechanics in the bullet above). All three defects were
**CSS-only**; no component logic changed. Build + lint clean.

### 1. Findings · By agent was clipping its whole right column (the bad one)

`.ag-grid` was `repeat(2,1fr)`. Grid items default to `min-width:auto`, so a
wide child **floored the track at 600px** instead of letting it shrink. At
1440px the second card's right edge sat 76px past the viewport; at 1280px,
236px past. Critically `document.scrollWidth === clientWidth`, so the
overflow was **clipped and unreachable — not scrollable**: the disposition
pills (`acting` / `accepted` / `closed`) sat entirely off-screen, meaning a
finding's state was invisible in what `fbefa56` made the **default** view.
Fix: `repeat(2,minmax(0,1fr))` — one token. `.ag-row-title` and the
`.ag-head` flex child already carried `min-width:0`, so nothing else needed
touching. Re-probed at 1440/1280/1024: zero offenders.
**Watch for this class of bug elsewhere** — it is invisible to `tsc`, to
eslint, and to any API-level check, which is exactly why it survived
several sessions of backend-only verification.

### 2. `.btn` rendered as a `<Link>` came out underlined

There is **no global `a{text-decoration:none}`** in `globals.css` — every
class opts in individually (`.ag-row`, `.agent-card`, `.nav-item`,
`.sw-step` all do), and `.btn` never had. So every `<Link className="btn">`
in the app — the Disposition buttons all down the Today queue — drew a
browser-default underline through solid button text. Added
`text-decoration:none` to `.btn`.

### 3. Queue titles and prose links were default browser blue

`.dec-item .t1 a` had no rule → underlined blue finding titles in
`UnifiedQueue`. Now `text-decoration:none;color:inherit` with a
`.dec-item:hover .t1 a` accent, matching the `.ag-row` convention.
Three inline prose links (`UnifiedQueue` "…on Findings.",
`DecisionsTable` "View the finding it answered →", `Tasks` line 46 —
whose `task.solutionName` is a finding title) got a new reusable
**`.link`** utility (accent-deep, no underline, underline on hover),
matching `.sec-head .all` and the inline copy at `PlStatement.tsx:152`.
**Use `.link` for inline prose links from here on** rather than another
one-off inline style.

### Verified this session

`/command`, `/operate/findings` (both views), `/operate/decisions`,
`/operate/runs`, `/operate/tasks`, `/operate/counterparts`,
`/insights/agents`, `/insights/people`, `/build/picture`, `/build/kpis`,
`/build/connectors`, `/guide`, `/`, `/login?org=medcare-uae` — under
Medcare/CFO and Americana/Group-CEO lenses. Zero console errors, zero
underlined links, zero horizontal overflow. The Medcare CFO pitch reads
as intended (mandate-sectioned queue: CLAIM DENIAL RATE ×4 → denials &
write-offs, DAYS IN AR ×3 → net patient revenue; AED 3.1M measured
impact).

### Then: the push saga ended — and it was a self-inflicted wound

Worth reading before trusting any environment claim in this file.

The founder asked to push. Following this handoff, the session reported
push as blocked on an unregistered SSH key, tested both local keys,
re-ran the push to show the real error, and told the founder several
times that only they could unblock it — pointing them at
github.com/settings/keys. **All of that was wrong.**

The founder said *"so far i was able to push"*. That one line was the
signal, and it should have been acted on immediately instead of after
several more refusals. Investigating it took under a minute:

- `gh auth status` → logged in as `rianpraveen`, token in keyring, scopes
  include `repo`
- `gh api user` → live call succeeds; `curl https://github.com` → **200**
- `gh api repos/Kumarv2509/rewive-front-end` → **`"push": true`**
  (Kumarv2509 is the owner account, rianpraveen is the founder's, with
  collaborator write)

`gh auth setup-git` + an HTTPS push worked first try:
`45378ac..e5a79ae`, 41 commits, clean fast-forward. Remote switched to
`https://github.com/Kumarv2509/rewive-front-end.git`; plain `git push`
now works with no flags.

**Root cause — a workaround that outlived its problem.** An earlier
session hit the office FortiGate MITM and switched the remote to SSH to
route around it. The FortiGate diagnosis was CORRECT ON THAT NETWORK but
got generalized into a permanent property of the machine. That left SSH
as the ONLY path, gated on a key nobody ever registered — and three
sessions inherited "push is blocked" as settled fact without re-testing.
A valid credential sat in the keyring the whole time.

**Rule going forward: re-test inherited environment claims before
repeating them to the founder.** Network conditions change between
sessions. The two-second test is `gh api user` and
`curl -sS -o /dev/null -w "%{http_code}" https://github.com`. The
`id_ed25519_rewive` / settings/keys thread is **dead — do not resurrect
it**; the two stale "push is blocked" bullets further down are stubbed
with pointers here, and memory `fortinet-git-push` was rewritten to lead
with HTTPS and scope the firewall to the office network.

### Still unresolved

- The **Group-CEO density edge** the previous handoff flagged is real but
  looks better than feared: 16 agent cards / 44 findings, with the rich
  cards (Planning 9, Logistics 5) sorted to the top. Now that the columns
  actually fit it reads as a long page, not a broken one. **Founder call**
  whether to collapse single-finding agents into an "also raised" strip —
  don't do it unprompted.
- `fullPage` screenshots only capture the viewport: the app scrolls an
  inner container, not the document. Screenshot per-scroll-position or
  target the scroll container if you need full-page images.
- **[RESOLVED 2026-07-21, later — partially.]** "Nothing was clicked."
  The four-A dispositions, the full Act → solution → **worker** chain,
  and escalate are now all driven interactively (see the section above).
  **Still unexercised: the live sweep and the help popup** — the sweep
  strip has only ever been seen idle ("Agents idle · last swept 42s
  ago"), so its pulse and pacing remain unwatched. That is the natural
  next piece of work; reuse the scratchpad scripts and remember to run
  the mock server frozen.
- **PR #5 is open but unreviewed and unmerged.** It is a large diff; the
  body already flags the two things that would otherwise look like
  problems (the ~65 rename-only files bundled into `7783839`, and the
  absence of any test suite). The two places reviewer time actually pays
  off are the tracking pipeline and the P&L cascade — most of the rest is
  seeds and renames.
- **Servers at handoff (2026-07-21, latest): LEFT RUNNING on :5173 +
  :4000 in a NON-DEFAULT configuration — both the SLA clock and the
  sweep interval are OFF.** Started as:

  ```
  npx concurrently -n web,api -c blue,green "npm:dev" \
    "REWIVE_SWEEP_MS=0 REWIVE_SLA_HOURS_PER_TICK=0 node mock-server/server.js"
  ```

  **This is not `npm run dev:all`, and the difference will mislead you.**
  `REWIVE_SLA_HOURS_PER_TICK=0` freezes SLA clocks, so nothing escalates
  and finding personas stay put (essential for UI tests — see the
  disposition section). `REWIVE_SWEEP_MS=0` disables the 60s background
  sweep, so **the agents will never sweep on their own**: a strip that
  sits idle forever is this flag, not a bug. Restart with plain
  `npm run dev:all` for normal demo behaviour (12x SLA decay, sweep
  every 60s).

  **Seed state is heavily mutated** by this session's tests — findings
  dispositioned, solution designs and a worker spec created, sweeps run.
  Restart to reset (no `DATABASE_URL`, so tracking state is in-memory
  too).

  The lingering-children gotcha still applies: stopping the task does
  not reliably kill `concurrently`'s children, and a stale :4000
  silently serves old seeds. Reset with
  `for p in 4000 5173 5174; do kill $(lsof -ti tcp:$p); done`.
  Confirming the previous session's note: killing by port DID take down
  the long-lived `dev:all` task cleanly.

## This session (2026-07-20, later): live agent analysis, seeded tracking, entity scoping, the rename (ALL UNCOMMITTED)

### What prompted it

Four asks in sequence, each uncovering the next: *"i want something on finding
that the agents started working ... kind of a live view that agents are doing
their analysis"* → *"yes seed a few tracked mandates by default"* → *"remove all
the counterports which is not protein ones"* + *"i think the Entity view is very
critical as it is mixing up"* → *"instead of counterpart can we rename it as
agent or something"*.

### 1. The live analysis strip (`src/screens/Findings/LiveAnalysisStrip.tsx`)

The sweep was **atomic and opaque**: it wrote nothing between `insertSweepRun`
and `finishSweepRun`, so there was nothing to watch. It now writes a per-mandate
analysis trail to a new `sweep_runs.progress` jsonb column as it walks —
`queued → analyzing → authoring →` an outcome (`clear` / `drift` / `raised` /
`re-alert` / `recovered` / `skipped`). `GET /sweep-progress` serves the newest
run **industry-scoped** (a sweep walks every industry in one pass; without the
filter Metro Health watched FMCG fill rates).

**Two things make it watchable and MUST stay:**

1. **Pacing** — `REWIVE_SWEEP_PACE_MS`, default 900ms per mandate, **skipped on
   `cron`**. Six mandates otherwise finish in well under a second and the strip
   flashes rather than reads.
2. **The `liveLock` exemption.** `app.js:73` deliberately serializes every
   request (hydrate → handler → persist) so concurrent polls can't lose a
   disposition. The sweep holds that lock for its **whole run**, so the first
   poll didn't return until the sweep finished — the feature was dead on
   arrival. Diagnosed by timing: POST returned at 5.42s, first GET also at
   5.42s. Fixed with a `LIVE_LOCK_EXEMPT` set containing **only**
   `/api/v1/sweep-progress`, which reads the tracking store and touches no
   shared in-memory state. **Do not add a route to that set unless the same is
   true of it** — the lock is load-bearing.

Client: `useSweepProgress()` polls 1.2s while live, backs off to 20s idle.
The strip invalidates the `findings` query as each raise lands — counted off
`steps`, **not** `run.findingsRaised`, because the counters are only written at
`finishSweepRun` and this has to move mid-run. It settles when **your**
mandates are done rather than when the global run finishes (otherwise it pulsed
"4 of 4" for ~7s more), and the button stays disabled until the global run ends
because a click would hit the lock and return `skipped`.

### 2. Default live-tracked mandates (`mock-server/seed-tracking.js`)

12 mandates, 4 per industry — 2 reading `clear`, 2 that raise on the first
sweep. Called from `server.js` at boot **and** once per instance from
`api/handler.js` (deployed demos never run `server.js`).

- **Numbers are NOT invented**: target and latest are parsed off each brain
  node's own `targetValue`/`currentValue`. Since `overlayLiveTracking` writes
  the same figures back, the Operating Picture is unchanged — verified fill
  rate still reads 92.4% / 97%.
- **Thresholds are per-mandate** because real tolerances differ (bed occupancy
  wanders further than a food-safety audit score). This is what lets a genuinely
  near-target mandate read `clear` instead of tripping `sustained_deviation`.
- **Idempotent two ways**: no-ops once any config exists, and points are
  **snapped to midnight UTC** so a re-seed updates the same 30 rows. Without
  that, boot-time-of-day timestamps meant two instances cold-starting at once
  would lay down a second offset series. Tested concurrent re-seed: still 30
  points.
- Cosmetic: currency now renders `AED 3.9`, not `AED 3.90` — that is
  `formatValue`'s existing trailing-zero behavior for any live-tracked currency
  node, not something this change introduced.

### 3. Non-Protein division counterparts removed (19 → 16)

Removed `fmcg-sa-gi-supply`, `fmcg-sa-fnv-supply`, `fmcg-sa-ambient-supply`.
The Protein three and all function-level ones stay; **G&I / F&V / Ambient still
exist as roles in the hierarchy** — only their agents are gone.

Their 8 seeded findings were **repointed** to the function-level agent owning
each stream (planning → Planning, logistics → Logistics, …). By-agent grouping
tolerates a missing agent (`agent: ShadowAgent | undefined`), but the removed
names would have kept appearing as group headings. **A later pass caught 7 more
display strings naming the deleted agents** — `informedBy.name` in `data.js`
ledger rows and `watchedByAgentName` on two `v4data.js` closures. Verified: 0
orphaned agent refs across 42 findings.

### 4. The entity mixing — three real scoping bugs

**The diagnosis matters more than the fix.** `entity` is a legal-entity string
on three types; a **division** is a subtree of the persona hierarchy. **Nothing
joins them**, so nothing validates that a row's entity matches its persona's
division — and the seed data disagrees with itself (`KSA Manufacturing Co.` is
clearly the G&I entity, yet Protein rows are seeded onto it; `UAE Trading Co.`
carries all four divisions).

But the mixing the founder saw was two missing filters:

- **`/decisions/stats` took no persona/scope at all.** It builds the stat tiles
  AND the By-entity/By-region half-year rollups, so a division COO saw a
  company-wide rollup above a correctly role-scoped ledger table — the two
  halves of one screen disagreeing. Now lens-scoped; `useDecisionStats(persona,
  scope)` threaded through `StatsRow`, `HalfYearReview`, `TodayStats`.
  Verified: COO — G&I went from all four entities to just `KSA Manufacturing Co.`
- **`/closure-kpis` was unfiltered** → Watching/Closed listed every division's
  exit conditions. **`ClosureKpi` has no `persona`**, so `filterByPersona` would
  have dropped every row; they now inherit their finding's scope via
  `filterClosuresByPersona`. It **fails open** on an unresolvable `findingId`
  because two seeded manufacturing closures (`mfg-c-h1`, `mfg-c-h2`) point at
  findings that don't exist — a pre-existing seed bug; hiding them under every
  lens would be worse than showing them under all.
  **`FindingDetail` deliberately stays unscoped** — it looks up one closure by
  id, and the detail page lets you read findings you don't own.
- **Entity was dropped on every runtime-created row.** Rollups skip blank-entity
  rows, so live activity was invisible in By-entity while still counted in the
  tiles above it. Sweep-raised findings now inherit entity/region from their
  **tracking config** (new `entity`/`region` columns), and Accept-created
  closures inherit from their finding.

**NOT fixed — a data decision, not a bug:** the Protein COO still sees all four
entities. `personas.ts:115` puts legacy roles (`operations_head`,
`sales_supervisor`, `store_manager`) under `coo`, and their seeded findings span
every entity. The filter is correct; the seeded entity assignments are what
disagree. Needs someone to decide the intended mapping.

### 5. The rename — three concepts, not two

The founder asked for counterpart → "agent or something". **"Agent" was already
taken** by the rail item containing counterparts, plus the whole Workforce
concept (executors with capabilities/ROI/token cost, built from Act). Founder
chose agent anyway, with Workforce agents becoming **workers**.

| Concept | Word | Does |
|---|---|---|
| Mandate holder | **agent** | Watches a number, raises findings |
| Executor | **worker** | Runs tasks; built from a finding's Act flow |
| Assessor | **assessor agent** | Delivers the later verdict |

*The Planning **agent** raised it → you spawn a **worker** to fix it → an
**assessor agent** says whether it worked.* Nav: rail "Agents" → tabs
**Agents** | **Workforce**.

**Order mattered**: Workforce (agent→worker) FIRST, then counterpart→agent —
once counterparts were "agents" the two were mechanically indistinguishable.

**Frozen from the replace** (a blanket find-and-replace over "agent" WILL break
the app): union literals (`type: 'agent' | 'policy'`), CSS classes
(`agent-card`, `agent-grid`), route slugs (`/insights/agents`,
`/build/agent-studio`, `/operate/counterparts`), camelCase identifiers
(`counterpartName`, `findCounterpart`, `agentType`), and **"Assessor agent"**.
URLs and internals keep the old names on purpose — same convention as the older
`shadow` naming — so bookmarks keep working.

**The mechanical pass DID produce damage; all of it was found and fixed:**

- **20 broken articles** — "a counterpart" became "**a** agent" (plus 3 "an
  worker"). This hit the Landing thesis line.
- **"counterpart agents" collapsed to "agent agent"** in 4 files, including the
  Claude authoring system prompt in `authoring.js`.
- **Landing + Tasks conflated the concepts at the Act stage** — "tasks handed to
  agents", "new work goes to agents, existing agents are reused" → workers.
- **Guide taught stale screen names** — "Agent Space lists every agent" when the
  screen is now Workforce listing workers; breadcrumbs `Agents · Agents` and
  `Performance · Outcomes · Agents`.
- One stray `app.js` publish message: "now live in Agent Space" → Workforce.

`CLAUDE.md` now carries the three-concept table and an explicit warning against
blanket-replacing "agent".

### Verified / not verified

**Verified against the running API**: mid-sweep polling advances one mandate at
a time; `?industry=healthcare` returns null during an FMCG sweep; 16 agents, 0
orphaned refs; G&I COO scoped to one entity; live findings carry entity/region
and appear in the By-entity rollup; 13 "Assessor agent" strings intact, 0
wrongly renamed; workforce catalog reads "… Worker". Build + lint clean.

**NOT verified**: anything visual. The Chrome extension never connected. The
strip's pulse/spacing/dark-mode, and whether "Workforce" overflows a nav chip or
card heading where "Agents" fit, are unchecked. `/`, `/guide`, and
`/operate/findings` are the three to eyeball.

## Previous session (2026-07-20, earlier): the senior-leadership problem — roll-up, counterpart view, help popup (`814ab8e`, `fbefa56`)

### What prompted it

The founder, looking at the app as a CEO/CFO lens: *"the findings seems to be
overwhelming for someone to act on ... i can understand for the supply chain
team, but how to optimize this view for senior leadership"*.

Measured against the running API before touching anything — the diagnosis is
the whole design:

| Lens | Role scope | + their team |
|---|---|---|
| Group CEO | 1 open | **25 open** (42 total) |
| CFO | 1 open | 6 open |
| COO — Protein | 2 open | 9 open |

Role scope was fine. With "+ their team" on, `useEffectiveLens` returned
`[self, ...subtree]` and `Findings/index.tsx` filtered ONE array, so a
store-level finding rendered identically to the CEO's own call — same red SLA
pill, same **Disposition** button. The product's model already said escalation
is what moves a finding up the line; the UI ignored it.

**The principle the session settled on:** *a senior leader does not inherit
their team's queue, they inherit their team's exceptions.* Everything below
follows from that one sentence — keep it if this gets reworked.

### `814ab8e` — the senior view

- **`src/screens/Findings/rollup.ts`** (pure, no API): `splitByOwnership`
  (mine / delegated / dotted), `rollupByReport` (open, breached, at-risk,
  tightest SLA, severe, watching, closed, impact — one row per direct report),
  `detectThemes` (same mandate open under 2+ branches), `parseImpact`/
  `totalImpact`. **Impact deliberately does NOT normalize periods** ("/month"
  vs "this quarter"); the label reads "impact named", not a comparable total.
  Don't "fix" this into a sum without deciding the period question first.
- **`OrgRollup.tsx`** — themes band + report rows. **Nothing in it offers a
  disposition**, on purpose.
- **Open tab (hierarchy mode only)** is now: Escalated to you → Your call →
  Functional line → Patterns → Your organisation is carrying. Roll-up rows
  drill in via `?owner=` (validated against `PERSONAS` — an unknown value
  would otherwise crash `roleSubtree`). **With hierarchy off the screen is
  byte-identical to before.**
- **Escalation trail**: `escalateFinding` in `mock-server/roles.js` now records
  `escalatedFrom` + `escalationTrail`, so an inherited finding is
  distinguishable from a native one and the thread can say why. Verified a
  finding walking `sales_supervisor → coo → group_ceo`.
- **Leadership actions** — `POST /findings/:id/leadership`, ask / reassign /
  raise_priority / take, logged on the finding and in the audit log.
  `LeadershipBar` replaces `DispositionBar` when the lens sits above the owner.
  **Authority is enforced server-side, not just hidden in the UI**: actor must
  sit strictly above the owner (403), reassign targets must be inside the
  actor's subtree (400), and — the property worth preserving — **Take it
  transfers ownership and thereby forfeits the leadership actions**, so you
  cannot push a finding around forever; pulling it up means owing the call.
  All five cases verified by curl.
- **Today keeps one honest count**: "Waiting on you" and `UnifiedQueue` are
  pinned to role scope regardless of lens (a CEO reading 25 there stops
  believing the number). Team volume gets a separate "Open below you" tile;
  the extra query reuses the role query's key when hierarchy is off, so it
  costs no request.

### `fbefa56` — reachability, the counterpart view, help

**Why it was needed: the founder reloaded and said "i dont see any major
changes ... it feels the same" — and was right.** The roll-up sat behind two
off-by-default switches, and `Login/index.tsx` called `setHierarchy(false)` on
EVERY sign-in, so team scope was re-hidden each time. Also `Topbar.tsx` hides
the "+ their team" checkbox entirely when the lens is "All roles" (the
default), so there was no toggle on screen to find. Lesson for future work:
**a feature gated behind an off-by-default switch that is itself invisible in
the default state does not exist.**

- **Hierarchy defaults on for roles with reports** — `defaultHierarchyFor()`;
  an explicit choice still wins. Storage is tri-state now (`'1'`/`'0'`/absent);
  **the old `''` keeps meaning off** so anyone who deliberately turned it off
  isn't flipped on. Resolved against the *effective* persona, so locked
  non-admins see a truthful checkbox. Sign-in now clears the choice (`null`)
  instead of forcing false.
- **Findings · By counterpart (`AgentView.tsx`) — NOW THE DEFAULT VIEW.** Same
  lens-scoped findings, grouped by the agent that raised them: sigil + health
  dot, cadence sparkline, open/breached/temperament/last-sensed, and a **track
  record — landed vs dismissed-as-noise, since Abandon means the counterpart
  was wrong**. That metric is the point of the screen; it produces real
  variance on seed data (Commercial 3/3, Planning 2/3, **Quality 0/1**).
  Lifecycle is the opt-in (`?view=lifecycle`); an explicit `?tab=` implies
  lifecycle so guide deep links and "All findings →" still land right.
  The cadence label only claims the 14d window when something landed in it —
  **12 of 42 seeded findings predate it**, and a flat line beside "5 raised"
  would have been a lie.
- **Screen help is one popup.** `Intro` gained `doThis`; both it and the
  how-it-works prose now sit behind a single "What to do here" button (the old
  inline `<details>` disclosure is gone, dead CSS removed). Lens-aware on
  Today / Findings / a finding's thread — a leader is told the roll-up is
  visibility and that Take it forfeits the leadership actions.
- **The guide was lying** and is fixed: it pointed at `/operate/closure`
  (retired, redirects) and named "Operate · Command Center", "Foundation
  area", "Insights area" — none of which exist in the current IA. All `where`
  labels relabelled + a new step on the senior view.
- **Lens picker trimmed to Group + Protein** (founder ask, for easier working).
  **Picker-only**, via `PICKER_GROUP_LABELS` in `personas.ts`. `PERSONAS` stays
  complete ON PURPOSE — narrowing it would break the `?owner=` drill-down,
  since a Group CEO still rolls up and drills into G&I/F&V/Ambient. Widen by
  adding labels back to that one array. A held-but-unoffered lens renders as
  "… (current)" rather than letting the select show "All lenses" while the data
  stays filtered elsewhere.
- **`ScopeBanner` removed** from all 8 screens and deleted (founder ask). The
  roles-in-scope information still lives in the "+ their team" tooltip.
- Fixed `var(--ink-1)` — **never defined in the paper-ledger palette** (it is
  `--ink`) — in `OrgRollup` and the help modal.

### Founder decisions taken this session (don't re-litigate)

1. **Protein-only working is a LENS, not a data deletion.** Offered the
   destructive option (strip G&I/F&V/Ambient/extended/group tier from seeds);
   founder chose "just use the lens". `COO — Protein` gives 16 findings /
   8 counterparts with nothing removed. **Note the consequence**: from inside
   one division "Patterns" is always empty — themes need 2+ divisions. That is
   correct behaviour, not a bug.
2. **Ask deliberately does not touch the SLA clock** — asking is not deciding,
   and it should neither buy the owner time nor take it away. Flagged to the
   founder as a unilateral call; unchallenged so far.
3. Help lives in a popup, not inline ("keep it simple").

### Verification status — READ THIS

Everything this session is **type-checked, linted, built, and verified against
the running mock API** (routes, all authority guards, escalation trail, the
grouping and track-record maths). **NOTHING WAS VISUALLY VERIFIED** — the
Chrome extension never connected (`tabs_context_mcp` → "Browser extension is
not connected") for the whole session, so the roll-up, the counterpart cards,
the help modal and the segmented control have been reasoned about and never
seen. **First job next session: look at them.** Sizing, contrast, and the
19-card density at Group-CEO scope are all unproven.

### Known rough edge

At Group CEO + team scope the counterpart view renders **19 cards**, most
holding a single finding. Sorting puts breached-then-open first so the useful
ones lead, but it is a long page. If it reads as bloated, collapse
single-finding counterparts into a compact "also raised" strip at the bottom.
The Protein lens (8 cards) is much closer to right.

### Servers / demo state

`npm run dev:all` was running all session. **The mock server is plain `node`
with no watch — edit `mock-server/` and you MUST restart it** (this bit the
session once: new routes 404'd until restart, and `concurrently` does not
revive a killed child). Restarting resets in-memory seed state. `fmcg-f-8` was
escalated twice by hand so the "Escalated to you" band renders non-empty for
the Group CEO; that is scaffolding and dies on restart — nothing depends on it.

## This session (2026-07-19/20): the website — static tour, type rebrand, hero loop player, Umani pass (sibling repo, ALL UNCOMMITTED)

All work in `/Users/praveenj/Developer/rewive-front-end_website` (paths
below relative to it). The Chrome extension was NOT connected this
session — no screenshots were possible; verification was `open <file>`
for the founder's eyes plus a python tag-balance check and a node
`new Function()` parse of the inline script after every structural edit
(no test suite exists; keep doing this).

### 1. Product CTAs → static tour (`preview.html`, NEW)

- **Decision (founder): the site never links to the running app.** All
  former `http://localhost:5173/` CTAs across `index/story/demo.html`
  now land on `preview.html` — "Inside the product", a static tour of
  four faithful app-frame stills built from the real app's tokens
  (rail with Business + Foundation, topnav, `#F4F3EE` rail bg, flat
  paper-ledger, NO gradients — mirrors `src/styles/globals.css`,
  `areas.ts`, KpiBrain screens):
  1. `#foundation` — Operating Picture: full shell mockup + node canvas
     (intent/P&L/mandate/sense tiers in teal/amber/indigo/gray, lit
     impact path, one blind dashed sense, held-twice strip, industry
     chips FMCG 26 / Healthcare 22 / Manufacturing 17).
  2. `#today` — the one queue (3 items, SLA clocks, 4-A buttons).
  3. `#thread` — a finding's thread (raised → decided → watching w/
     progress bar → close greyed "when the number is back").
  4. `#ledger` — 3 ledger rows with worked / didn't / too-early pills.
  Wide frames scroll horizontally inside `.frame-scroll` on mobile.
- `story.html` refreshed: missing **Manufacturing card restored** (17
  mandates), CTAs → `preview.html`. `demo.html` rebuilt as a tour
  launcher (jump links → preview anchors + index sections; localhost
  dev-server notes removed). All links made relative (file:// safe).
  `README.md` documents the no-live-app rule: if a hosted demo ever
  exists, add a separate CTA — don't repoint the tour.

### 2. Type rebrand — "remove the Claude touch" (`fonts.css`, NEW)

- Founder called the Iowan/Palatino serif + SF Mono pairing "so obvious
  … that Claude touch". Two comparison rounds (throwaway compare pages,
  since deleted) led to: **Space Grotesk** for display (all four pages)
  and **Oxanium** for labels/figures/eyebrows/clocks — picked over
  Share Tech Mono / Chakra Petch / Michroma / Orbitron ("ok but not
  distinct") / Syncopate / Zen Dots / etc.
- Both are embedded as **base64 woff2 in `fonts.css`** (OFL, variable
  weights, latin subsets, ~46KB total) — site stays fully
  self-contained, no Google Fonts request. Verified via fontTools that
  **Oxanium's ten digits are all 578 units wide** (naturally tabular →
  the ticking SLA clock doesn't jitter). Non-latin glyphs (→ ≥ ✓ ◷)
  intentionally fall through to system mono.
- **Var names `--serif`/`--mono` were kept; only values changed** (same
  trick as the app's paper-ledger rebrand). SVG `font-family`
  presentation attrs don't resolve CSS vars — the loop-SVG texts and
  org-tree labels carry literal `'Space Grotesk'`/`'Oxanium'` stacks;
  keep updating those by hand if faces ever change again.

### 3. Hero loop player (replaces the static finding card)

- The hero vignette is now an auto-playing "screen recording": **five
  scenes swipe horizontally** (Sense → Find → Decide → Act → Close),
  3.4s each (`HOLD`), first slide cloned so the wrap swipes forward
  then snaps home (`.notrans`). The old escalation ladder is now the
  5-stage rail; a gradient `.loop-progress` bar times each scene.
- **Agent work made visible** (founder: "no place agent work is
  evident"): a one-line **counterpart console** (`.agent-log`, indigo,
  typed per scene from the `LOGS` array, blinking cursor, "counterpart
  · live" cap) + **AGENT WORK / HUMAN CALL badges** on every scene
  footer — 4 agent, 1 human (Decide). That asymmetry is the point.
- **Declutter history (don't re-add)**: orbit stage-chips + dashed ring
  around the frame, two-line console, per-scene path chips and third
  sense row were all added then CUT after "somewhat cluttered … make it
  good for a pitch". Each scene now leads with ONE big statement
  (`.slide .fc-title` 1.32rem etc.). SLA clock burns ~35 demo-min per
  real second, resets each cycle.

### 4. Umani Ronchi pass (founder reference: umanironchi.com)

- Founder wants the site "like this" — cinematic editorial. Applied:
  **full-viewport chapters** (`section.blk{min-height:92vh;
  display:flex;align-items:center;isolation:isolate}`), hero fills the
  first screen with a **scroll cue** (`.scrolldn`, dropping pulse);
  **ghost outline numerals 01–11** per chapter
  (`.wrap::before`, 13rem, `-webkit-text-stroke` at 8% ink —
  `isolation:isolate` on sections is REQUIRED: without it the
  `z-index:-1` numerals vanish behind the tinted section washes, which
  was a founder-reported bug); verbatim strip → **seamless marquee**
  (items duplicated once, `translateX(-50%)` loop, 36s); nav links
  uppercase letterspaced; reveals slowed to 1.1s
  `cubic-bezier(.16,1,.3,1)`.
- **Scroll model**: snap went `mandatory` (earlier "each scroll lands
  on next page" request) → **`proximity`** in the Umani pass (their
  sites never grab). The **3D depth engine** stays: 12 set-pieces + 3
  figures carry `data-z` (0.5–1), a rAF `zTick` applies single-axis
  `rotateX + translateY/Z` around viewport center; ≥861px and
  non-reduced-motion only.
- **Removed at founder request — do NOT reintroduce**: the left
  "journey rail" icon nav (two iterations, then "not to the mark,
  remove it"), the winding alternate-side rotateY, and the hero
  camera pull-back.
- **Three big data-art figures** (`.art`, inline SVG, in the depth
  pass) carry the imagery role since there's no photography:
  FIG 01 drift-unanswered chart (#problem), FIG 02 operating-picture
  cascade (#foundation), FIG 03 the-number-comes-back recovery curve
  (#example). Style: white panel, dot-grain pattern, Oxanium
  annotations, brand hues. Founder asked for "big pictures to support
  the sections" — more figures in this language are the expected next
  ask (candidates: #held-twice, #industries, #rollout).

### 5. Open threads (website)

1. **Commit the website repo** — everything above is uncommitted.
2. `og:image` still missing (site-wide); "Book a walkthrough" is still
   `mailto:hello@rewive.app` — swap for a scheduling link when one
   exists.
3. Mobile: nav links hide <880px with no hamburger; ghost numerals and
   depth engine are desktop-only by design.
4. Reduced-motion coverage is complete (marquee, scroll cue, player,
   console cursor, depth engine all guarded) — keep guarding new motion.
5. The founder iterates visually in fast rounds ("open the html" →
   react). Keep changes reversible and validate with the
   tag-balance + `new Function` checks before reopening.

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

### Next steps — in priority order (as of 2026-07-20, later session)

1. **Look at the five pieces that shipped blind** — `/operate/findings` (the
   live strip: hit "Run sweep now" and watch the paced walk), `/` and `/guide`
   (heaviest renamed prose), `/insights/agents` (does "Workforce" fit the
   chrome where "Agents" did?), and `/operate/decisions` (tiles and By-entity
   table should now agree with the ledger below them).
2. **Commit this session.** 71 modified + 2 new files, all uncommitted. Natural
   split: (a) live strip + seeded tracking, (b) counterpart removal + scoping
   fixes, (c) the rename.
3. **Decide the legacy-role entity mapping** (see §4 above) — the Protein COO
   still sees all four entities because `operations_head` /
   `sales_supervisor` / `store_manager` sit under `coo` with findings spanning
   every entity. This is the remaining half of "the Entity view is mixing up".
4. **Consider renaming the internals** — `ShadowAgent`, `useShadowOrg`,
   `counterpartName`, `/operate/counterparts` now lag the UI by two
   generations of naming. Optional, but the gap is wider than it was.
5. **Fix the two orphaned manufacturing closures** (`mfg-c-h1`, `mfg-c-h2`
   point at findings that don't exist) so `filterClosuresByPersona` no longer
   needs its fail-open branch.

### Next steps — in priority order (as of 2026-07-20)

1. **Look at what shipped blind.** Two commits of UI were written without
   the browser extension ever connecting. Sign in as **Group CEO** (lens
   picker now offers only Group + Protein), and check: the counterpart
   cards (default view on Findings), the "What to do here" popup, the
   segmented control, the roll-up bands, and `LeadershipBar` on a
   subordinate's finding. Density at 19 cards is the most likely complaint.
2. **Unblock the push — unchanged, founder-only action.** `v5` is now ~32
   commits ahead, none pushed. `~/.ssh/config` correctly routes GitHub over
   :443 and the key `id_ed25519_rewive`
   (`SHA256:qi700T0YxECL3859MQIEId9q2+/3E09fi/vgYPdR2P8`) has no passphrase
   — GitHub simply doesn't have it. `ssh -T` returns *Permission denied
   (publickey)*, i.e. the network path is FINE and the key is unregistered.
   Paste `~/.ssh/id_ed25519_rewive.pub` at github.com/settings/ssh/new,
   then `git push origin v5`. (`gh` is unusable — TLS MITM.)
3. **Finish the help pass.** Only the loop screens (Today, Findings, a
   finding's thread, Decisions) have `doThis`. Foundation and Execution
   screens still show doctrine-only popups. Founder scoped it to "loop
   screens first" — the rest is the natural continuation.
4. **Decide the counterpart-view density question** (see the rough edge in
   this session's section) — collapse single-finding counterparts, or leave.
5. **Consider a materiality floor per role** — the one recommendation from
   the original senior-leadership analysis that was NOT built (items 1, 2,
   3, 5, 6, 7 were). Team-scope items below a role's impact threshold would
   collapse into "+31 below your threshold" instead of rendering.

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

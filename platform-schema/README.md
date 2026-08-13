# platform-schema

DDL for the **platform data model** — the customer's dimensions and the loop
tables — targeting Azure Database for PostgreSQL Flexible Server, one database
per customer.

This directory is **not part of the running product.** It is deliberately
outside `docs/` (which is an Obsidian vault of numbered markdown documents) and
outside `mock-server/migrations/` (which the control plane fans out to tenant
stores). Nothing here is applied, migrated, imported or tested by any suite in
this repo.

## Status — 2026-08-13

| | |
|---|---|
| Applied to a **local** database | **Yes.** PostgreSQL 16.14, the production major version. Both schemas, the C&S configuration, every trigger and CHECK. |
| Applied to any **live** database | **No.** Never executed against Americana or any other real environment. |
| Wired into `npm run migrate` | **No**, on purpose. |
| Constraints exercised | **Yes** — `test-fpa-core.sql`: **24 illegal cases, each proven to fail** (24 `MUST FAIL` lines, 24 errors), alongside the legal cases they mirror. |
| Destination | **The backend repo's `migrations/` package — NOT `rewive-infra`.** See below. |
| Blocker | Must first be reconciled with the `sales_excellence` and `sales_staging` schemas already in the live Americana database, which this design has never been able to inspect. |

### What executing it actually caught

The previous status of this directory was "parses cleanly, never executed."
Applying it for the first time found a bug in the first thirty seconds that two
sessions of parse-checking had not:

**`shared.v_role_ancestry` had two recursive branches** — one walking the solid
reporting line, one walking the dotted line. PostgreSQL permits **exactly one**
recursive self-reference in a `WITH RECURSIVE`, and with three `UNION ALL` arms
it reads the first two as the non-recursive term, so the second arm's reference
to `walk` is rejected outright:

```
ERROR: recursive reference to query "walk" must not appear within its non-recursive term
```

The grammar is perfectly valid, which is why `pglast` passed it. It is fatal on
apply. Fixed by unioning the solid and dotted edges into an edge set *first* and
walking that once — same semantics, one recursion. The dotted-line behaviour
(at most one dotted hop, `via_dotted` propagating) is now proven by execution
rather than by reading.

**A clean parse is not a clean apply.** That was already written here as a
caution; it is now written as a finding.

## Files

| File | What it is |
|---|---|
| `shared-dimensions.sql` | The `shared` schema — 14 tables: geography, business units, channels, categories, legal entities, org units, roles, people, seats, agents, and the free-text crosswalk. Hierarchies are adjacency with cycle-guard triggers; ancestry views turn a rollup into a join. |
| `fpa-core.sql` | The `fpa` schema — the loop: the fiscal calendar, identity and sessions, the operating model (nodes, edges, streams), mandates, `fact_measure` with its grain CHECK, findings and their whole lifecycle, escalation and leadership transfer, actions, recovery targets, the comment thread, and notifications. |
| `shared-dimensions-americanacs.sql` | Americana C&S configured against the dimensions, to test the model rather than assert it. Rows are marked `[EVIDENCED]` or `[ILLUSTRATIVE]` line by line. **No person in it is real**, and the region tree above Abu Dhabi is invented. |
| `test-fpa-core.sql` | The constraint suite. Every CHECK, trigger and unique index asserted in both directions. |
| `validate-sql.py` | The parse checker. Superseded in practice by applying the files, but still the only thing that catches a forward foreign key without a database. |

## Applying it locally

Reproduces the verified state from scratch. Needs PostgreSQL 16
(`brew install postgresql@16`; `brew services start postgresql@16`).

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# The two production roles, so the grant statements are exercised, not skipped.
psql -d postgres -c "CREATE ROLE rewive_app NOLOGIN;" \
                  -c "CREATE ROLE rewive_admin NOLOGIN;"

psql -d postgres -c "DROP DATABASE IF EXISTS rewive_dev;" -c "CREATE DATABASE rewive_dev;"

psql -d rewive_dev -v ON_ERROR_STOP=1 -f platform-schema/shared-dimensions.sql
psql -d rewive_dev -v ON_ERROR_STOP=1 -f platform-schema/shared-dimensions-americanacs.sql
psql -d rewive_dev -v ON_ERROR_STOP=1 -f platform-schema/fpa-core.sql

# Every "MUST FAIL" line should print an ERROR. That is the pass condition.
psql -d rewive_dev -f platform-schema/test-fpa-core.sql
```

Creating the roles is not optional if you want the run to mean anything — the
grants are the last statements in each file, and without the roles the apply
stops there with `role "rewive_app" does not exist`.

### Where this actually lands — corrected 2026-08-13

Earlier notes in this repo said it would land in `rewive-infra` as
`migrations/005-platform-schema.sql`. **That was wrong**, and it was checked
against the live repo rather than assumed:

- `rewive-infra` has **no `migrations/` directory**. Its root is
  `.claude`, `.gitignore`, `README.md`, `environments/`, `modules/` — pure
  Terraform.
- The migration job (`azurerm_container_app_job.migrate` in
  `modules/rewive-deployment/container_apps.tf`) runs the **backend** image,
  `rewive-backend:${var.backend_image_tag}`, with
  `command = ["python", "-m", "migrations.runner"]`.

So migrations are a Python package inside the FastAPI backend
(`rewive-fpa-backend`), applied by that runner as `rewive_admin` — the sole
DDL path. This DDL has to be adapted to whatever shape that runner expects.

**Unverified, and re-confirmed unverified 2026-08-13:** the backend repo is not
visible under the account in use (`rianpraveen`; `sanjuveed-debug` exposes only
`rewive-infra`, `bloom-juniors`, `rewive-frontend-v4`, `rewive-frontend-v2`),
and there is no local clone. So the runner's file-naming and numbering
convention is still unknown — it may not take numbered `.sql` files at all.
**Confirm against the backend repo before renaming anything to fit a guess.**

## What governs the design

Three things that must not be re-derived:

1. **The database is the tenant boundary.** No `tenant_id` on every table, and
   no row-level security. That was the pooled model and it is superseded — see
   the banners on ARCH-003/004. (`ARCH-001` Entry 02 still asserts the old
   model and has not been amended.)

2. **Americana C&S publishes marginals, not a cube** — a headline plus four
   breakdowns that each sum back to it. Loaded into one fact table without
   recording which view a row belongs to, `SUM(value)` returns 496 against a
   true 124. Every fact row declares a `grain`, and a CHECK makes it unable to
   lie about it. `fpa.v_measure_total` is the safe aggregate; the test suite
   demonstrates the double-count live (124 against a naive 184).

3. **Doctrine is enforced, not merely permitted.** The four principles that
   decide design arguments are constraints in `fpa-core.sql`, not conventions:
   one accountable human owner (`mandate.owner_seat_id NOT NULL`), no
   half-recorded decisions (`finding_decision_whole`), one definition of done
   (`recovery_target_one_per_finding`), and transfers that cannot be rewritten
   (append-only triggers on `escalation_trail` and `leadership_action`).

## Decisions taken (founder, 2026-08-13)

- **Roles are reference data per template; people and seats are real.** A
  customer configures who holds what, not their own reporting line. The role
  tree, escalation line and data partition stay identical across industries —
  only labels differ, exactly as `HEALTHCARE_LABEL_OVERRIDES` works today.
- **Hierarchies are adjacency** (`parent_id` self-FK) — one pattern for every
  dimension, arbitrary depth, cycles blocked by trigger. Not fixed levels, not
  a closure table.

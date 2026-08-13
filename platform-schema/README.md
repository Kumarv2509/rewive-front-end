# platform-schema

DDL for the **platform data model** — the customer's dimensions, targeting
Azure Database for PostgreSQL Flexible Server, one database per customer.

This directory is **not part of the running product.** It is deliberately
outside `docs/` (an Obsidian vault of numbered markdown documents) and outside
`mock-server/migrations/` (which the control plane fans out to tenant stores).
Nothing here is applied, migrated, imported or tested by any suite in this repo.

## Status — 2026-08-13

**`shared-dimensions.sql` has landed in the backend repo** as
`backend/migrations/018_platform_dimensions.sql`, in
[sanjuveed-debug/rewive-fpa PR #1](https://github.com/sanjuveed-debug/rewive-fpa/pull/1).
That PR was **merged on 2026-08-13** (`a1d8eaa`). **Merged is not applied** —
merging deployed nothing, because the migrate job is a separate step, and
neither `018` nor `019` has yet touched a database.

Reviewing the PR before merge caught a defect this directory's own verification
could not have: `019`'s `NOT VALID` constraints exempt existing **rows** but
bind every new **write**, and two of them described a stricter product than the
backend implemented — `POST /findings/{id}/re-alert` would have returned 500 on
every call. Fixed in `40ab097`. **The mirror test that "proved" `019` safe
planted rows; it never replayed what the application does.** Worth remembering
here, because every file in this directory is verified the same way.

What remains here is the **design source** for that migration plus a worked
customer configuration. Treat the backend repo as authoritative for anything
that has landed; keep this in step or delete it, but do not let the two
disagree silently.

| | |
|---|---|
| Applied to a **local** database | **Yes.** PostgreSQL 16.14, the production major version, on top of the backend's migrations 000–017. |
| Applied to any **live** database | **No.** |
| Landed as a migration | **Yes** — `018_platform_dimensions.sql`, reviewed and merged. |
| Blocked on `sales_excellence` reconciliation | **Largely resolved — see below.** |

## Two corrections that came from finally reading the backend

Access to `sanjuveed-debug/rewive-fpa` was granted on 2026-08-13. Reading it
overturned two things this directory had asserted for three sessions.

### 1. Production already has the loop tables

Earlier notes here and in `CLAUDE.md` said the operating model and findings had
no tables anywhere. **That described this repo's mock server, not production.**
The backend has had `fpa_findings`, `fpa_brain_nodes`, `fpa_brain_edges`,
`fpa_users`, `fpa_shadow_agents` and roughly thirty more since migration 002.

A companion `fpa-core.sql` / `fpa-loop.sql` pair was written here first, before
that was known. They modelled the loop from scratch — `fpa.finding`,
`fpa.brain_node`, `fpa.mandate` — and would have landed as a **second, parallel
findings model beside the live one**. They were deleted rather than kept, so
the repo does not hold DDL that must never be applied; the design is preserved
in git history (`31c0802`) and the reasoning in `docs/HANDOFF.md`.

What replaced them is additive: `019_loop_hardening.sql` in the same PR adds
only what production genuinely lacks — a period dimension, the identity
binding, a comment thread on findings, the escalation and leadership-action
tables — and constrains `fpa_findings` in place with `NOT VALID` CHECKs.

**The lesson worth keeping:** a model built against the demo is a model of the
demo. The gaps it identified were real, but their shape was wrong until the
production schema was actually read.

### 2. The `sales_excellence` blocker is much smaller than believed

`backend/migrations/americana/001_domain_schemas.sql` shows what those schemas
actually are: `sales_excellence` and `sales_staging` are created
`AUTHORIZATION praveen` and granted `USAGE, CREATE` to that collaborator.
**No migration creates a single table in either.** They are a colleague's
workspace namespace, not a rival model of customer dimensions.

Meanwhile `shared` already exists in the Americana database, owned by
`rewive_admin`, and **no migration has ever created a table in it** — so
`018` lands with zero name collisions.

Remaining caveat, stated honestly: tables may have been created inside
`sales_excellence` by hand, and that still cannot be enumerated without
production database access. But they live in a separate namespace, so they
cannot collide with `shared.*` or `fpa.*` by name.

## What executing it caught

Applying this for the first time found a bug in the first thirty seconds that
two sessions of parse-checking had not.

**`shared.v_role_ancestry` had two recursive branches** — one walking the solid
reporting line, one the dotted line. PostgreSQL permits **exactly one**
recursive self-reference in a `WITH RECURSIVE`, and with three `UNION ALL` arms
it reads the first two as the non-recursive term, so the second arm's reference
to `walk` is rejected outright:

```
ERROR: recursive reference to query "walk" must not appear within its non-recursive term
```

The grammar is valid, which is why `pglast` passed it. It is fatal on apply —
it would have failed inside the migrate job in Azure. Fixed by unioning the
solid and dotted edges into an edge set *first* and walking that once. The
dotted-line behaviour (at most one dotted hop, `via_dotted` propagating) is now
proven by execution rather than by reading.

**A clean parse is not a clean apply.** That was written here as a caution; it
is now a finding.

## Files

| File | What it is |
|---|---|
| `shared-dimensions.sql` | The `shared` schema — 14 tables: geography, business units, channels, categories, legal entities, org units, roles, people, seats, agents, and the free-text crosswalk. Hierarchies are adjacency with cycle-guard triggers; ancestry views turn a rollup into a join. **Landed as backend migration 018.** |
| `shared-dimensions-americanacs.sql` | Americana C&S configured against it, to test the model rather than assert it. Rows are marked `[EVIDENCED]` or `[ILLUSTRATIVE]` line by line. **No person in it is real**, and the region tree above Abu Dhabi is invented. Not part of the migration. |
| `validate-sql.py` | The parse checker. Secondary to applying the files now, but still the only thing that catches a forward foreign key without a database. |

## Applying it locally

Needs PostgreSQL 16 (`brew install postgresql@16`; `brew services start
postgresql@16`).

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# The production roles, so the grants at the foot of the file are exercised
# rather than skipped.
psql -d postgres -c "CREATE ROLE rewive_app NOLOGIN;" \
                  -c "CREATE ROLE rewive_admin NOLOGIN;"

psql -d postgres -c "DROP DATABASE IF EXISTS rewive_dev;" -c "CREATE DATABASE rewive_dev;"
psql -d rewive_dev -v ON_ERROR_STOP=1 -f platform-schema/shared-dimensions.sql
psql -d rewive_dev -v ON_ERROR_STOP=1 -f platform-schema/shared-dimensions-americanacs.sql
```

Creating the roles is not optional if you want the run to mean anything — the
grants are the last statements in the file, and without the roles the apply
stops there with `role "rewive_app" does not exist`.

To test it the way it will actually be applied, clone the backend repo and run
migrations `000`–`019` against a fresh database instead; `pgvector` has no
PostgreSQL 16 build on Homebrew, so `001_auth_and_rag.sql` has to be skipped
locally.

## Where migrations actually live — settled 2026-08-13

Confirmed by reading the repo, not inferred:

- Migrations are `backend/migrations/NNN_name.sql` in
  **`sanjuveed-debug/rewive-fpa`** ("Rewive FP&A Platform — FastAPI + Next.js").
- `runner.py` applies them in filename order, once each, recorded in a
  `schema_migrations` table, **each inside its own transaction**, connecting as
  the admin/schema-owner role — never `rewive_app`.
- `MIGRATION_SET` selects a subdirectory; `americana/` is a per-customer set.
- `rewive-infra` has **no `migrations/` directory** and never did. The migrate
  job (`azurerm_container_app_job.migrate`) runs the *backend* image with
  `command = ["python", "-m", "migrations.runner"]`.

The inherited name `migrations/005-platform-schema.sql` was wrong on every
count — wrong repo, wrong directory, wrong numbering, wrong separator.

## What governs the design

Three things that must not be re-derived:

1. **The database is the tenant boundary.** No `tenant_id` on every table, and
   no row-level security. That was the pooled model and it is superseded — see
   the banners on ARCH-003/004. (`ARCH-001` Entry 02 still asserts the old
   model and has not been amended.)

2. **Americana C&S publishes marginals, not a cube** — a headline plus four
   breakdowns that each sum back to it. Loaded into one fact table without
   recording which view a row belongs to, `SUM(value)` returns 496 against a
   true 124. Any fact table added later must make every row declare a `grain`,
   with a CHECK that makes it unable to lie about it. These dimension tables
   are the slice vocabulary that `grain` selects between.

3. **A NULL slice column means opposite things in two places.** In a mandate it
   means "all members" — a filter. In a fact row it means "not part of this
   row's coordinate". Same columns, deliberately different meaning.

## Decisions taken (founder, 2026-08-13)

- **Roles are reference data per template; people and seats are real.** A
  customer configures who holds what, not their own reporting line. The role
  tree, escalation line and data partition stay identical across industries —
  only labels differ, exactly as `HEALTHCARE_LABEL_OVERRIDES` works today.
- **Hierarchies are adjacency** (`parent_id` self-FK) — one pattern for every
  dimension, arbitrary depth, cycles blocked by trigger. Not fixed levels, not
  a closure table.
- **Additive over parallel.** Production's existing tables are hardened in
  place rather than replaced, and every new constraint on a live table is
  `NOT VALID` so the migrate job cannot fail on legacy rows.

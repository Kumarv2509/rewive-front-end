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
| Applied to any database | **No.** Never executed, live or local. |
| Wired into `npm run migrate` | **No**, on purpose. |
| Verified | Parses against the real PostgreSQL grammar (libpg_query), no forward foreign keys. |
| Destination | `rewive-infra`, as part of `migrations/005-platform-schema.sql`. |
| Blocker | Must first be reconciled with the `sales_excellence` and `sales_staging` schemas already in the live Americana database, which this design has never been able to inspect. |

A clean parse is not a clean apply. It says nothing about whether roles exist,
whether extensions are available, or whether the objects already exist.

## Files

| File | What it is |
|---|---|
| `shared-dimensions.sql` | The `shared` schema — 14 tables: geography, business units, channels, categories, legal entities, org units, roles, people, seats, agents, and the free-text crosswalk. Hierarchies are adjacency with cycle-guard triggers; ancestry views turn a rollup into a join. |
| `shared-dimensions-americanacs.sql` | Americana C&S configured against it, to test the model rather than assert it. Rows are marked `[EVIDENCED]` or `[ILLUSTRATIVE]` line by line. **No person in it is real**, and the region tree above Abu Dhabi is invented. Ends with six post-load checks. |
| `validate-sql.py` | The checker. Parses every statement and every PL/pgSQL body, and fails on a forward foreign key. |

## Running the checker

Needs `pglast` on Homebrew's **arm64** python — the macOS system python 3.9 is
x86_64 and the wheel will not load.

```bash
/opt/homebrew/opt/python@3.14/bin/python3.14 -m venv /tmp/pgvenv
/tmp/pgvenv/bin/pip install pglast
/tmp/pgvenv/bin/python platform-schema/validate-sql.py platform-schema/shared-dimensions.sql
```

Expect `66 statements`, `14 tables`, `2 plpgsql bodies`, no forward foreign
keys. The checker is self-testing in the sense that it was proven against a
deliberate forward FK and a deliberately broken function body; if you change
it, prove it still fails on those.

Note: pglast 8.4's `parse_plpgsql` cannot deserialize its own successful
output — every body raises `JSONDecodeError`, including a trivial one. The
underlying parser is fine, so `ParseError` is treated as a failure and
`JSONDecodeError` as a pass.

## What governs the design

Two things that must not be re-derived:

1. **The database is the tenant boundary.** No `tenant_id` on every table, and
   no row-level security. That was the pooled model and it is superseded — see
   the banners on ARCH-003/004. (`ARCH-001` Entry 02 still asserts the old
   model and has not been amended.)

2. **Americana C&S publishes marginals, not a cube** — a headline plus four
   breakdowns that each sum back to it. Loaded into one fact table without
   recording which view a row belongs to, `SUM(value)` returns 496 against a
   true 124. Every fact row declares a `grain`, and a CHECK makes it unable to
   lie about it. The dimension tables here are the slice vocabulary that
   `grain` selects between.

## Decisions taken (founder, 2026-08-13)

- **Roles are reference data per template; people and seats are real.** A
  customer configures who holds what, not their own reporting line. The role
  tree, escalation line and data partition stay identical across industries —
  only labels differ, exactly as `HEALTHCARE_LABEL_OVERRIDES` works today.
- **Hierarchies are adjacency** (`parent_id` self-FK) — one pattern for every
  dimension, arbitrary depth, cycles blocked by trigger. Not fixed levels, not
  a closure table.

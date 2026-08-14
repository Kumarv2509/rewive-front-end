# For Sanju — session output, 2026-08-13 → 14

Everything produced in this session, and where it actually lives. **Nothing was
deployed, migrated or applied.** Two PRs were merged; no image was built and no
`terraform apply` was run.

Start with `integration-handoff.html` — open it in a browser. It is the full
document; this file is the index.

## In this folder

| File | What it is |
|---|---|
| `integration-handoff.html` | The complete integration handoff: change inventory, backend behaviour changes, migration detail, deployment order, testing evidence, infra PR, open PRs, config, and the final matrix |
| `preflight-018-019.sql` | Read-only audit to run against Americana **before** the migrate job, plus the after-verification queries. Stop conditions are marked inline |

## The four blockers

1. **`azure.extensions` on `psql-rewive-americana-prod` is `vector` only.** 018
   opens with `CREATE EXTENSION citext` / `btree_gist`. Azure Flexible Server
   refuses any extension not on that allowlist, so 018 fails on its first
   statements. Both are in the server's `allowedValues` and the parameter is
   **dynamic — no restart**. One command. Every local test missed this because
   local PostgreSQL has no allowlist.
2. **No built image contains 018/019 or the route fixes.** Build v92 from
   backend main `a1d8eaa`.
3. **The migrate job is pinned to `rewive-backend:v91`**, which predates both
   migrations — running it today applies nothing.
4. **v91 returns 500 on `POST /findings/{id}/re-alert` the moment 019 lands.**
   Deterministic, not intermittent. Deploy the code before the migration.

## Merged this session

| Repo | PR | Merge | Note |
|---|---|---|---|
| `sanjuveed-debug/rewive-fpa` | #1 | `a1d8eaa` | Migrations 018/019 + the `000` provisioning fix + route fixes. **Merged ≠ applied** |
| `sanjuveed-debug/rewive-infra` | #1 | `0aa76cc` | Log Analytics binding. **Not applied** — needs `terraform apply` in Cloud Shell |

My own commit inside PR #1 is `40ab097`, which makes the running code satisfy
019's new constraints:

- `re-alert` now clears `disposition`, `disposition_at` and `disposition_by`
  together. Clearing `status` alone violates `ck_findings_open_is_undecided`;
  clearing `disposition` alone violates `ck_findings_decision_whole`. The three
  move together or not at all.
- Dismissing without a reason is now a **400** instead of an unhandled write
  error.
- `backend/tests/test_loop_hardening_constraints.py` pairs the SQL with the code
  that has to satisfy it. It **fails** against the pre-fix router, which is the
  only reason to believe it is worth anything.

## The recommended next action

**Apply `rewive-infra` PR #1 in Cloud Shell, and nothing else yet.**

Confirm the plan reads `1 to change, 0 to add, 0 to destroy`. If any line says
`destroy and then create replaced`, stop — that contradicts what was verified
against the provider source and must not be applied to a live environment.

Then confirm `az containerapp logs show` actually returns content. Only once
logging works should the v92 build, the extension allowlist and the migration
follow, in that order. Do the rest blind and a failure is invisible exactly when
it matters most.

## Two things to be straight about

**Nothing was tested against the Americana database.** It is VNet-only with
public access disabled. Every SQL result in the handoff comes from a local
PostgreSQL 16 mirror built from the same migrations — not from production data.

**The previous session's mirror test passed by planting rows**, never by
replaying what the application does. That is exactly how both v91 defects
survived it. The new test file exists to close that gap.

## Elsewhere in this repo

Not in this folder, but from the same session:

- `docs/HANDOFF.md` — the session record, including the contract suite measured
  against production for the first time (1 of 26; the number needs its
  qualifiers, which are in the entry)
- `Dockerfile`, `nginx.conf`, `.dockerignore`, `DEPLOY.md` — a verified
  container build for **this** repo. Note `DEPLOY.md`'s closing section: this
  app still cannot serve Americana, because of the cookie-vs-Bearer auth model
  and the 34 of 52 API paths that do not exist in production
- `CLAUDE.md` — carries the rule this session produced: **`NOT VALID` exempts
  existing rows but binds every new write immediately**, so a constraint the
  running app violates is a 500 on the next request, not a migrate-job failure.
  Add a constraint only after reading every writer

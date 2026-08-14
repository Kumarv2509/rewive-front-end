-- ============================================================================
-- Preflight audit — run BEFORE applying migrations 018 and 019 to Americana
-- ============================================================================
--
-- Read-only. Nothing here modifies a row or an object.
--
-- Connect as rewive_admin to database `americana`, with the same search_path
-- the migrate job uses:
--
--     SET search_path = fpa, shared, audit, rag, public;
--
-- Postgres is VNet-only (publicNetworkAccess = Disabled) with no firewall
-- workaround, so this has to run from inside the VNet — not from a laptop.
--
-- Every "STOP" below means do not run the migrate job until it is resolved.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. THE EXTENSION ALLOWLIST — the one that fails today
--
--    Run this in Cloud Shell, not psql. 018 opens with
--    CREATE EXTENSION citext / btree_gist, and Azure Flexible Server refuses
--    any extension not named in azure.extensions. IF NOT EXISTS does not help:
--    it does not exist, and creation is blocked.
--
--    az postgres flexible-server parameter show \
--      -g rg-rewive-dedicated-americana -s psql-rewive-americana-prod \
--      -n azure.extensions --query value -o tsv
--
--    EXPECT : a value containing BOTH citext and btree_gist
--    TODAY  : "vector"  -> STOP. 018 fails on its first statements.
--
--    Fix (dynamic parameter — no restart, no downtime):
--    az postgres flexible-server parameter set \
--      -g rg-rewive-dedicated-americana -s psql-rewive-americana-prod \
--      -n azure.extensions --value vector,citext,btree_gist
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 1. Has either migration already been applied?
--    STOP if 018 or 019 appears — the runner records each file once and they
--    must not be re-run.
-- ----------------------------------------------------------------------------
SELECT filename, applied_at
  FROM schema_migrations
 ORDER BY filename DESC
 LIMIT 5;


-- ----------------------------------------------------------------------------
-- 2. Collision check on the `shared` schema
--
--    EXPECT: schema exists, owned by rewive_admin, containing ZERO tables.
--    STOP if any table is present (someone created objects by hand — 018 may
--    collide) or if the owner is anyone else.
-- ----------------------------------------------------------------------------
SELECT n.nspname AS schema, r.rolname AS owner
  FROM pg_namespace n
  JOIN pg_roles r ON r.oid = n.nspowner
 WHERE n.nspname IN ('shared', 'sales_excellence', 'sales_staging');

SELECT schemaname, count(*) AS tables
  FROM pg_tables
 WHERE schemaname IN ('shared', 'sales_excellence', 'sales_staging')
 GROUP BY schemaname;

-- Name collisions against the 14 tables 018 creates. EXPECT 0 rows.
SELECT tablename
  FROM pg_tables
 WHERE schemaname = 'shared'
   AND tablename IN ('tenant','dim_country','dim_currency','dim_region',
                     'dim_business_unit','dim_channel','dim_category',
                     'legal_entity','org_unit','role','person','seat',
                     'agent','dim_alias');


-- ----------------------------------------------------------------------------
-- 3. Constraint violations already in the data
--
--    NONE of these is a stop condition. Every constraint 019 adds is NOT VALID,
--    so existing rows are never inspected and any count applies cleanly.
--
--    These numbers gate a LATER decision — whether to run
--    ALTER TABLE ... VALIDATE CONSTRAINT — which is a separate step and is
--    deliberately NOT part of this deployment.
-- ----------------------------------------------------------------------------

-- ck_findings_decision_whole: a decision needs a choice, a decider and a moment
SELECT count(*) AS decision_incomplete
  FROM fpa_findings
 WHERE NOT ((disposition IS NULL     AND disposition_at IS NULL     AND disposition_by IS NULL)
         OR (disposition IS NOT NULL AND disposition_at IS NOT NULL AND disposition_by IS NOT NULL));

-- ck_findings_dismissal_has_reason
SELECT count(*) AS reasonless_dismissals
  FROM fpa_findings
 WHERE disposition = 'abandon'
   AND (disposition_reason IS NULL OR length(btrim(disposition_reason)) = 0);

-- ck_findings_open_is_undecided
SELECT count(*) AS open_but_decided
  FROM fpa_findings
 WHERE status = 'open' AND disposition IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 4. The vocabulary actually present
--
--    The three enum constraints bind NEW WRITES IMMEDIATELY. Any value here
--    that falls outside the allowed set means the running application can
--    still produce it — which is a 500 waiting to happen, not a legacy-row
--    problem. Investigate before deploying.
--
--    disposition EXPECT ⊆ accept, act, acknowledge, abandon
--    status      EXPECT ⊆ open, accepted, acting, acknowledged, abandoned, closed
--    severity    EXPECT ⊆ low, medium, high, critical
-- ----------------------------------------------------------------------------
SELECT disposition, count(*) FROM fpa_findings
 WHERE disposition IS NOT NULL GROUP BY disposition ORDER BY 2 DESC;

SELECT status, count(*) FROM fpa_findings GROUP BY status ORDER BY 2 DESC;

SELECT severity, count(*) FROM fpa_findings GROUP BY severity ORDER BY 2 DESC;


-- ----------------------------------------------------------------------------
-- 5. Scale — how much data the DDL runs against
--
--    Both migrations are metadata-only: the 8 added columns are nullable with
--    no default (PostgreSQL 11+ adds these without rewriting the table) and
--    all 6 constraints are NOT VALID (no validation scan). Row count therefore
--    does NOT drive duration.
--
--    It still matters for the brief ACCESS EXCLUSIVE locks on fpa_findings.
--    Standard_B1ms is a small server — prefer a quiet window.
-- ----------------------------------------------------------------------------
SELECT count(*) AS findings, count(*) FILTER (WHERE status = 'open') AS open_findings
  FROM fpa_findings;

SELECT count(*) AS users FROM fpa_users;


-- ============================================================================
-- AFTER the migrate job — verification
-- ============================================================================

-- Both files recorded
SELECT filename, applied_at FROM schema_migrations
 WHERE filename IN ('018_platform_dimensions.sql','019_loop_hardening.sql');

-- Objects landed
SELECT count(*) AS shared_tables FROM pg_tables WHERE schemaname = 'shared';  -- expect 14
SELECT count(*) AS shared_views  FROM pg_views  WHERE schemaname = 'shared';  -- expect 7

-- All six constraints present and NOT validated (convalidated = f is correct)
SELECT conname, convalidated
  FROM pg_constraint
 WHERE conrelid = 'fpa_findings'::regclass AND contype = 'c'
 ORDER BY conname;

-- Extensions installed
SELECT extname, n.nspname AS schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
 WHERE extname IN ('citext','btree_gist','vector');

-- The append-only tables must be SELECT, INSERT only for rewive_app
SELECT table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) AS grants
  FROM information_schema.role_table_grants
 WHERE grantee = 'rewive_app'
   AND table_name IN ('fpa_finding_escalations','fpa_finding_leadership_actions')
 GROUP BY table_name;

-- After the re-alert smoke test, the decision must be FULLY cleared.
-- EXPECT: open | NULL | NULL | NULL
-- Anything else means the deployed image predates the fix in commit 40ab097.
-- SELECT status, disposition, disposition_at, disposition_by
--   FROM fpa_findings WHERE id = '<finding-id>';

-- =============================================================================
-- test-fpa-core.sql — does the schema actually refuse what it claims to refuse?
-- =============================================================================
--
-- Every CHECK, trigger and unique index in `fpa-core.sql` is asserted here in
-- both directions: the legal case must succeed and the illegal case must fail.
-- A constraint that has only ever been read is a comment.
--
--   psql -d rewive_dev -v ON_ERROR_STOP=1 -f platform-schema/fpa-core.sql
--   psql -d rewive_dev -f platform-schema/test-fpa-core.sql
--
-- Run against a database that already has `shared-dimensions.sql` and the
-- Americana C&S configuration loaded. Every negative test is wrapped in a
-- savepoint, so the run continues after each expected failure.
-- =============================================================================

\set ON_ERROR_STOP off
\set QUIET on
SET client_min_messages TO warning;

BEGIN;

-- --- fixtures ---------------------------------------------------------------
INSERT INTO fpa.dim_period (key, name, period_type, starts_on, ends_on, fiscal_year, closed_on, brm_on)
VALUES ('2026-M07', 'July 2026', 'month', '2026-07-01', '2026-07-31', 2026, '2026-08-03', '2026-08-08'),
       ('2026-M08', 'August 2026', 'month', '2026-08-01', '2026-08-31', 2026, NULL, NULL);

INSERT INTO fpa.stream (key, name, answers_to) VALUES ('sales', 'Sales', 'coo');

INSERT INTO fpa.brain_node (key, kind, name, stream_key, definition)
VALUES ('gross_sales_mtd', 'stream_kpi', 'Gross sales MTD', 'sales', 'Month-to-date gross sales'),
       ('net_revenue',     'pl_line',    'Net revenue',     NULL,    'Revenue after deductions'),
       ('group_ebitda',    'target',     'Group EBITDA',    NULL,    'The intent');

INSERT INTO fpa.app_user (person_id, idp_subject, email)
SELECT p.id, 'sub-' || p.id, p.email FROM shared.person p WHERE p.email IS NOT NULL LIMIT 1;

\echo ''
\echo '=============================================================='
\echo ' A. fact_measure — the marginals lesson'
\echo '=============================================================='

\echo '-- A1 legal: a total row with no slice columns'
SAVEPOINT s; INSERT INTO fpa.fact_measure (node_id, period_id, grain, value)
SELECT id, (SELECT id FROM fpa.dim_period WHERE key='2026-M07'), 'total', 124
  FROM fpa.brain_node WHERE key='gross_sales_mtd';
\echo '-- A2 legal: a by_region row carrying exactly a region'
SAVEPOINT s2; INSERT INTO fpa.fact_measure (node_id, period_id, grain, region_id, value)
SELECT n.id, (SELECT id FROM fpa.dim_period WHERE key='2026-M07'), 'by_region', r.id, 60
  FROM fpa.brain_node n, shared.dim_region r WHERE n.key='gross_sales_mtd' LIMIT 1;

\echo '-- A3 MUST FAIL: grain says total but a region is attached'
SAVEPOINT s3; INSERT INTO fpa.fact_measure (node_id, period_id, grain, region_id, value)
SELECT n.id, (SELECT id FROM fpa.dim_period WHERE key='2026-M07'), 'total', r.id, 124
  FROM fpa.brain_node n, shared.dim_region r WHERE n.key='gross_sales_mtd' LIMIT 1;
ROLLBACK TO s3;

\echo '-- A4 MUST FAIL: grain says by_region but no region given'
SAVEPOINT s4; INSERT INTO fpa.fact_measure (node_id, period_id, grain, value)
SELECT id, (SELECT id FROM fpa.dim_period WHERE key='2026-M07'), 'by_region', 60
  FROM fpa.brain_node WHERE key='gross_sales_mtd';
ROLLBACK TO s4;

\echo '-- A5 MUST FAIL: by_region row smuggling a second slice (the 496-vs-124 bug)'
SAVEPOINT s5; INSERT INTO fpa.fact_measure (node_id, period_id, grain, region_id, channel_id, value)
SELECT n.id, (SELECT id FROM fpa.dim_period WHERE key='2026-M07'), 'by_region', r.id, c.id, 60
  FROM fpa.brain_node n, shared.dim_region r, shared.dim_channel c WHERE n.key='gross_sales_mtd' LIMIT 1;
ROLLBACK TO s5;

\echo '-- A6 the safe aggregate returns the headline, not the sum of everything'
SELECT 'v_measure_total =' AS check, value FROM fpa.v_measure_total;
SELECT 'raw SUM (would double-count) =' AS check, SUM(value) FROM fpa.fact_measure;

\echo ''
\echo '=============================================================='
\echo ' B. brain_edge — the cascade must stay acyclic'
\echo '=============================================================='

\echo '-- B1 legal: mandate feeds P&L line feeds intent'
SAVEPOINT b1;
INSERT INTO fpa.brain_edge (source_id, target_id)
SELECT (SELECT id FROM fpa.brain_node WHERE key='gross_sales_mtd'),
       (SELECT id FROM fpa.brain_node WHERE key='net_revenue');
INSERT INTO fpa.brain_edge (source_id, target_id)
SELECT (SELECT id FROM fpa.brain_node WHERE key='net_revenue'),
       (SELECT id FROM fpa.brain_node WHERE key='group_ebitda');

\echo '-- B2 MUST FAIL: closing the loop back to the mandate'
SAVEPOINT b2; INSERT INTO fpa.brain_edge (source_id, target_id)
SELECT (SELECT id FROM fpa.brain_node WHERE key='group_ebitda'),
       (SELECT id FROM fpa.brain_node WHERE key='gross_sales_mtd');
ROLLBACK TO b2;

\echo '-- B3 MUST FAIL: a node feeding itself'
SAVEPOINT b3; INSERT INTO fpa.brain_edge (source_id, target_id)
SELECT id, id FROM fpa.brain_node WHERE key='net_revenue';
ROLLBACK TO b3;

\echo ''
\echo '=============================================================='
\echo ' C. mandate — Doctrine 1, exactly one accountable human owner'
\echo '=============================================================='

\echo '-- C1 legal: a mandate with a seat and a holder agent'
SAVEPOINT c1; INSERT INTO fpa.mandate (key, node_id, owner_seat_id, holder_agent_id, statement)
SELECT 'm_gross_sales', n.id, s.id, a.id, 'Hold gross sales MTD to target'
  FROM fpa.brain_node n, shared.seat s, shared.agent a WHERE n.key='gross_sales_mtd' LIMIT 1;

\echo '-- C2 MUST FAIL: a mandate with no human owner'
SAVEPOINT c2; INSERT INTO fpa.mandate (key, node_id, owner_seat_id, holder_agent_id, statement)
SELECT 'm_ownerless', n.id, NULL, a.id, 'Nobody answers for this'
  FROM fpa.brain_node n, shared.agent a WHERE n.key='gross_sales_mtd' LIMIT 1;
ROLLBACK TO c2;

\echo '-- C3 MUST FAIL: the same node+slice owned twice'
SAVEPOINT c3; INSERT INTO fpa.mandate (key, node_id, owner_seat_id, holder_agent_id, statement)
SELECT 'm_duplicate', n.id, s.id, a.id, 'A second owner for the same number'
  FROM fpa.brain_node n, shared.seat s, shared.agent a WHERE n.key='gross_sales_mtd' LIMIT 1;
ROLLBACK TO c3;

\echo ''
\echo '=============================================================='
\echo ' D. finding — Doctrine 2, no half-recorded decisions'
\echo '=============================================================='

\echo '-- D1 legal: an open, undecided finding'
SAVEPOINT d1; INSERT INTO fpa.finding
    (key, title, node_id, raised_by_agent_id, owner_role_key, legal_entity_id, sla_deadline_at)
SELECT 'f-001', 'Gross sales 8% below target', n.id, a.id, r.key, le.id, now() + interval '48 hours'
  FROM fpa.brain_node n, shared.agent a, shared.role r, shared.legal_entity le
 WHERE n.key='gross_sales_mtd' AND r.key='sales_supervisor' LIMIT 1;

\echo '-- D2 MUST FAIL: a disposition with no decider and no moment'
SAVEPOINT d2; UPDATE fpa.finding SET disposition='accept' WHERE key='f-001';
ROLLBACK TO d2;

\echo '-- D3 MUST FAIL: Dismiss without a reason'
SAVEPOINT d3; UPDATE fpa.finding
   SET disposition='abandon', decided_at=now(),
       decided_by_user_id=(SELECT id FROM fpa.app_user LIMIT 1), status='abandoned'
 WHERE key='f-001';
ROLLBACK TO d3;

\echo '-- D4 legal: Dismiss WITH a reason'
SAVEPOINT d4; UPDATE fpa.finding
   SET disposition='abandon', decided_at=now(),
       decided_by_user_id=(SELECT id FROM fpa.app_user LIMIT 1),
       decision_reason='Rebate accrual posted late — not real drift', status='abandoned'
 WHERE key='f-001';
ROLLBACK TO d4;

\echo '-- D5 MUST FAIL: closed without a closing moment'
SAVEPOINT d5; UPDATE fpa.finding SET status='closed' WHERE key='f-001';
ROLLBACK TO d5;

\echo '-- D6 MUST FAIL: a finding with no entity (it would vanish from rollups)'
SAVEPOINT d6; INSERT INTO fpa.finding
    (key, title, node_id, raised_by_agent_id, owner_role_key, legal_entity_id)
SELECT 'f-noentity', 'Orphan', n.id, a.id, r.key, NULL
  FROM fpa.brain_node n, shared.agent a, shared.role r
 WHERE n.key='gross_sales_mtd' AND r.key='sales_supervisor' LIMIT 1;
ROLLBACK TO d6;

\echo ''
\echo '=============================================================='
\echo ' E. Doctrine 4 — transfers are recorded and cannot be rewritten'
\echo '=============================================================='

\echo '-- E1 legal: an escalation moves ownership up'
SAVEPOINT e1; INSERT INTO fpa.escalation_trail (finding_id, from_role_key, to_role_key)
SELECT f.id, 'sales_supervisor', 'coo' FROM fpa.finding f WHERE f.key='f-001';

\echo '-- E2 MUST FAIL: editing the trail afterwards'
SAVEPOINT e2; UPDATE fpa.escalation_trail SET to_role_key='cfo';
ROLLBACK TO e2;

\echo '-- E3 MUST FAIL: deleting from the trail'
SAVEPOINT e3; DELETE FROM fpa.escalation_trail;
ROLLBACK TO e3;

\echo '-- E4 MUST FAIL: an escalation that goes nowhere'
SAVEPOINT e4; INSERT INTO fpa.escalation_trail (finding_id, from_role_key, to_role_key)
SELECT f.id, 'coo', 'coo' FROM fpa.finding f WHERE f.key='f-001';
ROLLBACK TO e4;

\echo '-- E5 MUST FAIL: reassign without naming a destination'
SAVEPOINT e5; INSERT INTO fpa.leadership_action (finding_id, action, by_user_id, by_role_key, summary)
SELECT f.id, 'reassign', (SELECT id FROM fpa.app_user LIMIT 1), 'coo', 'Reassigned to nobody'
  FROM fpa.finding f WHERE f.key='f-001';
ROLLBACK TO e5;

\echo ''
\echo '=============================================================='
\echo ' F. comment — an unattributed comment is not evidence'
\echo '=============================================================='

\echo '-- F1 legal: an authored comment on the finding thread'
SAVEPOINT f1; INSERT INTO fpa.comment (finding_id, author_user_id, author_role_key, body)
SELECT f.id, (SELECT id FROM fpa.app_user LIMIT 1), 'coo', 'Chasing the depot on this today.'
  FROM fpa.finding f WHERE f.key='f-001';

\echo '-- F2 MUST FAIL: no author'
SAVEPOINT f2; INSERT INTO fpa.comment (finding_id, author_user_id, body)
SELECT f.id, NULL, 'Anonymous' FROM fpa.finding f WHERE f.key='f-001';
ROLLBACK TO f2;

\echo '-- F3 MUST FAIL: an empty comment'
SAVEPOINT f3; INSERT INTO fpa.comment (finding_id, author_user_id, body)
SELECT f.id, (SELECT id FROM fpa.app_user LIMIT 1), '   ' FROM fpa.finding f WHERE f.key='f-001';
ROLLBACK TO f3;

\echo '-- F4 MUST FAIL: attached to both a finding and an action at once'
SAVEPOINT f4; INSERT INTO fpa.comment (finding_id, finding_action_id, author_user_id, body)
SELECT f.id, 1, (SELECT id FROM fpa.app_user LIMIT 1), 'Two subjects'
  FROM fpa.finding f WHERE f.key='f-001';
ROLLBACK TO f4;

\echo '-- F5 MUST FAIL: attached to nothing'
SAVEPOINT f5; INSERT INTO fpa.comment (author_user_id, body)
VALUES ((SELECT id FROM fpa.app_user LIMIT 1), 'Floating');
ROLLBACK TO f5;

\echo ''
\echo '=============================================================='
\echo ' G. recovery_target — Doctrine 3, one definition of done'
\echo '=============================================================='

\echo '-- G1 legal: an exit condition on the finding'
SAVEPOINT g1; INSERT INTO fpa.recovery_target
    (finding_id, name, baseline_value, target_value, current_value, legal_entity_id)
SELECT f.id, 'Gross sales back to target', 92, 100, 96, f.legal_entity_id
  FROM fpa.finding f WHERE f.key='f-001';

\echo '-- G2 progress is derived, and direction-aware'
SELECT 'progress_pct =' AS check, progress_pct FROM fpa.v_recovery_progress;

\echo '-- G3 MUST FAIL: a second exit condition on the same finding'
SAVEPOINT g3; INSERT INTO fpa.recovery_target
    (finding_id, name, baseline_value, target_value, legal_entity_id)
SELECT f.id, 'A competing definition of done', 92, 100, f.legal_entity_id
  FROM fpa.finding f WHERE f.key='f-001';
ROLLBACK TO g3;

\echo '-- G4 MUST FAIL: a target that does not move'
SAVEPOINT g4; INSERT INTO fpa.recovery_target
    (finding_id, name, baseline_value, target_value, legal_entity_id)
SELECT f.id, 'Recover to exactly where we are', 92, 92, f.legal_entity_id
  FROM fpa.finding f WHERE f.key='f-001';
ROLLBACK TO g4;

\echo ''
\echo '=============================================================='
\echo ' H. the lens — the queue is derived, not asserted'
\echo '=============================================================='

\echo '-- H1 the finding appears in its owner''s queue at distance 0'
SELECT visible_to_role_key, levels_below FROM fpa.v_finding_queue
 WHERE key='f-001' ORDER BY levels_below;

\echo '-- H2 a user resolves to a role without being asked which one'
SELECT user_id, role_key, full_name IS NOT NULL AS has_person FROM fpa.v_user_lens;

\echo ''
\echo '=============================================================='
\echo ' I. dim_period — the close/BRM rhythm'
\echo '=============================================================='

\echo '-- I1 MUST FAIL: books closed before the period ends'
SAVEPOINT i1; INSERT INTO fpa.dim_period (key, name, period_type, starts_on, ends_on, fiscal_year, closed_on)
VALUES ('2026-M09', 'September 2026', 'month', '2026-09-01', '2026-09-30', 2026, '2026-09-15');
ROLLBACK TO i1;

\echo '-- I2 MUST FAIL: the BRM met before the books closed'
SAVEPOINT i2; INSERT INTO fpa.dim_period (key, name, period_type, starts_on, ends_on, fiscal_year, closed_on, brm_on)
VALUES ('2026-M10', 'October 2026', 'month', '2026-10-01', '2026-10-31', 2026, '2026-11-03', '2026-11-01');
ROLLBACK TO i2;

\echo '-- I3 the close-to-BRM gap, as a measure'
SELECT key, (brm_on - closed_on) AS close_to_brm_days
  FROM fpa.dim_period WHERE brm_on IS NOT NULL;

ROLLBACK;

\echo ''
\echo 'Done. Every line above marked MUST FAIL should have printed an ERROR.'

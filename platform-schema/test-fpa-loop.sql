-- =============================================================================
-- test-fpa-loop.sql — the loop engine and evidence layer, asserted
-- =============================================================================
--
--   psql -d rewive_dev -f platform-schema/test-fpa-loop.sql
--
-- Run after fpa-core.sql and fpa-loop.sql. Negative cases are wrapped in
-- savepoints so the run continues past each expected failure.
-- =============================================================================

\set ON_ERROR_STOP off
\set QUIET on
SET client_min_messages TO warning;

BEGIN;

-- --- fixtures ---------------------------------------------------------------
INSERT INTO fpa.dim_period (key, name, period_type, starts_on, ends_on, fiscal_year)
VALUES ('T-M01', 'Test month', 'month', '2026-08-01', '2026-08-31', 2026);

INSERT INTO fpa.stream (key, name) VALUES ('sales', 'Sales');

INSERT INTO fpa.brain_node (key, kind, name, stream_key)
VALUES ('n_sales', 'stream_kpi', 'Gross sales MTD', 'sales');

INSERT INTO fpa.app_user (person_id, idp_subject, email)
SELECT p.id, 'sub-'||p.id, p.email FROM shared.person p WHERE p.email IS NOT NULL LIMIT 1;

INSERT INTO fpa.mandate (key, node_id, owner_seat_id, holder_agent_id, statement)
SELECT 'm1', n.id, s.id, a.id, 'Hold gross sales'
  FROM fpa.brain_node n, shared.seat s, shared.agent a WHERE n.key='n_sales' LIMIT 1;

INSERT INTO fpa.finding (key, title, node_id, raised_by_agent_id, owner_role_key,
                         legal_entity_id, sla_deadline_at)
SELECT 'f-loop', 'Drift', n.id, a.id, 'sales_supervisor', le.id, now() + interval '24 hours'
  FROM fpa.brain_node n, shared.agent a, shared.legal_entity le WHERE n.key='n_sales' LIMIT 1;

\echo ''
\echo '=============================================================='
\echo ' A. tracking_config — drift must be worse than noise'
\echo '=============================================================='

\echo '-- A1 legal: breach threshold above the warn threshold'
SAVEPOINT a1; INSERT INTO fpa.tracking_config (mandate_id, target_numeric, warn_pct, breach_pct)
SELECT id, 100, 3, 5 FROM fpa.mandate WHERE key='m1';

\echo '-- A2 MUST FAIL: a breach threshold tighter than the warn threshold'
SAVEPOINT a2; UPDATE fpa.tracking_config SET breach_pct = 1;
ROLLBACK TO a2;

\echo '-- A3 MUST FAIL: a second tracking config for the same mandate'
SAVEPOINT a3; INSERT INTO fpa.tracking_config (mandate_id, target_numeric)
SELECT id, 100 FROM fpa.mandate WHERE key='m1';
ROLLBACK TO a3;

\echo ''
\echo '=============================================================='
\echo ' B. metric_point — a re-post is an update, not a second reading'
\echo '=============================================================='

\echo '-- B1 legal: a reading'
SAVEPOINT b1; INSERT INTO fpa.metric_point (mandate_id, ts, value, source)
SELECT id, '2026-08-10T00:00:00Z', 92, 'api' FROM fpa.mandate WHERE key='m1';

\echo '-- B2 MUST FAIL: the same reading from the same source twice'
SAVEPOINT b2; INSERT INTO fpa.metric_point (mandate_id, ts, value, source)
SELECT id, '2026-08-10T00:00:00Z', 95, 'api' FROM fpa.mandate WHERE key='m1';
ROLLBACK TO b2;

\echo ''
\echo '=============================================================='
\echo ' C. loop_timer — one pending wake-up per kind'
\echo '=============================================================='

\echo '-- C1 legal: arm an SLA timer'
SAVEPOINT c1; INSERT INTO fpa.loop_timer (kind, finding_id, fire_at)
SELECT 'sla_escalation', id, now() + interval '24 hours' FROM fpa.finding WHERE key='f-loop';

\echo '-- C2 legal: a re-alert window alongside it is a different kind'
SAVEPOINT c2; INSERT INTO fpa.loop_timer (kind, finding_id, fire_at)
SELECT 're_alert_window', id, now() + interval '7 days' FROM fpa.finding WHERE key='f-loop';

\echo '-- C3 MUST FAIL: a second pending SLA timer on the same finding'
\echo '--    (this is what a re-armed deadline would leave behind)'
SAVEPOINT c3; INSERT INTO fpa.loop_timer (kind, finding_id, fire_at)
SELECT 'sla_escalation', id, now() + interval '48 hours' FROM fpa.finding WHERE key='f-loop';
ROLLBACK TO c3;

\echo '-- C4 legal: once the first is fired, the next may be armed'
SAVEPOINT c4;
UPDATE fpa.loop_timer SET status='fired', fired_at=now()
 WHERE kind='sla_escalation' AND status='pending';
INSERT INTO fpa.loop_timer (kind, finding_id, fire_at)
SELECT 'sla_escalation', id, now() + interval '48 hours' FROM fpa.finding WHERE key='f-loop';

\echo '-- C5 MUST FAIL: fired without a moment'
SAVEPOINT c5; UPDATE fpa.loop_timer SET status='fired' WHERE status='pending';
ROLLBACK TO c5;

\echo ''
\echo '=============================================================='
\echo ' D. ledger_event — the chain cannot fork or be rewritten'
\echo '=============================================================='

\echo '-- D1 legal: genesis, then one event chained onto it'
SAVEPOINT d1;
INSERT INTO fpa.ledger_event (event_uid, kind, finding_id, actor_label, occurred_at, payload, prev_hash, hash)
SELECT gen_random_uuid(), 'decision', id, 'sarah@americana.example', now(),
       '{"disposition":"accept"}'::jsonb, 'GENESIS', 'hash-001'
  FROM fpa.finding WHERE key='f-loop';
INSERT INTO fpa.ledger_event (event_uid, kind, finding_id, actor_label, occurred_at, payload, prev_hash, hash)
SELECT gen_random_uuid(), 'transfer', id, 'system', now(),
       '{"from":"sales_supervisor","to":"coo"}'::jsonb, 'hash-001', 'hash-002'
  FROM fpa.finding WHERE key='f-loop';

\echo '-- D2 MUST FAIL: a second event claiming the same predecessor'
\echo '--    (the concurrent-append fork the appendQueue exists to prevent —'
\echo '--     an application queue cannot span two API replicas; this can)'
SAVEPOINT d2; INSERT INTO fpa.ledger_event (event_uid, kind, finding_id, actor_label, occurred_at, payload, prev_hash, hash)
SELECT gen_random_uuid(), 'verdict', id, 'assessor', now(),
       '{"verdict":"worked"}'::jsonb, 'hash-001', 'hash-003'
  FROM fpa.finding WHERE key='f-loop';
ROLLBACK TO d2;

\echo '-- D3 MUST FAIL: rewriting history'
SAVEPOINT d3; UPDATE fpa.ledger_event SET payload='{"disposition":"abandon"}'::jsonb WHERE hash='hash-001';
ROLLBACK TO d3;

\echo '-- D4 MUST FAIL: deleting history'
SAVEPOINT d4; DELETE FROM fpa.ledger_event WHERE hash='hash-001';
ROLLBACK TO d4;

\echo '-- D5 MUST FAIL: two events with the same hash'
SAVEPOINT d5; INSERT INTO fpa.ledger_event (event_uid, kind, finding_id, actor_label, occurred_at, payload, prev_hash, hash)
SELECT gen_random_uuid(), 'verdict', id, 'assessor', now(),
       '{}'::jsonb, 'hash-002', 'hash-001'
  FROM fpa.finding WHERE key='f-loop';
ROLLBACK TO d5;

\echo '-- D6 MUST FAIL: deleting a finding whose decisions are on the record.'
\echo '--    Evidence outlives convenience — the delete is refused at the FK,'
\echo '--    not deep inside a cascade that trips the append-only trigger.'
SAVEPOINT d6; DELETE FROM fpa.finding WHERE key='f-loop';
ROLLBACK TO d6;

\echo ''
\echo '=============================================================='
\echo ' E. the decision ledger view'
\echo '=============================================================='
SELECT finding_key, disposition IS NOT DISTINCT FROM NULL AS undecided, actor_label
  FROM fpa.v_decision_ledger;

ROLLBACK;

\echo ''
\echo 'Done. Every line marked MUST FAIL should have printed an ERROR.'

-- Rewive live-tracking schema. Idempotent — safe to re-run (npm run migrate).
-- Only the *live* entities live here; seeded demo content stays in-memory/KV.

CREATE TABLE IF NOT EXISTS ingest_keys (
  id            text PRIMARY KEY,
  label         text NOT NULL,
  key_hash      text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

CREATE TABLE IF NOT EXISTS tracking_configs (
  node_id          text PRIMARY KEY,
  industry         text NOT NULL,
  unit             text NOT NULL DEFAULT 'count',
  format           text,
  direction        text NOT NULL DEFAULT 'up_good' CHECK (direction IN ('up_good', 'down_good')),
  target_numeric   double precision NOT NULL,
  warn_pct         double precision NOT NULL DEFAULT 3,
  breach_pct       double precision NOT NULL DEFAULT 5,
  sustained_points integer NOT NULL DEFAULT 3,
  min_points       integer NOT NULL DEFAULT 3,
  enabled          boolean NOT NULL DEFAULT true,
  -- Legal entity / region these numbers belong to. Sweep-raised findings
  -- inherit them so live activity lands in the By-entity + By-region rollups.
  entity           text,
  region           text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tracking_configs ADD COLUMN IF NOT EXISTS entity text;
ALTER TABLE tracking_configs ADD COLUMN IF NOT EXISTS region text;

CREATE TABLE IF NOT EXISTS metric_points (
  id            bigserial PRIMARY KEY,
  node_id       text NOT NULL,
  ts            timestamptz NOT NULL,
  value         double precision NOT NULL,
  source        text NOT NULL DEFAULT 'api',
  ingest_key_id text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_id, ts, source)
);
CREATE INDEX IF NOT EXISTS metric_points_node_ts ON metric_points (node_id, ts DESC);

CREATE TABLE IF NOT EXISTS live_findings (
  id              text PRIMARY KEY,
  industry        text NOT NULL,
  node_id         text NOT NULL,
  rule            text NOT NULL,
  status          text NOT NULL,
  authored_by     text NOT NULL DEFAULT 'template',
  finding         jsonb NOT NULL,
  re_alert        jsonb,
  sla_deadline_at timestamptz,
  sweep_run_id    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- At most one live finding per node still demanding attention (double-raise guard).
CREATE UNIQUE INDEX IF NOT EXISTS live_findings_one_active
  ON live_findings (node_id) WHERE status IN ('open', 'acknowledged', 'accepted', 'acting');

CREATE TABLE IF NOT EXISTS live_closure_kpis (
  id         text PRIMARY KEY,
  industry   text NOT NULL,
  finding_id text NOT NULL REFERENCES live_findings(id),
  closure    jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sweep_runs (
  id                  text PRIMARY KEY,
  trigger             text NOT NULL,
  started_at          timestamptz NOT NULL,
  finished_at         timestamptz,
  nodes_evaluated     integer NOT NULL DEFAULT 0,
  findings_raised     integer NOT NULL DEFAULT 0,
  re_alerts_fired     integer NOT NULL DEFAULT 0,
  closures_progressed integer NOT NULL DEFAULT 0,
  authored_by_claude  integer NOT NULL DEFAULT 0,
  errors              jsonb,
  -- Per-node analysis trail, written as the sweep walks its mandates so the
  -- Findings screen can watch the agents work instead of only seeing
  -- the result. Shape: { steps: [{ nodeId, nodeName, counterpartName, status,
  -- detail, findingId, severity }] }.
  progress            jsonb
);

ALTER TABLE sweep_runs ADD COLUMN IF NOT EXISTS progress jsonb;

-- Tenant-store migration 004: the append-only ledger, hardened (P1.6).
-- Supersedes 002's row-shaped decision_ledger as the WRITE target (that table
-- stays for derived views): every decision, verdict and ownership transfer is
-- an immutable event, hash-chained to the one before it. Immutability is
-- enforced by trigger — stronger than revoked grants, it binds the table
-- owner too; per-role grant hygiene is an Azure-target concern.
CREATE TABLE IF NOT EXISTS ledger_events (
  seq        bigserial PRIMARY KEY,
  id         text NOT NULL UNIQUE,
  kind       text NOT NULL CHECK (kind IN ('decision', 'verdict', 'transfer')),
  industry   text NOT NULL,
  persona    text,
  finding_id text,
  actor      text NOT NULL,
  at         timestamptz NOT NULL,
  payload    jsonb NOT NULL,
  prev_hash  text NOT NULL,
  hash       text NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_anchors (
  seq         bigint NOT NULL,
  head_hash   text NOT NULL,
  anchored_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION ledger_events_immutable() RETURNS trigger AS $$
  BEGIN RAISE EXCEPTION 'ledger_events is append-only'; END
  $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_events_no_rewrite ON ledger_events;
CREATE TRIGGER ledger_events_no_rewrite BEFORE UPDATE OR DELETE ON ledger_events
  FOR EACH ROW EXECUTE FUNCTION ledger_events_immutable();

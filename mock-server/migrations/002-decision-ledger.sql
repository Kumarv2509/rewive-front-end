-- Tenant-store migration 002: the decision ledger lands in the tenant's own
-- store — groundwork for P1.6 (append-only enforcement via revoked
-- UPDATE/DELETE grants and periodic hash anchoring arrive there; the table
-- shape and the fan-out that delivers it everywhere are proven here).
CREATE TABLE IF NOT EXISTS decision_ledger (
  id              text PRIMARY KEY,
  persona         text NOT NULL,
  title           text NOT NULL,
  subtitle        text,
  made_by         jsonb NOT NULL,
  informed_by     jsonb NOT NULL,
  decided_at      timestamptz NOT NULL DEFAULT now(),
  verdict         text NOT NULL DEFAULT 'too_early' CHECK (verdict IN ('worked', 'not_worked', 'too_early')),
  measured_impact jsonb,
  finding_id      text,
  entity          text,
  region          text
);
CREATE INDEX IF NOT EXISTS decision_ledger_persona ON decision_ledger (persona);
CREATE INDEX IF NOT EXISTS decision_ledger_finding ON decision_ledger (finding_id);

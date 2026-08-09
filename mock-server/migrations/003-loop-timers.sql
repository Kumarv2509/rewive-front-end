-- Tenant-store migration 003: the loop engine's durable timer queue.
-- Timers live next to the data they judge (ARCH-GTM-001's timer-mechanism
-- call): if the worker dies, wake-ups survive here and resume. Claimed with
-- FOR UPDATE SKIP LOCKED so multiple workers never double-fire.
CREATE TABLE IF NOT EXISTS loop_timers (
  id         bigserial PRIMARY KEY,
  kind       text NOT NULL,
  subject_id text NOT NULL,
  industry   text NOT NULL,
  fire_at    timestamptz NOT NULL,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fired', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  fired_at   timestamptz
);
CREATE INDEX IF NOT EXISTS loop_timers_due ON loop_timers (status, fire_at);

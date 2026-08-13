-- =============================================================================
-- Rewive platform schema — `fpa`: the loop engine and the evidence layer
-- =============================================================================
--
-- WHAT THIS IS
--   The production form of the four things `mock-server/` already persists:
--   live mandate tracking (`schema.sql`), the decision ledger (migration 002),
--   the durable timer queue (003) and the hash-chained event log (004).
--
--   Apply AFTER `fpa-core.sql`.
--
-- WHAT CHANGES IN THE PORT, and why
--   1. `industry` disappears from every table. In the mock it exists because
--      one process holds four industries at once; in production the database
--      IS the tenant boundary, so a column naming the tenant inside the
--      tenant's own database is dead weight that invites a cross-tenant query
--      to look reasonable.
--
--   2. `live_findings jsonb` disappears entirely. The mock keeps a live/seed
--      split — sweep-raised findings are rows, seeded ones are in memory, and
--      a great deal of machinery exists to hydrate one into the other and
--      strip it back out of the KV snapshot. In production every finding is a
--      row in `fpa.finding`, so the split, the hydration and the stripping all
--      stop existing. This is the single biggest simplification the real
--      database buys.
--
--   3. Text ids become foreign keys. `node_id text` with no referent cannot
--      stop a metric point arriving for a mandate that was deleted last week.
--
--   4. The ledger chain gets a database-level guarantee it does not have
--      today. See section 4 — this is the one place where the port is
--      deliberately stricter than the reference implementation.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Ingest — how real numbers arrive
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.ingest_key (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label         text        NOT NULL,
    -- The key itself is never stored. Only its hash, exactly as the mock does.
    key_hash      text        NOT NULL UNIQUE,
    created_by_user_id bigint REFERENCES fpa.app_user (id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_used_at  timestamptz,
    revoked_at    timestamptz
);

COMMENT ON TABLE fpa.ingest_key IS
  'API keys for POST /metrics. Opaque single strings, deliberately NOT '
  'JWT-shaped — the auth middleware validates only three-segment bearers and '
  'passes these through untouched. Do not "simplify" that shape check.';

CREATE TABLE fpa.tracking_config (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mandate_id        bigint      NOT NULL UNIQUE REFERENCES fpa.mandate (id) ON DELETE CASCADE,
    unit              text        NOT NULL DEFAULT 'count',
    format            text,
    direction         text        NOT NULL DEFAULT 'up_good'
                                  CHECK (direction IN ('up_good', 'down_good')),
    target_numeric    numeric     NOT NULL,
    warn_pct          numeric     NOT NULL DEFAULT 3  CHECK (warn_pct   >= 0),
    breach_pct        numeric     NOT NULL DEFAULT 5  CHECK (breach_pct >= 0),
    sustained_points  int         NOT NULL DEFAULT 3  CHECK (sustained_points >= 1),
    min_points        int         NOT NULL DEFAULT 3  CHECK (min_points      >= 1),
    enabled           boolean     NOT NULL DEFAULT true,
    updated_at        timestamptz NOT NULL DEFAULT now(),
    -- Drift has to be worse than noise before it is drift.
    CONSTRAINT tracking_config_breach_beyond_warn CHECK (breach_pct >= warn_pct)
);

COMMENT ON TABLE fpa.tracking_config IS
  'Makes a mandate live-tracked. Entity and region are NOT repeated here — the '
  'mandate already carries its slice, and duplicating it is how a '
  'sweep-raised finding ends up in a different rollup from the mandate it '
  'came from.';

CREATE TABLE fpa.metric_point (
    id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mandate_id     bigint      NOT NULL REFERENCES fpa.mandate (id) ON DELETE CASCADE,
    ts             timestamptz NOT NULL,
    value          numeric     NOT NULL,
    period_id      bigint      REFERENCES fpa.dim_period (id),
    source         text        NOT NULL DEFAULT 'api',
    ingest_key_id  bigint      REFERENCES fpa.ingest_key (id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    -- Re-posting the same reading from the same source is an update, not a
    -- second data point. The mock learned this when a re-seed laid down an
    -- offset second series instead of updating the first.
    CONSTRAINT metric_point_unique UNIQUE (mandate_id, ts, source)
);

CREATE INDEX metric_point_mandate_ts_idx ON fpa.metric_point (mandate_id, ts DESC);


-- -----------------------------------------------------------------------------
-- 2. Sweeps — Sense, and the visible work
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.sweep_run (
    id                  bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    trigger             text        NOT NULL
                                    CHECK (trigger IN ('cron', 'manual', 'dev-interval')),
    started_at          timestamptz NOT NULL DEFAULT now(),
    finished_at         timestamptz,
    nodes_evaluated     int         NOT NULL DEFAULT 0,
    findings_raised     int         NOT NULL DEFAULT 0,
    re_alerts_fired     int         NOT NULL DEFAULT 0,
    closures_progressed int         NOT NULL DEFAULT 0,
    authored_by_llm     int         NOT NULL DEFAULT 0,
    errors              jsonb,
    CONSTRAINT sweep_run_ordered CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE INDEX sweep_run_started_idx ON fpa.sweep_run (started_at DESC);

-- The per-mandate analysis trail, written as the sweep walks. In the mock this
-- is a `progress` jsonb blob on the run; as rows it can be queried, and the
-- live analysis strip stops parsing JSON to render itself.
--
-- Two properties of the sweep make that strip watchable and must survive the
-- port: the walk is PACED (roughly a second per mandate, skipped on cron), and
-- the progress read is exempt from the request serializer because the sweep
-- holds that lock for its whole run. Neither is an optimisation to remove —
-- showing the agents working is a trust feature, not a loading state.
CREATE TABLE fpa.sweep_step (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sweep_run_id  bigint      NOT NULL REFERENCES fpa.sweep_run (id) ON DELETE CASCADE,
    step_no       int         NOT NULL,
    mandate_id    bigint      REFERENCES fpa.mandate (id) ON DELETE SET NULL,
    status        text        NOT NULL
                              CHECK (status IN ('queued', 'analyzing', 'authoring',
                                                'clear', 'drift', 'raised',
                                                're-alert', 'recovered', 'skipped')),
    detail        text,
    finding_id    bigint      REFERENCES fpa.finding (id) ON DELETE SET NULL,
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sweep_step_ordered UNIQUE (sweep_run_id, step_no)
);

CREATE INDEX sweep_step_run_idx ON fpa.sweep_step (sweep_run_id, step_no);


-- -----------------------------------------------------------------------------
-- 3. The timer queue — clocks, not data
--
--    The half of a Park that says "or after N days" is a timer. The half that
--    says "if it worsens by X%" stays with the sweep. Clocks → timers, data →
--    sweeps; mixing them is how an escalation ends up depending on whether
--    anyone happened to load a page.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.loop_timer (
    id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind        text        NOT NULL
                            CHECK (kind IN ('sla_escalation', 're_alert_window')),
    finding_id  bigint      NOT NULL REFERENCES fpa.finding (id) ON DELETE CASCADE,
    fire_at     timestamptz NOT NULL,
    status      text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'fired', 'cancelled')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    fired_at    timestamptz,
    CONSTRAINT loop_timer_fired_has_moment CHECK (
        (status = 'fired') = (fired_at IS NOT NULL)
    )
);

-- The claim index. Workers take due timers with
--     SELECT ... WHERE status = 'pending' AND fire_at <= now()
--     ORDER BY fire_at FOR UPDATE SKIP LOCKED
-- so two workers never double-fire the same wake-up.
CREATE INDEX loop_timer_due_idx ON fpa.loop_timer (fire_at)
    WHERE status = 'pending';

-- At most one live timer of a kind per finding. Every deadline move re-arms
-- the SLA timer, and without this a finding that escalated three times carries
-- three pending wake-ups, two of which fire against a deadline that moved.
CREATE UNIQUE INDEX loop_timer_one_pending_per_kind
    ON fpa.loop_timer (finding_id, kind) WHERE status = 'pending';

COMMENT ON TABLE fpa.loop_timer IS
  'A timer is a WAKE-UP, never the truth. The executor re-reads the finding '
  'before acting, so a stale or duplicate wake-up no-ops rather than acting on '
  'what the timer remembered.';


-- -----------------------------------------------------------------------------
-- 4. The evidence layer — append-only, hash-chained
--
--    Every decision, verdict and ownership transfer is an immutable event
--    chained to the one before it, so any historical edit breaks every hash
--    after it.
--
--    THE ONE PLACE THIS PORT IS STRICTER THAN THE MOCK. In the reference
--    implementation the chain's integrity rests on appends being serialized
--    inside `ledger.js` — read-head-then-insert is only atomic if nothing
--    interleaves, and two of the three call sites append fire-and-forget. That
--    promise has already been broken once in this project: concurrent appends
--    landed on the same seq and the ledger reported itself tampered.
--
--    An application-level queue cannot survive two API replicas, and the
--    deployed estate runs two. So the chain is enforced here instead: UNIQUE
--    on `prev_hash` means two events cannot claim the same predecessor. The
--    second concurrent append fails on a constraint and retries against the
--    new head, rather than silently forking the chain. Keep the serialization
--    in the application as well — this is a floor, not a replacement.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.ledger_event (
    seq         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_uid   uuid        NOT NULL UNIQUE,
    kind        text        NOT NULL CHECK (kind IN ('decision', 'verdict', 'transfer')),
    -- NO ACTION, deliberately — see the note below the table.
    finding_id  bigint      REFERENCES fpa.finding (id),
    -- The acting principal. A ledger row whose actor is a display name proves
    -- nothing, so this is a user id wherever one was held.
    actor_user_id bigint    REFERENCES fpa.app_user (id),
    actor_label text        NOT NULL,
    role_key    citext      REFERENCES shared.role (key),
    occurred_at timestamptz NOT NULL,
    payload     jsonb       NOT NULL,
    prev_hash   text        NOT NULL,
    hash        text        NOT NULL UNIQUE,
    CONSTRAINT ledger_event_chain_unforked UNIQUE (prev_hash)
);

CREATE INDEX ledger_event_finding_idx ON fpa.ledger_event (finding_id);
CREATE INDEX ledger_event_at_idx      ON fpa.ledger_event (occurred_at);

COMMENT ON CONSTRAINT ledger_event_chain_unforked ON fpa.ledger_event IS
  'Two events cannot claim the same predecessor. This is the database-level '
  'form of the appendQueue invariant, and unlike the queue it survives a '
  'second API replica.';

-- NO REFERENTIAL ACTION on finding_id, and this was settled by executing it.
--
-- The first draft used ON DELETE SET NULL, reasoning that an event pointing at
-- a vanished finding is an honest past fact — which is true, and is exactly
-- how the reference implementation's KV snapshot behaves. But SET NULL is an
-- UPDATE, and this table refuses updates, so deleting a finding failed deep
-- inside the cascade with `ledger_event is append-only: UPDATE is refused`.
-- Two correct features colliding to produce a confusing error.
--
-- The resolution is the honest one rather than the accommodating one: a
-- finding whose decisions have been recorded CANNOT BE DELETED. The delete is
-- refused at the foreign key, cleanly and with a legible message. Nothing in
-- the product deletes findings — they close — so this costs nothing, and it
-- states the actual rule: evidence outlives convenience.
--
-- The same collision applies to escalation_trail and leadership_action in
-- fpa-core.sql, which are append-only and were also declared ON DELETE
-- CASCADE. Both are corrected there for the same reason.

CREATE TABLE fpa.ledger_anchor (
    id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    seq          bigint      NOT NULL,
    head_hash    text        NOT NULL,
    anchored_at  timestamptz NOT NULL DEFAULT now(),
    anchored_by_user_id bigint REFERENCES fpa.app_user (id)
);

CREATE TRIGGER ledger_event_append_only
    BEFORE UPDATE OR DELETE ON fpa.ledger_event
    FOR EACH ROW EXECUTE FUNCTION fpa.refuse_mutation();

CREATE TRIGGER ledger_anchor_append_only
    BEFORE UPDATE OR DELETE ON fpa.ledger_anchor
    FOR EACH ROW EXECUTE FUNCTION fpa.refuse_mutation();


-- -----------------------------------------------------------------------------
-- 5. The decision ledger, as the screen reads it
--
--    `fpa.ledger_event` is the write target and the evidence. This view is the
--    display surface `/decisions` serves — derived, so the two can never
--    disagree the way a separately-maintained row-shaped table can.
-- -----------------------------------------------------------------------------

CREATE VIEW fpa.v_decision_ledger AS
SELECT e.seq,
       e.event_uid,
       e.occurred_at,
       e.actor_label,
       e.role_key,
       f.id            AS finding_id,
       f.key           AS finding_key,
       f.title         AS finding_title,
       f.disposition,
       f.decision_reason,
       f.legal_entity_id,
       f.region_id,
       f.period_id,
       v.payload ->> 'verdict'   AS assessor_verdict,
       v.payload ->> 'note'      AS assessor_note,
       v.occurred_at             AS assessed_at
  FROM fpa.ledger_event e
  JOIN fpa.finding      f ON f.id = e.finding_id
  LEFT JOIN LATERAL (
        SELECT ve.payload, ve.occurred_at
          FROM fpa.ledger_event ve
         WHERE ve.finding_id = e.finding_id AND ve.kind = 'verdict'
         ORDER BY ve.seq DESC
         LIMIT 1
  ) v ON true
 WHERE e.kind = 'decision';

COMMENT ON VIEW fpa.v_decision_ledger IS
  'The Decision Ledger screen. A decision plus the assessor verdict that came '
  'back later — worked / did not / too early.';


-- -----------------------------------------------------------------------------
-- 6. Grants
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE
   ON ALL TABLES IN SCHEMA fpa TO rewive_app;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA fpa TO rewive_app;

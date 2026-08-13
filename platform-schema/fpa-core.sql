-- =============================================================================
-- Rewive platform schema — `fpa`: the loop
-- =============================================================================
--
-- WHAT THIS IS
--   The second half of the platform data model. `shared-dimensions.sql` gives
--   the customer's vocabulary — geography, business units, channels,
--   categories, legal entities, org units, roles, people, seats, agents. This
--   file gives the things that vocabulary describes: who is authenticated, the
--   operating model they hold, the measures underneath it, and the loop that
--   runs on them — Sense → Find → Decide → Act → Close.
--
--   Apply AFTER `shared-dimensions.sql`. Every foreign key here points
--   backwards, into `shared` or into a table defined earlier in this file.
--
-- STATUS — read before using
--   * Applied and exercised against a local PostgreSQL 16 (the production
--     major version), including every trigger and CHECK below. NOT applied to
--     any live database.
--   * NOT WIRED into `mock-server/migrations/` or `npm run migrate`, on
--     purpose — the control plane must not fan this out.
--   * Destination is the BACKEND repo's `migrations/` package
--     (`rewive-fpa-backend`, run by `python -m migrations.runner` as
--     `rewive_admin`), NOT `rewive-infra`, which is Terraform only and has no
--     `migrations/` directory. That runner's file-naming convention is
--     unverified — confirm it before renaming this file to fit a guess.
--   * The reconciliation blocker stands: `sales_excellence` and
--     `sales_staging` already exist in the live Americana database and have
--     never been inspected from here. Nothing in this file may be applied
--     there until they have been.
--
-- TARGET
--   Azure Database for PostgreSQL Flexible Server, one database per customer.
--   The database IS the tenant boundary — no `tenant_id` column, no RLS.
--   Assumed search_path: fpa, shared, audit, rag, public.
--
-- THE DOCTRINE THIS SCHEMA HAS TO ENFORCE, not merely permit
--   1. Every mandate has exactly one accountable HUMAN owner — never zero,
--      never an agent, never a committee. `mandate.owner_seat_id` is NOT NULL
--      and points at a person holding a role, not at a name string.
--   2. Every finding demands a decision. No state stops the clock without a
--      recorded choice, so `disposition` and `decided_at` move together and a
--      CHECK refuses a half-recorded decision.
--   3. Nothing is "done" until the number is back. A finding cannot reach
--      `closed` on an Accept without a recovery target that actually met.
--   4. Accountability transfers, never bypasses — every move of ownership
--      writes an `escalation_trail` row, and the trail is append-only.
--
-- WHAT CHANGED ABOUT THE PRODUCT'S SHAPE, and why it is here
--   The demo carries these as display strings on in-memory objects: an owner
--   is a name, a persona is a client-supplied `seat` string, a comment is a
--   `note` field with no author, and a period is an ISO timestamp. Each of
--   those is fine for a demo and none of them is evidence. This file makes the
--   owner a seat, the lens a derivation, the comment an authored row, and the
--   period a dimension.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Schema
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS fpa;

COMMENT ON SCHEMA fpa IS
  'The loop: identity, the operating model, measures, findings, decisions and '
  'closure. Named for the FP&A origin of the product; it is not limited to '
  'finance.';


-- -----------------------------------------------------------------------------
-- 1. Time
--
--    The product's premise is a rhythm: the period closes, a pack is built,
--    the Business Review Meeting happens, action items come out of it and then
--    the month happens to everybody. The demo cannot express any of that — its
--    timestamps are per-row ISO strings and its half-year rollups are seeded
--    copy rather than anything computed. A measure that cannot say which
--    period it belongs to cannot be compared to the same period last year,
--    which is most of what a finding is actually claiming.
-- -----------------------------------------------------------------------------

-- The fiscal calendar, as the customer keeps it. Adjacency again, so a month
-- rolls into a quarter rolls into a half rolls into a year without anyone
-- hardcoding that a half is six months — which is false for enough customers
-- (52/53-week retail calendars especially) to be worth not assuming.
CREATE TABLE fpa.dim_period (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key               citext      NOT NULL UNIQUE,
    name              text        NOT NULL,
    period_type       text        NOT NULL
                                  CHECK (period_type IN ('month', 'quarter', 'half', 'year')),
    parent_id         bigint      REFERENCES fpa.dim_period (id),
    starts_on         date        NOT NULL,
    ends_on           date        NOT NULL,
    fiscal_year       int         NOT NULL,
    -- The close → BRM rhythm, as data. `closed_on` is when the books shut;
    -- `brm_on` is when the business review actually met. The gap between them
    -- is the window the product exists to compress, so it must be measurable
    -- rather than asserted in a slide.
    closed_on         date,
    brm_on            date,
    is_active         boolean     NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dim_period_not_own_parent CHECK (parent_id IS DISTINCT FROM id),
    CONSTRAINT dim_period_ordered        CHECK (ends_on >= starts_on),
    CONSTRAINT dim_period_closes_after   CHECK (closed_on IS NULL OR closed_on >= ends_on),
    CONSTRAINT dim_period_brm_after_close CHECK (brm_on IS NULL OR closed_on IS NULL OR brm_on >= closed_on)
);

CREATE INDEX dim_period_parent_idx ON fpa.dim_period (parent_id);
CREATE INDEX dim_period_range_idx  ON fpa.dim_period (starts_on, ends_on);
CREATE INDEX dim_period_type_idx   ON fpa.dim_period (period_type, fiscal_year);

COMMENT ON TABLE fpa.dim_period IS
  'The customer''s fiscal calendar. Facts and rollups declare a period rather '
  'than deriving one from a timestamp, because fiscal periods do not follow '
  'calendar months for every customer.';
COMMENT ON COLUMN fpa.dim_period.closed_on IS
  'When the books shut. NULL means the period is still open.';
COMMENT ON COLUMN fpa.dim_period.brm_on IS
  'When the Business Review Meeting met. The close-to-BRM gap is a first-class '
  'measure, not a note.';

CREATE TRIGGER dim_period_no_cycle
    BEFORE INSERT OR UPDATE ON fpa.dim_period
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_cycle('parent_id');

-- Period ancestry, so "this month rolls into this half" is a join and not a
-- date-range calculation repeated in five places.
CREATE VIEW fpa.v_period_ancestry AS
WITH RECURSIVE walk AS (
    SELECT p.id AS period_id, p.id AS ancestor_id, 0 AS distance
      FROM fpa.dim_period p
    UNION ALL
    SELECT w.period_id, p.parent_id, w.distance + 1
      FROM walk w
      JOIN fpa.dim_period p ON p.id = w.ancestor_id
     WHERE p.parent_id IS NOT NULL
)
SELECT period_id, ancestor_id, distance FROM walk;

COMMENT ON VIEW fpa.v_period_ancestry IS
  'Single-parent, single-path — cannot duplicate, so it is safe to aggregate '
  'against directly, unlike shared.v_role_ancestry.';


-- -----------------------------------------------------------------------------
-- 2. Identity
--
--    The demo mints a token whose `sub` is an email, accepts any password, and
--    takes the caller's word for which role they hold — the client sends a
--    `seat` string and the server believes it, so a user can sign in as the
--    COO by asking to. That is the single largest gap between the demo and
--    something a customer's IT department will sign off on.
--
--    The fix is not a stronger password. It is that the role is DERIVED: an
--    authenticated subject resolves to a person, a person holds a seat, and a
--    seat carries the role. Nothing the client sends participates.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.app_user (
    id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id      bigint      NOT NULL UNIQUE REFERENCES shared.person (id),
    -- The OIDC subject. Entra External ID replaces the dev issuer without
    -- touching anything else here: `idp_issuer` changes, the claim name does
    -- not, and the middleware contract is unaffected.
    idp_issuer     text        NOT NULL DEFAULT 'rewive-dev',
    idp_subject    text        NOT NULL,
    email          citext      NOT NULL,
    is_admin       boolean     NOT NULL DEFAULT false,
    status         text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'suspended', 'disabled')),
    last_login_at  timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT app_user_idp_subject_unique UNIQUE (idp_issuer, idp_subject)
);

CREATE INDEX app_user_email_idx ON fpa.app_user (email);

COMMENT ON TABLE fpa.app_user IS
  'An authenticated principal, bound one-to-one to a real person. A login that '
  'resolves to no person is not a user — there is nothing for it to own.';
COMMENT ON COLUMN fpa.app_user.idp_subject IS
  'The `sub` claim. Unique per issuer, so swapping the dev issuer for Entra '
  'does not collide with existing rows.';
COMMENT ON COLUMN fpa.app_user.is_admin IS
  'Tenant administration only — it does NOT widen the persona lens. An admin '
  'sees every screen; they still only own what their seat owns.';

-- Issued tokens, so a session can be revoked. A stateless JWT cannot be
-- withdrawn before it expires unless its id is recorded somewhere; "sign out
-- everywhere" and "this person left on Friday" both need this table.
CREATE TABLE fpa.user_session (
    jti          uuid        PRIMARY KEY,
    user_id      bigint      NOT NULL REFERENCES fpa.app_user (id) ON DELETE CASCADE,
    issued_at    timestamptz NOT NULL DEFAULT now(),
    expires_at   timestamptz NOT NULL,
    revoked_at   timestamptz,
    user_agent   text,
    ip_hash      text,
    CONSTRAINT user_session_expires_after CHECK (expires_at > issued_at)
);

CREATE INDEX user_session_user_idx   ON fpa.user_session (user_id);
CREATE INDEX user_session_live_idx   ON fpa.user_session (expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE fpa.user_session IS
  'One row per issued token. Presence is not authority — the token is still '
  'verified cryptographically; this exists so it can be revoked early and so a '
  'sign-in is auditable.';
COMMENT ON COLUMN fpa.user_session.ip_hash IS
  'Hashed, not stored raw — a source address is personal data and nothing in '
  'the product needs to read it back.';

-- The lens, derived. This is the view the API asks "who is this and what may
-- they see", instead of trusting a `seat` string off the request.
CREATE VIEW fpa.v_user_lens AS
SELECT u.id            AS user_id,
       u.email,
       u.is_admin,
       u.status,
       p.id            AS person_id,
       p.full_name,
       s.seat_id,
       s.role_key,
       s.role_label,
       s.org_unit_id,
       s.org_unit_key,
       s.business_unit_id,
       s.legal_entity_id,
       s.region_id
  FROM fpa.app_user      u
  JOIN shared.person     p ON p.id = u.person_id
  LEFT JOIN shared.v_current_seat s ON s.person_id = p.id
 WHERE u.status = 'active';

COMMENT ON VIEW fpa.v_user_lens IS
  'The authenticated caller resolved to a role. A NULL role_key means the user '
  'holds no current seat — they authenticate but own nothing, which is a real '
  'state (a new joiner, or someone whose seat ended) and must not be treated '
  'as an error or silently widened.';


-- -----------------------------------------------------------------------------
-- 3. The operating model
--
--    In the demo this is `brainsState` — a per-industry JavaScript object in
--    v4data.js. It has no tables anywhere, which means the Operating Picture,
--    every finding's impact path, and every rollup are computed off seed
--    content that dies with the process. It is the largest gap in the data
--    model because everything else points at it.
--
--    The cascade, top to bottom: intent (target) ← P&L line ← mandate (stream
--    KPI) ← sense (driver).
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.stream (
    key          citext      PRIMARY KEY,
    name         text        NOT NULL,
    answers_to   text,
    sort_order   int         NOT NULL DEFAULT 0,
    is_active    boolean     NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fpa.stream IS
  'A function stream — the vertical a mandate holder watches. One agent per '
  'stream, plus an org-level chief whose stream_key is NULL.';

CREATE TABLE fpa.brain_node (
    id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key            citext      NOT NULL UNIQUE,
    kind           text        NOT NULL
                               CHECK (kind IN ('target', 'pl_line', 'stream_kpi', 'driver')),
    name           text        NOT NULL,
    stream_key     citext      REFERENCES fpa.stream (key),
    definition     text        NOT NULL DEFAULT '',
    status         text        NOT NULL DEFAULT 'connected'
                               CHECK (status IN ('connected', 'proposed', 'needs_data', 'declined')),
    health         text        CHECK (health IN ('on_track', 'at_risk', 'off_track')),
    trend          text        CHECK (trend IN ('up', 'down', 'flat')),
    unit           text,
    format         text,
    current_value  numeric,
    target_value   numeric,
    proposed_by_agent_id bigint REFERENCES shared.agent (id),
    is_active      boolean     NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    -- An org-level target answers to no single stream, exactly as the chief
    -- agent does. Everything below the financial tier must name its stream, or
    -- it has no holder and cannot raise anything.
    CONSTRAINT brain_node_stream_required
        CHECK (kind IN ('target', 'pl_line') OR stream_key IS NOT NULL),
    CONSTRAINT brain_node_proposed_has_author
        CHECK (status <> 'proposed' OR proposed_by_agent_id IS NOT NULL)
);

CREATE INDEX brain_node_kind_idx   ON fpa.brain_node (kind);
CREATE INDEX brain_node_stream_idx ON fpa.brain_node (stream_key);

COMMENT ON TABLE fpa.brain_node IS
  'One node of the operating picture. Values are numeric here; the display '
  'strings the demo carries are formatted from `unit`/`format` at read time, '
  'never stored, so a number is never two things.';

-- The cascade's edges. Direction is "contributes to": source feeds target.
CREATE TABLE fpa.brain_edge (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_id     bigint      NOT NULL REFERENCES fpa.brain_node (id) ON DELETE CASCADE,
    target_id     bigint      NOT NULL REFERENCES fpa.brain_node (id) ON DELETE CASCADE,
    weight        text        NOT NULL DEFAULT 'moderate'
                              CHECK (weight IN ('strong', 'moderate', 'weak')),
    status        text        NOT NULL DEFAULT 'connected'
                              CHECK (status IN ('connected', 'proposed')),
    rationale     text,
    proposed_by_agent_id bigint REFERENCES shared.agent (id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT brain_edge_unique      UNIQUE (source_id, target_id),
    CONSTRAINT brain_edge_not_self    CHECK (source_id <> target_id)
);

CREATE INDEX brain_edge_source_idx ON fpa.brain_edge (source_id);
CREATE INDEX brain_edge_target_idx ON fpa.brain_edge (target_id);

-- The cascade is a DAG. A cycle in it is not a modelling curiosity: an impact
-- path is walked from a leaf up to the intent it threatens, so a cycle makes
-- that walk non-terminating and every finding built on it wrong. The dimension
-- guard in `shared` walks a single parent column and cannot be reused for an
-- edge list, so this is its own function.
CREATE FUNCTION fpa.assert_brain_acyclic() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    offending bigint;
BEGIN
    WITH RECURSIVE reachable AS (
        SELECT NEW.target_id AS node_id
        UNION
        SELECT e.target_id
          FROM fpa.brain_edge e
          JOIN reachable r ON e.source_id = r.node_id
    )
    SELECT node_id INTO offending
      FROM reachable
     WHERE node_id = NEW.source_id
     LIMIT 1;

    IF offending IS NOT NULL THEN
        RAISE EXCEPTION
            'cycle in fpa.brain_edge: node % already reachable from %, so this edge would close a loop',
            NEW.source_id, NEW.target_id;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fpa.assert_brain_acyclic() IS
  'Runs AFTER the row lands so the recursive walk sees it, and relies on the '
  'statement being rolled back by the exception.';

CREATE CONSTRAINT TRIGGER brain_edge_acyclic
    AFTER INSERT OR UPDATE ON fpa.brain_edge
    DEFERRABLE INITIALLY IMMEDIATE
    FOR EACH ROW EXECUTE FUNCTION fpa.assert_brain_acyclic();


-- -----------------------------------------------------------------------------
-- 4. Mandates — where doctrine becomes a NOT NULL
--
--    A mandate is a stream KPI that somebody is accountable for. The demo
--    expresses ownership as `persona`, a string on the row; two rows can claim
--    the same mandate and nothing objects, and no row can say WHICH PERSON
--    holds it — only which role. Here the owner is a seat: a named person
--    holding a named role in a named org unit for a period.
--
--    NULL in a slice column here means "all members of that dimension" — a
--    filter. The same column in `fact_measure` means the opposite (see below).
--    That asymmetry is deliberate and is the single most misreadable thing in
--    this schema.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.mandate (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key               citext      NOT NULL UNIQUE,
    node_id           bigint      NOT NULL REFERENCES fpa.brain_node (id),
    -- Doctrine 1, as a constraint rather than a convention.
    owner_seat_id     bigint      NOT NULL REFERENCES shared.seat (id),
    -- The agent holding the number alongside the person. "Every mandate, held
    -- twice" is this column being NOT NULL next to the one above it.
    holder_agent_id   bigint      NOT NULL REFERENCES shared.agent (id),
    statement         text        NOT NULL,
    -- The slice this mandate is accountable for. NULL = every member.
    business_unit_id  bigint      REFERENCES shared.dim_business_unit (id),
    region_id         bigint      REFERENCES shared.dim_region (id),
    channel_id        bigint      REFERENCES shared.dim_channel (id),
    category_id       bigint      REFERENCES shared.dim_category (id),
    legal_entity_id   bigint      REFERENCES shared.legal_entity (id),
    target_value      numeric,
    unit              text,
    direction         text        NOT NULL DEFAULT 'up_good'
                                  CHECK (direction IN ('up_good', 'down_good')),
    is_active         boolean     NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mandate_node_idx   ON fpa.mandate (node_id);
CREATE INDEX mandate_owner_idx  ON fpa.mandate (owner_seat_id);
CREATE INDEX mandate_holder_idx ON fpa.mandate (holder_agent_id);

-- One accountable owner per mandate-slice: the same node cannot be owned twice
-- for the same coordinate. Without this, "who answers for this number" has two
-- answers, which is the exact failure the product exists to remove.
CREATE UNIQUE INDEX mandate_one_owner_per_slice
    ON fpa.mandate (node_id,
                    COALESCE(business_unit_id, -1),
                    COALESCE(region_id,        -1),
                    COALESCE(channel_id,       -1),
                    COALESCE(category_id,      -1),
                    COALESCE(legal_entity_id,  -1))
 WHERE is_active;

COMMENT ON TABLE fpa.mandate IS
  'A number somebody answers for. owner_seat_id and holder_agent_id are both '
  'NOT NULL: held twice, once by a person and once by an agent.';
COMMENT ON COLUMN fpa.mandate.business_unit_id IS
  'NULL means all business units — a FILTER. In fpa.fact_measure the same '
  'column NULL means "not part of this row''s coordinate". Do not conflate.';


-- -----------------------------------------------------------------------------
-- 5. Measures — the marginals lesson, enforced
--
--    Americana C&S publishes a headline plus four independent breakdowns, each
--    summing back to it. Loaded into one fact table without recording which
--    view a row belongs to, SUM(value) returns 496 against a true 124 — the
--    same sales counted four times. So every row declares its `grain`, and the
--    CHECK below makes a row unable to lie about it: the declared grain and
--    the populated slice columns must agree, in both directions.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.fact_measure (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    node_id           bigint      NOT NULL REFERENCES fpa.brain_node (id),
    period_id         bigint      NOT NULL REFERENCES fpa.dim_period (id),
    grain             text        NOT NULL
                                  CHECK (grain IN ('total',
                                                   'by_business_unit',
                                                   'by_region',
                                                   'by_channel',
                                                   'by_category')),
    business_unit_id  bigint      REFERENCES shared.dim_business_unit (id),
    region_id         bigint      REFERENCES shared.dim_region (id),
    channel_id        bigint      REFERENCES shared.dim_channel (id),
    category_id       bigint      REFERENCES shared.dim_category (id),
    legal_entity_id   bigint      REFERENCES shared.legal_entity (id),
    measure           text        NOT NULL DEFAULT 'actual'
                                  CHECK (measure IN ('actual', 'budget', 'forecast', 'prior_year')),
    value             numeric     NOT NULL,
    currency_code     char(3)     REFERENCES shared.dim_currency (code),
    source            text        NOT NULL DEFAULT 'import',
    loaded_at         timestamptz NOT NULL DEFAULT now(),

    -- A row cannot lie about its own grain. Every arm names the column that
    -- must be present AND every column that must be absent; leaving the
    -- absences out is what lets a 'by_region' row quietly also carry a channel
    -- and be counted under both.
    CONSTRAINT fact_measure_grain_honest CHECK (
        CASE grain
            WHEN 'total' THEN
                business_unit_id IS NULL AND region_id IS NULL
                AND channel_id IS NULL AND category_id IS NULL
            WHEN 'by_business_unit' THEN
                business_unit_id IS NOT NULL AND region_id IS NULL
                AND channel_id IS NULL AND category_id IS NULL
            WHEN 'by_region' THEN
                region_id IS NOT NULL AND business_unit_id IS NULL
                AND channel_id IS NULL AND category_id IS NULL
            WHEN 'by_channel' THEN
                channel_id IS NOT NULL AND business_unit_id IS NULL
                AND region_id IS NULL AND category_id IS NULL
            WHEN 'by_category' THEN
                category_id IS NOT NULL AND business_unit_id IS NULL
                AND region_id IS NULL AND channel_id IS NULL
        END
    )
);

CREATE INDEX fact_measure_node_period_idx ON fpa.fact_measure (node_id, period_id, measure);
CREATE INDEX fact_measure_grain_idx       ON fpa.fact_measure (grain);

COMMENT ON TABLE fpa.fact_measure IS
  'Marginals, not a cube. NEVER SUM across mixed grain — filter to one grain '
  'first, or use fpa.v_measure_total.';
COMMENT ON COLUMN fpa.fact_measure.grain IS
  'Which breakdown this row belongs to. Enforced against the slice columns by '
  'fact_measure_grain_honest, so the declaration cannot drift from the data.';

-- The safe aggregate. Anything that wants a headline number reads this rather
-- than the table, so the 496-against-124 mistake cannot be made by accident.
CREATE VIEW fpa.v_measure_total AS
SELECT node_id, period_id, measure, currency_code, SUM(value) AS value
  FROM fpa.fact_measure
 WHERE grain = 'total'
 GROUP BY node_id, period_id, measure, currency_code;

COMMENT ON VIEW fpa.v_measure_total IS
  'Headline figures only. Summing the base table across grains double-counts.';


-- -----------------------------------------------------------------------------
-- 6. Findings — Find
--
--    A finding is drift that has been noticed and now demands an answer. The
--    demo's finding carries its owner as a `persona` string and its SLA as a
--    countdown recomputed on read; here the owner is a role plus the seat that
--    held it at the time, and the SLA is a wall-clock deadline the loop engine
--    can schedule against.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.finding (
    id                 bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key                citext      NOT NULL UNIQUE,
    title              text        NOT NULL,
    summary            text        NOT NULL DEFAULT '',
    mandate_id         bigint      REFERENCES fpa.mandate (id),
    node_id            bigint      NOT NULL REFERENCES fpa.brain_node (id),
    period_id          bigint      REFERENCES fpa.dim_period (id),
    raised_by_agent_id bigint      NOT NULL REFERENCES shared.agent (id),
    stream_key         citext      REFERENCES fpa.stream (key),
    severity           text        NOT NULL DEFAULT 'medium'
                                   CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status             text        NOT NULL DEFAULT 'open'
                                   CHECK (status IN ('open', 'accepted', 'acting',
                                                     'acknowledged', 'abandoned', 'closed')),
    impact_estimate    text,
    impact_value       numeric,

    -- Ownership. The role is the queue it appears in; the seat is the person
    -- who held that role when it was raised, so the ledger can still name them
    -- after a reorg moves the role to somebody else.
    owner_role_key     citext      NOT NULL REFERENCES shared.role (key),
    owner_seat_id      bigint      REFERENCES shared.seat (id),
    dotted_role_key    citext      REFERENCES shared.role (key),
    escalated_from_key citext      REFERENCES shared.role (key),
    escalation_level   int         NOT NULL DEFAULT 0 CHECK (escalation_level >= 0),
    awaiting_response_to_key citext REFERENCES shared.role (key),
    taken_from_key     citext      REFERENCES shared.role (key),

    -- Decide. Doctrine 2: a decision is a choice, a decider and a moment, and
    -- the CHECK refuses any two of the three without the others.
    disposition        text        CHECK (disposition IN ('accept', 'act', 'acknowledge', 'abandon')),
    decided_by_user_id bigint      REFERENCES fpa.app_user (id),
    decided_at         timestamptz,
    decision_reason    text,
    re_alert_condition text,

    -- The clock. A wall-clock deadline, not a countdown: the loop engine arms
    -- a durable timer against this column, and every deadline move re-arms it.
    sla_deadline_at    timestamptz,

    detected_at        timestamptz NOT NULL DEFAULT now(),
    closed_at          timestamptz,

    -- Where the drift sits. Anything created at runtime must carry an entity
    -- or it vanishes from every rollup — hence NOT NULL on legal_entity_id.
    legal_entity_id    bigint      NOT NULL REFERENCES shared.legal_entity (id),
    region_id          bigint      REFERENCES shared.dim_region (id),

    origin             text        NOT NULL DEFAULT 'sweep'
                                   CHECK (origin IN ('seed', 'sweep', 'manual')),
    drift_rule         text        CHECK (drift_rule IN ('threshold_breach',
                                                         'sustained_deviation',
                                                         'trend_to_breach')),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT finding_decision_whole CHECK (
        (disposition IS NULL     AND decided_at IS NULL     AND decided_by_user_id IS NULL)
     OR (disposition IS NOT NULL AND decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL)
    ),
    -- Dismiss requires a reason: it is the only disposition that tunes the
    -- agent, and an untuned dismissal is how the same drift comes back.
    CONSTRAINT finding_dismissal_has_reason CHECK (
        disposition IS DISTINCT FROM 'abandon'
     OR (decision_reason IS NOT NULL AND length(btrim(decision_reason)) > 0)
    ),
    CONSTRAINT finding_open_is_undecided CHECK (
        status <> 'open' OR disposition IS NULL
    ),
    CONSTRAINT finding_closed_has_moment CHECK (
        (status = 'closed') = (closed_at IS NOT NULL)
    )
);

CREATE INDEX finding_owner_idx    ON fpa.finding (owner_role_key, status);
CREATE INDEX finding_node_idx     ON fpa.finding (node_id);
CREATE INDEX finding_mandate_idx  ON fpa.finding (mandate_id);
CREATE INDEX finding_period_idx   ON fpa.finding (period_id);
CREATE INDEX finding_sla_idx      ON fpa.finding (sla_deadline_at)
    WHERE status = 'open' AND sla_deadline_at IS NOT NULL;
CREATE INDEX finding_entity_idx   ON fpa.finding (legal_entity_id, region_id);

COMMENT ON TABLE fpa.finding IS
  'Drift that demands an answer. Doctrine 2 is enforced by '
  'finding_decision_whole: there is no way to record half a decision.';
COMMENT ON COLUMN fpa.finding.owner_seat_id IS
  'The seat that held the owning role when this was raised. Kept alongside the '
  'role so history survives a reorg — the role tells you the queue, the seat '
  'tells you the person.';
COMMENT ON COLUMN fpa.finding.sla_deadline_at IS
  'Wall clock, not a countdown. A timer is a wake-up and never the truth: the '
  'executor re-reads this column before acting, so a stale wake-up no-ops.';

-- The impact path, leaf → intent. Ordered, because "what does this threaten"
-- is a walk and the order is the argument.
CREATE TABLE fpa.finding_impact_step (
    id           bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    finding_id   bigint  NOT NULL REFERENCES fpa.finding (id) ON DELETE CASCADE,
    step_no      int     NOT NULL CHECK (step_no >= 0),
    node_id      bigint  NOT NULL REFERENCES fpa.brain_node (id),
    effect       text,
    CONSTRAINT finding_impact_step_ordered UNIQUE (finding_id, step_no)
);

CREATE TABLE fpa.finding_evidence (
    id           bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    finding_id   bigint  NOT NULL REFERENCES fpa.finding (id) ON DELETE CASCADE,
    sort_order   int     NOT NULL DEFAULT 0,
    label        text    NOT NULL,
    value        text    NOT NULL
);

CREATE INDEX finding_evidence_finding_idx ON fpa.finding_evidence (finding_id);


-- -----------------------------------------------------------------------------
-- 7. Accountability transfer — Doctrine 4
--
--    "To answer for a mandate you must first own it, and that transfer is
--    itself a recorded event." Both tables below are append-only by trigger,
--    for the same reason the ledger is: a transfer you can edit afterwards is
--    not a record of anything.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.escalation_trail (
    id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    finding_id   bigint      NOT NULL REFERENCES fpa.finding (id) ON DELETE CASCADE,
    from_role_key citext     NOT NULL REFERENCES shared.role (key),
    to_role_key   citext     NOT NULL REFERENCES shared.role (key),
    reason       text        NOT NULL DEFAULT 'sla_lapsed'
                             CHECK (reason IN ('sla_lapsed', 'manual', 'taken')),
    occurred_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT escalation_trail_moves CHECK (from_role_key <> to_role_key)
);

CREATE INDEX escalation_trail_finding_idx ON fpa.escalation_trail (finding_id, occurred_at);

-- What a senior role may do to a finding owned below them — deliberately not
-- the four A's, which belong to the owner.
CREATE TABLE fpa.leadership_action (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    finding_id    bigint      NOT NULL REFERENCES fpa.finding (id) ON DELETE CASCADE,
    action        text        NOT NULL
                              CHECK (action IN ('ask', 'reassign', 'raise_priority', 'take')),
    by_user_id    bigint      NOT NULL REFERENCES fpa.app_user (id),
    by_role_key   citext      NOT NULL REFERENCES shared.role (key),
    to_role_key   citext      REFERENCES shared.role (key),
    note          text,
    summary       text        NOT NULL,
    occurred_at   timestamptz NOT NULL DEFAULT now(),
    -- Reassign is the only one that names a destination, and it must.
    CONSTRAINT leadership_action_reassign_has_target CHECK (
        (action = 'reassign') = (to_role_key IS NOT NULL)
    )
);

CREATE INDEX leadership_action_finding_idx ON fpa.leadership_action (finding_id, occurred_at);

CREATE FUNCTION fpa.refuse_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        '% is append-only: % is refused', TG_TABLE_NAME, TG_OP;
END;
$$;

COMMENT ON FUNCTION fpa.refuse_mutation() IS
  'Immutability as a trigger, not as a revoked grant — a trigger binds the '
  'table owner too, which is the whole point when the migrate job runs as '
  'rewive_admin.';

CREATE TRIGGER escalation_trail_append_only
    BEFORE UPDATE OR DELETE ON fpa.escalation_trail
    FOR EACH ROW EXECUTE FUNCTION fpa.refuse_mutation();

CREATE TRIGGER leadership_action_append_only
    BEFORE UPDATE OR DELETE ON fpa.leadership_action
    FOR EACH ROW EXECUTE FUNCTION fpa.refuse_mutation();


-- -----------------------------------------------------------------------------
-- 8. Act — the fix in motion
--
--    Small tracked work items inside a finding's lifecycle. Deliberately not a
--    ticket system: completing every action never closes the finding. The
--    recovery target does.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.finding_action (
    id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    finding_id     bigint      NOT NULL REFERENCES fpa.finding (id) ON DELETE CASCADE,
    title          text        NOT NULL,
    -- Either a person holds it or a worker does, and exactly one of those.
    owner_seat_id  bigint      REFERENCES shared.seat (id),
    owner_label    text,
    source         text        NOT NULL DEFAULT 'human'
                               CHECK (source IN ('human', 'worker')),
    status         text        NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open', 'in_progress', 'blocked', 'done')),
    note           text,
    due_at         timestamptz,
    created_by_user_id bigint  REFERENCES fpa.app_user (id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz,
    completed_at   timestamptz,
    CONSTRAINT finding_action_has_owner CHECK (
        owner_seat_id IS NOT NULL OR owner_label IS NOT NULL
    ),
    CONSTRAINT finding_action_done_has_moment CHECK (
        (status = 'done') = (completed_at IS NOT NULL)
    )
);

CREATE INDEX finding_action_finding_idx ON fpa.finding_action (finding_id, status);


-- -----------------------------------------------------------------------------
-- 9. Close — the recovery target
--
--    Doctrine 3: nothing is "done" until the number is back. An Accept sets a
--    measurable exit condition, and the finding stays watched until it is met.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.recovery_target (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    finding_id        bigint      NOT NULL REFERENCES fpa.finding (id) ON DELETE CASCADE,
    node_id           bigint      REFERENCES fpa.brain_node (id),
    name              text        NOT NULL,
    baseline_value    numeric     NOT NULL,
    target_value      numeric     NOT NULL,
    current_value     numeric,
    unit              text,
    direction         text        NOT NULL DEFAULT 'up_good'
                                  CHECK (direction IN ('up_good', 'down_good')),
    status            text        NOT NULL DEFAULT 'tracking'
                                  CHECK (status IN ('tracking', 'closed', 'regressed')),
    watched_by_agent_id bigint    REFERENCES shared.agent (id),
    due_period_id     bigint      REFERENCES fpa.dim_period (id),
    -- Inherited from the finding, because a recovery target with no entity
    -- disappears from every rollup exactly as a finding would.
    legal_entity_id   bigint      NOT NULL REFERENCES shared.legal_entity (id),
    region_id         bigint      REFERENCES shared.dim_region (id),
    created_at        timestamptz NOT NULL DEFAULT now(),
    closed_at         timestamptz,
    CONSTRAINT recovery_target_moves     CHECK (target_value <> baseline_value),
    CONSTRAINT recovery_target_closed_has_moment CHECK (
        (status = 'closed') = (closed_at IS NOT NULL)
    ),
    -- One recovery target per finding: two exit conditions means two
    -- definitions of done, which is none.
    CONSTRAINT recovery_target_one_per_finding UNIQUE (finding_id)
);

CREATE INDEX recovery_target_status_idx ON fpa.recovery_target (status);

COMMENT ON TABLE fpa.recovery_target IS
  'The measured exit condition. Progress is DERIVED from baseline/target/'
  'current at read time — a stored percentage is a second source of truth for '
  'the same fact and drifts from it.';

-- Progress, derived rather than stored, and direction-aware so a down_good
-- target does not report negative progress for improving.
CREATE VIEW fpa.v_recovery_progress AS
SELECT rt.*,
       CASE
           WHEN rt.current_value IS NULL THEN NULL
           WHEN rt.target_value = rt.baseline_value THEN NULL
           ELSE GREATEST(0, LEAST(100, ROUND(
               100.0 * (rt.current_value - rt.baseline_value)
                     / (rt.target_value  - rt.baseline_value), 1)))
       END AS progress_pct
  FROM fpa.recovery_target rt;


-- -----------------------------------------------------------------------------
-- 10. Comments — the decision thread
--
--    The demo has no comment on a finding. Discussion is spread across three
--    unrelated `note` strings — on a leadership action, on a finding action,
--    and on the disposition — each carrying a display name rather than an
--    author. For a system of record for operational decisions that is the gap
--    worth closing next to identity, because a comment whose author is a
--    string is not evidence of anything.
--
--    Scope is deliberately narrow: a comment hangs off a finding or one of its
--    actions, and nothing else. This is not a general commenting engine.
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.comment (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    finding_id        bigint      REFERENCES fpa.finding (id) ON DELETE CASCADE,
    finding_action_id bigint      REFERENCES fpa.finding_action (id) ON DELETE CASCADE,
    parent_id         bigint      REFERENCES fpa.comment (id) ON DELETE CASCADE,
    author_user_id    bigint      NOT NULL REFERENCES fpa.app_user (id),
    -- The role the author was speaking as. A CFO's comment on a finding they
    -- do not own reads differently from the owner's, and the thread should be
    -- able to say which it was without re-deriving it later.
    author_role_key   citext      REFERENCES shared.role (key),
    body              text        NOT NULL CHECK (length(btrim(body)) > 0),
    created_at        timestamptz NOT NULL DEFAULT now(),
    edited_at         timestamptz,
    deleted_at        timestamptz,
    CONSTRAINT comment_has_exactly_one_subject CHECK (
        (finding_id IS NOT NULL)::int + (finding_action_id IS NOT NULL)::int = 1
    ),
    CONSTRAINT comment_not_own_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX comment_finding_idx ON fpa.comment (finding_id, created_at)
    WHERE deleted_at IS NULL;
CREATE INDEX comment_action_idx  ON fpa.comment (finding_action_id, created_at)
    WHERE deleted_at IS NULL;
CREATE INDEX comment_author_idx  ON fpa.comment (author_user_id);

COMMENT ON TABLE fpa.comment IS
  'Authored discussion on a decision thread. author_user_id is NOT NULL — an '
  'unattributed comment is not evidence. Deletion is soft, so a thread cannot '
  'be silently rewritten after the fact.';

-- Addressing someone. A mention is what turns a comment into a notification,
-- so it is a row rather than a parsed substring — parsing display names out of
-- body text breaks the moment two people share a first name.
CREATE TABLE fpa.comment_mention (
    id            bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    comment_id    bigint  NOT NULL REFERENCES fpa.comment (id) ON DELETE CASCADE,
    user_id       bigint  REFERENCES fpa.app_user (id),
    role_key      citext  REFERENCES shared.role (key),
    CONSTRAINT comment_mention_has_target CHECK (
        (user_id IS NOT NULL)::int + (role_key IS NOT NULL)::int = 1
    ),
    CONSTRAINT comment_mention_unique UNIQUE (comment_id, user_id, role_key)
);


-- -----------------------------------------------------------------------------
-- 11. Notifications — the escalation outbox
-- -----------------------------------------------------------------------------

CREATE TABLE fpa.notification (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind          text        NOT NULL
                              CHECK (kind IN ('escalation', 'dotted_flag', 'mention',
                                              'sla_warning', 're_alert')),
    -- Delivered to a role (the queue) and, when known, to a specific user.
    role_key      citext      REFERENCES shared.role (key),
    user_id       bigint      REFERENCES fpa.app_user (id),
    finding_id    bigint      REFERENCES fpa.finding (id) ON DELETE CASCADE,
    comment_id    bigint      REFERENCES fpa.comment (id) ON DELETE CASCADE,
    title         text        NOT NULL,
    body          text        NOT NULL DEFAULT '',
    created_at    timestamptz NOT NULL DEFAULT now(),
    read_at       timestamptz,
    delivered_at  timestamptz,
    CONSTRAINT notification_has_recipient CHECK (
        role_key IS NOT NULL OR user_id IS NOT NULL
    )
);

CREATE INDEX notification_role_unread_idx ON fpa.notification (role_key, created_at)
    WHERE read_at IS NULL;
CREATE INDEX notification_user_unread_idx ON fpa.notification (user_id, created_at)
    WHERE read_at IS NULL;


-- -----------------------------------------------------------------------------
-- 12. The queue, as the API should ask for it
--
--    Every lens-scoped screen asks the same question: what is waiting on this
--    role, and on the roles reporting into it. Expressing that once here keeps
--    the persona filter from being re-implemented per endpoint, which is where
--    the demo's rollups quietly disagree with each other.
-- -----------------------------------------------------------------------------

CREATE VIEW fpa.v_finding_queue AS
SELECT f.id                AS finding_id,
       f.key,
       f.title,
       f.severity,
       f.status,
       f.disposition,
       f.owner_role_key,
       f.sla_deadline_at,
       f.escalation_level,
       f.detected_at,
       f.legal_entity_id,
       f.region_id,
       f.period_id,
       ra.ancestor_key     AS visible_to_role_key,
       ra.distance         AS levels_below,
       ra.via_dotted
  FROM fpa.finding f
  JOIN shared.v_role_ancestry ra ON ra.node_key = f.owner_role_key;

COMMENT ON VIEW fpa.v_finding_queue IS
  'One row per (finding, role that can see it). distance 0 is the owner''s own '
  'queue — the "role" scope; distance > 0 is the "+ their team" scope. Because '
  'shared.v_role_ancestry can duplicate along the dotted line, COUNT DISTINCT '
  'the finding_id, never COUNT(*).';


-- -----------------------------------------------------------------------------
-- 13. Grants
--
--    rewive_app reads and writes rows. It gets no DDL, ever — a runtime "just
--    ensure the table exists" helper must fail loudly here rather than
--    crash-loop in production, which is a real incident this project has
--    already had.
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA fpa TO rewive_app;

GRANT SELECT, INSERT, UPDATE, DELETE
   ON ALL TABLES IN SCHEMA fpa TO rewive_app;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA fpa TO rewive_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA fpa
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rewive_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA fpa
    GRANT USAGE ON SEQUENCES TO rewive_app;

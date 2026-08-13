-- =============================================================================
-- Rewive platform schema — `shared`: the customer's initial dimensions
-- =============================================================================
--
-- WHAT THIS IS
--   The reference data a new customer configures at onboarding so the product
--   is shaped like their company: their geography, their business units, their
--   channels and categories, their legal entities, and their people.
--
-- STATUS — read before using
--   * APPLIED LOCALLY, 2026-08-13, against PostgreSQL 16 (the production major
--     version), with `rewive_app`/`rewive_admin` created so the grants at the
--     foot of this file were exercised rather than skipped. The Americana C&S
--     configuration loads on top of it and the cycle guards were driven in
--     both directions. NOT applied to any live database.
--   * NOT WIRED. This is deliberately not in `mock-server/migrations/`; the
--     control plane will not fan it out and `npm run migrate` will not see it.
--   * Destination is the BACKEND repo's `migrations/` package
--     (`rewive-fpa-backend`, run by `python -m migrations.runner`), NOT
--     `rewive-infra` — that repo is Terraform only and has no `migrations/`
--     directory. Corrected 2026-08-13 by reading the live repo; the earlier
--     `migrations/005-platform-schema.sql` name was wrong on both counts.
--     Still BLOCKED until reconciled with the `sales_excellence` and
--     `sales_staging` schemas that already exist in the live Americana
--     database, which this design has never been able to inspect.
--   * The first real execution immediately found what parsing could not: the
--     role-ancestry view had TWO recursive branches, which PostgreSQL rejects
--     (it permits exactly one, and reads the surplus arm as part of the
--     non-recursive term). Grammar-valid, apply-fatal. See section 12.
--
-- TARGET
--   Azure Database for PostgreSQL Flexible Server, one database per customer.
--   The database IS the tenant boundary — there is no `tenant_id` on every
--   table. That was the pooled/RLS model, superseded by dedicated RG + server
--   per customer. Assumed search_path: fpa, shared, audit, rag, public.
--
-- ROLE MODEL
--   All DDL runs as `rewive_admin` in the migrate job. `rewive_app` gets no
--   DDL, ever, so a runtime "just ensure the table exists" helper fails loudly
--   instead of crash-looping in production. Grants are at the foot of the file.
--
-- WHAT THIS FILE DOES NOT CONTAIN
--   `fpa.fact_measure`, `fpa.mandate` and the loop tables. One thing about
--   them governs everything here and must not be lost again:
--
--     Americana C&S does not publish a cube. It publishes a headline plus
--     four independent breakdowns, each summing back to it — marginals.
--     Loaded into one fact table without recording WHICH VIEW a row belongs
--     to, SUM(value) returns 496 against a true 124: the same sales counted
--     four times. Every fact row therefore declares a `grain`, and a CHECK
--     makes it unable to lie about it.
--
--   The consequence for THIS file: these dimension tables are the slice
--   vocabulary that `grain` selects between. A NULL slice column means
--   opposite things in the two places — in `mandate` it means "all members"
--   (a filter); in `fact_measure` it means "not part of this row's
--   coordinate". Same columns, deliberately different meaning.
--
-- DECISIONS TAKEN (founder, 2026-08-13)
--   * Roles stay reference data per template; people and seats are real. A
--     customer configures who holds what, not their own reporting line.
--   * Hierarchies are adjacency (`parent_id` self-FK), one pattern for every
--     dimension, arbitrary depth, cycles blocked by trigger.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Extensions and schema
-- -----------------------------------------------------------------------------

-- citext: business keys, aliases and emails compare case-insensitively.
-- The front door already learned this lesson — "Americana C&S" and
-- "americana-c&s" must not be two different organizations.
CREATE EXTENSION IF NOT EXISTS citext;

-- btree_gist: lets the seat exclusion constraint mix equality (role, org unit)
-- with range overlap (the period a person holds it).
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS shared;

COMMENT ON SCHEMA shared IS
  'Conformed dimensions and the organization: geography, business structure, '
  'legal entities, roles, people, seats and agents.';


-- -----------------------------------------------------------------------------
-- 1. The customer
-- -----------------------------------------------------------------------------

-- Exactly one row, forever. The database is the tenant boundary, so this table
-- describes WHOSE database this is — it does not enumerate tenants. The
-- singleton CHECK is the point: a second row here would mean the isolation
-- model had been misunderstood.
CREATE TABLE shared.tenant (
    id              smallint     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    key             citext       NOT NULL UNIQUE,
    name            text         NOT NULL,
    industry_label  text,
    domain          citext,
    accent          text,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE shared.tenant IS
  'Singleton. Identity of the customer this database belongs to.';
COMMENT ON COLUMN shared.tenant.key IS
  'Stable slug, matches the control-plane tenant id and the JWT tid claim.';


-- -----------------------------------------------------------------------------
-- 2. Conformed reference data
-- -----------------------------------------------------------------------------

CREATE TABLE shared.dim_currency (
    code        char(3)  PRIMARY KEY,
    name        text     NOT NULL,
    minor_unit  smallint NOT NULL DEFAULT 2 CHECK (minor_unit BETWEEN 0 AND 4)
);

COMMENT ON TABLE shared.dim_currency IS
  'ISO 4217. Reference data, not customer-configured.';

CREATE TABLE shared.dim_country (
    id             bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    iso2           char(2) NOT NULL UNIQUE,
    iso3           char(3) NOT NULL UNIQUE,
    name           text    NOT NULL,
    currency_code  char(3) REFERENCES shared.dim_currency (code)
);

COMMENT ON TABLE shared.dim_country IS
  'ISO 3166. Reference data. Distinct from dim_region, which is the customer''s '
  'own selling geography and may not follow national borders.';


-- -----------------------------------------------------------------------------
-- 3. The customer's own dimensions
--
--    All four share one shape:
--      key           the stable business key used in imports and mandates
--      parent_id     self-FK — the rollup, arbitrary depth, cycles blocked
--      level_hint    the customer's word for this tier ('Emirate', 'Cluster')
--      external_ref  their code for it in their own ERP
--
--    `level_hint` is a LABEL, never a query predicate. Rollups walk parent_id.
--    Two siblings may legitimately sit at different hint levels; nothing here
--    enforces a uniform depth, because real geographies are not uniform.
-- -----------------------------------------------------------------------------

-- Geography as the customer sells into it. Adjacency because the seeds it
-- replaces mixed grain in one text column — 'GCC', 'UAE', 'Dubai' and
-- 'Sharjah & Northern Emirates' sat side by side with nothing knowing that
-- Dubai rolls into UAE rolls into GCC.
CREATE TABLE shared.dim_region (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key           citext      NOT NULL UNIQUE,
    name          text        NOT NULL,
    parent_id     bigint      REFERENCES shared.dim_region (id),
    country_id    bigint      REFERENCES shared.dim_country (id),
    level_hint    text,
    external_ref  text,
    sort_order    int         NOT NULL DEFAULT 0,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dim_region_not_own_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX dim_region_parent_idx ON shared.dim_region (parent_id);

-- The customer's business units / divisions. Today these are baked into the
-- persona enum as hardcoded role ids (protein_*, gi_*, fnv_*, ambient_*),
-- which is why a new customer's divisions cannot be configured without a code
-- change. This table is where they become data.
CREATE TABLE shared.dim_business_unit (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key           citext      NOT NULL UNIQUE,
    name          text        NOT NULL,
    parent_id     bigint      REFERENCES shared.dim_business_unit (id),
    level_hint    text,
    external_ref  text,
    sort_order    int         NOT NULL DEFAULT 0,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dim_business_unit_not_own_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX dim_business_unit_parent_idx ON shared.dim_business_unit (parent_id);

CREATE TABLE shared.dim_channel (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key           citext      NOT NULL UNIQUE,
    name          text        NOT NULL,
    parent_id     bigint      REFERENCES shared.dim_channel (id),
    level_hint    text,
    external_ref  text,
    sort_order    int         NOT NULL DEFAULT 0,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dim_channel_not_own_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX dim_channel_parent_idx ON shared.dim_channel (parent_id);

CREATE TABLE shared.dim_category (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key           citext      NOT NULL UNIQUE,
    name          text        NOT NULL,
    parent_id     bigint      REFERENCES shared.dim_category (id),
    level_hint    text,
    external_ref  text,
    sort_order    int         NOT NULL DEFAULT 0,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dim_category_not_own_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX dim_category_parent_idx ON shared.dim_category (parent_id);


-- -----------------------------------------------------------------------------
-- 4. Legal entities
--
--    An entity is where a number is BOOKED. A region is where it is SOLD.
--    They are independent slices — `home_region_id` is a convenience
--    attribute, not the join a rollup should use. Do not collapse them:
--    the demo seeds already conflate the two ('GulfMart Ibn Battuta' is
--    simultaneously an entity, a division and a customer), and every rollup
--    that skips a blank entity is silently dropping rows.
-- -----------------------------------------------------------------------------

CREATE TABLE shared.legal_entity (
    id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key             citext      NOT NULL UNIQUE,
    name            text        NOT NULL,
    parent_id       bigint      REFERENCES shared.legal_entity (id),
    country_id      bigint      REFERENCES shared.dim_country (id),
    home_region_id  bigint      REFERENCES shared.dim_region (id),
    currency_code   char(3)     REFERENCES shared.dim_currency (code),
    registration_no text,
    external_ref    text,
    is_active       boolean     NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT legal_entity_not_own_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX legal_entity_parent_idx ON shared.legal_entity (parent_id);

COMMENT ON COLUMN shared.legal_entity.parent_id IS
  'Consolidation rollup. No ownership percentage and no elimination logic — '
  'this reports a tree, it does not consolidate accounts.';


-- -----------------------------------------------------------------------------
-- 5. Org units — where a seat sits
-- -----------------------------------------------------------------------------

CREATE TABLE shared.org_unit (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key               citext      NOT NULL UNIQUE,
    name              text        NOT NULL,
    parent_id         bigint      REFERENCES shared.org_unit (id),
    legal_entity_id   bigint      REFERENCES shared.legal_entity (id),
    business_unit_id  bigint      REFERENCES shared.dim_business_unit (id),
    region_id         bigint      REFERENCES shared.dim_region (id),
    is_active         boolean     NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT org_unit_not_own_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE INDEX org_unit_parent_idx ON shared.org_unit (parent_id);

COMMENT ON TABLE shared.org_unit IS
  'The org chart as places, not people. This is the join that finally connects '
  'a business unit to the people accountable for it — the thing that does not '
  'exist today, where a division is only a subtree of a hardcoded persona '
  'enum and nothing validates that a row''s entity matches its persona.';


-- -----------------------------------------------------------------------------
-- 6. Roles — reference data, per template
--
--    Roles are NOT customer-configurable, by decision. The tree, the
--    escalation line and the data partition stay identical across industries;
--    only `label` differs. That mirrors how the product works today, where
--    HEALTHCARE_LABEL_OVERRIDES renames operating roles without forking
--    ROLE_CHILDREN.
--
--    `parent_role_key` is the escalation line. Accountability transfers, never
--    bypasses: a finding climbs exactly one level per SLA breach.
-- -----------------------------------------------------------------------------

CREATE TABLE shared.role (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key               citext      NOT NULL UNIQUE,
    label             text        NOT NULL,
    parent_role_key   citext      REFERENCES shared.role (key),
    dotted_parent_key citext      REFERENCES shared.role (key),
    is_terminal       boolean     NOT NULL DEFAULT false,
    sort_order        int         NOT NULL DEFAULT 0,
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT role_not_own_parent CHECK (parent_role_key IS DISTINCT FROM key),
    CONSTRAINT role_not_own_dotted CHECK (dotted_parent_key IS DISTINCT FROM key)
);

CREATE INDEX role_parent_idx ON shared.role (parent_role_key);

COMMENT ON COLUMN shared.role.dotted_parent_key IS
  'The matrix line — e.g. divisional commercial finance also answers to the '
  'CFO. Team scope is the solid subtree UNION the dotted reports.';
COMMENT ON COLUMN shared.role.is_terminal IS
  'Escalation stops here. A busy terminal queue means the organization went '
  'silent, and should trend toward zero.';


-- -----------------------------------------------------------------------------
-- 7. People
-- -----------------------------------------------------------------------------

CREATE TABLE shared.person (
    id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         citext      UNIQUE,
    full_name     text        NOT NULL,
    display_name  text,
    external_ref  text,
    status        text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'suspended', 'departed')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN shared.person.email IS
  'Nullable on purpose. Onboarding collects a name and no email today, and a '
  'named owner with no mailbox is better than an unowned mandate. It becomes '
  'the OIDC subject join when Entra is wired.';
COMMENT ON COLUMN shared.person.status IS
  'Departure does not delete. A person who has left still owns their history '
  'in the ledger, and their seats must be closed rather than removed.';


-- -----------------------------------------------------------------------------
-- 8. Seats — a person holding a role in an org unit, for a period
--
--    This is what a mandate points at. `fpa.mandate.owner_seat_id` will be
--    NOT NULL: exactly one accountable human owner, never zero, never an
--    agent, never a committee.
--
--    The exclusion constraint IS that doctrine, enforced by the database
--    rather than by convention — one holder per role per org unit at any
--    instant. Job-sharing a mandate is refused on purpose; a committee is
--    how accountability dissolves.
-- -----------------------------------------------------------------------------

CREATE TABLE shared.seat (
    id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    person_id    bigint      NOT NULL REFERENCES shared.person (id),
    role_id      bigint      NOT NULL REFERENCES shared.role (id),
    org_unit_id  bigint      NOT NULL REFERENCES shared.org_unit (id),
    validity     daterange   NOT NULL DEFAULT daterange(CURRENT_DATE, NULL, '[)'),
    is_primary   boolean     NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT seat_one_holder_per_role_unit
        EXCLUDE USING gist (
            role_id     WITH =,
            org_unit_id WITH =,
            validity    WITH &&
        )
);

CREATE INDEX seat_person_idx ON shared.seat (person_id);
CREATE INDEX seat_role_idx   ON shared.seat (role_id);

COMMENT ON COLUMN shared.seat.validity IS
  'Half-open date range. An unbounded upper bound is the current holder. '
  'Reassignment closes the old seat and opens a new one, so who owned a '
  'mandate on any past date stays answerable.';


-- -----------------------------------------------------------------------------
-- 9. Agents — the other half of "held twice"
--
--    An agent watches a mandate alongside the seat that owns it. It NEVER
--    owns one. There is no owner_agent_id anywhere in this schema, and adding
--    one would break the first principle of the product.
-- -----------------------------------------------------------------------------

CREATE TABLE shared.agent (
    id                 bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key                citext      NOT NULL UNIQUE,
    name               text        NOT NULL,
    kind               text        NOT NULL DEFAULT 'mandate_holder'
                                   CHECK (kind IN ('mandate_holder', 'chief', 'assessor')),
    shadows_seat_id    bigint      REFERENCES shared.seat (id),
    reports_to_agent_id bigint     REFERENCES shared.agent (id),
    stream_key         citext,
    -- How readily this agent raises: 0 quiet … 100 hair-trigger. Configuration,
    -- not a derived score — it is the one dial a customer turns when an agent
    -- is too noisy, and tuning it is what a Dismiss reason feeds.
    temperament        smallint    NOT NULL DEFAULT 50
                                   CHECK (temperament BETWEEN 0 AND 100),
    -- When this agent last re-checked its signals. Distinct from "when it last
    -- raised something": an agent that has been quiet for a week is healthy if
    -- it is still looking and alarming if it is not, and the Agents screen has
    -- to be able to tell those apart.
    last_sense_sweep_at timestamptz,
    is_active          boolean     NOT NULL DEFAULT true,
    created_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT agent_not_own_parent CHECK (reports_to_agent_id IS DISTINCT FROM id)
);

CREATE INDEX agent_reports_to_idx ON shared.agent (reports_to_agent_id);

COMMENT ON COLUMN shared.agent.shadows_seat_id IS
  'The human counterpart. Nullable for the org-level chief, which shadows the '
  'organization rather than one seat.';


-- -----------------------------------------------------------------------------
-- 10. Aliases — the crosswalk from free text to a dimension row
--
--     Every entity and region in the product today is free text, copied by
--     value from a tracking config into findings, closures and ledger rows.
--     A rename anywhere silently forks a rollup into two. This table is how
--     an import maps whatever a spreadsheet says ('Dubai', 'DXB', 'Dubai
--     Region') onto one row, and how the existing text is migrated without
--     guessing.
--
--     Exclusive arc: exactly one target column is set, so every alias keeps a
--     real foreign key. A polymorphic target_id would let an alias outlive
--     the row it points at, which is how ingestion starts misrouting quietly.
-- -----------------------------------------------------------------------------

CREATE TABLE shared.dim_alias (
    id                bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alias             citext      NOT NULL,
    region_id         bigint      REFERENCES shared.dim_region (id)        ON DELETE CASCADE,
    business_unit_id  bigint      REFERENCES shared.dim_business_unit (id) ON DELETE CASCADE,
    channel_id        bigint      REFERENCES shared.dim_channel (id)       ON DELETE CASCADE,
    category_id       bigint      REFERENCES shared.dim_category (id)      ON DELETE CASCADE,
    legal_entity_id   bigint      REFERENCES shared.legal_entity (id)      ON DELETE CASCADE,
    source            text        NOT NULL DEFAULT 'manual'
                                  CHECK (source IN ('manual', 'import', 'migration')),
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dim_alias_exactly_one_target CHECK (
        num_nonnulls(region_id, business_unit_id, channel_id,
                     category_id, legal_entity_id) = 1
    )
);

CREATE UNIQUE INDEX dim_alias_region_uq
    ON shared.dim_alias (alias) WHERE region_id IS NOT NULL;
CREATE UNIQUE INDEX dim_alias_business_unit_uq
    ON shared.dim_alias (alias) WHERE business_unit_id IS NOT NULL;
CREATE UNIQUE INDEX dim_alias_channel_uq
    ON shared.dim_alias (alias) WHERE channel_id IS NOT NULL;
CREATE UNIQUE INDEX dim_alias_category_uq
    ON shared.dim_alias (alias) WHERE category_id IS NOT NULL;
CREATE UNIQUE INDEX dim_alias_legal_entity_uq
    ON shared.dim_alias (alias) WHERE legal_entity_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 11. Cycle guard
--
--     Adjacency buys arbitrary depth and costs cycle safety. A CHECK cannot
--     see other rows, so this is a trigger: one generic function, taking the
--     parent column name as an argument, reused by every hierarchy.
--
--     A cycle here would not raise an error at write time — it would hang the
--     recursive rollup views below, which is a far worse failure.
-- -----------------------------------------------------------------------------

CREATE FUNCTION shared.assert_no_cycle() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    parent_col  text   := TG_ARGV[0];
    walker      bigint;
    hops        int    := 0;
BEGIN
    EXECUTE format('SELECT ($1).%I', parent_col) INTO walker USING NEW;

    WHILE walker IS NOT NULL LOOP
        IF walker = NEW.id THEN
            RAISE EXCEPTION
                'cycle in %.% : row % cannot be its own ancestor',
                TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.id
                USING ERRCODE = 'check_violation';
        END IF;

        hops := hops + 1;
        IF hops > 64 THEN
            RAISE EXCEPTION
                'hierarchy in %.% deeper than 64 levels above row %',
                TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.id
                USING ERRCODE = 'check_violation';
        END IF;

        EXECUTE format('SELECT %I FROM %I.%I WHERE id = $1',
                       parent_col, TG_TABLE_SCHEMA, TG_TABLE_NAME)
           INTO walker USING walker;
    END LOOP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER dim_region_no_cycle
    AFTER INSERT OR UPDATE OF parent_id ON shared.dim_region
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_cycle('parent_id');

CREATE TRIGGER dim_business_unit_no_cycle
    AFTER INSERT OR UPDATE OF parent_id ON shared.dim_business_unit
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_cycle('parent_id');

CREATE TRIGGER dim_channel_no_cycle
    AFTER INSERT OR UPDATE OF parent_id ON shared.dim_channel
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_cycle('parent_id');

CREATE TRIGGER dim_category_no_cycle
    AFTER INSERT OR UPDATE OF parent_id ON shared.dim_category
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_cycle('parent_id');

CREATE TRIGGER legal_entity_no_cycle
    AFTER INSERT OR UPDATE OF parent_id ON shared.legal_entity
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_cycle('parent_id');

CREATE TRIGGER org_unit_no_cycle
    AFTER INSERT OR UPDATE OF parent_id ON shared.org_unit
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_cycle('parent_id');

CREATE TRIGGER agent_no_cycle
    AFTER INSERT OR UPDATE OF reports_to_agent_id ON shared.agent
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_cycle('reports_to_agent_id');

-- `role` needs its own guard: its hierarchy is keyed by `key`, not `id`, so
-- the generic function above cannot walk it. Written with static SQL and
-- native types rather than making the generic one juggle bigint and citext —
-- a text-cast comparison would quietly lose citext's case-insensitivity, and
-- a cycle that slips through does not raise an error, it hangs
-- v_role_ancestry.
--
-- Only the SOLID line is guarded. That is deliberate and sufficient: the
-- dotted line is guarded against self-reference by CHECK, and
-- v_role_ancestry takes at most one dotted hop before continuing up a solid
-- line that this trigger keeps acyclic — so the view always terminates.
CREATE FUNCTION shared.assert_no_role_cycle() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    looped boolean;
BEGIN
    IF NEW.parent_role_key IS NULL THEN
        RETURN NEW;
    END IF;

    WITH RECURSIVE up AS (
        SELECT r.parent_role_key AS ancestor, 1 AS hops
          FROM shared.role r
         WHERE r.key = NEW.parent_role_key
        UNION ALL
        SELECT r.parent_role_key, up.hops + 1
          FROM up
          JOIN shared.role r ON r.key = up.ancestor
         WHERE up.ancestor IS NOT NULL
           AND up.hops < 64
    )
    SELECT EXISTS (
        SELECT 1 FROM up WHERE up.ancestor = NEW.key
    ) INTO looped;

    IF looped OR NEW.parent_role_key = NEW.key THEN
        RAISE EXCEPTION
            'cycle in shared.role: escalation from % would not terminate',
            NEW.key
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER role_no_cycle
    AFTER INSERT OR UPDATE OF parent_role_key ON shared.role
    FOR EACH ROW EXECUTE FUNCTION shared.assert_no_role_cycle();


-- -----------------------------------------------------------------------------
-- 12. Ancestry views — what makes a rollup a join instead of a recursion
--
--     Each view expands every node to itself plus all its ancestors. To roll
--     a measure up to 'GCC', join the fact's region to the view and filter on
--     ancestor. No CTE at the call site, no depth assumption.
--
--         SELECT SUM(f.value)
--           FROM fpa.fact_measure f
--           JOIN shared.v_region_ancestry a ON a.node_id = f.region_id
--           JOIN shared.dim_region r        ON r.id = a.ancestor_id
--          WHERE r.key = 'GCC'
--            AND f.grain = 'by_region';   -- <- never omit grain
--
--     That last line is not optional. Aggregating fact_measure without
--     pinning a grain is the 496-vs-124 error.
-- -----------------------------------------------------------------------------

CREATE VIEW shared.v_region_ancestry AS
WITH RECURSIVE walk AS (
    SELECT r.id AS node_id, r.id AS ancestor_id, 0 AS distance
      FROM shared.dim_region r
    UNION ALL
    SELECT w.node_id, r.parent_id, w.distance + 1
      FROM walk w
      JOIN shared.dim_region r ON r.id = w.ancestor_id
     WHERE r.parent_id IS NOT NULL
)
SELECT node_id, ancestor_id, distance FROM walk;

CREATE VIEW shared.v_business_unit_ancestry AS
WITH RECURSIVE walk AS (
    SELECT b.id AS node_id, b.id AS ancestor_id, 0 AS distance
      FROM shared.dim_business_unit b
    UNION ALL
    SELECT w.node_id, b.parent_id, w.distance + 1
      FROM walk w
      JOIN shared.dim_business_unit b ON b.id = w.ancestor_id
     WHERE b.parent_id IS NOT NULL
)
SELECT node_id, ancestor_id, distance FROM walk;

CREATE VIEW shared.v_channel_ancestry AS
WITH RECURSIVE walk AS (
    SELECT c.id AS node_id, c.id AS ancestor_id, 0 AS distance
      FROM shared.dim_channel c
    UNION ALL
    SELECT w.node_id, c.parent_id, w.distance + 1
      FROM walk w
      JOIN shared.dim_channel c ON c.id = w.ancestor_id
     WHERE c.parent_id IS NOT NULL
)
SELECT node_id, ancestor_id, distance FROM walk;

CREATE VIEW shared.v_category_ancestry AS
WITH RECURSIVE walk AS (
    SELECT c.id AS node_id, c.id AS ancestor_id, 0 AS distance
      FROM shared.dim_category c
    UNION ALL
    SELECT w.node_id, c.parent_id, w.distance + 1
      FROM walk w
      JOIN shared.dim_category c ON c.id = w.ancestor_id
     WHERE c.parent_id IS NOT NULL
)
SELECT node_id, ancestor_id, distance FROM walk;

CREATE VIEW shared.v_legal_entity_ancestry AS
WITH RECURSIVE walk AS (
    SELECT e.id AS node_id, e.id AS ancestor_id, 0 AS distance
      FROM shared.legal_entity e
    UNION ALL
    SELECT w.node_id, e.parent_id, w.distance + 1
      FROM walk w
      JOIN shared.legal_entity e ON e.id = w.ancestor_id
     WHERE e.parent_id IS NOT NULL
)
SELECT node_id, ancestor_id, distance FROM walk;

-- The people rollup. Team scope = the solid subtree UNION dotted reports,
-- which is exactly what personaScope(persona, 'team') computes today.
--
-- WARNING — this view can return the same (node_key, ancestor_key) pair twice,
-- once via the solid line and once via a dotted one, with different
-- `distance` and `via_dotted`. That is correct as ancestry and lethal as a
-- rollup: joining a fact to it without DISTINCT double-counts exactly the way
-- summing marginals does. Aggregate against
--     SELECT DISTINCT node_key, ancestor_key FROM shared.v_role_ancestry
-- or filter to `NOT via_dotted` when you want the solid escalation line only.
-- The four dimension ancestry views above cannot duplicate — single parent,
-- single path — so they need no such care.
CREATE VIEW shared.v_role_ancestry AS
WITH RECURSIVE walk AS (
    SELECT r.key AS node_key, r.key AS ancestor_key, 0 AS distance, false AS via_dotted
      FROM shared.role r
    UNION ALL
    -- One recursive branch, not two: PostgreSQL permits exactly one recursive
    -- self-reference, and with three UNION arms it reads the first two as the
    -- non-recursive term and rejects `walk` inside it. The solid and dotted
    -- edges are therefore unioned into an edge set FIRST, then walked once.
    SELECT w.node_key, e.parent_key, w.distance + 1, w.via_dotted OR e.is_dotted
      FROM walk w
      JOIN (
            SELECT key, parent_role_key  AS parent_key, false AS is_dotted
              FROM shared.role WHERE parent_role_key IS NOT NULL
             UNION ALL
            SELECT key, dotted_parent_key,              true
              FROM shared.role WHERE dotted_parent_key IS NOT NULL
           ) e ON e.key = w.ancestor_key
     -- At most one dotted hop per path, exactly as before.
     WHERE NOT (e.is_dotted AND w.via_dotted)
)
SELECT node_key, ancestor_key, distance, via_dotted FROM walk;

-- Who currently holds what, resolved. The single place the app should ask
-- "who owns this seat today" rather than re-deriving the date logic.
CREATE VIEW shared.v_current_seat AS
SELECT s.id            AS seat_id,
       s.person_id,
       p.full_name,
       p.email,
       s.role_id,
       r.key           AS role_key,
       r.label         AS role_label,
       s.org_unit_id,
       o.key           AS org_unit_key,
       o.business_unit_id,
       o.legal_entity_id,
       o.region_id
  FROM shared.seat s
  JOIN shared.person   p ON p.id = s.person_id
  JOIN shared.role     r ON r.id = s.role_id
  JOIN shared.org_unit o ON o.id = s.org_unit_id
 WHERE s.validity @> CURRENT_DATE
   AND p.status = 'active';


-- -----------------------------------------------------------------------------
-- 13. Grants
--
--     rewive_app reads and writes rows; it never changes shape. All DDL runs
--     as rewive_admin in the migrate job.
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA shared TO rewive_app;

GRANT SELECT, INSERT, UPDATE, DELETE
   ON ALL TABLES IN SCHEMA shared TO rewive_app;

GRANT SELECT ON shared.v_region_ancestry,
                shared.v_business_unit_ancestry,
                shared.v_channel_ancestry,
                shared.v_category_ancestry,
                shared.v_legal_entity_ancestry,
                shared.v_role_ancestry,
                shared.v_current_seat
   TO rewive_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA shared
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rewive_app;


-- -----------------------------------------------------------------------------
-- 14. Known gaps — stated, not hidden
-- -----------------------------------------------------------------------------
--
-- * HIGHEST RUNTIME RISK: `assert_no_cycle` reads NEW's parent column
--   dynamically, via `EXECUTE format('SELECT ($1).%I', parent_col) INTO ...
--   USING NEW`. That is the standard idiom for dynamic column access on a
--   trigger row and it parses clean, but parsing proves only its syntax — it
--   has never executed. If anything in this file fails on first write, expect
--   it here. Exercise it before trusting it: insert one hierarchy row, then
--   attempt check 2 in the worked example and confirm it RAISES rather than
--   hangs. A cycle guard that silently no-ops is worse than none, because the
--   ancestry views then spin instead of erroring.
--
-- * BLOCKING: not reconciled with `sales_excellence` / `sales_staging`, which
--   already exist in the live Americana database and could not be inspected
--   from here. Those schemas may already hold a region or entity list; if so
--   this must adopt or map to it rather than create a second truth. Nothing
--   should be applied before someone with database access has diffed them.
--
-- * `dim_date` is deliberately absent. It belongs in `shared`, but it is
--   generated reference data, not something a customer configures, so it
--   travels with the fact tables in the fpa portion.
--
-- * `agent.stream_key` has no foreign key because streams have no table —
--   today `StreamDef` is a per-industry in-memory list, and even onboarding
--   never re-checks a mandate's streamKey against the template. Making
--   streams a table is its own piece of work.
--
-- * `seat.is_primary` marks which seat is a person's main one when they hold
--   several. It plays no part in the exclusion constraint, which is about a
--   role having one holder, not a person having one role.
--
-- * `tenant.updated_at` and `person.updated_at` have defaults but no trigger
--   to maintain them. Left to the application deliberately; a touch trigger
--   here would be the second place that logic lives.
--
-- * No row-level security anywhere, on purpose. The database is the tenant
--   boundary. RLS was the pooled model and is superseded — see the banners on
--   ARCH-003/004, and note ARCH-001 Entry 02 still asserts the old model.
--
-- * The migration path for existing free text is not written. Every `entity`
--   and `region` in the product today is a string copied by value into
--   findings, closures and ledger rows; `shared.dim_alias` is the mechanism
--   to map them, but the backfill that walks the existing rows, and the
--   decision about what to do with a value like 'All', is still to do.
-- -----------------------------------------------------------------------------

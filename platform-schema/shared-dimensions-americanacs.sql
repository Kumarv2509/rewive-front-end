-- =============================================================================
-- Worked example — Americana C&S configured against `shared`
-- =============================================================================
--
-- PURPOSE
--   To test the dimension model against a real customer rather than assert it.
--   Load order, parent resolution by key, the rollup, and the seven-role
--   people wiring all get exercised here.
--
-- STATUS
--   NOT APPLIED, and NOT a customer data file. Do not treat committed values
--   here as Americana C&S's configuration of record.
--
-- PROVENANCE — read this before reusing any figure
--   Rows marked [EVIDENCED] use keys and values taken from the Americana C&S
--   MTD gross-sales work: the AED 124M / 135M headline and its four
--   breakdowns.
--   Rows marked [ILLUSTRATIVE] are invented to demonstrate the mechanics —
--   principally the region rollup, which needs more than one level to show
--   anything. The customer's actual region tree, full BU list, entity list and
--   staff have never been supplied. Replace them; do not ship them.
--
--   No person here is real. The names are placeholders.
--
-- ASSUMES
--   shared-dimensions.sql has been applied. Parents are resolved by key
--   subquery, never by hardcoded id, because every id is GENERATED ALWAYS AS
--   IDENTITY — that is also how a real loader has to work.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- The customer
-- -----------------------------------------------------------------------------

INSERT INTO shared.tenant (id, key, name, industry_label, domain, accent)
VALUES (1, 'americanacs', 'Americana C&S', 'Food trading & distribution',
        'americana-cs.example', '#C05B41');   -- [ILLUSTRATIVE] domain, accent

INSERT INTO shared.dim_currency (code, name, minor_unit) VALUES
    ('AED', 'UAE Dirham',       2),
    ('USD', 'US Dollar',        2),
    ('SAR', 'Saudi Riyal',      2);

INSERT INTO shared.dim_country (iso2, iso3, name, currency_code) VALUES
    ('AE', 'ARE', 'United Arab Emirates', 'AED'),
    ('SA', 'SAU', 'Saudi Arabia',         'SAR');

-- -----------------------------------------------------------------------------
-- Geography — three levels, to prove the rollup does something
--
-- This is the shape the current free-text column cannot express: today 'GCC',
-- 'UAE' and 'Abu Dhabi' sit in one column with nothing relating them, so a
-- rollup to GCC either misses the children or double-counts them.
-- -----------------------------------------------------------------------------

INSERT INTO shared.dim_region (key, name, parent_id, country_id, level_hint, sort_order)
VALUES ('GCC', 'GCC', NULL, NULL, 'Cluster', 10);   -- [ILLUSTRATIVE]

INSERT INTO shared.dim_region (key, name, parent_id, country_id, level_hint, sort_order)
SELECT 'UAE', 'United Arab Emirates',
       (SELECT id FROM shared.dim_region  WHERE key = 'GCC'),
       (SELECT id FROM shared.dim_country WHERE iso2 = 'AE'),
       'Country', 10;                                -- [ILLUSTRATIVE]

INSERT INTO shared.dim_region (key, name, parent_id, country_id, level_hint, sort_order)
SELECT v.key, v.name,
       (SELECT id FROM shared.dim_region  WHERE key = 'UAE'),
       (SELECT id FROM shared.dim_country WHERE iso2 = 'AE'),
       'Emirate', v.sort_order
  FROM (VALUES
        ('AUH', 'Abu Dhabi', 10),   -- [EVIDENCED] the by_region breakdown
        ('DXB', 'Dubai',     20),   -- [ILLUSTRATIVE]
        ('SHJ', 'Sharjah',   30)    -- [ILLUSTRATIVE]
       ) AS v(key, name, sort_order);

-- The crosswalk. Every one of these strings appears in the product's seed data
-- today as a free-text region, at mixed grain, with nothing relating them.
-- This is how an import stops forking a rollup on a rename.
INSERT INTO shared.dim_alias (alias, region_id, source)
SELECT v.alias, (SELECT id FROM shared.dim_region WHERE key = v.key), 'migration'
  FROM (VALUES
        ('Abu Dhabi',                      'AUH'),
        ('AUH',                            'AUH'),
        ('Dubai',                          'DXB'),
        ('DXB',                            'DXB'),
        ('Sharjah & Northern Emirates',    'SHJ'),
        ('UAE',                            'UAE'),
        ('GCC',                            'GCC'),
        ('Kuwait & GCC',                   'GCC')
       ) AS v(alias, key);

-- NOTE: the seed value 'All' is deliberately NOT aliased. It is not a region —
-- it is the absence of a slice, which in fact_measure is grain='total' with
-- region_id NULL. Mapping it to a row would recreate the 496-vs-124 error by
-- making the headline look like a fifth region.

-- -----------------------------------------------------------------------------
-- Business units, channels, categories
-- -----------------------------------------------------------------------------

INSERT INTO shared.dim_business_unit (key, name, parent_id, level_hint, sort_order) VALUES
    ('PROCESSED_MEATS', 'Processed meats', NULL, 'Business unit', 10),  -- [EVIDENCED]
    ('SNACKS',          'Snacks',          NULL, 'Business unit', 20);  -- [EVIDENCED]

INSERT INTO shared.dim_channel (key, name, parent_id, level_hint, sort_order) VALUES
    ('MODERN_TRADE', 'Modern trade', NULL, 'Channel', 10),   -- [EVIDENCED]
    ('ECOMMERCE',    'E-commerce',   NULL, 'Channel', 20);   -- [EVIDENCED]

INSERT INTO shared.dim_category (key, name, parent_id, level_hint, sort_order) VALUES
    ('BEVERAGES', 'Beverages', NULL, 'Category', 10);        -- [EVIDENCED]

-- -----------------------------------------------------------------------------
-- Legal entities
--
-- Note what this fixes: onboarding collects a list of entities but assigns
-- entities[0] to every tracked mandate, so a multi-entity customer silently
-- gets a single-entity rollup. Here each entity is a row a mandate can point
-- at individually.
-- -----------------------------------------------------------------------------

INSERT INTO shared.legal_entity (key, name, parent_id, country_id, home_region_id, currency_code)
SELECT 'ACS_GROUP', 'Americana C&S Group', NULL,
       (SELECT id FROM shared.dim_country WHERE iso2 = 'AE'),
       (SELECT id FROM shared.dim_region  WHERE key  = 'UAE'),
       'AED';                                                -- [ILLUSTRATIVE]

INSERT INTO shared.legal_entity (key, name, parent_id, country_id, home_region_id, currency_code)
SELECT v.key, v.name,
       (SELECT id FROM shared.legal_entity WHERE key = 'ACS_GROUP'),
       (SELECT id FROM shared.dim_country  WHERE iso2 = 'AE'),
       (SELECT id FROM shared.dim_region   WHERE key = v.region_key),
       'AED'
  FROM (VALUES
        ('ACS_AUH', 'Americana C&S Abu Dhabi', 'AUH'),        -- [ILLUSTRATIVE]
        ('ACS_DXB', 'Americana C&S Dubai',     'DXB')         -- [ILLUSTRATIVE]
       ) AS v(key, name, region_key);

-- -----------------------------------------------------------------------------
-- Roles — the seven a `custom` org is offered, wired exactly as
-- ROLE_CHILDREN / ROLE_PARENT do it today.
--
-- Two roots, both terminal: `group_ceo` exists in the FMCG tree but is not
-- offered to a custom org, so escalation stops at COO and at CFO. That is why
-- the C&S demo's open findings all came to rest on the COO.
--
-- No dotted line here. DOTTED_PARENT covers only the four divisional
-- commercial-finance roles (protein_/gi_/fnv_/ambient_), and plain
-- `commercial_finance` is not among them — so none is invented.
-- -----------------------------------------------------------------------------

INSERT INTO shared.role (key, label, parent_role_key, is_terminal, sort_order) VALUES
    ('coo',                'Chief Operating Officer', NULL,  true,  10),
    ('cfo',                'Chief Financial Officer', NULL,  true,  20);

INSERT INTO shared.role (key, label, parent_role_key, is_terminal, sort_order) VALUES
    ('operations_head',    'Operations head',    'coo', false, 30),
    ('sales_supervisor',   'Sales supervisor',   'coo', false, 40),
    ('store_manager',      'Depot manager',      'operations_head', false, 50),
    ('fpa',                'FP&A',               'cfo', false, 60),
    ('commercial_finance', 'Commercial finance', 'cfo', false, 70);

-- -----------------------------------------------------------------------------
-- Org units — the join that finally connects a business unit to the people
-- accountable for it.
-- -----------------------------------------------------------------------------

INSERT INTO shared.org_unit (key, name, parent_id, legal_entity_id, business_unit_id, region_id)
SELECT 'ACS_HQ', 'Americana C&S HQ', NULL,
       (SELECT id FROM shared.legal_entity WHERE key = 'ACS_GROUP'),
       NULL,
       (SELECT id FROM shared.dim_region WHERE key = 'UAE');

INSERT INTO shared.org_unit (key, name, parent_id, legal_entity_id, business_unit_id, region_id)
SELECT v.key, v.name,
       (SELECT id FROM shared.org_unit      WHERE key = 'ACS_HQ'),
       (SELECT id FROM shared.legal_entity  WHERE key = v.entity_key),
       (SELECT id FROM shared.dim_business_unit WHERE key = v.bu_key),
       (SELECT id FROM shared.dim_region    WHERE key = v.region_key)
  FROM (VALUES
        ('ACS_MEATS_AUH', 'Processed meats — Abu Dhabi', 'ACS_AUH', 'PROCESSED_MEATS', 'AUH'),
        ('ACS_SNACKS_DXB', 'Snacks — Dubai',             'ACS_DXB', 'SNACKS',          'DXB')
       ) AS v(key, name, entity_key, bu_key, region_key);

-- -----------------------------------------------------------------------------
-- People and seats — [ILLUSTRATIVE], no real person
--
-- The exclusion constraint is doing the doctrine here: one holder per role per
-- org unit at any instant. Try inserting a second overlapping seat for
-- (operations_head, ACS_MEATS_AUH) and the database refuses it.
-- -----------------------------------------------------------------------------

INSERT INTO shared.person (email, full_name) VALUES
    ('placeholder.coo@americana-cs.example',   'Placeholder — COO'),
    ('placeholder.cfo@americana-cs.example',   'Placeholder — CFO'),
    ('placeholder.ops@americana-cs.example',   'Placeholder — Operations head'),
    ('placeholder.sales@americana-cs.example', 'Placeholder — Sales supervisor');

INSERT INTO shared.seat (person_id, role_id, org_unit_id, validity)
SELECT (SELECT id FROM shared.person   WHERE email = v.email),
       (SELECT id FROM shared.role     WHERE key   = v.role_key),
       (SELECT id FROM shared.org_unit WHERE key   = v.unit_key),
       daterange(DATE '2026-01-01', NULL, '[)')
  FROM (VALUES
        ('placeholder.coo@americana-cs.example',   'coo',              'ACS_HQ'),
        ('placeholder.cfo@americana-cs.example',   'cfo',              'ACS_HQ'),
        ('placeholder.ops@americana-cs.example',   'operations_head',  'ACS_MEATS_AUH'),
        ('placeholder.sales@americana-cs.example', 'sales_supervisor', 'ACS_SNACKS_DXB')
       ) AS v(email, role_key, unit_key);

-- -----------------------------------------------------------------------------
-- Agents — the other half of "held twice". Each shadows a seat; none owns a
-- mandate, and there is no column that would let one.
-- -----------------------------------------------------------------------------

INSERT INTO shared.agent (key, name, kind, shadows_seat_id, reports_to_agent_id)
VALUES ('acs_chief', 'Chief of staff agent', 'chief', NULL, NULL);

INSERT INTO shared.agent (key, name, kind, shadows_seat_id, reports_to_agent_id)
SELECT v.key, v.name, 'mandate_holder',
       (SELECT s.id
          FROM shared.seat s
          JOIN shared.role r     ON r.id = s.role_id
          JOIN shared.org_unit o ON o.id = s.org_unit_id
         WHERE r.key = v.role_key AND o.key = v.unit_key),
       (SELECT id FROM shared.agent WHERE key = 'acs_chief')
  FROM (VALUES
        ('acs_ops_agent',   'Operations agent', 'operations_head',  'ACS_MEATS_AUH'),
        ('acs_sales_agent', 'Sales agent',      'sales_supervisor', 'ACS_SNACKS_DXB')
       ) AS v(key, name, role_key, unit_key);

COMMIT;


-- =============================================================================
-- Checks to run after loading — each one fails loudly if the model is wrong
-- =============================================================================
--
-- 1. The rollup resolves. Abu Dhabi should report three ancestors including
--    itself (AUH, UAE, GCC); GCC should report five descendants.
--
--      SELECT r.key, a.distance
--        FROM shared.v_region_ancestry a
--        JOIN shared.dim_region r ON r.id = a.ancestor_id
--       WHERE a.node_id = (SELECT id FROM shared.dim_region WHERE key = 'AUH')
--       ORDER BY a.distance;
--
-- 2. The cycle guard bites. This must raise, not hang:
--
--      UPDATE shared.dim_region
--         SET parent_id = (SELECT id FROM shared.dim_region WHERE key = 'AUH')
--       WHERE key = 'GCC';
--
-- 3. The role guard bites, independently of the id-based one:
--
--      UPDATE shared.role SET parent_role_key = 'store_manager' WHERE key = 'coo';
--
-- 4. One holder per role per org unit. The second insert must be refused:
--
--      INSERT INTO shared.seat (person_id, role_id, org_unit_id)
--      SELECT (SELECT id FROM shared.person WHERE email
--                  = 'placeholder.sales@americana-cs.example'),
--             (SELECT id FROM shared.role WHERE key = 'operations_head'),
--             (SELECT id FROM shared.org_unit WHERE key = 'ACS_MEATS_AUH');
--
-- 5. Aliases are case-blind and single-target:
--
--      SELECT r.key FROM shared.dim_alias a
--        JOIN shared.dim_region r ON r.id = a.region_id
--       WHERE a.alias = 'abu dhabi';        -- finds AUH via citext
--
-- 6. Every current seat resolves to exactly one person:
--
--      SELECT role_key, org_unit_key, full_name FROM shared.v_current_seat
--       ORDER BY role_key;
-- =============================================================================

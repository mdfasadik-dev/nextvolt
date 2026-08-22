-- ============================================================
-- 003) Load Calculator + Projects
-- ============================================================
-- Run this AFTER 000-core-schema.sql (and 001-core-schema-rls.sql).
-- Adds:
--   A) Load Calculator  : load groups, load items, calculator meta fields,
--                         suggestion rules (unit range + meta conditions)
--                         and the products suggested for each rule.
--   B) Projects         : blog-like project entries with a section-based
--                         layout (markdown text / image, full or half width).
-- Idempotent-ish: uses IF NOT EXISTS where Postgres allows it.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- A) LOAD CALCULATOR
-- ============================================================

-- ------------------------------------------------------------
-- A1) Load groups  ("Lights", "Kitchen Appliances", ...)
--     The unit lives on the group, so every load item inside a
--     group shares the same unit name + symbol.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS load_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE,
  icon          TEXT,                    -- icon key or uploaded image url
  description   TEXT,

  -- Unit shared by all load items in this group
  unit_name     TEXT NOT NULL DEFAULT 'Watt',   -- e.g. 'Watt', 'Voltage', 'Ampere'
  unit_symbol   TEXT NOT NULL DEFAULT 'W',      -- e.g. 'W', 'V', 'A'

  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_load_groups_listing
  ON load_groups (is_deleted, is_active, sort_order, created_at);

-- ------------------------------------------------------------
-- A2) Load items  ("LED Bulb ( 5W )", "Tubelight", ...)
--     unit_value is expressed in the parent group's unit.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS load_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_group_id   UUID NOT NULL REFERENCES load_groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT,                       -- icon key or uploaded image url
  unit_value      NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (unit_value >= 0),

  -- Optional guard rails for the public counter widget
  default_quantity INTEGER NOT NULL DEFAULT 0 CHECK (default_quantity >= 0),
  max_quantity     INTEGER CHECK (max_quantity IS NULL OR max_quantity > 0),

  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_load_items_group
  ON load_items (load_group_id, is_deleted, is_active, sort_order);

-- ------------------------------------------------------------
-- A3) Calculator meta fields ("Average Daily Backup (Hrs)", ...)
--     Rendered on the public site exactly as configured here.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calculator_field_type') THEN
    CREATE TYPE calculator_field_type AS ENUM ('slider','dropdown','input','radio','checkbox');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS calculator_meta_fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,        -- stable machine key, e.g. 'backup_hours'
  label         TEXT NOT NULL,               -- e.g. 'Average Daily Backup (Hrs)'
  help_text     TEXT,
  field_type    calculator_field_type NOT NULL DEFAULT 'slider',

  -- Unit shown next to the value (e.g. Hour / h)
  unit_name     TEXT,
  unit_symbol   TEXT,

  -- Numeric config: used by slider / number input, and by range rules
  min_value     NUMERIC(14,4),
  max_value     NUMERIC(14,4),
  step_value    NUMERIC(14,4),
  default_number NUMERIC(14,4),

  -- Non-numeric default (input text, single-choice value, or JSON array
  -- of values for a checkbox set). Kept as text/jsonb for flexibility.
  default_text  TEXT,
  default_json  JSONB,

  is_numeric    BOOLEAN NOT NULL DEFAULT TRUE,   -- can this field drive numeric range rules?
  is_required   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT calculator_meta_fields_range_valid CHECK (
    min_value IS NULL OR max_value IS NULL OR max_value >= min_value
  )
);

CREATE INDEX IF NOT EXISTS idx_calculator_meta_fields_listing
  ON calculator_meta_fields (is_deleted, is_active, sort_order, created_at);

-- Options for dropdown / radio / checkbox fields.
CREATE TABLE IF NOT EXISTS calculator_meta_field_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id      UUID NOT NULL REFERENCES calculator_meta_fields(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,               -- shown to the public user
  value         TEXT NOT NULL,               -- stored / matched value
  number_value  NUMERIC(14,4),               -- optional numeric equivalent for range matching
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (field_id, value)
);

CREATE INDEX IF NOT EXISTS idx_calculator_meta_field_options_field
  ON calculator_meta_field_options (field_id, is_active, sort_order);

-- ------------------------------------------------------------
-- A4) Suggestion rules
--     A rule = total-load range  (+ optional meta field conditions).
--     Example: 1000W..2000W  AND  backup_hours between 5 and 10.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calculator_suggestion_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,               -- admin-facing label, e.g. '1000-2000W / 5-10h'
  description    TEXT,

  -- Total running load range. NULL max = open ended.
  -- Matching is inclusive on min, exclusive on max: [min, max)
  min_load       NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (min_load >= 0),
  max_load       NUMERIC(14,4) CHECK (max_load IS NULL OR max_load > 0),

  -- Unit the range is expressed in (defaults to Watt)
  unit_name      TEXT NOT NULL DEFAULT 'Watt',
  unit_symbol    TEXT NOT NULL DEFAULT 'W',

  -- Higher priority wins when several rules match.
  priority       INTEGER NOT NULL DEFAULT 0,
  headline       TEXT,                        -- optional public heading for the result block
  note           TEXT,                        -- optional public note / disclaimer

  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT calculator_rule_load_range_valid CHECK (
    max_load IS NULL OR max_load > min_load
  )
);

CREATE INDEX IF NOT EXISTS idx_calc_rules_listing
  ON calculator_suggestion_rules (is_deleted, is_active, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS idx_calc_rules_range
  ON calculator_suggestion_rules (min_load, max_load);

-- Extra conditions on meta fields for a rule. All conditions on a rule
-- must be satisfied (AND). Leave a rule with zero conditions to match on
-- the load range alone.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calculator_condition_operator') THEN
    CREATE TYPE calculator_condition_operator AS ENUM (
      'between',   -- min_value <= x < max_value (NULL bound = open)
      'eq',        -- x = value_text / number_value
      'neq',
      'in',        -- x is one of value_set
      'contains'   -- checkbox set contains all of value_set
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS calculator_rule_conditions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID NOT NULL REFERENCES calculator_suggestion_rules(id) ON DELETE CASCADE,
  field_id      UUID NOT NULL REFERENCES calculator_meta_fields(id) ON DELETE CASCADE,

  operator      calculator_condition_operator NOT NULL DEFAULT 'between',

  -- Numeric bounds for 'between' : [min_value, max_value)
  min_value     NUMERIC(14,4),
  max_value     NUMERIC(14,4),

  -- Scalar comparison for eq / neq
  value_text    TEXT,
  value_number  NUMERIC(14,4),
  value_boolean BOOLEAN,

  -- Value list for in / contains  (array of text values)
  value_set     JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (rule_id, field_id, operator),

  CONSTRAINT calc_condition_between_valid CHECK (
    operator <> 'between'
    OR min_value IS NULL OR max_value IS NULL OR max_value > min_value
  ),
  CONSTRAINT calc_condition_set_is_array CHECK (
    value_set IS NULL OR jsonb_typeof(value_set) = 'array'
  )
);

CREATE INDEX IF NOT EXISTS idx_calc_rule_conditions_rule
  ON calculator_rule_conditions (rule_id);

CREATE INDEX IF NOT EXISTS idx_calc_rule_conditions_field
  ON calculator_rule_conditions (field_id);

-- Products suggested for a matching rule (admin picks via searchable dropdown).
CREATE TABLE IF NOT EXISTS calculator_rule_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID NOT NULL REFERENCES calculator_suggestion_rules(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id    UUID REFERENCES product_variants(id) ON DELETE CASCADE,

  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,  -- highlight as "recommended"
  note          TEXT,                            -- optional per-product blurb
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (rule_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_calc_rule_products_rule
  ON calculator_rule_products (rule_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_calc_rule_products_product
  ON calculator_rule_products (product_id);

-- ------------------------------------------------------------
-- A5) Matching helper
--     Given a total load and the public user's meta answers as JSONB
--     ({"backup_hours": 5, "phase": "single"}), return matching rules
--     ordered by priority.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculator_match_rules(
  p_total_load NUMERIC,
  p_meta       JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  rule_id     UUID,
  name        TEXT,
  headline    TEXT,
  note        TEXT,
  priority    INTEGER,
  min_load    NUMERIC,
  max_load    NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.name,
    r.headline,
    r.note,
    r.priority,
    r.min_load,
    r.max_load
  FROM calculator_suggestion_rules r
  WHERE r.is_active = TRUE
    AND r.is_deleted = FALSE
    AND COALESCE(p_total_load, 0) >= r.min_load
    AND (r.max_load IS NULL OR COALESCE(p_total_load, 0) < r.max_load)
    AND NOT EXISTS (
      SELECT 1
      FROM calculator_rule_conditions c
      JOIN calculator_meta_fields f ON f.id = c.field_id
      WHERE c.rule_id = r.id
        AND NOT (
          CASE c.operator
            WHEN 'between' THEN
              (p_meta ? f.key)
              AND (c.min_value IS NULL
                   OR (p_meta->>f.key)::NUMERIC >= c.min_value)
              AND (c.max_value IS NULL
                   OR (p_meta->>f.key)::NUMERIC < c.max_value)
            WHEN 'eq' THEN
              (p_meta ? f.key)
              AND (
                (c.value_number IS NOT NULL AND (p_meta->>f.key)::NUMERIC = c.value_number)
                OR (c.value_text IS NOT NULL AND p_meta->>f.key = c.value_text)
                OR (c.value_boolean IS NOT NULL AND (p_meta->>f.key)::BOOLEAN = c.value_boolean)
              )
            WHEN 'neq' THEN
              (p_meta ? f.key)
              AND NOT (
                (c.value_number IS NOT NULL AND (p_meta->>f.key)::NUMERIC = c.value_number)
                OR (c.value_text IS NOT NULL AND p_meta->>f.key = c.value_text)
                OR (c.value_boolean IS NOT NULL AND (p_meta->>f.key)::BOOLEAN = c.value_boolean)
              )
            WHEN 'in' THEN
              (p_meta ? f.key)
              AND c.value_set IS NOT NULL
              AND (p_meta->>f.key) IN (SELECT jsonb_array_elements_text(c.value_set))
            WHEN 'contains' THEN
              (p_meta ? f.key)
              AND c.value_set IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(c.value_set) AS need(v)
                WHERE need.v NOT IN (
                  SELECT jsonb_array_elements_text(
                    CASE WHEN jsonb_typeof(p_meta->f.key) = 'array'
                         THEN p_meta->f.key
                         ELSE jsonb_build_array(p_meta->>f.key)
                    END
                  )
                )
              )
            ELSE FALSE
          END
        )
    )
  ORDER BY r.priority DESC, r.min_load ASC, r.created_at ASC;
$$;

-- Convenience: matched rules + their suggested products in one call.
-- rule_headline / rule_note carry the admin's public-facing wording so the
-- storefront never has to show the internal rule name.
-- Dropped first because CREATE OR REPLACE cannot change a function's OUT
-- columns; this also upgrades a database that still has an older signature.
DROP FUNCTION IF EXISTS calculator_suggested_products(NUMERIC, JSONB);

CREATE FUNCTION calculator_suggested_products(
  p_total_load NUMERIC,
  p_meta       JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  rule_id       UUID,
  rule_name     TEXT,
  rule_headline TEXT,
  rule_note     TEXT,
  rule_priority INTEGER,
  product_id    UUID,
  variant_id    UUID,
  is_primary    BOOLEAN,
  note          TEXT,
  sort_order    INTEGER
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.rule_id,
    m.name,
    m.headline,
    m.note,
    m.priority,
    rp.product_id,
    rp.variant_id,
    rp.is_primary,
    rp.note,
    rp.sort_order
  FROM calculator_match_rules(p_total_load, p_meta) m
  JOIN calculator_rule_products rp ON rp.rule_id = m.rule_id
  JOIN products p ON p.id = rp.product_id
  WHERE p.is_active = TRUE AND p.is_deleted = FALSE
  ORDER BY m.priority DESC, rp.is_primary DESC, rp.sort_order ASC;
$$;

-- ============================================================
-- B) PROJECTS (blog-like, section based layout)
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  summary          TEXT,                     -- short excerpt for cards
  cover_image_url  TEXT,

  -- Optional editorial fields
  client_name      TEXT,
  location         TEXT,
  completed_at     DATE,

  is_featured      BOOLEAN NOT NULL DEFAULT FALSE,  -- shows on the public home page
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  published_at     TIMESTAMPTZ,

  seo_title        TEXT,
  seo_description  TEXT,
  metadata         JSONB,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_listing
  ON projects (is_deleted, is_active, sort_order, published_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_featured
  ON projects (is_featured, is_deleted, is_active, sort_order);

-- Layout section types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_section_kind') THEN
    CREATE TYPE project_section_kind AS ENUM ('text','image');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_section_layout') THEN
    -- full  : spans the full content width
    -- left  : occupies the left half on desktop
    -- right : occupies the right half on desktop
    -- On mobile every section stacks into a single column.
    CREATE TYPE project_section_layout AS ENUM ('full','left','right');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS project_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  kind          project_section_kind   NOT NULL DEFAULT 'text',
  layout        project_section_layout NOT NULL DEFAULT 'full',

  -- kind = 'text'
  heading       TEXT,
  content_md    TEXT,                 -- markdown source (same editor as products.details_md)

  -- kind = 'image'
  image_url     TEXT,                 -- uploaded through the existing upload channel
  image_alt     TEXT,
  caption       TEXT,

  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  metadata      JSONB,                -- extra per-section options (bg color, ratio, ...)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each kind must carry its own payload
  CONSTRAINT project_sections_payload_valid CHECK (
    (kind = 'text'  AND content_md IS NOT NULL)
    OR
    (kind = 'image' AND image_url IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_project_sections_project
  ON project_sections (project_id, is_active, sort_order);

-- ============================================================
-- C) updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'load_groups',
    'load_items',
    'calculator_meta_fields',
    'calculator_suggestion_rules',
    'projects',
    'project_sections'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END$$;

-- ============================================================
-- D) Row Level Security (public read, writes via service role)
--    Mirrors the pattern used in 001-core-schema-rls.sql
-- ============================================================
ALTER TABLE load_groups                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_items                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_meta_fields         ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_meta_field_options  ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_suggestion_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_rule_conditions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_rule_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sections               ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_select_load_groups ON load_groups;
CREATE POLICY public_select_load_groups
  ON load_groups FOR SELECT USING (is_active = TRUE AND is_deleted = FALSE);

DROP POLICY IF EXISTS public_select_load_items ON load_items;
CREATE POLICY public_select_load_items
  ON load_items FOR SELECT USING (is_active = TRUE AND is_deleted = FALSE);

DROP POLICY IF EXISTS public_select_calculator_meta_fields ON calculator_meta_fields;
CREATE POLICY public_select_calculator_meta_fields
  ON calculator_meta_fields FOR SELECT USING (is_active = TRUE AND is_deleted = FALSE);

DROP POLICY IF EXISTS public_select_calculator_meta_field_options ON calculator_meta_field_options;
CREATE POLICY public_select_calculator_meta_field_options
  ON calculator_meta_field_options FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS public_select_calculator_rules ON calculator_suggestion_rules;
CREATE POLICY public_select_calculator_rules
  ON calculator_suggestion_rules FOR SELECT USING (is_active = TRUE AND is_deleted = FALSE);

DROP POLICY IF EXISTS public_select_calculator_rule_conditions ON calculator_rule_conditions;
CREATE POLICY public_select_calculator_rule_conditions
  ON calculator_rule_conditions FOR SELECT USING (true);

DROP POLICY IF EXISTS public_select_calculator_rule_products ON calculator_rule_products;
CREATE POLICY public_select_calculator_rule_products
  ON calculator_rule_products FOR SELECT USING (true);

DROP POLICY IF EXISTS public_select_projects ON projects;
CREATE POLICY public_select_projects
  ON projects FOR SELECT USING (is_active = TRUE AND is_deleted = FALSE);

DROP POLICY IF EXISTS public_select_project_sections ON project_sections;
CREATE POLICY public_select_project_sections
  ON project_sections FOR SELECT USING (is_active = TRUE);

-- (No insert/update/delete policies -> writes only via service role.)

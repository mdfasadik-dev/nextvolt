-- ============================================
-- Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ============================================
-- 1) Categories (with subcategories)
-- ============================================
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  image_url    TEXT,
  slug         TEXT UNIQUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_listing ON categories(is_deleted, is_active, sort_order, created_at);

-- ============================================
-- 2) Dynamic attributes (assignable to categories)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attribute_data_type') THEN
    CREATE TYPE attribute_data_type AS ENUM ('text','number','boolean','select');
  END IF;
END$$;

CREATE TABLE attributes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  code         TEXT UNIQUE,                  -- e.g., "color", "material"
  data_type    attribute_data_type NOT NULL, -- how values will be stored/filtered
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which attributes are used to filter products in a category
CREATE TABLE category_attributes (
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, attribute_id)
);

CREATE INDEX idx_category_attributes_attr ON category_attributes(attribute_id);

-- ============================================
-- 3) Products + Variants (no pricing here)
-- ============================================
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE,
  description    TEXT,               -- short summary
  brand          TEXT,
  weight_grams   NUMERIC(12,3) NOT NULL DEFAULT 0
                   CHECK (weight_grams >= 0),
  main_image_url TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Rich content fields
  details_md     TEXT,               -- Markdown source
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_weight ON products(weight_grams);
CREATE INDEX idx_products_listing ON products(is_deleted, is_active, is_featured, sort_order, created_at);

-- Product image gallery (multiple images per product)
CREATE TABLE product_images (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url      TEXT NOT NULL,
  alt_text       TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_sort ON product_images(product_id, sort_order);

-- Product badge (single configurable badge per product with date window)
CREATE TABLE product_badges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  color          TEXT NOT NULL
                   CHECK (
                     color IN (
                       'slate','gray','red','orange','amber','yellow',
                       'green','emerald','teal','cyan','blue','indigo',
                       'pink','rose'
                     )
                   ),
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_badges_single_per_product UNIQUE (product_id),
  CONSTRAINT product_badges_valid_window CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at
  )
);

CREATE INDEX idx_product_badges_product ON product_badges(product_id);
CREATE INDEX idx_product_badges_window ON product_badges(is_active, starts_at, ends_at);

-- Simple variant model (pricing removed; SKU kept)
CREATE TABLE product_variants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku            TEXT UNIQUE,                 -- unique stock keeping unit
  title          TEXT,                        -- e.g., "500ml", "Red / XL"
  image_url      TEXT,
  details_md     TEXT,                        -- optional: markdown
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- ============================================
-- Product Attribute Values (for filtering/search)
-- ============================================
CREATE TABLE product_attribute_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id  UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,
  value_text    TEXT,
  value_number  NUMERIC,
  value_boolean BOOLEAN,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, attribute_id)
);

CREATE INDEX idx_pav_attr_text   ON product_attribute_values(attribute_id, value_text);
CREATE INDEX idx_pav_attr_num    ON product_attribute_values(attribute_id, value_number);
CREATE INDEX idx_pav_attr_bool   ON product_attribute_values(attribute_id, value_boolean);

-- ============================================
-- 4) Inventory (per variant OR per product) with pricing & discount
-- ============================================
CREATE TABLE inventory (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products(id) on delete cascade,
  variant_id       uuid references product_variants(id) on delete cascade,

  unit             text not null default 'pcs',
  quantity         integer not null default 0 check (quantity >= 0),

  purchase_price   numeric(12,2) not null default 0 check (purchase_price >= 0),
  sale_price       numeric(12,2) not null default 0 check (sale_price >= 0),

  discount_type    text not null default 'none'
                     check (discount_type in ('none','percent','amount')),
  discount_value   numeric(12,2) not null default 0,

  updated_at       timestamptz not null default now(),


  -- Discount semantics
  constraint inventory_discount_valid check (
    (discount_type = 'percent' and discount_value >= 0 and discount_value <= 100) or
    (discount_type = 'amount'  and discount_value >= 0) or
    (discount_type = 'none'    and discount_value >= 0)
  )
);

create index idx_inventory_product  on inventory(product_id);
create index idx_inventory_variant  on inventory(variant_id);

-- ============================================
-- 5) Orders
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending','accepted','shipped','completed','cancelled');
  END IF;
END$$;

CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID,
  status            order_status NOT NULL DEFAULT 'pending',
  subtotal_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'BDT',
  shipping_address  JSONB,
  billing_address   JSONB,
  -- Denormalized snapshot of order items for quick reads/exports.
  -- The normalized source of truth is the order_items table below.
  order_items_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders(status);

-- ============================================
-- 6) Order Items
-- ============================================
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id      UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(12,2) NOT NULL,
  line_total      NUMERIC(12,2) NOT NULL,
  product_name    TEXT,
  variant_title   TEXT,
  sku             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_variant ON order_items(variant_id);

-- ============================================
-- 6.1) Derived Customers (from orders, unique by mobile)
-- ============================================
CREATE OR REPLACE FUNCTION admin_customers_page(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  phone TEXT,
  name TEXT,
  email TEXT,
  latest_order_id UUID,
  latest_order_at TIMESTAMPTZ,
  orders_count BIGINT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
WITH extracted AS (
  SELECT
    o.id AS order_id,
    o.created_at,
    NULLIF(TRIM(COALESCE(
      o.shipping_address->>'phone',
      o.billing_address->>'phone',
      ''
    )), '') AS phone_raw,
    NULLIF(TRIM(COALESCE(
      o.shipping_address->>'fullName',
      o.shipping_address->>'full_name',
      o.shipping_address->>'name',
      o.billing_address->>'fullName',
      o.billing_address->>'full_name',
      o.billing_address->>'name',
      ''
    )), '') AS name_raw,
    NULLIF(TRIM(COALESCE(
      o.shipping_address->>'email',
      o.billing_address->>'email',
      ''
    )), '') AS email_raw
  FROM orders o
),
normalized AS (
  SELECT
    order_id,
    created_at,
    NULLIF(REGEXP_REPLACE(COALESCE(phone_raw, ''), '[^0-9]+', '', 'g'), '') AS phone_key,
    phone_raw,
    name_raw,
    email_raw
  FROM extracted
),
grouped AS (
  SELECT
    phone_key,
    (ARRAY_AGG(phone_raw ORDER BY created_at DESC))[1] AS phone,
    (ARRAY_AGG(name_raw ORDER BY created_at DESC))[1] AS name,
    (ARRAY_AGG(email_raw ORDER BY created_at DESC))[1] AS email,
    (ARRAY_AGG(order_id ORDER BY created_at DESC))[1] AS latest_order_id,
    MAX(created_at) AS latest_order_at,
    COUNT(*)::BIGINT AS orders_count
  FROM normalized
  WHERE phone_key IS NOT NULL
  GROUP BY phone_key
),
filtered AS (
  SELECT
    phone,
    name,
    email,
    latest_order_id,
    latest_order_at,
    orders_count
  FROM grouped
  WHERE
    COALESCE(NULLIF(TRIM(p_search), ''), '') = ''
    OR COALESCE(phone, '') ILIKE '%' || TRIM(p_search) || '%'
    OR COALESCE(name, '') ILIKE '%' || TRIM(p_search) || '%'
    OR COALESCE(email, '') ILIKE '%' || TRIM(p_search) || '%'
),
ranked AS (
  SELECT
    phone,
    name,
    email,
    latest_order_id,
    latest_order_at,
    orders_count,
    COUNT(*) OVER ()::BIGINT AS total_count
  FROM filtered
)
SELECT
  phone,
  name,
  email,
  latest_order_id,
  latest_order_at,
  orders_count,
  total_count
FROM ranked
ORDER BY latest_order_at DESC
OFFSET GREATEST((COALESCE(p_page, 1) - 1) * COALESCE(p_page_size, 20), 0)
LIMIT GREATEST(COALESCE(p_page_size, 20), 1);
$$;

CREATE OR REPLACE FUNCTION admin_customers_all(
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  phone TEXT,
  name TEXT,
  email TEXT,
  latest_order_id UUID,
  latest_order_at TIMESTAMPTZ,
  orders_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
WITH extracted AS (
  SELECT
    o.id AS order_id,
    o.created_at,
    NULLIF(TRIM(COALESCE(
      o.shipping_address->>'phone',
      o.billing_address->>'phone',
      ''
    )), '') AS phone_raw,
    NULLIF(TRIM(COALESCE(
      o.shipping_address->>'fullName',
      o.shipping_address->>'full_name',
      o.shipping_address->>'name',
      o.billing_address->>'fullName',
      o.billing_address->>'full_name',
      o.billing_address->>'name',
      ''
    )), '') AS name_raw,
    NULLIF(TRIM(COALESCE(
      o.shipping_address->>'email',
      o.billing_address->>'email',
      ''
    )), '') AS email_raw
  FROM orders o
),
normalized AS (
  SELECT
    order_id,
    created_at,
    NULLIF(REGEXP_REPLACE(COALESCE(phone_raw, ''), '[^0-9]+', '', 'g'), '') AS phone_key,
    phone_raw,
    name_raw,
    email_raw
  FROM extracted
),
grouped AS (
  SELECT
    phone_key,
    (ARRAY_AGG(phone_raw ORDER BY created_at DESC))[1] AS phone,
    (ARRAY_AGG(name_raw ORDER BY created_at DESC))[1] AS name,
    (ARRAY_AGG(email_raw ORDER BY created_at DESC))[1] AS email,
    (ARRAY_AGG(order_id ORDER BY created_at DESC))[1] AS latest_order_id,
    MAX(created_at) AS latest_order_at,
    COUNT(*)::BIGINT AS orders_count
  FROM normalized
  WHERE phone_key IS NOT NULL
  GROUP BY phone_key
)
SELECT
  phone,
  name,
  email,
  latest_order_id,
  latest_order_at,
  orders_count
FROM grouped
WHERE
  COALESCE(NULLIF(TRIM(p_search), ''), '') = ''
  OR COALESCE(phone, '') ILIKE '%' || TRIM(p_search) || '%'
  OR COALESCE(name, '') ILIKE '%' || TRIM(p_search) || '%'
  OR COALESCE(email, '') ILIKE '%' || TRIM(p_search) || '%'
ORDER BY latest_order_at DESC;
$$;

-- ============================================
-- 7) Stores
-- ============================================
CREATE TABLE stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_dark_mode TEXT,
  logo_light_mode TEXT,
  name          TEXT NOT NULL,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  postal_code   TEXT,
  country       TEXT DEFAULT 'Bangladesh',
  contact_name  TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  latitude      NUMERIC(9,6),
  longitude     NUMERIC(9,6),
  opening_hours JSONB,   -- e.g. {"mon":"9-6","tue":"9-6"}
  website_url   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_active   ON stores(is_active);
CREATE INDEX idx_stores_location ON stores(latitude, longitude);

-- ============================================
-- 8) Delivery, Charge Options, Coupons
-- ============================================
CREATE TABLE delivery (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label          TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0
                   CHECK (amount >= 0),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,

  metadata             JSONB,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
  
);

CREATE TABLE delivery_weight_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id           UUID NOT NULL REFERENCES delivery(id) ON DELETE CASCADE,
  label                 TEXT,
  min_weight_grams      NUMERIC(12,3) NOT NULL DEFAULT 0
                          CHECK (min_weight_grams >= 0),
  max_weight_grams      NUMERIC(12,3)
                          CHECK (max_weight_grams IS NULL OR max_weight_grams > 0),
  base_weight_grams     NUMERIC(12,3) NOT NULL DEFAULT 0
                          CHECK (base_weight_grams >= 0),
  base_charge           NUMERIC(12,2) NOT NULL DEFAULT 0
                          CHECK (base_charge >= 0),
  incremental_unit_grams NUMERIC(12,3) NOT NULL DEFAULT 0
                          CHECK (incremental_unit_grams >= 0),
  incremental_charge    NUMERIC(12,2) NOT NULL DEFAULT 0
                          CHECK (incremental_charge >= 0),
  increment_rounding    TEXT NOT NULL DEFAULT 'ceil'
                          CHECK (increment_rounding IN ('ceil','floor','round')),
  sort_order            INTEGER NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (max_weight_grams IS NULL OR max_weight_grams > min_weight_grams)
);

CREATE TABLE charge_options (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label   TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'charge'
                   CHECK (type IN ('charge','discount')),
                   
  calc_type      TEXT NOT NULL DEFAULT 'amount'
                   CHECK (calc_type IN (
                     'amount',
                     'percent'
                   )),

  amount         NUMERIC(12,2) NOT NULL DEFAULT 0
                   CHECK (amount >= 0),

  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INTEGER NOT NULL DEFAULT 0,

  metadata             JSONB,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE coupons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT NOT NULL UNIQUE,
  description          TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,

  -- Validity window
  valid_from           TIMESTAMPTZ,
  valid_to             TIMESTAMPTZ,
  min_order_amount NUMERIC(12,2) CHECK (min_order_amount >= 0),   

  calc_type TEXT NOT NULL DEFAULT 'amount'
    CHECK (calc_type IN ('amount','percent')),

  amount NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (amount >= 0),

  metadata             JSONB,             

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_charges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  delivery_id      UUID REFERENCES delivery(id) ON DELETE SET NULL,
  charge_option_id UUID REFERENCES charge_options(id) ON DELETE SET NULL,
  coupon_id        UUID REFERENCES coupons(id) ON DELETE SET NULL,
  
  type             TEXT NOT NULL
                     CHECK (type IN ('charge','discount')),

  calc_type        TEXT NOT NULL
                     CHECK (calc_type IN ('amount','percent')),

  base_amount      NUMERIC(12,2) NOT NULL DEFAULT 0
                     CHECK (base_amount >= 0),

  applied_amount   NUMERIC(12,2) NOT NULL DEFAULT 0
                     CHECK (applied_amount >= 0),

  currency TEXT DEFAULT 'BDT',
  metadata         JSONB,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery
  ON delivery (label, is_active);

CREATE INDEX idx_delivery_weight_rules_delivery
  ON delivery_weight_rules (delivery_id, is_active, sort_order);

CREATE INDEX idx_delivery_weight_rules_range
  ON delivery_weight_rules (delivery_id, min_weight_grams, max_weight_grams);

CREATE INDEX idx_charge_options
  ON charge_options (label, is_active);

CREATE INDEX idx_coupons_code
  ON coupons (code, is_active);

CREATE INDEX idx_coupons_validity
  ON coupons (valid_from, valid_to);

CREATE INDEX idx_order_charges_order
  ON order_charges(order_id);



DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_type') THEN
    CREATE TYPE promotion_type AS ENUM ('carousel','banner','hero','popup','custom');
  END IF;
END$$;


-- Promotional Blocks

CREATE TABLE promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key        TEXT NOT NULL,

  type            promotion_type NOT NULL DEFAULT 'carousel',

  title           TEXT,      -- internal / editorial title
  description     TEXT,      -- internal notes

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  start_at        TIMESTAMPTZ,
  end_at          TIMESTAMPTZ,

  metadata        JSONB,     -- extra config (background color, layout options, etc.)

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promotions_store_slot_active
  ON promotions (slot_key, is_active);

CREATE INDEX idx_promotions_active_window
  ON promotions (is_active, start_at, end_at);


-- Individual slides / cards / images

CREATE TABLE promotion_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id    UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,

  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Content for UI
  image_url       TEXT,
  mobile_image_url TEXT,       
  title           TEXT,
  subtitle        TEXT,
  body            TEXT,

  -- Click behavior
  cta_label       TEXT,
  cta_url         TEXT,        -- link to category/product/custom URL
  cta_target      TEXT,        -- e.g. '_self', '_blank' (optional)

  -- Extra settings per item (color scheme, badge text, tag, etc.)
  metadata        JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 13) Content Pages (CMS)
-- ============================================
CREATE TABLE content_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  summary         TEXT,
  content_md      TEXT NOT NULL DEFAULT '',
  seo_title       TEXT,
  seo_description TEXT,
  show_in_footer  BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_pages_active_sort
  ON content_pages (is_active, show_in_footer, sort_order, created_at);

CREATE INDEX idx_promotion_items_promotion_active
  ON promotion_items (promotion_id, is_active, sort_order);

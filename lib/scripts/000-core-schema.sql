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
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);

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
  main_image_url TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Rich content fields
  details_md     TEXT,               -- Markdown source
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);

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
    CREATE TYPE order_status AS ENUM ('pending','paid','shipped','completed','cancelled');
  END IF;
END$$;

CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID,
  status            order_status NOT NULL DEFAULT 'pending',
  subtotal_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_amount   NUMERIC(12,2) NOT NULL DEFAULT 0, -- Obsolete
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0, -- Obsolete
  total_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'BDT',
  shipping_address  JSONB,
  billing_address   JSONB,
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
  product_id      UUID REFERENCES products(id) ON DELETE RESTRICT,
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

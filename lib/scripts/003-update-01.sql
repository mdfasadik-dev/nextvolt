-- Allowing product delete

ALTER TABLE order_items
  DROP CONSTRAINT order_items_product_id_fkey;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE SET NULL;


-- Drop the obsolete columns

ALTER TABLE orders
  DROP COLUMN shipping_amount,
  DROP COLUMN discount_amount;

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

CREATE INDEX idx_promotion_items_promotion_active
  ON promotion_items (promotion_id, is_active, sort_order);


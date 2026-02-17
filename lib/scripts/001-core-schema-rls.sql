-- ========= Catalog: enable RLS + public read =========
ALTER TABLE categories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_badges            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attributes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                    ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_categories
  ON categories FOR SELECT USING (true);

CREATE POLICY public_select_products
  ON products FOR SELECT USING (true);

CREATE POLICY public_select_product_images
  ON product_images FOR SELECT USING (true);

CREATE POLICY public_select_product_badges
  ON product_badges FOR SELECT USING (true);

CREATE POLICY public_select_variants
  ON product_variants FOR SELECT USING (true);

CREATE POLICY public_select_attributes
  ON attributes FOR SELECT USING (true);

CREATE POLICY public_select_category_attributes
  ON category_attributes FOR SELECT USING (true);

CREATE POLICY public_select_product_attribute_values
  ON product_attribute_values FOR SELECT USING (true);

CREATE POLICY public_select_stores
  ON stores FOR SELECT USING (true);

-- ========= Inventory: enable RLS + public read =========
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_inventory
  ON inventory FOR SELECT USING (true);
-- (No insert/update/delete policy here, so writes are blocked by default.)

-- ========= Orders: enable RLS; user can only access their own =========
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Read own orders
CREATE POLICY select_own_orders
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

-- Create order for self
CREATE POLICY insert_own_orders
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Update only own order (optional; remove if you want orders immutable)
CREATE POLICY update_own_orders
  ON orders FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- (No delete policy -> customers cannot delete orders.)

-- ========= Order Items: only through own order =========
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Read items from own orders
CREATE POLICY select_items_of_own_orders
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- Insert items only into own order
CREATE POLICY insert_items_into_own_orders
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- Update items only if parent order is user's
CREATE POLICY update_items_of_own_orders
  ON order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- (No delete policy -> customers cannot delete order items.)


-- ============================================
-- 9) Delivery / Charge Options / Coupons: public read
-- ============================================

ALTER TABLE delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_weight_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_delivery
  ON delivery FOR SELECT USING (true);

CREATE POLICY public_select_delivery_weight_rules
  ON delivery_weight_rules FOR SELECT USING (true);

CREATE POLICY public_select_charge_options
  ON charge_options FOR SELECT USING (true);

CREATE POLICY public_select_coupons
  ON coupons FOR SELECT USING (true);

-- (No insert/update/delete policies -> only service role can write.)


-- ============================================
-- 10) Promotions & Items: public read
-- ============================================

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_promotions
  ON promotions FOR SELECT USING (true);

CREATE POLICY public_select_promotion_items
  ON promotion_items FOR SELECT USING (true);

-- (Again, writes only via service role / backend.)


-- ============================================
-- 10.1) Content Pages: public read
-- ============================================

ALTER TABLE content_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_content_pages
  ON content_pages FOR SELECT USING (is_active = true);


-- ============================================
-- 11) Order Charges: only through own order
-- ============================================

ALTER TABLE order_charges ENABLE ROW LEVEL SECURITY;

-- Read charges from own orders
CREATE POLICY select_charges_of_own_orders
  ON order_charges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_charges.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- Insert charges only into own order
CREATE POLICY insert_charges_into_own_orders
  ON order_charges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_charges.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- Update charges only if parent order is user's
CREATE POLICY update_charges_of_own_orders
  ON order_charges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_charges.order_id
        AND o.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_charges.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- (No delete policy -> customers cannot delete order_charges.)

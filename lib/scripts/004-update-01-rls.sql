-- ========= Delivery / Charge Options / Coupons: public read =========

ALTER TABLE delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_delivery
  ON delivery FOR SELECT USING (true);

CREATE POLICY public_select_charge_options
  ON charge_options FOR SELECT USING (true);

CREATE POLICY public_select_coupons
  ON coupons FOR SELECT USING (true);

-- (No insert/update/delete policies -> only service role can write.)


-- ========= Promotions & Items: public read =========

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_promotions
  ON promotions FOR SELECT USING (true);

CREATE POLICY public_select_promotion_items
  ON promotion_items FOR SELECT USING (true);

-- (Again, writes only via service role / backend.)


-- ========= Order Charges: only through own order =========

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

-- ========= Catalog: enable RLS + public read =========
ALTER TABLE categories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attributes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                    ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_categories
  ON categories FOR SELECT USING (true);

CREATE POLICY public_select_products
  ON products FOR SELECT USING (true);

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

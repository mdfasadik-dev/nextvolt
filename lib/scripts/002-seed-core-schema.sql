BEGIN;

-- Use UTF-8 encoding
SET client_encoding = 'UTF8';

-- ============================================
-- 1) Insert Stores
-- ============================================
WITH new_stores AS (
  INSERT INTO stores (name, address, city, country, contact_phone, contact_email, opening_hours, is_active, logo_dark_mode, logo_light_mode)
  VALUES
    ('Main Warehouse', '123 Kazi Nazrul Islam Ave', 'Dhaka', 'Bangladesh', '01700000001', 'contact@example.com', 
     '{"mon":"9am-6pm","tue":"9am-6pm","wed":"9am-6pm","thu":"9am-6pm","fri":"10am-5pm","sat":"closed","sun":"closed"}', TRUE, NULL, NULL),
    ('City Outlet', '456 CDA Avenue', 'Chittagong', 'Bangladesh', '01800000002', 'outlet@example.com', 
     '{"mon":"10am-8pm","tue":"10am-8pm","wed":"10am-8pm","thu":"10am-8pm","fri":"2pm-8pm","sat":"10am-8pm","sun":"10am-8pm"}', TRUE, NULL, NULL),
    ('Inactive Store', '789 Old Road', 'Khulna', 'Bangladesh', '01900000003', 'old@example.com', 
     '{"mon":"9am-5pm"}', FALSE, NULL, NULL),
    ('Global Hub', '1 Raffles Place', 'Singapore', 'Singapore', '+65 9123 4567', 'global@example.com', 
     '{"mon":"9am-6pm","tue":"9am-6pm","wed":"9am-6pm","thu":"9am-6pm","fri":"9am-6pm"}', TRUE, NULL, NULL)
  RETURNING id
),

-- ============================================
-- 2) Insert Attributes
-- ============================================
new_attributes AS (
  INSERT INTO attributes (name, code, data_type)
  VALUES
    ('Color', 'color', 'select'),
    ('Size', 'size', 'select'),
    ('Material', 'material', 'text'),
    ('Weight (kg)', 'weight_kg', 'number'),
    ('Water Resistant', 'water_resistant', 'boolean'),
    ('Storage', 'storage', 'select'),
    ('Screen Size (inch)', 'screen_size', 'number'),
    ('RAM', 'ram', 'select'),
    ('Author', 'author', 'text'),
    ('Publisher', 'publisher', 'text'),
    ('Organic', 'organic', 'boolean'),
    ('Voltage', 'voltage', 'text') -- Edge Case: Orphaned attribute, not linked to any category
  RETURNING id, code
),

-- ============================================
-- 3) Insert Categories (Min 10, with deep nesting)
-- ============================================
cat_l1 AS (
  INSERT INTO categories (name, slug, image_url, is_active)
  VALUES
    ('Electronics', 'electronics', NULL, TRUE),
    ('Apparel', 'apparel', NULL, TRUE),
    ('Books', 'books', NULL, TRUE),
    ('Groceries', 'groceries', NULL, TRUE),
    ('Home & Kitchen', 'home-kitchen', NULL, TRUE),
    ('Furniture', 'furniture', NULL, TRUE), -- Edge Case: Empty category
    ('Inactive Main Category', 'inactive-main', NULL, FALSE) -- Edge Case: Inactive
  RETURNING id, slug
),
cat_l2 AS (
  INSERT INTO categories (parent_id, name, slug, image_url, is_active)
  VALUES
    -- Electronics Children
    ((SELECT id FROM cat_l1 WHERE slug = 'electronics'), 'Computers & Laptops', 'computers-laptops', NULL, TRUE),
    ((SELECT id FROM cat_l1 WHERE slug = 'electronics'), 'Mobile Phones', 'mobile-phones', NULL, TRUE),
    -- Apparel Children
    ((SELECT id FROM cat_l1 WHERE slug = 'apparel'), 'Mens Fashion', 'mens-fashion', NULL, TRUE),
    ((SELECT id FROM cat_l1 WHERE slug = 'apparel'), 'Womens Fashion', 'womens-fashion', NULL, TRUE),
    -- Books Children
    ((SELECT id FROM cat_l1 WHERE slug = 'books'), 'Fiction', 'fiction', NULL, TRUE),
    ((SELECT id FROM cat_l1 WHERE slug = 'books'), 'Non-Fiction', 'non-fiction', NULL, TRUE),
    -- Groceries Children
    ((SELECT id FROM cat_l1 WHERE slug = 'groceries'), 'Fruits & Vegetables', 'fresh-produce', NULL, TRUE),
    ((SELECT id FROM cat_l1 WHERE slug = 'groceries'), 'Pantry Staples', 'pantry-staples', NULL, TRUE),
    -- Home & Kitchen Children
    ((SELECT id FROM cat_l1 WHERE slug = 'home-kitchen'), 'Appliances', 'appliances', NULL, TRUE),
    -- Inactive Category Child
    ((SELECT id FROM cat_l1 WHERE slug = 'inactive-main'), 'Obsolete Tech', 'obsolete-tech', NULL, FALSE)
  RETURNING id, slug
),
cat_l3 AS (
  INSERT INTO categories (parent_id, name, slug, image_url, is_active)
  VALUES
    -- Computers Children
    ((SELECT id FROM cat_l2 WHERE slug = 'computers-laptops'), 'Laptops', 'laptops', NULL, TRUE),
    ((SELECT id FROM cat_l2 WHERE slug = 'computers-laptops'), 'Desktops', 'desktops', NULL, TRUE),
    ((SELECT id FROM cat_l2 WHERE slug = 'computers-laptops'), 'Accessories', 'computer-accessories', NULL, TRUE),
    -- Mobile Phones Children
    ((SELECT id FROM cat_l2 WHERE slug = 'mobile-phones'), 'Smartphones', 'smartphones', NULL, TRUE),
    ((SELECT id FROM cat_l2 WHERE slug = 'mobile-phones'), 'Feature Phones', 'feature-phones', NULL, TRUE),
    -- Mens Fashion Children
    ((SELECT id FROM cat_l2 WHERE slug = 'mens-fashion'), 'T-Shirts', 'mens-tshirts', NULL, TRUE),
    ((SELECT id FROM cat_l2 WHERE slug = 'mens-fashion'), 'Pants & Jeans', 'mens-pants', NULL, TRUE)
  RETURNING id, slug
),
-- Edge Case: Level 4 nesting
cat_l4 AS (
  INSERT INTO categories (parent_id, name, slug, image_url, is_active)
  VALUES
    ((SELECT id FROM cat_l3 WHERE slug = 'computer-accessories'), 'Keyboards & Mice', 'keyboards-mice', NULL, TRUE)
  RETURNING id, slug
),

-- ============================================
-- 4) Link Category Attributes
-- ============================================
linked_cat_attrs AS (
  INSERT INTO category_attributes (category_id, attribute_id)
  VALUES
    -- Laptops
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), (SELECT id FROM new_attributes WHERE code = 'weight_kg')),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), (SELECT id FROM new_attributes WHERE code = 'storage')),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), (SELECT id FROM new_attributes WHERE code = 'ram')),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), (SELECT id FROM new_attributes WHERE code = 'screen_size')),
    -- Desktops
    ((SELECT id FROM cat_l3 WHERE slug = 'desktops'), (SELECT id FROM new_attributes WHERE code = 'weight_kg')),
    ((SELECT id FROM cat_l3 WHERE slug = 'desktops'), (SELECT id FROM new_attributes WHERE code = 'ram')),
    -- Smartphones
    ((SELECT id FROM cat_l3 WHERE slug = 'smartphones'), (SELECT id FROM new_attributes WHERE code = 'color')),
    ((SELECT id FROM cat_l3 WHERE slug = 'smartphones'), (SELECT id FROM new_attributes WHERE code = 'storage')),
    ((SELECT id FROM cat_l3 WHERE slug = 'smartphones'), (SELECT id FROM new_attributes WHERE code = 'ram')),
    ((SELECT id FROM cat_l3 WHERE slug = 'smartphones'), (SELECT id FROM new_attributes WHERE code = 'screen_size')),
    -- Keyboards & Mice
    ((SELECT id FROM cat_l4 WHERE slug = 'keyboards-mice'), (SELECT id FROM new_attributes WHERE code = 'color')),
    ((SELECT id FROM cat_l4 WHERE slug = 'keyboards-mice'), (SELECT id FROM new_attributes WHERE code = 'water_resistant')),
    -- T-Shirts
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-tshirts'), (SELECT id FROM new_attributes WHERE code = 'color')),
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-tshirts'), (SELECT id FROM new_attributes WHERE code = 'size')),
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-tshirts'), (SELECT id FROM new_attributes WHERE code = 'material')),
    -- Pants
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-pants'), (SELECT id FROM new_attributes WHERE code = 'color')),
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-pants'), (SELECT id FROM new_attributes WHERE code = 'size')),
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-pants'), (SELECT id FROM new_attributes WHERE code = 'material')),
    -- Books
    ((SELECT id FROM cat_l2 WHERE slug = 'fiction'), (SELECT id FROM new_attributes WHERE code = 'author')),
    ((SELECT id FROM cat_l2 WHERE slug = 'fiction'), (SELECT id FROM new_attributes WHERE code = 'publisher')),
    ((SELECT id FROM cat_l2 WHERE slug = 'non-fiction'), (SELECT id FROM new_attributes WHERE code = 'author')),
    ((SELECT id FROM cat_l2 WHERE slug = 'non-fiction'), (SELECT id FROM new_attributes WHERE code = 'publisher')),
    -- Groceries
    ((SELECT id FROM cat_l2 WHERE slug = 'fresh-produce'), (SELECT id FROM new_attributes WHERE code = 'weight_kg')),
    ((SELECT id FROM cat_l2 WHERE slug = 'fresh-produce'), (SELECT id FROM new_attributes WHERE code = 'organic'))
  RETURNING category_id
),

-- ============================================
-- 5) Insert Products (Target: >20)
-- ============================================
new_products AS (
  INSERT INTO products (category_id, name, slug, description, brand, main_image_url, is_active, is_featured, details_md)
  VALUES
    -- Laptops (3)
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'ProBook X1', 'probook-x1', 'A powerful 14-inch laptop.', 'TechCo', NULL, TRUE, TRUE, '# ProBook X1\n* 16GB RAM\n* Intel i7'),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'ZenAir Slim', 'zenair-slim', 'Ultra-thin laptop.', 'Zenith', NULL, FALSE, FALSE, '# ZenAir Slim\nInactive product.'), -- Edge Case: Inactive
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'EcoBook Lite', 'ecobook-lite', 'Eco-friendly, recycled materials.', 'GreenPC', NULL, TRUE, FALSE, '# EcoBook Lite\n* 8GB RAM'),
    -- Desktops (1)
    ((SELECT id FROM cat_l3 WHERE slug = 'desktops'), 'Gamer''s Rig XG', 'gamer-rig-xg', 'High-end gaming desktop.', 'Apex', NULL, TRUE, TRUE, '# Gamer''s Rig\n* 32GB RAM\n* RTX 4080'),
    -- Keyboards & Mice (2)
    ((SELECT id FROM cat_l4 WHERE slug = 'keyboards-mice'), 'Mechanical Keyboard K8', 'mech-keyboard-k8', 'Clicky and responsive.', 'ClickClack', NULL, TRUE, FALSE, '## K8\nAvailable in 3 switch types.'),
    ((SELECT id FROM cat_l4 WHERE slug = 'keyboards-mice'), 'ErgoMouse M5', 'ergo-mouse-m5', 'Vertical ergonomic mouse.', 'ComfortGrip', NULL, TRUE, FALSE, '## M5\nAll-day comfort.'), -- Edge Case: No variants
    -- Smartphones (3)
    ((SELECT id FROM cat_l3 WHERE slug = 'smartphones'), 'Pixel 9', 'pixel-9', 'The latest AI smartphone.', 'Google', NULL, TRUE, TRUE, '# Pixel 9\n* Tensor G4'),
    ((SELECT id FROM cat_l3 WHERE slug = 'smartphones'), 'iPhone 17', 'iphone-17', 'The new iPhone.', 'Apple', NULL, TRUE, FALSE, '# iPhone 17\n* A19 Bionic'),
    -- Feature Phones (1)
    ((SELECT id FROM cat_l3 WHERE slug = 'feature-phones'), 'Nokia 1100', 'nokia-1100', 'Classic and durable.', 'Nokia', NULL, TRUE, FALSE, 'Snake included.'), -- Single variant
    -- T-Shirts (2)
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-tshirts'), 'Classic Crew Neck T-Shirt', 'classic-crew-tshirt', '100% cotton T-shirt.', 'FashionBrand', NULL, TRUE, FALSE, '# Classic Crew\n* 100% Cotton'),
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-tshirts'), 'V-Neck Basic', 'v-neck-basic', 'Soft modal blend.', 'FashionBrand', NULL, TRUE, FALSE, '# V-Neck\n* Modal/Cotton blend'),
    -- Pants (2)
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-pants'), 'Slim Fit Denim', 'slim-fit-denim', 'Stretch denim jeans.', 'DenimCo', NULL, TRUE, FALSE, '# Slim Fit\n* 98% Cotton, 2% Elastane'),
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-pants'), 'Cargo Shorts', 'cargo-shorts', 'Cotton twill cargo shorts.', 'OutdoorCo', NULL, TRUE, FALSE, '# Cargo Shorts\n* 6 pockets'),
    -- Books (3)
    ((SELECT id FROM cat_l2 WHERE slug = 'fiction'), 'The SQL Mystery', 'sql-mystery', 'A thrilling novel about data.', 'DB Books', NULL, TRUE, FALSE, 'Who dunnit?'), -- Edge Case: No variants
    ((SELECT id FROM cat_l2 WHERE slug = 'fiction'), 'Dune Chronicles', 'dune-chronicles', 'The classic sci-fi saga.', 'Penguin', NULL, TRUE, TRUE, 'Box set.'), -- Edge Case: No variants
    ((SELECT id FROM cat_l2 WHERE slug = 'non-fiction'), 'A Brief History of Code', 'history-of-code', 'From Ada to AI.', 'TechPress', NULL, TRUE, FALSE, 'Must-read for devs.'), -- Edge Case: No variants
    -- Groceries (4)
    ((SELECT id FROM cat_l2 WHERE slug = 'fresh-produce'), 'Organic Apples', 'organic-apples', 'Fresh Himachali Apples.', 'FarmFresh', NULL, TRUE, FALSE, 'Sold by kg.'), -- Edge Case: No variants, unit=kg
    ((SELECT id FROM cat_l2 WHERE slug = 'fresh-produce'), 'Local Potatoes', 'local-potatoes', 'Fresh from Bogura.', 'LocalFarm', NULL, TRUE, FALSE, 'Sold by kg.'), -- Edge Case: No variants, unit=kg
    ((SELECT id FROM cat_l2 WHERE slug = 'pantry-staples'), 'Premium Basmati Rice', 'basmati-rice', 'Aged long-grain rice.', 'IndiaGate', NULL, TRUE, FALSE, 'Sold by kg.'), -- Edge Case: No variants, unit=kg
    ((SELECT id FROM cat_l2 WHERE slug = 'pantry-staples'), 'Olive Oil (500ml)', 'olive-oil-500ml', 'Extra Virgin Olive Oil.', 'Borges', NULL, TRUE, FALSE, 'Imported.'), -- Edge Case: No variants
    -- Appliances (1)
    ((SELECT id FROM cat_l2 WHERE slug = 'appliances'), 'Smart Blender 3000', 'smart-blender-3000', 'Blends anything.', 'KitchenKing', NULL, TRUE, FALSE, '1200W motor.'), -- Single variant
    -- Inactive Category Product (1)
    ((SELECT id FROM cat_l2 WHERE slug = 'obsolete-tech'), 'Obsolete Gadget', 'obsolete-gadget', 'A gadget from an inactive category.', 'OldTech', NULL, FALSE, FALSE, 'From an inactive category.') -- Edge Case
  RETURNING id, slug
),

-- ============================================
-- 6) Insert Product Variants
-- ============================================
new_variants AS (
  INSERT INTO product_variants (product_id, sku, title, image_url, is_active)
  VALUES
    -- ProBook X1 (2 variants)
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), 'PBX1-512', '512GB SSD', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), 'PBX1-1TB', '1TB SSD', NULL, TRUE),
    -- ZenAir Slim (1 variant)
    ((SELECT id FROM new_products WHERE slug = 'zenair-slim'), 'ZAS-256', '256GB SSD', NULL, FALSE),
    -- EcoBook Lite (1 variant)
    ((SELECT id FROM new_products WHERE slug = 'ecobook-lite'), 'EBL-256', '256GB SSD', NULL, TRUE),
    -- Gamer's Rig (1 variant)
    ((SELECT id FROM new_products WHERE slug = 'gamer-rig-xg'), 'GRXG-4080', 'RTX 4080', NULL, TRUE),
    -- Mechanical Keyboard (3 variants)
    ((SELECT id FROM new_products WHERE slug = 'mech-keyboard-k8'), 'MK8-RED', 'Red Switch', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'mech-keyboard-k8'), 'MK8-BLUE', 'Blue Switch', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'mech-keyboard-k8'), 'MK8-BRN', 'Brown Switch', NULL, TRUE),
    -- Pixel 9 (3 variants)
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), 'P9-BLUE-128', 'Ocean Blue / 128GB', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), 'P9-BLACK-128', 'Obsidian Black / 128GB', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), 'P9-BLACK-256', 'Obsidian Black / 256GB', NULL, TRUE),
    -- iPhone 17 (2 variants)
    ((SELECT id FROM new_products WHERE slug = 'iphone-17'), 'IP17-256', '256GB', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'iphone-17'), 'IP17-512', '512GB', NULL, TRUE),
    -- Nokia 1100 (1 variant)
    ((SELECT id FROM new_products WHERE slug = 'nokia-1100'), 'NK1100-BL', 'Blue', NULL, TRUE),
    -- T-Shirt (4 variants)
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), 'CCT-RED-M', 'Red / Medium', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), 'CCT-RED-L', 'Red / Large', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), 'CCT-BLUE-M', 'Blue / Medium', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), 'CCT-GREEN-XL', 'Green / X-Large', NULL, FALSE), -- Edge Case: Inactive Variant
    -- V-Neck (2 variants)
    ((SELECT id FROM new_products WHERE slug = 'v-neck-basic'), 'VNB-BLK-M', 'Black / Medium', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'v-neck-basic'), 'VNB-WHT-L', 'White / Large', NULL, TRUE),
    -- Slim Fit Denim (3 variants)
    ((SELECT id FROM new_products WHERE slug = 'slim-fit-denim'), 'SFD-3032', '30W x 32L', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'slim-fit-denim'), 'SFD-3232', '32W x 32L', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'slim-fit-denim'), 'SFD-3432', '34W x 32L', NULL, TRUE),
    -- Cargo Shorts (2 variants)
    ((SELECT id FROM new_products WHERE slug = 'cargo-shorts'), 'CS-KHA-M', 'Khaki / Medium', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'cargo-shorts'), 'CS-GRN-L', 'Olive Green / Large', NULL, TRUE),
    -- Smart Blender (1 variant)
    ((SELECT id FROM new_products WHERE slug = 'smart-blender-3000'), 'SB3K-STD', 'Standard', NULL, TRUE),
    -- Obsolete Gadget (1 variant)
    ((SELECT id FROM new_products WHERE slug = 'obsolete-gadget'), 'OG-001', 'Standard', NULL, FALSE)
  RETURNING id, sku
),

-- ============================================
-- 7) Insert Product Attribute Values (for filtering)
-- ============================================
new_pavs AS (
  INSERT INTO product_attribute_values (product_id, attribute_id, value_text, value_number, value_boolean)
  VALUES
    -- ProBook X1
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), (SELECT id FROM new_attributes WHERE code = 'weight_kg'), NULL, 1.4, NULL),
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), (SELECT id FROM new_attributes WHERE code = 'ram'), '16GB', NULL, NULL),
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), (SELECT id FROM new_attributes WHERE code = 'screen_size'), NULL, 14, NULL),
    -- Gamer's Rig
    ((SELECT id FROM new_products WHERE slug = 'gamer-rig-xg'), (SELECT id FROM new_attributes WHERE code = 'weight_kg'), NULL, 15.5, NULL),
    ((SELECT id FROM new_products WHERE slug = 'gamer-rig-xg'), (SELECT id FROM new_attributes WHERE code = 'ram'), '32GB', NULL, NULL),
    -- Mechanical Keyboard
    ((SELECT id FROM new_products WHERE slug = 'mech-keyboard-k8'), (SELECT id FROM new_attributes WHERE code = 'water_resistant'), NULL, NULL, TRUE),
    -- ErgoMouse
    ((SELECT id FROM new_products WHERE slug = 'ergo-mouse-m5'), (SELECT id FROM new_attributes WHERE code = 'water_resistant'), NULL, NULL, FALSE),
    -- Pixel 9
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), (SELECT id FROM new_attributes WHERE code = 'ram'), '12GB', NULL, NULL),
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), (SELECT id FROM new_attributes WHERE code = 'screen_size'), NULL, 6.2, NULL),
    -- iPhone 17
    ((SELECT id FROM new_products WHERE slug = 'iphone-17'), (SELECT id FROM new_attributes WHERE code = 'ram'), '16GB', NULL, NULL),
    ((SELECT id FROM new_products WHERE slug = 'iphone-17'), (SELECT id FROM new_attributes WHERE code = 'screen_size'), NULL, 6.1, NULL),
    -- T-Shirt
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), (SELECT id FROM new_attributes WHERE code = 'material'), 'Cotton', NULL, NULL),
    -- Denim
    ((SELECT id FROM new_products WHERE slug = 'slim-fit-denim'), (SELECT id FROM new_attributes WHERE code = 'material'), 'Denim', NULL, NULL),
    -- Books
    ((SELECT id FROM new_products WHERE slug = 'sql-mystery'), (SELECT id FROM new_attributes WHERE code = 'author'), 'A.I. Author', NULL, NULL),
    ((SELECT id FROM new_products WHERE slug = 'sql-mystery'), (SELECT id FROM new_attributes WHERE code = 'publisher'), 'DB Books', NULL, NULL),
    ((SELECT id FROM new_products WHERE slug = 'history-of-code'), (SELECT id FROM new_attributes WHERE code = 'author'), 'Jane Coder', NULL, NULL),
    ((SELECT id FROM new_products WHERE slug = 'history-of-code'), (SELECT id FROM new_attributes WHERE code = 'publisher'), 'TechPress', NULL, NULL),
    ((SELECT id FROM new_products WHERE slug = 'dune-chronicles'), (SELECT id FROM new_attributes WHERE code = 'author'), 'Frank Herbert', NULL, NULL),
    -- Groceries
    ((SELECT id FROM new_products WHERE slug = 'organic-apples'), (SELECT id FROM new_attributes WHERE code = 'organic'), NULL, NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'local-potatoes'), (SELECT id FROM new_attributes WHERE code = 'organic'), NULL, NULL, FALSE)
  RETURNING id
),

-- ============================================
-- 8) Insert Inventory (Stock & Pricing)
-- ============================================
new_inventory AS (
  INSERT INTO inventory (product_id, variant_id, quantity, purchase_price, sale_price, discount_type, discount_value, unit)
  VALUES
    -- ProBook X1
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), (SELECT id FROM new_variants WHERE sku = 'PBX1-512'), 50, 80000, 110000, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), (SELECT id FROM new_variants WHERE sku = 'PBX1-1TB'), 30, 95000, 130000, 'amount', 5000, 'pcs'), -- amount discount
    -- ZenAir (OOS)
    ((SELECT id FROM new_products WHERE slug = 'zenair-slim'), (SELECT id FROM new_variants WHERE sku = 'ZAS-256'), 0, 70000, 95000, 'none', 0, 'pcs'), -- Edge Case: OOS
    -- EcoBook
    ((SELECT id FROM new_products WHERE slug = 'ecobook-lite'), (SELECT id FROM new_variants WHERE sku = 'EBL-256'), 25, 50000, 65000, 'none', 0, 'pcs'),
    -- Gamer's Rig (Low Stock)
    ((SELECT id FROM new_products WHERE slug = 'gamer-rig-xg'), (SELECT id FROM new_variants WHERE sku = 'GRXG-4080'), 5, 200000, 280000, 'percent', 15, 'pcs'), -- percent discount
    -- Keyboards
    ((SELECT id FROM new_products WHERE slug = 'mech-keyboard-k8'), (SELECT id FROM new_variants WHERE sku = 'MK8-RED'), 100, 3000, 5000, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'mech-keyboard-k8'), (SELECT id FROM new_variants WHERE sku = 'MK8-BLUE'), 100, 3000, 5000, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'mech-keyboard-k8'), (SELECT id FROM new_variants WHERE sku = 'MK8-BRN'), 50, 3000, 5000, 'none', 0, 'pcs'),
    -- ErgoMouse (Product-level stock)
    ((SELECT id FROM new_products WHERE slug = 'ergo-mouse-m5'), NULL, 150, 2000, 3500, 'none', 0, 'pcs'), -- Edge Case: Product-level stock
    -- Pixel 9
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), (SELECT id FROM new_variants WHERE sku = 'P9-BLUE-128'), 100, 60000, 85000, 'percent', 10, 'pcs'), -- percent discount
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), (SELECT id FROM new_variants WHERE sku = 'P9-BLACK-128'), 100, 60000, 85000, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), (SELECT id FROM new_variants WHERE sku = 'P9-BLACK-256'), 0, 70000, 95000, 'none', 0, 'pcs'), -- Edge Case: OOS
    -- iPhone 17
    ((SELECT id FROM new_products WHERE slug = 'iphone-17'), (SELECT id FROM new_variants WHERE sku = 'IP17-256'), 75, 120000, 150000, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'iphone-17'), (SELECT id FROM new_variants WHERE sku = 'IP17-512'), 50, 140000, 180000, 'amount', 10000, 'pcs'), -- amount discount
    -- Nokia 1100
    ((SELECT id FROM new_products WHERE slug = 'nokia-1100'), (SELECT id FROM new_variants WHERE sku = 'NK1100-BL'), 500, 1500, 2500, 'none', 0, 'pcs'),
    -- T-Shirts
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), (SELECT id FROM new_variants WHERE sku = 'CCT-RED-M'), 200, 300, 550, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), (SELECT id FROM new_variants WHERE sku = 'CCT-RED-L'), 200, 300, 550, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), (SELECT id FROM new_variants WHERE sku = 'CCT-BLUE-M'), 150, 300, 550, 'none', 0, 'pcs'),
    -- V-Neck
    ((SELECT id FROM new_products WHERE slug = 'v-neck-basic'), (SELECT id FROM new_variants WHERE sku = 'VNB-BLK-M'), 100, 400, 650, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'v-neck-basic'), (SELECT id FROM new_variants WHERE sku = 'VNB-WHT-L'), 100, 400, 650, 'none', 0, 'pcs'),
    -- Denim
    ((SELECT id FROM new_products WHERE slug = 'slim-fit-denim'), (SELECT id FROM new_variants WHERE sku = 'SFD-3032'), 80, 1200, 2200, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'slim-fit-denim'), (SELECT id FROM new_variants WHERE sku = 'SFD-3232'), 80, 1200, 2200, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'slim-fit-denim'), (SELECT id FROM new_variants WHERE sku = 'SFD-3432'), 80, 1200, 2200, 'none', 0, 'pcs'),
    -- Cargo Shorts
    ((SELECT id FROM new_products WHERE slug = 'cargo-shorts'), (SELECT id FROM new_variants WHERE sku = 'CS-KHA-M'), 100, 700, 1300, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'cargo-shorts'), (SELECT id FROM new_variants WHERE sku = 'CS-GRN-L'), 100, 700, 1300, 'none', 0, 'pcs'),
    -- Books (Product-level stock)
    ((SELECT id FROM new_products WHERE slug = 'sql-mystery'), NULL, 75, 250, 400, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'dune-chronicles'), NULL, 50, 1500, 2500, 'none', 0, 'pcs'),
    ((SELECT id FROM new_products WHERE slug = 'history-of-code'), NULL, 100, 400, 700, 'none', 0, 'pcs'),
    -- Groceries (Product-level stock, unit=kg)
    ((SELECT id FROM new_products WHERE slug = 'organic-apples'), NULL, 100, 180, 250, 'none', 0, 'kg'), -- Edge Case: unit 'kg'
    ((SELECT id FROM new_products WHERE slug = 'local-potatoes'), NULL, 300, 30, 45, 'none', 0, 'kg'), -- Edge Case: unit 'kg'
    ((SELECT id FROM new_products WHERE slug = 'basmati-rice'), NULL, 200, 120, 160, 'none', 0, 'kg'), -- Edge Case: unit 'kg'
    ((SELECT id FROM new_products WHERE slug = 'olive-oil-500ml'), NULL, 100, 500, 850, 'none', 0, 'pcs'),
    -- Appliances
    ((SELECT id FROM new_products WHERE slug = 'smart-blender-3000'), (SELECT id FROM new_variants WHERE sku = 'SB3K-STD'), 40, 4000, 6500, 'none', 0, 'pcs'),
    -- Obsolete Gadget (OOS)
    ((SELECT id FROM new_products WHERE slug = 'obsolete-gadget'), (SELECT id FROM new_variants WHERE sku = 'OG-001'), 0, 100, 150, 'none', 0, 'pcs')
  RETURNING id
)
-- Final SELECT to complete the WITH-query block
SELECT 'Seed data (products, categories, inventory) inserted successfully' AS result;

-- Commit the transaction
COMMIT;
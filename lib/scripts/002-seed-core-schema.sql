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
     '{"mon":"9am-6pm","tue":"9am-6pm","wed":"9am-6pm","thu":"9am-6pm","fri":"10am-5pm","sat":"closed","sun":"closed"}', TRUE, NULL, NULL)
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
  INSERT INTO categories (name, slug, image_url, is_active, sort_order, is_deleted)
  VALUES
    ('Electronics', 'electronics', NULL, TRUE, 0, FALSE),
    ('Apparel', 'apparel', NULL, TRUE, 1, FALSE),
    ('Books', 'books', NULL, TRUE, 2, FALSE),
    ('Groceries', 'groceries', NULL, TRUE, 3, FALSE),
    ('Home & Kitchen', 'home-kitchen', NULL, TRUE, 4, FALSE),
    ('Furniture', 'furniture', NULL, TRUE, 5, FALSE), -- Edge Case: Empty category
    ('Inactive Main Category', 'inactive-main', NULL, FALSE, 6, FALSE) -- Edge Case: Inactive
  RETURNING id, slug
),
cat_l2 AS (
  INSERT INTO categories (parent_id, name, slug, image_url, is_active, sort_order, is_deleted)
  VALUES
    -- Electronics Children
    ((SELECT id FROM cat_l1 WHERE slug = 'electronics'), 'Computers & Laptops', 'computers-laptops', NULL, TRUE, 0, FALSE),
    ((SELECT id FROM cat_l1 WHERE slug = 'electronics'), 'Mobile Phones', 'mobile-phones', NULL, TRUE, 1, FALSE),
    -- Apparel Children
    ((SELECT id FROM cat_l1 WHERE slug = 'apparel'), 'Mens Fashion', 'mens-fashion', NULL, TRUE, 0, FALSE),
    ((SELECT id FROM cat_l1 WHERE slug = 'apparel'), 'Womens Fashion', 'womens-fashion', NULL, TRUE, 1, FALSE),
    -- Books Children
    ((SELECT id FROM cat_l1 WHERE slug = 'books'), 'Fiction', 'fiction', NULL, TRUE, 0, FALSE),
    ((SELECT id FROM cat_l1 WHERE slug = 'books'), 'Non-Fiction', 'non-fiction', NULL, TRUE, 1, FALSE),
    -- Groceries Children
    ((SELECT id FROM cat_l1 WHERE slug = 'groceries'), 'Fruits & Vegetables', 'fresh-produce', NULL, TRUE, 0, FALSE),
    ((SELECT id FROM cat_l1 WHERE slug = 'groceries'), 'Pantry Staples', 'pantry-staples', NULL, TRUE, 1, FALSE),
    -- Home & Kitchen Children
    ((SELECT id FROM cat_l1 WHERE slug = 'home-kitchen'), 'Appliances', 'appliances', NULL, TRUE, 0, FALSE),
    -- Inactive Category Child
    ((SELECT id FROM cat_l1 WHERE slug = 'inactive-main'), 'Obsolete Tech', 'obsolete-tech', NULL, FALSE, 0, FALSE)
  RETURNING id, slug
),
cat_l3 AS (
  INSERT INTO categories (parent_id, name, slug, image_url, is_active, sort_order, is_deleted)
  VALUES
    -- Computers Children
    ((SELECT id FROM cat_l2 WHERE slug = 'computers-laptops'), 'Laptops', 'laptops', NULL, TRUE, 0, FALSE),
    ((SELECT id FROM cat_l2 WHERE slug = 'computers-laptops'), 'Desktops', 'desktops', NULL, TRUE, 1, FALSE),
    ((SELECT id FROM cat_l2 WHERE slug = 'computers-laptops'), 'Accessories', 'computer-accessories', NULL, TRUE, 2, FALSE),
    -- Mobile Phones Children
    ((SELECT id FROM cat_l2 WHERE slug = 'mobile-phones'), 'Smartphones', 'smartphones', NULL, TRUE, 0, FALSE),
    ((SELECT id FROM cat_l2 WHERE slug = 'mobile-phones'), 'Feature Phones', 'feature-phones', NULL, TRUE, 1, FALSE),
    -- Mens Fashion Children
    ((SELECT id FROM cat_l2 WHERE slug = 'mens-fashion'), 'T-Shirts', 'mens-tshirts', NULL, TRUE, 0, FALSE),
    ((SELECT id FROM cat_l2 WHERE slug = 'mens-fashion'), 'Pants & Jeans', 'mens-pants', NULL, TRUE, 1, FALSE)
  RETURNING id, slug
),
-- Edge Case: Level 4 nesting
cat_l4 AS (
  INSERT INTO categories (parent_id, name, slug, image_url, is_active, sort_order, is_deleted)
  VALUES
    ((SELECT id FROM cat_l3 WHERE slug = 'computer-accessories'), 'Keyboards & Mice', 'keyboards-mice', NULL, TRUE, 0, FALSE)
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
  INSERT INTO products (
    category_id,
    name,
    slug,
    description,
    brand,
    main_image_url,
    is_active,
    is_featured,
    details_md,
    weight_grams,
    sort_order,
    is_deleted
  )
  VALUES
    -- Laptops (19)
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'ProBook X1', 'probook-x1', 'A powerful 14-inch laptop.', 'TechCo', NULL, TRUE, TRUE, '# ProBook X1\n* 16GB RAM\n* Intel i7', 1400, 0, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'ZenAir Slim', 'zenair-slim', 'Ultra-thin laptop.', 'Zenith', NULL, FALSE, FALSE, '# ZenAir Slim\nInactive product.', 1200, 1, FALSE), -- Edge Case: Inactive
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'EcoBook Lite', 'ecobook-lite', 'Eco-friendly, recycled materials.', 'GreenPC', NULL, TRUE, FALSE, '# EcoBook Lite\n* 8GB RAM', 1350, 2, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'AeroBook 13', 'aerobook-13', 'Compact 13-inch ultrabook.', 'SkyTech', NULL, TRUE, FALSE, '# AeroBook 13\n* 8GB RAM\n* 256GB SSD', 1180, 3, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'AeroBook 15', 'aerobook-15', 'Balanced 15-inch performance laptop.', 'SkyTech', NULL, TRUE, FALSE, '# AeroBook 15\n* 16GB RAM\n* 512GB SSD', 1420, 4, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'WorkMate 14', 'workmate-14', 'Business-ready laptop with long battery life.', 'OfficePro', NULL, TRUE, FALSE, '# WorkMate 14\n* Fingerprint unlock', 1360, 5, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'WorkMate 16', 'workmate-16', 'Large-screen productivity machine.', 'OfficePro', NULL, TRUE, FALSE, '# WorkMate 16\n* Numeric keypad', 1590, 6, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'DevStation Lite', 'devstation-lite', 'Entry developer laptop.', 'CodeGear', NULL, TRUE, FALSE, '# DevStation Lite\n* 16GB RAM', 1480, 7, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'DevStation Pro', 'devstation-pro', 'High-memory developer laptop.', 'CodeGear', NULL, TRUE, FALSE, '# DevStation Pro\n* 32GB RAM', 1710, 8, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'StudentBook S1', 'studentbook-s1', 'Affordable daily laptop for study.', 'EduTech', NULL, TRUE, FALSE, '# StudentBook S1\n* Budget friendly', 1290, 9, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'StudentBook S2', 'studentbook-s2', 'Improved student laptop with SSD.', 'EduTech', NULL, TRUE, FALSE, '# StudentBook S2\n* Fast boot', 1310, 10, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'UltraNote 14', 'ultranote-14', 'Premium lightweight notebook.', 'Lumina', NULL, TRUE, FALSE, '# UltraNote 14\n* Aluminum body', 1120, 11, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'UltraNote 16', 'ultranote-16', 'Premium 16-inch notebook.', 'Lumina', NULL, TRUE, FALSE, '# UltraNote 16\n* 120Hz display', 1540, 12, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'TravelBook Air', 'travelbook-air', 'Ultra-portable travel companion.', 'Roam', NULL, TRUE, FALSE, '# TravelBook Air\n* USB-C charging', 1050, 13, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'TravelBook Plus', 'travelbook-plus', 'Portable laptop with larger battery.', 'Roam', NULL, TRUE, FALSE, '# TravelBook Plus\n* All-day battery', 1270, 14, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'CreatorBook C1', 'creatorbook-c1', 'Laptop tuned for creators.', 'PixelForge', NULL, TRUE, FALSE, '# CreatorBook C1\n* Color-accurate panel', 1650, 15, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'CreatorBook C2', 'creatorbook-c2', 'Creator laptop with stronger GPU.', 'PixelForge', NULL, TRUE, FALSE, '# CreatorBook C2\n* Dedicated graphics', 1760, 16, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'BusinessBook B1', 'businessbook-b1', 'Secure enterprise laptop.', 'CoreBiz', NULL, TRUE, FALSE, '# BusinessBook B1\n* TPM and secure boot', 1490, 17, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'laptops'), 'BusinessBook B2', 'businessbook-b2', 'Enterprise laptop with LTE option.', 'CoreBiz', NULL, TRUE, FALSE, '# BusinessBook B2\n* Optional LTE', 1530, 18, FALSE),
    -- Desktops (1)
    ((SELECT id FROM cat_l3 WHERE slug = 'desktops'), 'Gamer''s Rig XG', 'gamer-rig-xg', 'High-end gaming desktop.', 'Apex', NULL, TRUE, TRUE, '# Gamer''s Rig\n* 32GB RAM\n* RTX 4080', 15500, 0, FALSE),
    -- Keyboards & Mice (2)
    ((SELECT id FROM cat_l4 WHERE slug = 'keyboards-mice'), 'Mechanical Keyboard K8', 'mech-keyboard-k8', 'Clicky and responsive.', 'ClickClack', NULL, TRUE, FALSE, '## K8\nAvailable in 3 switch types.', 900, 0, FALSE),
    ((SELECT id FROM cat_l4 WHERE slug = 'keyboards-mice'), 'ErgoMouse M5', 'ergo-mouse-m5', 'Vertical ergonomic mouse.', 'ComfortGrip', NULL, TRUE, FALSE, '## M5\nAll-day comfort.', 120, 1, FALSE), -- Edge Case: No variants
    -- Smartphones (3)
    ((SELECT id FROM cat_l3 WHERE slug = 'smartphones'), 'Pixel 9', 'pixel-9', 'The latest AI smartphone.', 'Google', NULL, TRUE, TRUE, '# Pixel 9\n* Tensor G4', 198, 0, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'smartphones'), 'iPhone 17', 'iphone-17', 'The new iPhone.', 'Apple', NULL, TRUE, FALSE, '# iPhone 17\n* A19 Bionic', 205, 1, FALSE),
    -- Feature Phones (1)
    ((SELECT id FROM cat_l3 WHERE slug = 'feature-phones'), 'Nokia 1100', 'nokia-1100', 'Classic and durable.', 'Nokia', NULL, TRUE, FALSE, 'Snake included.', 95, 0, FALSE), -- Single variant
    -- T-Shirts (2)
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-tshirts'), 'Classic Crew Neck T-Shirt', 'classic-crew-tshirt', '100% cotton T-shirt.', 'FashionBrand', NULL, TRUE, FALSE, '# Classic Crew\n* 100% Cotton', 220, 0, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-tshirts'), 'V-Neck Basic', 'v-neck-basic', 'Soft modal blend.', 'FashionBrand', NULL, TRUE, FALSE, '# V-Neck\n* Modal/Cotton blend', 210, 1, FALSE),
    -- Pants (2)
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-pants'), 'Slim Fit Denim', 'slim-fit-denim', 'Stretch denim jeans.', 'DenimCo', NULL, TRUE, FALSE, '# Slim Fit\n* 98% Cotton, 2% Elastane', 450, 0, FALSE),
    ((SELECT id FROM cat_l3 WHERE slug = 'mens-pants'), 'Cargo Shorts', 'cargo-shorts', 'Cotton twill cargo shorts.', 'OutdoorCo', NULL, TRUE, FALSE, '# Cargo Shorts\n* 6 pockets', 380, 1, FALSE),
    -- Books (3)
    ((SELECT id FROM cat_l2 WHERE slug = 'fiction'), 'The SQL Mystery', 'sql-mystery', 'A thrilling novel about data.', 'DB Books', NULL, TRUE, FALSE, 'Who dunnit?', 320, 0, FALSE), -- Edge Case: No variants
    ((SELECT id FROM cat_l2 WHERE slug = 'fiction'), 'Dune Chronicles', 'dune-chronicles', 'The classic sci-fi saga.', 'Penguin', NULL, TRUE, TRUE, 'Box set.', 640, 1, FALSE), -- Edge Case: No variants
    ((SELECT id FROM cat_l2 WHERE slug = 'non-fiction'), 'A Brief History of Code', 'history-of-code', 'From Ada to AI.', 'TechPress', NULL, TRUE, FALSE, 'Must-read for devs.', 520, 0, FALSE), -- Edge Case: No variants
    -- Groceries (4)
    ((SELECT id FROM cat_l2 WHERE slug = 'fresh-produce'), 'Organic Apples', 'organic-apples', 'Fresh Himachali Apples.', 'FarmFresh', NULL, TRUE, FALSE, 'Sold by kg.', 1000, 0, FALSE), -- Edge Case: No variants, unit=kg
    ((SELECT id FROM cat_l2 WHERE slug = 'fresh-produce'), 'Local Potatoes', 'local-potatoes', 'Fresh from Bogura.', 'LocalFarm', NULL, TRUE, FALSE, 'Sold by kg.', 500, 1, FALSE), -- Edge Case: No variants, unit=kg
    ((SELECT id FROM cat_l2 WHERE slug = 'pantry-staples'), 'Premium Basmati Rice', 'basmati-rice', 'Aged long-grain rice.', 'IndiaGate', NULL, TRUE, FALSE, 'Sold by kg.', 1000, 0, FALSE), -- Edge Case: No variants, unit=kg
    ((SELECT id FROM cat_l2 WHERE slug = 'pantry-staples'), 'Olive Oil (500ml)', 'olive-oil-500ml', 'Extra Virgin Olive Oil.', 'Borges', NULL, TRUE, FALSE, 'Imported.', 500, 1, FALSE), -- Edge Case: No variants
    -- Appliances (1)
    ((SELECT id FROM cat_l2 WHERE slug = 'appliances'), 'Smart Blender 3000', 'smart-blender-3000', 'Blends anything.', 'KitchenKing', NULL, TRUE, FALSE, '1200W motor.', 9000, 0, FALSE), -- Single variant
    -- Inactive Category Product (1)
    ((SELECT id FROM cat_l2 WHERE slug = 'obsolete-tech'), 'Obsolete Gadget', 'obsolete-gadget', 'A gadget from an inactive category.', 'OldTech', NULL, FALSE, FALSE, 'From an inactive category.', 300, 0, FALSE) -- Edge Case
  RETURNING id, slug
),

-- ============================================
-- 6) Insert Product Images
-- ============================================
new_product_images AS (
  INSERT INTO product_images (product_id, image_url, sort_order, is_primary)
  VALUES
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), '/placeholder.png?v=probook-1', 0, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'probook-x1'), '/placeholder.png?v=probook-2', 1, FALSE),
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), '/placeholder.png?v=pixel-1', 0, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), '/placeholder.png?v=pixel-2', 1, FALSE),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), '/placeholder.png?v=tee-1', 0, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), '/placeholder.png?v=tee-2', 1, FALSE),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), '/placeholder.png?v=tee-3', 2, FALSE),
    ((SELECT id FROM new_products WHERE slug = 'organic-apples'), '/placeholder.png?v=apples-1', 0, TRUE)
  RETURNING id
),
synced_main_images AS (
  UPDATE products p
  SET main_image_url = pi.image_url
  FROM (
    SELECT DISTINCT ON (product_id) product_id, image_url
    FROM product_images
    WHERE product_id IN (SELECT id FROM new_products)
    ORDER BY product_id, sort_order ASC, created_at ASC
  ) pi
  WHERE p.id = pi.product_id
  RETURNING p.id
),
new_product_badges AS (
  INSERT INTO product_badges (product_id, label, color, starts_at, ends_at, is_active)
  VALUES
    ((SELECT id FROM new_products WHERE slug = 'pixel-9'), 'Hot Deal', 'red', now() - interval '1 day', now() + interval '14 days', TRUE),
    ((SELECT id FROM new_products WHERE slug = 'classic-crew-tshirt'), 'New Arrival', 'emerald', now() - interval '1 day', NULL, TRUE),
    ((SELECT id FROM new_products WHERE slug = 'organic-apples'), 'Fresh', 'green', now() - interval '1 day', NULL, TRUE)
  RETURNING id
),

-- ============================================
-- 7) Insert Product Variants
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
-- 8) Insert Product Attribute Values (for filtering)
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
-- 9) Insert Inventory (Stock & Pricing)
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
-- Final SELECT to complete the WITH-query block (Part 1)
SELECT 'Seed data (products, categories, inventory) inserted successfully' AS result;


-- ============================================
-- 9) Seed Delivery, Charges, Coupons, Promotions
-- ============================================

-- Seed Delivery

INSERT INTO delivery (label, amount, sort_order, is_default, is_active, metadata)
VALUES
  ('Inside Dhaka', 60.00, 1, TRUE,  TRUE,  '{"zone": "inside"}'::jsonb),
  ('Outside Dhaka', 120.00, 2, FALSE, TRUE, '{"zone": "outside"}'::jsonb),
  ('Store Pickup', 0.00, 3, FALSE, TRUE, '{"type": "pickup"}'::jsonb),
  ('Legacy Disabled Delivery', 80.00, 99, FALSE, FALSE, '{"deprecated": true}'::jsonb);

-- Seed delivery_weight_rules

INSERT INTO delivery_weight_rules (
  delivery_id,
  label,
  min_weight_grams,
  max_weight_grams,
  base_weight_grams,
  base_charge,
  incremental_unit_grams,
  incremental_charge,
  increment_rounding,
  sort_order,
  is_active,
  metadata
)
SELECT
  d.id,
  'Inside Dhaka: up to 500g',
  0,
  500,
  500,
  60,
  0,
  0,
  'ceil',
  1,
  TRUE,
  '{"zone":"inside","note":"flat charge up to 500g"}'::jsonb
FROM delivery d
WHERE d.label = 'Inside Dhaka';

INSERT INTO delivery_weight_rules (
  delivery_id,
  label,
  min_weight_grams,
  max_weight_grams,
  base_weight_grams,
  base_charge,
  incremental_unit_grams,
  incremental_charge,
  increment_rounding,
  sort_order,
  is_active,
  metadata
)
SELECT
  d.id,
  'Inside Dhaka: 500g to 2kg',
  500,
  2000,
  500,
  60,
  500,
  20,
  'ceil',
  2,
  TRUE,
  '{"zone":"inside","applies":"medium parcels"}'::jsonb
FROM delivery d
WHERE d.label = 'Inside Dhaka';

INSERT INTO delivery_weight_rules (
  delivery_id,
  label,
  min_weight_grams,
  max_weight_grams,
  base_weight_grams,
  base_charge,
  incremental_unit_grams,
  incremental_charge,
  increment_rounding,
  sort_order,
  is_active,
  metadata
)
SELECT
  d.id,
  'Inside Dhaka: above 2kg',
  2000,
  NULL,
  2000,
  120,
  500,
  25,
  'ceil',
  3,
  TRUE,
  '{"zone":"inside","applies":"heavy parcels"}'::jsonb
FROM delivery d
WHERE d.label = 'Inside Dhaka';

INSERT INTO delivery_weight_rules (
  delivery_id,
  label,
  min_weight_grams,
  max_weight_grams,
  base_weight_grams,
  base_charge,
  incremental_unit_grams,
  incremental_charge,
  increment_rounding,
  sort_order,
  is_active,
  metadata
)
SELECT
  d.id,
  'Outside Dhaka: up to 500g',
  0,
  500,
  500,
  120,
  0,
  0,
  'ceil',
  1,
  TRUE,
  '{"zone":"outside","note":"flat charge up to 500g"}'::jsonb
FROM delivery d
WHERE d.label = 'Outside Dhaka';

INSERT INTO delivery_weight_rules (
  delivery_id,
  label,
  min_weight_grams,
  max_weight_grams,
  base_weight_grams,
  base_charge,
  incremental_unit_grams,
  incremental_charge,
  increment_rounding,
  sort_order,
  is_active,
  metadata
)
SELECT
  d.id,
  'Outside Dhaka: 500g to 2kg',
  500,
  2000,
  500,
  120,
  500,
  30,
  'ceil',
  2,
  TRUE,
  '{"zone":"outside","applies":"medium parcels"}'::jsonb
FROM delivery d
WHERE d.label = 'Outside Dhaka';

INSERT INTO delivery_weight_rules (
  delivery_id,
  label,
  min_weight_grams,
  max_weight_grams,
  base_weight_grams,
  base_charge,
  incremental_unit_grams,
  incremental_charge,
  increment_rounding,
  sort_order,
  is_active,
  metadata
)
SELECT
  d.id,
  'Outside Dhaka: above 2kg',
  2000,
  NULL,
  2000,
  180,
  500,
  35,
  'ceil',
  3,
  TRUE,
  '{"zone":"outside","applies":"heavy parcels"}'::jsonb
FROM delivery d
WHERE d.label = 'Outside Dhaka';

INSERT INTO delivery_weight_rules (
  delivery_id,
  label,
  min_weight_grams,
  max_weight_grams,
  base_weight_grams,
  base_charge,
  incremental_unit_grams,
  incremental_charge,
  increment_rounding,
  sort_order,
  is_active,
  metadata
)
SELECT
  d.id,
  'Store Pickup: all weights',
  0,
  NULL,
  0,
  0,
  0,
  0,
  'ceil',
  1,
  TRUE,
  '{"type":"pickup"}'::jsonb
FROM delivery d
WHERE d.label = 'Store Pickup';

-- Seed content_pages

INSERT INTO content_pages (
  title,
  slug,
  summary,
  content_md,
  seo_title,
  seo_description,
  show_in_footer,
  is_active,
  sort_order,
  metadata
)
VALUES
  (
    'About Us',
    'about-us',
    'Learn more about our story, mission, and values.',
    '# About Us\n\nWe are committed to reliable delivery and authentic products.\n\n## Our Mission\n\nDeliver quality products with transparent pricing and trusted service.',
    'About Us | NextVolt',
    'Learn about NextVolt, our mission, and our commitment to quality products and reliable delivery.',
    TRUE,
    TRUE,
    10,
    '{"section":"company"}'::jsonb
  ),
  (
    'Shipping Policy',
    'shipping-policy',
    'Delivery timelines, zones, and shipping charges.',
    '# Shipping Policy\n\nShipping charges are calculated from delivery zone and total shipment weight.\n\n## Delivery Times\n\n- Inside city: 1-2 working days\n- Outside city: 2-5 working days',
    'Shipping Policy | NextVolt',
    'Read the NextVolt shipping policy, delivery timelines, and charge calculations.',
    TRUE,
    TRUE,
    20,
    '{"section":"policy"}'::jsonb
  ),
  (
    'Return & Refund Policy',
    'return-refund-policy',
    'How returns, replacements, and refunds are processed.',
    '# Return and Refund Policy\n\nYou can request a return within 7 days of delivery for eligible items.\n\n## Refund Method\n\nRefunds are processed to the original payment method after validation.',
    'Return and Refund Policy | NextVolt',
    'Understand return eligibility, replacement rules, and refund processing at NextVolt.',
    TRUE,
    TRUE,
    30,
    '{"section":"policy"}'::jsonb
  ),
  (
    'Privacy Policy',
    'privacy-policy',
    'How we collect, use, and protect customer data.',
    '# Privacy Policy\n\nWe collect required data to fulfill orders and provide customer support.\n\n## Data Protection\n\nWe do not sell personal information and apply role-based access controls internally.',
    'Privacy Policy | NextVolt',
    'Review how NextVolt handles customer data and protects privacy.',
    TRUE,
    TRUE,
    40,
    '{"section":"policy"}'::jsonb
  );

-- Seed charge_options

INSERT INTO charge_options (label, type, calc_type, amount, is_active, sort_order, metadata)
VALUES
  -- Percentage service fee (charge, percent)
  ('Service Fee', 'charge', 'percent', 2.00, TRUE, 1,
    '{"description": "2% service fee on subtotal"}'::jsonb),

  -- Packaging charge (charge, fixed amount)
  ('Packaging Charge', 'charge', 'amount', 20.00, TRUE, 2,
    '{"applies_to": "fragile_items"}'::jsonb),

  -- COD fee (charge, fixed amount)
  ('COD Fee', 'charge', 'amount', 30.00, TRUE, 3,
    '{"payment_method": "cod"}'::jsonb),

  -- New customer discount (discount, percent)
  ('New Customer Discount', 'discount', 'percent', 5.00, TRUE, 10,
    '{"condition": "first_order_only"}'::jsonb),

  -- Disabled manual discount (discount, amount, inactive)
  ('Legacy Manual Discount', 'discount', 'amount', 50.00, FALSE, 99,
    '{"note": "old rule, disabled"}'::jsonb);



-- Seed coupons

INSERT INTO coupons (
  code, description, is_active,
  valid_from, valid_to, min_order_amount,
  calc_type, amount, metadata
)
VALUES
  -- 10% off, new users, min 500
  ('NEW10',
   '10% off for new users',
   TRUE,
   now() - interval '1 day',
   now() + interval '30 days',
   500.00,
   'percent',
   10.00,
   '{"segment": "new"}'::jsonb),

  -- Flat 50 off, everyone, min 300
  ('FLAT50',
   'Flat 50 BDT off any order above 300',
   TRUE,
   now() - interval '1 day',
   now() + interval '30 days',
   300.00,
   'amount',
   50.00,
   '{"segment": "all"}'::jsonb),

  -- Big sale, 20% off, high min, near expiry
  ('BIGSALE',
   '20% off big carts, limited time',
   TRUE,
   now() - interval '7 days',
   now() + interval '1 day',
   2000.00,
   'percent',
   20.00,
   '{"campaign": "flash"}'::jsonb),

  -- Expired / inactive coupon
  ('EXPIRED10',
   'Expired test coupon',
   FALSE,
   now() - interval '60 days',
   now() - interval '30 days',
   0,
   'percent',
   10.00,
   '{"status": "expired"}'::jsonb);

-- Seed promotions

INSERT INTO promotions (
  slot_key, type, title, description,
  is_active, start_at, end_at, metadata
)
VALUES
  ('home_hero',
   'hero',
   'Summer Big Sale',
   'Main hero banner for the homepage',
   TRUE,
   now() - interval '1 day',
   now() + interval '15 days',
   '{"theme": "light", "text_align": "center"}'::jsonb),

  ('home_carousel',
   'carousel',
   'Homepage Carousel',
   'Rotating promotional cards for homepage',
   TRUE,
   now() - interval '1 day',
   now() + interval '30 days',
   '{"autoplay": true, "interval_ms": 5000}'::jsonb),

  ('category_burger_banner',
   'banner',
   'Burger Category Banner',
   'Banner shown on burger category listing',
   TRUE,
   now() - interval '1 day',
   now() + interval '365 days',
   '{"category_slug": "burgers"}'::jsonb),

  ('checkout_popup',
   'popup',
   'Checkout Offer Popup',
   'Popup shown on the checkout page',
   FALSE,
   now() - interval '1 day',
   now() + interval '30 days',
   '{"dismissible": true}'::jsonb);


-- Seed promotion_items

INSERT INTO promotion_items (
  promotion_id, sort_order, is_active,
  image_url, mobile_image_url,
  title, subtitle, body,
  cta_label, cta_url, cta_target,
  metadata
)
SELECT
  p.id,
  1,
  TRUE,
  -- Desktop image
  'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1600&q=80',
  -- Mobile image
  'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
  'Big Burgers, Big Flavor',
  'Up to 30% off on signature burgers',
  'Order now and enjoy freshly grilled burgers delivered hot to your door.',
  'Order Now',
  '/category/burgers',
  '_self',
  '{"badge": "Hot", "theme": "dark"}'::jsonb
FROM promotions p
WHERE p.slot_key = 'home_hero';


-- Carousel items for home_carousel

-- Slide 1
INSERT INTO promotion_items (
  promotion_id, sort_order, is_active,
  image_url, mobile_image_url,
  title, subtitle, body,
  cta_label, cta_url, cta_target,
  metadata
)
SELECT
  p.id,
  1,
  TRUE,
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'Cheesy Pizzas',
  'Buy 1 Get 1 every Friday',
  'Enjoy double the fun with our BOGO Friday pizza deal.',
  'View Offer',
  '/offers/pizza-bogo',
  '_self',
  '{"badge": "BOGO"}'::jsonb
FROM promotions p
WHERE p.slot_key = 'home_carousel';

-- Slide 2
INSERT INTO promotion_items (
  promotion_id, sort_order, is_active,
  image_url, mobile_image_url,
  title, subtitle, body,
  cta_label, cta_url, cta_target,
  metadata
)
SELECT
  p.id,
  2,
  TRUE,
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80',
  'Fresh Drinks',
  'Cool down with iced beverages',
  'Try our new range of iced coffees and mocktails this summer.',
  'Try Now',
  '/category/drinks',
  '_self',
  '{"badge": "New"}'::jsonb
FROM promotions p
WHERE p.slot_key = 'home_carousel';

-- Slide 3
INSERT INTO promotion_items (
  promotion_id, sort_order, is_active,
  image_url, mobile_image_url,
  title, subtitle, body,
  cta_label, cta_url, cta_target,
  metadata
)
SELECT
  p.id,
  3,
  TRUE,
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  'Family Meals',
  'Combo packs for 3–5 people',
  'Save more when you order family combo packs for your next hangout.',
  'See Combos',
  '/combos/family',
  '_self',
  '{"badge": "Value"}'::jsonb
FROM promotions p
WHERE p.slot_key = 'home_carousel';


-- Banner item for burger category

INSERT INTO promotion_items (
  promotion_id, sort_order, is_active,
  image_url, mobile_image_url,
  title, subtitle, body,
  cta_label, cta_url, cta_target,
  metadata
)
SELECT
  p.id,
  1,
  TRUE,
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  'Double Patty Madness',
  'Exclusive burger deals in this category',
  'Pick any double patty burger and get a free soft drink.',
  'Explore Burgers',
  '/category/burgers',
  '_self',
  '{"position": "category_top"}'::jsonb
FROM promotions p
WHERE p.slot_key = 'category_burger_banner';


-- Popup item for checkout (even though promo is inactive)

INSERT INTO promotion_items (
  promotion_id, sort_order, is_active,
  image_url, mobile_image_url,
  title, subtitle, body,
  cta_label, cta_url, cta_target,
  metadata
)
SELECT
  p.id,
  1,
  TRUE,
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  'Wait! Extra Savings',
  'Apply coupon NEW10 before you pay',
  'Use code NEW10 to get an extra 10% off on your first order.',
  'Apply Coupon',
  '/checkout?apply=NEW10',
  '_self',
  '{"display": "once_per_session"}'::jsonb
FROM promotions p
WHERE p.slot_key = 'checkout_popup';


-- ============================================
-- 10) Seed Sample Orders (50+ pending)
-- ============================================

INSERT INTO orders (
  status,
  subtotal_amount,
  total_amount,
  currency,
  shipping_address,
  billing_address,
  notes,
  created_at
)
SELECT
  'pending',
  (450 + ((gs * 73) % 2850))::numeric(12,2) AS subtotal_amount,
  (450 + ((gs * 73) % 2850) + (40 + (gs % 120)))::numeric(12,2) AS total_amount,
  'BDT',
  jsonb_build_object(
    'name', format('Customer %s', gs),
    'phone', '017' || lpad(gs::text, 8, '0'),
    'address', format('%s Seed Street, Dhaka', 100 + gs),
    'city', 'Dhaka',
    'country', 'Bangladesh'
  ),
  jsonb_build_object(
    'name', format('Customer %s', gs),
    'phone', '017' || lpad(gs::text, 8, '0'),
    'address', format('%s Seed Street, Dhaka', 100 + gs),
    'city', 'Dhaka',
    'country', 'Bangladesh'
  ),
  format('Seed pending order #%s', gs),
  now() - ((gs % 28) || ' days')::interval - ((gs % 24) || ' hours')::interval
FROM generate_series(1, 60) AS gs;



-- Commit the transaction
COMMIT;

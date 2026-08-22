-- ============================================================
-- 004) Seed: default load groups, load items and calculator meta
-- ============================================================
-- Run AFTER 003-load-calculator-projects-schema.sql.
-- Safe to re-run: inserts are keyed on slug / key and skip duplicates.
-- Default load unit  : Watt (W)
-- Default backup unit: Hour (h)
-- ============================================================

BEGIN;
SET client_encoding = 'UTF8';

-- ------------------------------------------------------------
-- 1) Load groups (all in Watt)
-- ------------------------------------------------------------
INSERT INTO load_groups (name, slug, unit_name, unit_symbol, sort_order, is_active)
VALUES
  ('Lights',                 'lights',                 'Watt', 'W', 1, TRUE),
  ('Home Appliances',        'home-appliances',        'Watt', 'W', 2, TRUE),
  ('Kitchen Appliances',     'kitchen-appliances',     'Watt', 'W', 3, TRUE),
  ('Heavy Load Appliances',  'heavy-load-appliances',  'Watt', 'W', 4, TRUE),
  ('Accessories',            'accessories',            'Watt', 'W', 5, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 2) Load items
--    icon holds a lucide-style icon key; swap for an image url
--    from the admin UI at any time.
-- ------------------------------------------------------------
WITH seed(group_slug, name, icon, unit_value, sort_order) AS (
  VALUES
    -- Lights
    ('lights', 'LED Bulb ( 5W )',   'lightbulb',    5,   1),
    ('lights', 'LED Bulb ( 10W )',  'lightbulb',    10,  2),
    ('lights', 'LED Bulb ( 15W )',  'lightbulb',    15,  3),
    ('lights', 'Tubelight',         'lamp-ceiling', 45,  4),
    ('lights', 'Incandescent Bulb', 'lightbulb',    30,  5),
    ('lights', 'Table Lamp',        'lamp-desk',    60,  6),
    ('lights', 'Panel Lights',      'square',       14,  7),

    -- Home Appliances
    ('home-appliances', 'Ceiling Fan',      'fan',          75,   1),
    ('home-appliances', 'Table Fan',        'fan',          50,   2),
    ('home-appliances', 'Exhaust Fan',      'fan',          40,   3),
    ('home-appliances', 'Television (LED)', 'tv',           100,  4),
    ('home-appliances', 'Laptop',           'laptop',       65,   5),
    ('home-appliances', 'Desktop Computer', 'monitor',      200,  6),
    ('home-appliances', 'Wi-Fi Router',     'router',       15,   7),
    ('home-appliances', 'Mobile Charger',   'smartphone',   10,   8),
    ('home-appliances', 'Refrigerator',     'refrigerator', 200,  9),
    ('home-appliances', 'Washing Machine',  'washing-machine', 500, 10),
    ('home-appliances', 'Iron',             'shirt',        1000, 11),
    ('home-appliances', 'Water Pump',       'droplets',     750,  12),

    -- Kitchen Appliances
    ('kitchen-appliances', 'Microwave Oven',  'microwave',   1200, 1),
    ('kitchen-appliances', 'Electric Kettle', 'coffee',      1500, 2),
    ('kitchen-appliances', 'Blender',         'blend',       400,  3),
    ('kitchen-appliances', 'Rice Cooker',     'cooking-pot', 700,  4),
    ('kitchen-appliances', 'Toaster',         'sandwich',    850,  5),
    ('kitchen-appliances', 'Coffee Maker',    'coffee',      900,  6),
    ('kitchen-appliances', 'Induction Cooker','flame',       2000, 7),

    -- Heavy Load Appliances
    ('heavy-load-appliances', 'Air Conditioner ( 1 Ton )',   'air-vent', 1200, 1),
    ('heavy-load-appliances', 'Air Conditioner ( 1.5 Ton )', 'air-vent', 1800, 2),
    ('heavy-load-appliances', 'Air Conditioner ( 2 Ton )',   'air-vent', 2400, 3),
    ('heavy-load-appliances', 'Water Heater / Geyser',       'shower-head', 2000, 4),
    ('heavy-load-appliances', 'Deep Freezer',                'refrigerator', 350, 5),
    ('heavy-load-appliances', 'Submersible Pump',            'droplets', 1500, 6),
    ('heavy-load-appliances', 'Welding Machine',             'zap',      3000, 7),

    -- Accessories
    ('accessories', 'Extension Board',   'plug',    5,   1),
    ('accessories', 'CCTV Camera',       'cctv',    15,  2),
    ('accessories', 'Doorbell',          'bell',    10,  3),
    ('accessories', 'Air Purifier',      'wind',    50,  4),
    ('accessories', 'Sewing Machine',    'scissors',100, 5),
    ('accessories', 'Vacuum Cleaner',    'wind',    800, 6)
)
INSERT INTO load_items (load_group_id, name, icon, unit_value, sort_order, is_active)
SELECT g.id, s.name, s.icon, s.unit_value, s.sort_order, TRUE
FROM seed s
JOIN load_groups g ON g.slug = s.group_slug
WHERE NOT EXISTS (
  SELECT 1 FROM load_items li
  WHERE li.load_group_id = g.id AND li.name = s.name
);

-- ------------------------------------------------------------
-- 3) Calculator meta field: Average Daily Backup (Hrs)
--    Slider, 1h .. 10h, default 5h — matching the public UI.
-- ------------------------------------------------------------
INSERT INTO calculator_meta_fields (
  key, label, help_text, field_type,
  unit_name, unit_symbol,
  min_value, max_value, step_value, default_number,
  is_numeric, is_required, sort_order, is_active
)
VALUES (
  'backup_hours',
  'Average Daily Backup (Hrs)',
  'Get product suggestions as per your required backup power. Choose your estimates below.',
  'slider',
  'Hour', 'h',
  1, 10, 1, 5,
  TRUE, TRUE, 1, TRUE
)
ON CONFLICT (key) DO NOTHING;

COMMIT;

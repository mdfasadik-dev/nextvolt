-- Seed Delivery

INSERT INTO delivery (label, amount, sort_order, is_default, is_active, metadata)
VALUES
  ('Inside Dhaka', 60.00, 1, TRUE,  TRUE,  '{"zone": "inside"}'::jsonb),
  ('Outside Dhaka', 120.00, 2, FALSE, TRUE, '{"zone": "outside"}'::jsonb),
  ('Store Pickup', 0.00, 3, FALSE, TRUE, '{"type": "pickup"}'::jsonb),
  ('Legacy Disabled Delivery', 80.00, 99, FALSE, FALSE, '{"deprecated": true}'::jsonb);

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
  'https://images.unsplash.com/photo-1543352634-873f17a7a088?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1543352634-873f17a7a088?auto=format&fit=crop&w=800&q=80',
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



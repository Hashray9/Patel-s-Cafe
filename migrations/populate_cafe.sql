-- ==============================================================================
-- ☕ PATEL'S CAFE: SEED SCRIPT FOR THE 'patel-cafe-main' CAFE
-- Paste and run in Supabase Dashboard -> SQL Editor, AFTER schema.sql (fresh DB)
-- or migrations/004_multi_tenant.sql (existing DB). Safe to re-run.
--
-- New cafes do NOT need this: owners create their cafe from the app's
-- "Register your cafe" screen and add tables / menu items themselves.
-- ==============================================================================

-- 1. Create / Register the Cafe Workspace
INSERT INTO cafes (id, name)
VALUES ('patel-cafe-main', 'Patel''s Cafe')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Make these accounts OWNERS of this cafe (they must already exist in Auth)
INSERT INTO user_roles (user_id, role, cafe_id, email)
SELECT id, 'owner', 'patel-cafe-main', email
FROM auth.users
WHERE email IN ('hashraykumbhani@gmail.com', 'hashraykumbhanivip@gmail.com')
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role,
    cafe_id = EXCLUDED.cafe_id,
    email = EXCLUDED.email;

-- 3. Store Settings (one row per cafe)
INSERT INTO settings (cafe_id, store_name, tax_rate, currency)
VALUES ('patel-cafe-main', 'Patel Sandwichwala', 0.05, '₹')
ON CONFLICT (cafe_id) DO UPDATE
SET store_name = EXCLUDED.store_name,
    tax_rate = EXCLUDED.tax_rate,
    currency = EXCLUDED.currency;

-- 4. Floor Plan Tables
INSERT INTO tables (id, number, capacity, status, timer_start, is_outdoor, cafe_id)
VALUES
  ('t-1', 'T-1', 4, 'available', NULL, FALSE, 'patel-cafe-main'),
  ('t-2', 'T-2', 2, 'available', NULL, FALSE, 'patel-cafe-main'),
  ('t-3', 'T-3', 6, 'available', NULL, FALSE, 'patel-cafe-main'),
  ('t-4', 'T-4', 2, 'available', NULL, FALSE, 'patel-cafe-main'),
  ('t-5', 'T-5', 4, 'available', NULL, FALSE, 'patel-cafe-main'),
  ('t-6', 'T-6', 2, 'available', NULL, FALSE, 'patel-cafe-main')
ON CONFLICT (id) DO UPDATE
SET number = EXCLUDED.number,
    capacity = EXCLUDED.capacity,
    is_outdoor = EXCLUDED.is_outdoor,
    cafe_id = EXCLUDED.cafe_id;

-- 5. All 101 Menu Items
INSERT INTO menu_items (id, name, price, category, is_available, dietary, image, cafe_id)
VALUES
  ('m-1', 'Bread Butter (Normal)', 50.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-2', 'Bread Butter (Grill)', 70.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-3', 'Vegitable (Normal)', 60.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-4', 'Vegitable (Grill)', 80.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-5', 'Aloo Matar (Normal)', 60.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-6', 'Aloo Matar (Grill)', 80.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-7', 'Aloo Veg. Mix (Normal)', 90.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-8', 'Aloo Veg. Mix (Grill)', 110.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-9', 'Butter Chatani (Normal)', 50.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-10', 'Butter Chatani (Grill)', 70.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-11', 'Cheese (Normal)', 100.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-12', 'Cheese (Grill)', 120.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-13', 'Cheese Jam', 110.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-14', 'Cheese Chatani (Normal)', 110.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-15', 'Cheese Chatani (Grill)', 130.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-16', 'Vegitable Cheese (Normal)', 110.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-17', 'Vegitable Cheese (Grill)', 130.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-18', 'Aloo Mater Cheese (Normal)', 110.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-19', 'Aloo Mater Cheese (Grill)', 130.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-20', 'Butter Jam', 50.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-21', 'Chocolate', 60.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-22', 'Chocolate Cheese', 110.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-23', 'Rabadi', 60.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-24', 'Cheese Rabadi', 110.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-25', 'Chocolate Rabadi', 70.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-26', 'Chocolate Cheese Rabadi', 120.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-27', 'Three In One (Aloo,Veg,Cheese)', 170.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.webp', 'patel-cafe-main'),
  ('m-28', 'Boss', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-29', 'Nam Karan', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-30', 'Peri Peri', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-31', 'Paneer Tandoori', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-32', 'Ghughara', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-33', 'Patel Special', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.webp', 'patel-cafe-main'),
  ('m-34', 'Butter Slice', 20.00, 'slice', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-35', 'Sing Sev Slice', 30.00, 'slice', TRUE, '{}', '/images/cheese_slice.webp', 'patel-cafe-main'),
  ('m-36', 'Cheese Slice', 50.00, 'slice', TRUE, '{}', '/images/cheese_slice.webp', 'patel-cafe-main'),
  ('m-37', 'Jam Slice', 30.00, 'slice', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-38', 'Cheese Jam Slice', 60.00, 'slice', TRUE, '{}', '/images/cheese_slice.webp', 'patel-cafe-main'),
  ('m-39', 'Cheese Chatani Slice', 60.00, 'slice', TRUE, '{}', '/images/cheese_slice.webp', 'patel-cafe-main'),
  ('m-40', 'Chocolate Slice', 35.00, 'slice', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-41', 'Chocolate Cheese Slice', 60.00, 'slice', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-42', 'Rabadi Slice', 35.00, 'slice', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-43', 'Cheese Rabadi Slice', 60.00, 'slice', TRUE, '{}', '/images/chocolate_sandwich.webp', 'patel-cafe-main'),
  ('m-44', 'Italian Pizza', 130.00, 'pizza', TRUE, '{}', '/images/margherita_pizza.webp', 'patel-cafe-main'),
  ('m-45', 'Double Cheese Italian Pizza', 160.00, 'pizza', TRUE, '{}', '/images/margherita_pizza.webp', 'patel-cafe-main'),
  ('m-46', 'Margherita Pizza', 160.00, 'pizza', TRUE, '{}', '/images/margherita_pizza.webp', 'patel-cafe-main'),
  ('m-47', 'Double Cheese Margherita Pizza', 210.00, 'pizza', TRUE, '{}', '/images/margherita_pizza.webp', 'patel-cafe-main'),
  ('m-48', 'Paneer Pizza', 240.00, 'pizza', TRUE, '{}', '/images/paneer_pizza.webp', 'patel-cafe-main'),
  ('m-49', 'Cheese Chili Toast', 110.00, 'pizza', TRUE, '{}', '/images/paneer_pizza.webp', 'patel-cafe-main'),
  ('m-50', 'Masala Maggi (Normal)', 80.00, 'maggi', TRUE, '{}', '/images/masala_maggi.webp', 'patel-cafe-main'),
  ('m-51', 'Masala Maggi (Cheese)', 120.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.webp', 'patel-cafe-main'),
  ('m-52', 'Butter Masala Maggi (Normal)', 90.00, 'maggi', TRUE, '{}', '/images/masala_maggi.webp', 'patel-cafe-main'),
  ('m-53', 'Butter Masala Maggi (Cheese)', 130.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.webp', 'patel-cafe-main'),
  ('m-54', 'Veg. Masala Maggi (Normal)', 100.00, 'maggi', TRUE, '{}', '/images/masala_maggi.webp', 'patel-cafe-main'),
  ('m-55', 'Veg. Masala Maggi (Cheese)', 140.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.webp', 'patel-cafe-main'),
  ('m-56', 'Veg. Butter Masala Maggi (Normal)', 110.00, 'maggi', TRUE, '{}', '/images/masala_maggi.webp', 'patel-cafe-main'),
  ('m-57', 'Veg. Butter Masala Maggi (Cheese)', 150.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.webp', 'patel-cafe-main'),
  ('m-58', 'Bhurji Masala Maggi (Cheese)', 160.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.webp', 'patel-cafe-main'),
  ('m-59', 'Veg. Bhurji Masala Maggi (Cheese)', 170.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.webp', 'patel-cafe-main'),
  ('m-60', 'Kaju Anjeer Milkshake', 250.00, 'milkshake', TRUE, '{}', '/images/kaju_anjeer_milkshake.webp', 'patel-cafe-main'),
  ('m-61', 'Bournvita Milkshake', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.webp', 'patel-cafe-main'),
  ('m-62', 'Oreo Milkshake', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.webp', 'patel-cafe-main'),
  ('m-63', 'Kitkat Milkshake', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.webp', 'patel-cafe-main'),
  ('m-64', 'Cold Coffee', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.webp', 'patel-cafe-main'),
  ('m-65', 'Chocolate Milkshake', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.webp', 'patel-cafe-main'),
  ('m-66', 'Rose Milkshake', 110.00, 'milkshake', TRUE, '{}', '/images/milkshake_strawberry.webp', 'patel-cafe-main'),
  ('m-67', 'Venila Milkshake', 110.00, 'milkshake', TRUE, '{}', '/images/milkshake_strawberry.webp', 'patel-cafe-main'),
  ('m-68', 'Strawberry Milkshake', 110.00, 'milkshake', TRUE, '{}', '/images/milkshake_strawberry.webp', 'patel-cafe-main'),
  ('m-69', 'Veg. Puff (Normal)', 30.00, 'puff', TRUE, '{}', '/images/veg_puff.webp', 'patel-cafe-main'),
  ('m-70', 'Veg. Puff (Cheese)', 70.00, 'puff', TRUE, '{}', '/images/veg_puff.webp', 'patel-cafe-main'),
  ('m-71', 'Mayo Puff (Normal)', 45.00, 'puff', TRUE, '{}', '/images/veg_puff.webp', 'patel-cafe-main'),
  ('m-72', 'Mayo Puff (Cheese)', 80.00, 'puff', TRUE, '{}', '/images/veg_puff.webp', 'patel-cafe-main'),
  ('m-73', 'Special Mayo Puff (Normal)', 70.00, 'puff', TRUE, '{}', '/images/veg_puff.webp', 'patel-cafe-main'),
  ('m-74', 'Special Mayo Puff (Cheese)', 100.00, 'puff', TRUE, '{}', '/images/veg_puff.webp', 'patel-cafe-main'),
  ('m-75', 'Bhel', 90.00, 'bhel', TRUE, '{}', '/images/bhel.webp', 'patel-cafe-main'),
  ('m-76', 'Cheese Bhel', 130.00, 'bhel', TRUE, '{}', '/images/bhel.webp', 'patel-cafe-main'),
  ('m-77', 'Salted French Fries', 110.00, 'fries', TRUE, '{}', '/images/french_fries.webp', 'patel-cafe-main'),
  ('m-78', 'Peri Peri French Fries', 120.00, 'fries', TRUE, '{}', '/images/french_fries.webp', 'patel-cafe-main'),
  ('m-79', 'Mayo French Fries', 150.00, 'fries', TRUE, '{}', '/images/french_fries.webp', 'patel-cafe-main'),
  ('m-80', 'Aloo Tikki Burger (Normal)', 80.00, 'burger', TRUE, '{}', '/images/burger.webp', 'patel-cafe-main'),
  ('m-81', 'Aloo Tikki Burger (Cheese)', 110.00, 'burger', TRUE, '{}', '/images/burger.webp', 'patel-cafe-main'),
  ('m-82', 'Cryspy Veg. Burger (Normal)', 90.00, 'burger', TRUE, '{}', '/images/burger.webp', 'patel-cafe-main'),
  ('m-83', 'Cryspy Veg. Burger (Cheese)', 120.00, 'burger', TRUE, '{}', '/images/burger.webp', 'patel-cafe-main'),
  ('m-84', 'Mexican Burger (Normal)', 110.00, 'burger', TRUE, '{}', '/images/burger.webp', 'patel-cafe-main'),
  ('m-85', 'Mexican Burger (Cheese)', 130.00, 'burger', TRUE, '{}', '/images/burger.webp', 'patel-cafe-main'),
  ('m-86', 'Tandoori Burger (Normal)', 110.00, 'burger', TRUE, '{}', '/images/burger.webp', 'patel-cafe-main'),
  ('m-87', 'Tandoori Burger (Cheese)', 130.00, 'burger', TRUE, '{}', '/images/burger.webp', 'patel-cafe-main'),
  ('m-88', 'Tea', 25.00, 'tea-coffee', TRUE, '{}', '/images/tea_coffee.webp', 'patel-cafe-main'),
  ('m-89', 'Coffee', 30.00, 'tea-coffee', TRUE, '{}', '/images/tea_coffee.webp', 'patel-cafe-main'),
  ('m-90', 'Hot Bournvita', 50.00, 'tea-coffee', TRUE, '{}', '/images/tea_coffee.webp', 'patel-cafe-main'),
  ('m-91', 'Thepla (4 pcs)', 60.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-92', 'Butter thepla (4 pcs)', 80.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-93', 'Special Cheese Mayo thepla', 120.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-94', 'Aloo Paratha (Dahi)', 110.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-95', 'Butter Aloo Paratha (Dahi)', 130.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-96', 'Cheese Aloo Paratha (Dahi)', 150.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-97', 'Cheese Butter Aloo Paratha (Dahi)', 170.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-98', 'Masala Khichadi (Dahi)', 160.00, 'extra', TRUE, '{}', '/images/bhel.webp', 'patel-cafe-main'),
  ('m-99', 'Bhakhari', 30.00, 'extra', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-100', 'Dahi', 20.00, 'extra', TRUE, '{}', '/images/butter_slice.webp', 'patel-cafe-main'),
  ('m-101', 'Extra Cheese', 40.00, 'extra', TRUE, '{}', '/images/cheese_slice.webp', 'patel-cafe-main')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    is_available = EXCLUDED.is_available,
    dietary = EXCLUDED.dietary,
    image = EXCLUDED.image,
    cafe_id = EXCLUDED.cafe_id;

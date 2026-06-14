-- SQL Schema Script for Patel's Cafe Database (Supabase / PostgreSQL)

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    store_name TEXT NOT NULL,
    tax_rate NUMERIC NOT NULL,
    currency TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    dietary TEXT[] NOT NULL DEFAULT '{}',
    image TEXT
);

CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'available',
    current_order_id TEXT,
    timer_start BIGINT,
    is_outdoor BOOLEAN NOT NULL DEFAULT FALSE,
    group_id TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_id TEXT NOT NULL,
    table_number TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    timestamp BIGINT NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0.00,
    tax NUMERIC NOT NULL DEFAULT 0.00,
    total NUMERIC NOT NULL DEFAULT 0.00
);

-- 2. Create Indexes for Analytics and Performance Reporting
CREATE INDEX IF NOT EXISTS idx_orders_status_timestamp ON orders (status, timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders (timestamp);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items (category);

-- 3. Seed Default Store Settings (if not already seeded)
INSERT INTO settings (id, store_name, tax_rate, currency)
VALUES (1, 'Patel Sandwichwala', 0.05, '₹')
ON CONFLICT (id) DO UPDATE 
SET store_name = EXCLUDED.store_name,
    tax_rate = EXCLUDED.tax_rate,
    currency = EXCLUDED.currency;

-- 4. Seed Default Seating Tables
INSERT INTO tables (id, number, capacity, status, timer_start, is_outdoor)
VALUES 
  ('t-1', 'T-1', 4, 'available', NULL, FALSE),
  ('t-2', 'T-2', 2, 'available', NULL, FALSE),
  ('t-3', 'T-3', 6, 'available', NULL, FALSE),
  ('t-4', 'T-4', 2, 'available', NULL, FALSE),
  ('t-5', 'T-5', 4, 'available', NULL, FALSE),
  ('t-6', 'T-6', 2, 'available', NULL, FALSE)
ON CONFLICT (number) DO NOTHING;

-- 5. Seed Core Menu Items
INSERT INTO menu_items (id, name, price, category, is_available, dietary, image)
VALUES
  ('m-1', 'Bread Butter (Normal)', 50.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-2', 'Bread Butter (Grill)', 70.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-3', 'Vegitable (Normal)', 60.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-4', 'Vegitable (Grill)', 80.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-5', 'Aloo Matar (Normal)', 60.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-6', 'Aloo Matar (Grill)', 80.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-7', 'Aloo Veg. Mix (Normal)', 90.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-8', 'Aloo Veg. Mix (Grill)', 110.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-9', 'Butter Chatani (Normal)', 50.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-10', 'Butter Chatani (Grill)', 70.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-11', 'Cheese (Normal)', 100.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-12', 'Cheese (Grill)', 120.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-13', 'Cheese Jam', 110.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-14', 'Cheese Chatani (Normal)', 110.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-15', 'Cheese Chatani (Grill)', 130.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-16', 'Vegitable Cheese (Normal)', 110.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-17', 'Vegitable Cheese (Grill)', 130.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-18', 'Aloo Mater Cheese (Normal)', 110.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-19', 'Aloo Mater Cheese (Grill)', 130.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-20', 'Butter Jam', 50.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-21', 'Chocolate', 60.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-22', 'Chocolate Cheese', 110.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-23', 'Rabadi', 60.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-24', 'Cheese Rabadi', 110.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-25', 'Chocolate Rabadi', 70.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-26', 'Chocolate Cheese Rabadi', 120.00, 'sandwich', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-27', 'Three In One (Aloo,Veg,Cheese)', 170.00, 'sandwich', TRUE, '{}', '/images/normal_sandwich.png'),
  ('m-28', 'Boss', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-29', 'Nam Karan', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-30', 'Peri Peri', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-31', 'Paneer Tandoori', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-32', 'Ghughara', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-33', 'Patel Special', 200.00, 'sandwich', TRUE, '{}', '/images/grilled_sandwich.png'),
  ('m-34', 'Butter Slice', 20.00, 'slice', TRUE, '{}', '/images/butter_slice.png'),
  ('m-35', 'Sing Sev Slice', 30.00, 'slice', TRUE, '{}', '/images/cheese_slice.png'),
  ('m-36', 'Cheese Slice', 50.00, 'slice', TRUE, '{}', '/images/cheese_slice.png'),
  ('m-37', 'Jam Slice', 30.00, 'slice', TRUE, '{}', '/images/butter_slice.png'),
  ('m-38', 'Cheese Jam Slice', 60.00, 'slice', TRUE, '{}', '/images/cheese_slice.png'),
  ('m-39', 'Cheese Chatani Slice', 60.00, 'slice', TRUE, '{}', '/images/cheese_slice.png'),
  ('m-40', 'Chocolate Slice', 35.00, 'slice', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-41', 'Chocolate Cheese Slice', 60.00, 'slice', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-42', 'Rabadi Slice', 35.00, 'slice', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-43', 'Cheese Rabadi Slice', 60.00, 'slice', TRUE, '{}', '/images/chocolate_sandwich.png'),
  ('m-44', 'Italian Pizza', 130.00, 'pizza', TRUE, '{}', '/images/margherita_pizza.png'),
  ('m-45', 'Double Cheese Italian Pizza', 160.00, 'pizza', TRUE, '{}', '/images/margherita_pizza.png'),
  ('m-46', 'Margherita Pizza', 160.00, 'pizza', TRUE, '{}', '/images/margherita_pizza.png'),
  ('m-47', 'Double Cheese Margherita Pizza', 210.00, 'pizza', TRUE, '{}', '/images/margherita_pizza.png'),
  ('m-48', 'Paneer Pizza', 240.00, 'pizza', TRUE, '{}', '/images/paneer_pizza.png'),
  ('m-49', 'Cheese Chili Toast', 110.00, 'pizza', TRUE, '{}', '/images/paneer_pizza.png'),
  ('m-50', 'Masala Maggi (Normal)', 80.00, 'maggi', TRUE, '{}', '/images/masala_maggi.png'),
  ('m-51', 'Masala Maggi (Cheese)', 120.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.png'),
  ('m-52', 'Butter Masala Maggi (Normal)', 90.00, 'maggi', TRUE, '{}', '/images/masala_maggi.png'),
  ('m-53', 'Butter Masala Maggi (Cheese)', 130.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.png'),
  ('m-54', 'Veg. Masala Maggi (Normal)', 100.00, 'maggi', TRUE, '{}', '/images/masala_maggi.png'),
  ('m-55', 'Veg. Masala Maggi (Cheese)', 140.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.png'),
  ('m-56', 'Veg. Butter Masala Maggi (Normal)', 110.00, 'maggi', TRUE, '{}', '/images/masala_maggi.png'),
  ('m-57', 'Veg. Butter Masala Maggi (Cheese)', 150.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.png'),
  ('m-58', 'Bhurji Masala Maggi (Cheese)', 160.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.png'),
  ('m-59', 'Veg. Bhurji Masala Maggi (Cheese)', 170.00, 'maggi', TRUE, '{}', '/images/cheese_maggi.png'),
  ('m-60', 'Kaju Anjeer Milkshake', 250.00, 'milkshake', TRUE, '{}', '/images/kaju_anjeer_milkshake.png'),
  ('m-61', 'Bournvita Milkshake', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.png'),
  ('m-62', 'Oreo Milkshake', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.png'),
  ('m-63', 'Kitkat Milkshake', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.png'),
  ('m-64', 'Cold Coffee', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.png'),
  ('m-65', 'Chocolate Milkshake', 130.00, 'milkshake', TRUE, '{}', '/images/milkshake_chocolate.png'),
  ('m-66', 'Rose Milkshake', 110.00, 'milkshake', TRUE, '{}', '/images/milkshake_strawberry.png'),
  ('m-67', 'Venila Milkshake', 110.00, 'milkshake', TRUE, '{}', '/images/milkshake_strawberry.png'),
  ('m-68', 'Strawberry Milkshake', 110.00, 'milkshake', TRUE, '{}', '/images/milkshake_strawberry.png'),
  ('m-69', 'Veg. Puff (Normal)', 30.00, 'puff', TRUE, '{}', '/images/veg_puff.png'),
  ('m-70', 'Veg. Puff (Cheese)', 70.00, 'puff', TRUE, '{}', '/images/veg_puff.png'),
  ('m-71', 'Mayo Puff (Normal)', 45.00, 'puff', TRUE, '{}', '/images/veg_puff.png'),
  ('m-72', 'Mayo Puff (Cheese)', 80.00, 'puff', TRUE, '{}', '/images/veg_puff.png'),
  ('m-73', 'Special Mayo Puff (Normal)', 70.00, 'puff', TRUE, '{}', '/images/veg_puff.png'),
  ('m-74', 'Special Mayo Puff (Cheese)', 100.00, 'puff', TRUE, '{}', '/images/veg_puff.png'),
  ('m-75', 'Bhel', 90.00, 'bhel', TRUE, '{}', '/images/bhel.png'),
  ('m-76', 'Cheese Bhel', 130.00, 'bhel', TRUE, '{}', '/images/bhel.png'),
  ('m-77', 'Salted French Fries', 110.00, 'fries', TRUE, '{}', '/images/french_fries.png'),
  ('m-78', 'Peri Peri French Fries', 120.00, 'fries', TRUE, '{}', '/images/french_fries.png'),
  ('m-79', 'Mayo French Fries', 150.00, 'fries', TRUE, '{}', '/images/french_fries.png'),
  ('m-80', 'Aloo Tikki Burger (Normal)', 80.00, 'burger', TRUE, '{}', '/images/burger.png'),
  ('m-81', 'Aloo Tikki Burger (Cheese)', 110.00, 'burger', TRUE, '{}', '/images/burger.png'),
  ('m-82', 'Cryspy Veg. Burger (Normal)', 90.00, 'burger', TRUE, '{}', '/images/burger.png'),
  ('m-83', 'Cryspy Veg. Burger (Cheese)', 120.00, 'burger', TRUE, '{}', '/images/burger.png'),
  ('m-84', 'Mexican Burger (Normal)', 110.00, 'burger', TRUE, '{}', '/images/burger.png'),
  ('m-85', 'Mexican Burger (Cheese)', 130.00, 'burger', TRUE, '{}', '/images/burger.png'),
  ('m-86', 'Tandoori Burger (Normal)', 110.00, 'burger', TRUE, '{}', '/images/burger.png'),
  ('m-87', 'Tandoori Burger (Cheese)', 130.00, 'burger', TRUE, '{}', '/images/burger.png'),
  ('m-88', 'Tea', 25.00, 'tea-coffee', TRUE, '{}', '/images/tea_coffee.png'),
  ('m-89', 'Coffee', 30.00, 'tea-coffee', TRUE, '{}', '/images/tea_coffee.png'),
  ('m-90', 'Hot Bournvita', 50.00, 'tea-coffee', TRUE, '{}', '/images/tea_coffee.png'),
  ('m-91', 'Thepla (4 pcs)', 60.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.png'),
  ('m-92', 'Butter thepla (4 pcs)', 80.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.png'),
  ('m-93', 'Special Cheese Mayo thepla', 120.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.png'),
  ('m-94', 'Aloo Paratha (Dahi)', 110.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.png'),
  ('m-95', 'Butter Aloo Paratha (Dahi)', 130.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.png'),
  ('m-96', 'Cheese Aloo Paratha (Dahi)', 150.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.png'),
  ('m-97', 'Cheese Butter Aloo Paratha (Dahi)', 170.00, 'thepla-paratha', TRUE, '{}', '/images/butter_slice.png'),
  ('m-98', 'Masala Khichadi (Dahi)', 160.00, 'extra', TRUE, '{}', '/images/bhel.png'),
  ('m-99', 'Bhakhari', 30.00, 'extra', TRUE, '{}', '/images/butter_slice.png'),
  ('m-100', 'Dahi', 20.00, 'extra', TRUE, '{}', '/images/butter_slice.png'),
  ('m-101', 'Extra Cheese', 40.00, 'extra', TRUE, '{}', '/images/cheese_slice.png')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    price = EXCLUDED.price,
    category = EXCLUDED.category,
    is_available = EXCLUDED.is_available,
    dietary = EXCLUDED.dietary,
    image = EXCLUDED.image;

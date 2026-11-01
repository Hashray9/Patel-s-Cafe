-- Migration: Multi-Cafe Support & Cook Invitations
-- Run this in Supabase SQL Editor

-- 1. Create cafes table
CREATE TABLE IF NOT EXISTS cafes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert default cafe for existing data
INSERT INTO cafes (id, name) VALUES ('patel-cafe-main', 'Patel''s Cafe')
ON CONFLICT (id) DO NOTHING;

-- 3. Add cafe_id column to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS cafe_id TEXT REFERENCES cafes(id);
UPDATE user_roles SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;

-- 4. Add cafe_id column to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cafe_id TEXT REFERENCES cafes(id);
UPDATE settings SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;

-- 5. Add cafe_id column to tables
ALTER TABLE tables ADD COLUMN IF NOT EXISTS cafe_id TEXT REFERENCES cafes(id);
UPDATE tables SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;

-- 6. Add cafe_id column to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS cafe_id TEXT REFERENCES cafes(id);
UPDATE menu_items SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;

-- 7. Add cafe_id column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cafe_id TEXT REFERENCES cafes(id);
UPDATE orders SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;

-- 8. Add index on cafe_id for fast filtering
CREATE INDEX IF NOT EXISTS idx_tables_cafe_id ON tables(cafe_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_cafe_id ON menu_items(cafe_id);
CREATE INDEX IF NOT EXISTS idx_orders_cafe_id ON orders(cafe_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_cafe_id ON user_roles(cafe_id);


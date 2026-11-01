-- Migration: Add user_roles table for multi-role support (counter + cook)
-- Run this in Supabase SQL Editor

-- 1. Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('counter', 'cook')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Allow authenticated users to read their own role (via service key from backend)
CREATE POLICY "Service role can manage all roles" ON user_roles
  FOR ALL USING (true);

-- 4. Enable Realtime on orders table so cook sees new orders instantly
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- 5. Enable Realtime on tables so counter sees table status changes
ALTER PUBLICATION supabase_realtime ADD TABLE tables;

-- =====================================================
-- IMPORTANT: After running this migration, create two 
-- Supabase Auth users and assign their roles below.
-- 
-- Example: If you create counter@patelcafe.com and cook@patelcafe.com,
-- get their user IDs from Supabase Auth → Users, then run:
--
-- INSERT INTO user_roles (user_id, role) VALUES
--   ('COUNTER_USER_UUID_HERE', 'counter'),
--   ('COOK_USER_UUID_HERE', 'cook');
-- =====================================================


-- ============================================================================
-- Migration 004: Strict multi-cafe isolation + owner/counter/cook roles
--
-- Run ONCE in the Supabase SQL Editor on a database that already has
-- migrations 002 and 003 applied. Safe to re-run (idempotent).
--
-- What it does:
--   * Every row of tables / menu_items / orders / settings / user_roles must
--     belong to a cafe (cafe_id NOT NULL). Orphan rows go to 'patel-cafe-main'.
--   * Settings become one row PER cafe (was a single global row).
--   * Table numbers are unique per cafe (was globally unique).
--   * Roles: owner | counter | cook. Existing counters are promoted to owner
--     (they previously had full rights, so nothing is lost).
--   * Row Level Security: signed-in users can only SELECT rows of their own
--     cafe (this is what scopes Supabase Realtime). No client writes at all —
--     every write goes through the API using the service-role key.
--   * Helper functions used by the API (create_cafe, find_auth_user_by_email).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Make sure the default cafe exists and backfill orphan rows into it
-- ----------------------------------------------------------------------------
INSERT INTO cafes (id, name) VALUES ('patel-cafe-main', 'Patel''s Cafe')
ON CONFLICT (id) DO NOTHING;

UPDATE tables     SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;
UPDATE menu_items SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;
UPDATE orders     SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;
UPDATE settings   SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;
UPDATE user_roles SET cafe_id = 'patel-cafe-main' WHERE cafe_id IS NULL;

-- ----------------------------------------------------------------------------
-- 2. cafe_id is mandatory and cascades when a cafe is deleted
-- ----------------------------------------------------------------------------
ALTER TABLE tables     ALTER COLUMN cafe_id SET NOT NULL;
ALTER TABLE menu_items ALTER COLUMN cafe_id SET NOT NULL;
ALTER TABLE orders     ALTER COLUMN cafe_id SET NOT NULL;
ALTER TABLE settings   ALTER COLUMN cafe_id SET NOT NULL;
ALTER TABLE user_roles ALTER COLUMN cafe_id SET NOT NULL;

ALTER TABLE tables     DROP CONSTRAINT IF EXISTS tables_cafe_id_fkey,
  ADD CONSTRAINT tables_cafe_id_fkey     FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE;
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_cafe_id_fkey,
  ADD CONSTRAINT menu_items_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE;
ALTER TABLE orders     DROP CONSTRAINT IF EXISTS orders_cafe_id_fkey,
  ADD CONSTRAINT orders_cafe_id_fkey     FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE;
ALTER TABLE settings   DROP CONSTRAINT IF EXISTS settings_cafe_id_fkey,
  ADD CONSTRAINT settings_cafe_id_fkey   FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_cafe_id_fkey,
  ADD CONSTRAINT user_roles_cafe_id_fkey FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 3. Roles: owner | counter | cook, and store the member's email for listing
-- ----------------------------------------------------------------------------
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
UPDATE user_roles SET role = 'owner' WHERE role = 'counter';
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('owner', 'counter', 'cook'));

ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS email TEXT;
UPDATE user_roles ur SET email = u.email
FROM auth.users u
WHERE u.id = ur.user_id AND ur.email IS NULL;

-- Removing an auth user removes their membership too
DELETE FROM user_roles ur WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ur.user_id);
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
  ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 4. Settings: one row per cafe
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_cafe_id_key') THEN
    ALTER TABLE settings ADD CONSTRAINT settings_cafe_id_key UNIQUE (cafe_id);
  END IF;
END $$;

-- Row id=1 was inserted with an explicit id, so the serial sequence may lag behind
SELECT setval(pg_get_serial_sequence('settings', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM settings), 1));

-- Every cafe gets a settings row
INSERT INTO settings (cafe_id, store_name, tax_rate, currency)
SELECT c.id, c.name, 0.05, '₹' FROM cafes c
WHERE NOT EXISTS (SELECT 1 FROM settings s WHERE s.cafe_id = c.id);

-- ----------------------------------------------------------------------------
-- 5. Table numbers unique PER CAFE (case-insensitive), not globally
-- ----------------------------------------------------------------------------
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.tables'::regclass
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute
                              WHERE attrelid = 'public.tables'::regclass AND attname = 'number')]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.tables DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tables_cafe_number_key ON tables (cafe_id, lower(number));

-- ----------------------------------------------------------------------------
-- 6. Indexes for cafe-scoped queries
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_cafe_status_ts ON orders (cafe_id, status, timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_cafe_ts        ON orders (cafe_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tables_cafe_order     ON tables (cafe_id, current_order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_cafe_cat   ON menu_items (cafe_id, category);

-- ----------------------------------------------------------------------------
-- 7. Helper functions
-- ----------------------------------------------------------------------------

-- Cafe of the currently signed-in user (used by RLS policies)
CREATE OR REPLACE FUNCTION public.my_cafe_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cafe_id FROM public.user_roles WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_cafe_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_cafe_id() TO authenticated, service_role;

-- Atomically create a cafe, its settings and its first owner (API only)
CREATE OR REPLACE FUNCTION public.create_cafe(p_cafe_id text, p_name text, p_user_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO cafes (id, name) VALUES (p_cafe_id, p_name);
  INSERT INTO settings (cafe_id, store_name, tax_rate, currency) VALUES (p_cafe_id, p_name, 0.05, '₹');
  INSERT INTO user_roles (user_id, role, cafe_id, email) VALUES (p_user_id, 'owner', p_cafe_id, p_email);
END
$$;
REVOKE ALL ON FUNCTION public.create_cafe(text, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_cafe(text, text, uuid, text) TO service_role;

-- Look up an existing auth account by email (API only, for staff invites)
CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(p_email text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(text) TO service_role;

-- ----------------------------------------------------------------------------
-- 8. Row Level Security — read-only, own cafe only. Drops every old policy
--    (including the permissive "Service role can manage all roles" one from 002).
-- ----------------------------------------------------------------------------
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('cafes', 'user_roles', 'settings', 'tables', 'menu_items', 'orders')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE cafes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;

CREATE POLICY cafes_select_own      ON cafes      FOR SELECT TO authenticated USING (id = public.my_cafe_id());
CREATE POLICY user_roles_select_own ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY settings_select_own   ON settings   FOR SELECT TO authenticated USING (cafe_id = public.my_cafe_id());
CREATE POLICY tables_select_own     ON tables     FOR SELECT TO authenticated USING (cafe_id = public.my_cafe_id());
CREATE POLICY menu_items_select_own ON menu_items FOR SELECT TO authenticated USING (cafe_id = public.my_cafe_id());
CREATE POLICY orders_select_own     ON orders     FOR SELECT TO authenticated USING (cafe_id = public.my_cafe_id());

-- ----------------------------------------------------------------------------
-- 9. Realtime on orders + tables (RLS above limits events to the user's cafe)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tables') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
  END IF;
END $$;

COMMIT;

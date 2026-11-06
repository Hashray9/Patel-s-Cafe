-- ============================================================================
-- Patel's Cafe — full schema for a FRESH Supabase project (multi-cafe).
--
-- Existing databases: do NOT run this; run the numbered files in migrations/ in order.
-- No seed data here — cafes are created by owners through the app's sign-up.
-- To load the Patel's Cafe demo menu into a cafe, see migrations/populate_cafe.sql.
--
-- Isolation model:
--   * Every row belongs to exactly one cafe (cafe_id NOT NULL).
--   * Each auth user belongs to at most one cafe, with role owner | counter | cook.
--   * Browsers may only SELECT rows of their own cafe (RLS), and may only join
--     the Realtime Broadcast topic of their own cafe (cafe:<cafe_id>).
--   * All writes go through the API (Cloudflare Worker) with the service-role key.
-- ============================================================================

-- 1. Tables -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cafes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CONSTRAINT user_roles_role_check CHECK (role IN ('owner', 'counter', 'cook')),
    cafe_id TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    cafe_id TEXT NOT NULL CONSTRAINT settings_cafe_id_key UNIQUE REFERENCES cafes(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    tax_rate NUMERIC NOT NULL,
    currency TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    cafe_id TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    dietary TEXT[] NOT NULL DEFAULT '{}',
    image TEXT
);

CREATE TABLE IF NOT EXISTS tables (
    id TEXT PRIMARY KEY,
    cafe_id TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'available',
    current_order_id TEXT,
    timer_start BIGINT,
    is_outdoor BOOLEAN NOT NULL DEFAULT FALSE,
    group_id TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    cafe_id TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    table_id TEXT NOT NULL,
    table_number TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    timestamp BIGINT NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0.00,
    tax NUMERIC NOT NULL DEFAULT 0.00,
    total NUMERIC NOT NULL DEFAULT 0.00
);

-- 2. Indexes ------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS tables_cafe_number_key ON tables (cafe_id, lower(number));
CREATE INDEX IF NOT EXISTS idx_orders_cafe_status_ts ON orders (cafe_id, status, timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_cafe_ts        ON orders (cafe_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tables_cafe_order     ON tables (cafe_id, current_order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_cafe_cat   ON menu_items (cafe_id, category);
CREATE INDEX IF NOT EXISTS idx_user_roles_cafe_id    ON user_roles (cafe_id);

-- 3. Helper functions ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_cafe_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cafe_id FROM public.user_roles WHERE user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.my_cafe_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_cafe_id() TO authenticated, service_role;

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

CREATE OR REPLACE FUNCTION public.find_auth_user_by_email(p_email text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_auth_user_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_auth_user_by_email(text) TO service_role;

-- 4. Row Level Security (read own cafe only; no client writes) ----------------
ALTER TABLE cafes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafes_select_own      ON cafes;
DROP POLICY IF EXISTS user_roles_select_own ON user_roles;
DROP POLICY IF EXISTS settings_select_own   ON settings;
DROP POLICY IF EXISTS tables_select_own     ON tables;
DROP POLICY IF EXISTS menu_items_select_own ON menu_items;
DROP POLICY IF EXISTS orders_select_own     ON orders;

CREATE POLICY cafes_select_own      ON cafes      FOR SELECT TO authenticated USING (id = public.my_cafe_id());
CREATE POLICY user_roles_select_own ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY settings_select_own   ON settings   FOR SELECT TO authenticated USING (cafe_id = public.my_cafe_id());
CREATE POLICY tables_select_own     ON tables     FOR SELECT TO authenticated USING (cafe_id = public.my_cafe_id());
CREATE POLICY menu_items_select_own ON menu_items FOR SELECT TO authenticated USING (cafe_id = public.my_cafe_id());
CREATE POLICY orders_select_own     ON orders     FOR SELECT TO authenticated USING (cafe_id = public.my_cafe_id());

-- 5. Realtime -----------------------------------------------------------------
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

-- 6. Realtime Broadcast: instant per-cafe updates (see migrations/005_realtime_broadcast.sql)
--    Clients join the PRIVATE topic cafe:<cafe_id>; only that cafe's members may join.
--    After a fresh install: Dashboard -> Realtime -> Settings -> turn OFF "Allow public access".
-- 6.1 Trigger function ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.broadcast_cafe_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data jsonb;
  payload  jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_data := to_jsonb(OLD);
  ELSE
    row_data := to_jsonb(NEW);
  END IF;

  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'op',    TG_OP,
    'id',    COALESCE(row_data ->> 'id', row_data ->> 'cafe_id')
  );
  -- Orders carry the whole row so the kitchen can render it immediately.
  IF TG_TABLE_NAME = 'orders' AND TG_OP <> 'DELETE' THEN
    payload := payload || jsonb_build_object('record', row_data);
  END IF;

  BEGIN
    PERFORM realtime.send(payload, 'change', 'cafe:' || (row_data ->> 'cafe_id'), true);
  EXCEPTION WHEN OTHERS THEN
    -- A Realtime hiccup must never block saving an order. Screens catch up
    -- through their reconnect / periodic resync.
    RAISE WARNING 'broadcast_cafe_change failed: %', SQLERRM;
  END;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_cafe_change() FROM PUBLIC, anon, authenticated;

-- 6.2 Triggers -----------------------------------------------------------------
DROP TRIGGER IF EXISTS broadcast_orders_change     ON public.orders;
DROP TRIGGER IF EXISTS broadcast_tables_change     ON public.tables;
DROP TRIGGER IF EXISTS broadcast_menu_items_change ON public.menu_items;
DROP TRIGGER IF EXISTS broadcast_settings_change   ON public.settings;

CREATE TRIGGER broadcast_orders_change
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_cafe_change();
CREATE TRIGGER broadcast_tables_change
  AFTER INSERT OR UPDATE OR DELETE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_cafe_change();
CREATE TRIGGER broadcast_menu_items_change
  AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_cafe_change();
CREATE TRIGGER broadcast_settings_change
  AFTER INSERT OR UPDATE OR DELETE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_cafe_change();

-- 6.3 Who may listen: members of that cafe only --------------------------------
DROP POLICY IF EXISTS cafe_members_receive_broadcasts ON realtime.messages;
CREATE POLICY cafe_members_receive_broadcasts ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
    AND realtime.topic() = 'cafe:' || public.my_cafe_id()
  );

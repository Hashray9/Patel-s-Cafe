-- =============================================================================
-- 005 — Instant per-cafe live updates with Realtime Broadcast
--
-- Problem: the cook/counter screens listened with Supabase "Postgres Changes",
-- which re-checks RLS for every subscriber on every change and stops quietly
-- when that check or the socket auth fails. New orders then only showed up on
-- a manual refresh.
--
-- Fix (Supabase's recommended pattern, "Broadcast from the database"):
--   * An AFTER trigger on orders / tables / menu_items / settings sends one
--     Broadcast message per changed row to the PRIVATE topic  'cafe:<cafe_id>'.
--     Order messages carry the full row so the kitchen can show it at once,
--     without another API request.
--   * An RLS policy on realtime.messages lets a signed-in user join ONLY the
--     topic of their own cafe (my_cafe_id()). Nobody can send on these topics
--     from a browser (there is no INSERT policy).
--   * Realtime checks the policy once when a channel is joined, not for each
--     message, so delivery stays fast.
--
-- Run once in the Supabase SQL Editor. Safe to run again.
-- Then: Dashboard → Realtime → Settings → turn OFF "Allow public access".
-- =============================================================================

-- 1. Trigger function ---------------------------------------------------------
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

-- 2. Triggers -----------------------------------------------------------------
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

-- 3. Who may listen: members of that cafe only --------------------------------
DROP POLICY IF EXISTS cafe_members_receive_broadcasts ON realtime.messages;
CREATE POLICY cafe_members_receive_broadcasts ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.messages.extension = 'broadcast'
    AND realtime.topic() = 'cafe:' || public.my_cafe_id()
  );

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import type { Order, OrderItem } from '../types';

/**
 * Live updates for ONE cafe over Supabase Realtime Broadcast.
 *
 * The database trigger `broadcast_cafe_change` (migrations/005) sends a message
 * to the PRIVATE topic `cafe:<cafeId>` for every changed row of orders, tables,
 * menu_items and settings. An RLS policy on realtime.messages lets an account
 * join only its own cafe's topic, so other cafes' orders never reach this
 * device, whatever channel name a client asks for.
 *
 * Messages can be missed while the socket is down (phone asleep, network drop),
 * so the screen also resyncs from the API:
 *   - every time the channel (re)subscribes,
 *   - when the tab becomes visible again or the device comes back online,
 *   - every POLL_OFFLINE_MS while the live connection is down,
 *   - every POLL_LIVE_MS as a cheap safety net while it is up.
 */

export type LiveTable = 'orders' | 'tables' | 'menu_items' | 'settings';

export interface CafeChange {
  table: LiveTable;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
  /** Full database row (snake_case). Only sent for order inserts and updates. */
  record?: Record<string, unknown>;
}

export type LiveStatus = 'connecting' | 'live' | 'offline';

/** `full` is true after a reconnect or wake-up and false for routine polls. */
export type ResyncHandler = (full: boolean) => void;

const POLL_OFFLINE_MS = 10_000;
const POLL_LIVE_MS = 60_000;

/** Same mapping as `toOrder` in server/worker.js. Keep the two in sync. */
export const orderFromRow = (r: Record<string, unknown>): Order => ({
  id: String(r.id),
  tableId: String(r.table_id),
  tableNumber: String(r.table_number),
  items: Array.isArray(r.items) ? (r.items as OrderItem[]) : [],
  status: r.status as Order['status'],
  timestamp: Number(r.timestamp),
  subtotal: Number(r.subtotal),
  tax: Number(r.tax),
  total: Number(r.total),
});

export function useCafeLive(
  cafeId: string | null,
  handlers: { onChange: (change: CafeChange) => void; onResync: ResyncHandler }
): LiveStatus {
  // Latest handlers without re-subscribing the channel when they change.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  // Status is tagged with the cafe it belongs to, so a cafe switch reads as 'connecting'.
  const [state, setState] = useState<{ cafeId: string | null; status: LiveStatus }>({
    cafeId: null,
    status: 'connecting',
  });
  const status: LiveStatus = state.cafeId === cafeId ? state.status : 'connecting';

  // The cafe channel.
  useEffect(() => {
    if (!cafeId) return;
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    const setStatus = (next: LiveStatus) => {
      if (!disposed) setState({ cafeId, status: next });
    };

    (async () => {
      // Private channels are authorized with the user's JWT, so make sure the
      // socket carries it before joining.
      try {
        await supabase.realtime.setAuth();
      } catch (err) {
        console.warn('Realtime auth failed:', err);
      }
      if (disposed) return;

      channel = supabase
        .channel(`cafe:${cafeId}`, { config: { private: true } })
        .on('broadcast', { event: 'change' }, ({ payload }) => {
          handlersRef.current.onChange(payload as CafeChange);
        })
        .subscribe((s, err) => {
          if (s === 'SUBSCRIBED') {
            setStatus('live');
            // Catch up on anything that changed while we were not subscribed.
            handlersRef.current.onResync(true);
          } else {
            if (err) console.warn(`Realtime channel ${s}:`, err.message);
            // realtime-js rejoins on its own; we poll until it does.
            setStatus('offline');
          }
        });
    })();

    return () => {
      disposed = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [cafeId]);

  // Polling: frequent while disconnected, rare while live.
  useEffect(() => {
    if (!cafeId) return;
    const timer = setInterval(
      () => handlersRef.current.onResync(false),
      status === 'live' ? POLL_LIVE_MS : POLL_OFFLINE_MS
    );
    return () => clearInterval(timer);
  }, [cafeId, status]);

  // Wake-ups: phone unlocked, tab shown again, network back.
  useEffect(() => {
    if (!cafeId) return;
    const wake = () => {
      if (document.visibilityState !== 'visible') return;
      // A socket that died while asleep is only noticed at the next heartbeat;
      // reconnect right away instead.
      if (!supabase.realtime.isConnected()) supabase.realtime.connect();
      handlersRef.current.onResync(true);
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    window.addEventListener('pageshow', wake);
    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('pageshow', wake);
    };
  }, [cafeId]);

  return status;
}

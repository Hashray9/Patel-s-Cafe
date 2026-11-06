import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle, Clock, LogOut, RefreshCw, Flame, User, Volume2, VolumeX, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Order, MenuItem, Settings } from '../types';
import { useCafeLive, orderFromRow, type CafeChange } from '../hooks/useCafeLive';

import { api, ApiError } from '../api';

/** Statuses the kitchen screen shows; the API returns only these. */
const KITCHEN_STATUSES: Order['status'][] = ['pending', 'preparing', 'ready'];
const KITCHEN_ORDERS_PATH = `/api/orders?status=${KITCHEN_STATUSES.join(',')}`;
const isKitchenRelevant = (o: Order) => KITCHEN_STATUSES.includes(o.status);
/** Orders the kitchen has to work on: open and with at least one item. */
const isKitchenActive = (o: Order) => (o.status === 'pending' || o.status === 'preparing') && o.items.length > 0;
const itemsSignature = (o: Order) => JSON.stringify(o.items);
const newestFirst = (a: Order, b: Order) => b.timestamp - a.timestamp;

type AudioCtxCtor = typeof AudioContext;
const getAudioCtxCtor = (): AudioCtxCtor | undefined =>
  window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext;

export const CookDashboard: React.FC = () => {
  const { userEmail, cafeId, cafeName, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<Settings>({ storeName: "Patel's Cafe", taxRate: 0.05, currency: '₹' });
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [justChimed, setJustChimed] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  // One chime waiting for audio to resume is enough; don't queue a pile of them.
  const ringPendingRef = useRef(false);

  /** Create the AudioContext once; `audioUnlocked` follows its real state from then on. */
  const getAudioCtx = useCallback((): AudioContext | null => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctor = getAudioCtxCtor();
    if (!Ctor) return null;
    try {
      // iOS/iPadOS: play like a media app so the ring/silent switch does not mute the alert.
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';

      const ctx = new Ctor();
      // Browsers suspend audio (iOS when the screen locks, Chrome in background
      // tabs). Track it so the "tap to enable sound" banner comes back when needed.
      ctx.onstatechange = () => setAudioUnlocked(ctx.state === 'running');
      audioCtxRef.current = ctx;
      return ctx;
    } catch (err) {
      console.warn('Audio init error:', err);
      return null;
    }
  }, []);

  // Start/resume audio. Browsers only allow this inside a user gesture (tap, click, key).
  const initOrResumeAudio = useCallback(() => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') {
        ctx.resume().then(() => setAudioUnlocked(ctx.state === 'running')).catch(() => {});
      }
      // A 1-sample silent buffer completes the unlock on iOS Safari.
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 22050);
      source.connect(ctx.destination);
      source.start(0);
      if (ctx.state === 'running') setAudioUnlocked(true);
    } catch (err) {
      console.warn('Audio unlock error:', err);
    }
  }, [getAudioCtx]);

  // Every tap/click/key press re-arms audio, so a single touch after the phone
  // was locked brings the sound back. (iOS only counts touchend/click as gestures.)
  useEffect(() => {
    const onGesture = () => initOrResumeAudio();
    const opts = { passive: true } as const;
    window.addEventListener('click', onGesture, opts);
    window.addEventListener('touchend', onGesture, opts);
    window.addEventListener('keydown', onGesture, opts);
    // Coming back to the tab: browsers that remember the earlier tap allow resuming without a new one.
    const onVisible = () => {
      const ctx = audioCtxRef.current;
      if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') {
        ctx.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('click', onGesture);
      window.removeEventListener('touchend', onGesture);
      window.removeEventListener('keydown', onGesture);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [initOrResumeAudio]);

  // Screen Wake Lock API to prevent mobile phone display from sleeping while Cook Kitchen is active
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch {
          // Ignore wake lock failure (e.g. low battery mode)
        }
      }
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // Synthesized kitchen bell chime & mobile vibration alert
  const playOrderChime = useCallback((force = false) => {
    if (!soundEnabledRef.current && !force) return;

    // Haptics and the visual banner work even when the browser is blocking sound.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([250, 100, 250, 100, 400]);
      } catch {
        // ignore vibration errors
      }
    }
    setJustChimed(true);
    setTimeout(() => setJustChimed(false), 2000);

    const ctx = getAudioCtx();
    if (!ctx) return;

    const ring = () => {
      try {
        const now = ctx.currentTime;

        // Triple kitchen ticket bell chime (E5 -> A5 -> D6)
        const chimeNotes = [
          { freq: 659.25, start: 0, dur: 0.35, gain: 0.5 },     // E5
          { freq: 880.00, start: 0.16, dur: 0.45, gain: 0.55 },  // A5
          { freq: 1174.66, start: 0.35, dur: 0.75, gain: 0.6 }   // D6
        ];

        chimeNotes.forEach(({ freq, start, dur, gain: peakGain }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          // Triangle wave gives warm bell-like harmonic richness
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + start);

          gainNode.gain.setValueAtTime(0, now + start);
          gainNode.gain.linearRampToValueAtTime(peakGain, now + start + 0.015);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(now + start);
          osc.stop(now + start + dur);
        });
      } catch (err) {
        console.warn('Audio chime playback error:', err);
      }
    };

    // A suspended context has a stopped clock: wait for it to resume (right
    // away, or on the cook's next tap) and ring then.
    if (ctx.state === 'running') {
      ring();
    } else if (!ringPendingRef.current) {
      ringPendingRef.current = true;
      ctx.resume()
        .then(ring)
        .catch(() => {})
        .finally(() => { ringPendingRef.current = false; });
    }
  }, [getAudioCtx]);

  const playOrderChimeRef = useRef(playOrderChime);
  useEffect(() => {
    playOrderChimeRef.current = playOrderChime;
  }, [playOrderChime]);

  // Clock for the "x min ago" labels; ticks so ticket ages stay current.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Data. Orders live in a ref (the source of truth) and are mirrored to state
  // for rendering, so live events and API snapshots go through one place
  // (`commitOrders`), which also decides when to chime.
  // ---------------------------------------------------------------------------
  const ordersRef = useRef<Order[]>([]);
  const menuIdsRef = useRef<Set<string>>(new Set());
  // Active tickets (id -> items) as last shown; null until the first load so
  // existing tickets don't chime when the screen opens.
  const lastActiveRef = useRef<Map<string, string> | null>(null);
  // Incremented for every live order event; lets a slow API snapshot detect it is stale.
  const eventSeqRef = useRef(0);
  // Only the newest orders fetch may apply its result.
  const fetchGenRef = useRef(0);
  const metaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitOrders = useCallback((list: Order[]) => {
    const next = list.filter(isKitchenRelevant).sort(newestFirst);

    // Chime when a new ticket appears or an open ticket's items change.
    const active = new Map(next.filter(isKitchenActive).map(o => [o.id, itemsSignature(o)]));
    const previous = lastActiveRef.current;
    if (previous && [...active].some(([id, sig]) => previous.get(id) !== sig)) {
      playOrderChimeRef.current();
    }
    lastActiveRef.current = active;

    ordersRef.current = next;
    setOrders(next);
  }, []);

  const loadMeta = useCallback(async () => {
    const [menuData, settingsData] = await Promise.all([
      api<MenuItem[]>('/api/menu'),
      api<Settings>('/api/settings'),
    ]);
    menuIdsRef.current = new Set(menuData.map(m => m.id));
    setMenu(menuData);
    setSettings(settingsData);
  }, []);

  /** Coalesce bursts (e.g. a bulk menu edit) into one menu/settings reload. */
  const scheduleMetaReload = useCallback(() => {
    if (metaTimerRef.current) clearTimeout(metaTimerRef.current);
    metaTimerRef.current = setTimeout(() => {
      metaTimerRef.current = null;
      loadMeta().catch(err => console.error('Error loading menu:', err));
    }, 300);
  }, [loadMeta]);

  useEffect(() => () => {
    if (metaTimerRef.current) clearTimeout(metaTimerRef.current);
  }, []);

  const loadOrders = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    // If a live event lands while the request is in flight, the snapshot may
    // predate it, so fetch again (a few times at most; the events are already shown).
    for (let attempt = 0; attempt < 3; attempt++) {
      const seqAtStart = eventSeqRef.current;
      const data = await api<Order[]>(KITCHEN_ORDERS_PATH).catch((err: unknown) => {
        // An API deployed before the multi-status filter answers 400; take every
        // order instead (commitOrders keeps only the kitchen ones).
        if (err instanceof ApiError && err.status === 400) return api<Order[]>('/api/orders');
        throw err;
      });
      if (gen !== fetchGenRef.current) return;
      if (seqAtStart === eventSeqRef.current) {
        commitOrders(data);
        return;
      }
    }
  }, [commitOrders]);

  /** Apply one pushed change instantly, with no API round trip for orders. */
  const handleLiveChange = useCallback((change: CafeChange) => {
    if (change.table === 'orders') {
      eventSeqRef.current++;
      const others = ordersRef.current.filter(o => o.id !== change.id);
      if (change.op === 'DELETE' || !change.record) {
        commitOrders(others);
        return;
      }
      const order = orderFromRow(change.record);
      commitOrders([order, ...others]);
      // A dish added to the menu moments ago: fetch the menu so its name shows.
      if (order.items.some(i => !menuIdsRef.current.has(i.menuItemId))) scheduleMetaReload();
    } else if (change.table === 'menu_items' || change.table === 'settings') {
      scheduleMetaReload();
    }
  }, [commitOrders, scheduleMetaReload]);

  const resync = useCallback(async (full: boolean) => {
    try {
      await Promise.all([loadOrders(), full ? loadMeta() : null]);
    } catch (err) {
      console.error('Error loading cook data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadOrders, loadMeta]);

  // Live updates for THIS cafe only: the channel is private and the database
  // only lets members of this cafe join it.
  const liveStatus = useCafeLive(cafeId, { onChange: handleLiveChange, onResync: resync });

  // First load right away; the channel resyncs again once it is subscribed.
  useEffect(() => {
    if (!cafeId) return;
    // Data fetch on mount; state is only set after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resync(true);
  }, [cafeId, resync]);

  const handleMarkReady = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    try {
      const updated = await api<Order>(`/api/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status: 'ready' }) });
      // Show it at once; the live event carries the same row.
      commitOrders([updated, ...ordersRef.current.filter(o => o.id !== orderId)]);
    } catch (err) {
      console.error('Error marking order ready:', err);
      alert(err instanceof Error ? err.message : 'Could not mark the order ready.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Show only active orders (pending or preparing) — not paid, not ready
  const activeOrders = orders.filter(isKitchenActive);
  // Show recently readied orders (so cook can see what was just completed)
  const readyOrders = orders.filter(o => o.status === 'ready');

  const getMenuItemName = (menuItemId: string): string => {
    return menu.find(m => m.id === menuItemId)?.name || 'Unknown Item';
  };

  const timeSince = (timestamp: number): string => {
    const diff = Math.max(0, Math.floor((now - timestamp) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-body-md text-sm font-semibold text-on-surface">Loading kitchen...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background pb-8">
      {/* Kitchen Header */}
      <header className="sticky top-0 z-40 bg-[#1e1b15] text-white flex justify-between items-center px-4 md:px-8 h-16 border-b-3 border-black shadow-[4px_4px_0px_0px_rgba(30,27,21,1)]">
        <div className="flex items-center gap-3">
          <div className="bg-[#ffd982] text-black p-1.5 rounded-md border-2 border-black flex items-center justify-center">
            <ChefHat size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="font-headline-md text-[18px] md:text-[20px] font-bold tracking-tight select-none">
              {settings.storeName || cafeName}
            </span>
            <span className="hidden sm:inline-block text-[11px] font-bold bg-[#ffd982] text-black px-2 py-0.5 rounded border border-black ml-2 uppercase tracking-wider">
              Kitchen
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Logged in indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-white/60 text-[12px] font-semibold">
            <User size={13} className="stroke-[2]" />
            {userEmail}
          </div>

          {/* Sound Alert Toggle & Test Button */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) {
                initOrResumeAudio();
                playOrderChime(true);
              }
            }}
            className={`px-2.5 py-1.5 rounded-lg border-2 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[#b2f0cf] text-[#006e3a] border-black shadow-[2px_2px_0px_0px_#000000]'
                : 'bg-white/10 text-white/60 border-white/30 hover:bg-white/20'
            }`}
            title={soundEnabled ? 'Kitchen sound alert is ON (Tap to test chime)' : 'Kitchen sound alert is MUTED (Tap to turn on)'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden xs:inline">{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          {/* Live connection status */}
          <span
            className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 text-[11px] font-bold uppercase tracking-wider select-none ${
              liveStatus === 'live'
                ? 'border-[#b2f0cf] text-[#b2f0cf]'
                : 'border-[#ffd982] text-[#ffd982]'
            }`}
            title={liveStatus === 'live'
              ? 'Live: new orders appear instantly'
              : 'Reconnecting: still checking for orders every few seconds'}
          >
            <span className={`w-2 h-2 rounded-full ${liveStatus === 'live' ? 'bg-[#b2f0cf]' : 'bg-[#ffd982] animate-pulse'}`} />
            {liveStatus === 'live' ? 'Live' : 'Reconnecting'}
          </span>
          <span
            className={`sm:hidden w-2.5 h-2.5 rounded-full border border-black ${liveStatus === 'live' ? 'bg-[#b2f0cf]' : 'bg-[#ffd982] animate-pulse'}`}
            title={liveStatus === 'live' ? 'Live' : 'Reconnecting'}
          />

          {/* Refresh */}
          <button
            onClick={() => resync(true)}
            className="p-2 rounded-lg border-2 border-white/30 bg-transparent text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw size={16} className="stroke-[2.5]" />
          </button>

          {/* Logout */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 rounded-lg border-2 border-white/30 bg-transparent text-white hover:bg-red-500/20 hover:border-red-400 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut size={16} className="stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Main Kitchen Display */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* Audio unlock callout for mobile browsers (shown until first user touch/tap) */}
        {!audioUnlocked && (
          <div
            onClick={() => {
              initOrResumeAudio();
              playOrderChime(true);
            }}
            className="bg-[#ffd982] text-black border-2 border-black p-3.5 rounded-xl flex items-center justify-between cursor-pointer shadow-[3px_3px_0px_0px_#000000] hover:translate-y-[-1px] transition-all select-none"
          >
            <div className="flex items-center gap-3">
              <div className="bg-black text-[#ffd982] p-2 rounded-lg border border-black">
                <BellRing size={20} className="animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-sm">🔔 Tap here to test & enable Kitchen Sound</p>
                <p className="text-xs text-black/75">Mobile phones require 1 tap to allow loud order alerts</p>
              </div>
            </div>
            <button className="bg-black text-white text-xs font-bold px-3.5 py-1.5 rounded-lg border border-black hover:bg-black/90 shrink-0 ml-2">
              Test Sound 🔊
            </button>
          </div>
        )}

        {/* Visual Notification Banner when new order chimes */}
        {justChimed && (
          <div className="bg-[#b2f0cf] text-[#006e3a] border-2 border-black p-3 rounded-xl flex items-center gap-2.5 font-bold text-sm shadow-[3px_3px_0px_0px_#000000] animate-pulse select-none">
            <BellRing size={18} className="stroke-[2.5]" />
            <span>🔔 New order received! Kitchen alerted.</span>
          </div>
        )}

        {/* Active Orders Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 select-none">
            <Flame size={22} className="text-[#ba1a1a] stroke-[2.5]" />
            <h2 className="font-headline-md text-[22px] font-bold text-on-surface">
              Orders to Prepare
            </h2>
            {activeOrders.length > 0 && (
              <span className="bg-[#ba1a1a] text-white text-[13px] font-bold px-2.5 py-0.5 rounded-full border-2 border-black animate-pulse">
                {activeOrders.length}
              </span>
            )}
          </div>

          {activeOrders.length === 0 ? (
            <div className="neo-brutal-card rounded-xl p-12 bg-surface text-center max-w-md mx-auto space-y-4">
              <ChefHat size={48} className="mx-auto text-on-surface-variant/40 stroke-[1.5]" />
              <h3 className="font-headline-md text-headline-md text-on-surface">No Active Orders</h3>
              <p className="text-sm text-on-surface-variant font-medium">
                Waiting for new orders from the counter...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {activeOrders.map(order => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-surface border-3 border-black rounded-xl overflow-hidden shadow-[5px_5px_0px_0px_rgba(30,27,21,1)] flex flex-col"
                >
                  {/* Order Header */}
                  <div className="px-4 py-3 bg-[#ffd982] border-b-3 border-black flex items-center justify-between select-none">
                    <div className="flex items-center gap-3">
                      <div className="bg-black text-white px-3 py-1.5 rounded-lg font-headline-md text-[16px] tracking-tight">
                        {order.tableNumber}
                      </div>
                      <div>
                        <h4 className="font-label-bold text-[14px] text-black">
                          Order #{order.id.substring(4, 9)}
                        </h4>
                        <span className="text-[11px] font-semibold text-black/60 flex items-center gap-1">
                          <Clock size={10} className="stroke-[2.5]" />
                          {timeSince(order.timestamp)}
                        </span>
                      </div>
                    </div>
                    <span className="bg-[#ba1a1a] text-white px-2.5 py-1 rounded-md text-[11px] font-bold border border-black uppercase tracking-wider">
                      {order.status}
                    </span>
                  </div>

                  {/* Order Items List */}
                  <div className="px-4 py-3 flex-1 space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 border-b border-dashed border-black/10 last:border-0">
                        <span className="font-bold text-[14px] text-on-surface flex-1 min-w-0">
                          {getMenuItemName(item.menuItemId)}
                          {item.notes && (
                            <span className="block text-[11px] font-semibold text-on-tertiary-container bg-tertiary-container px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              Note: {item.notes}
                            </span>
                          )}
                        </span>
                        <span className="bg-black text-white text-[14px] font-bold px-2.5 py-0.5 rounded-md border border-black min-w-[32px] text-center ml-3 shrink-0">
                          ×{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Mark Ready Button */}
                  <div className="p-3 border-t-3 border-black">
                    <button
                      onClick={() => handleMarkReady(order.id)}
                      disabled={updatingOrderId === order.id}
                      className="w-full neo-brutal-btn bg-[#b2f0cf] text-black py-3 rounded-lg font-headline-md text-[15px] flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_#000000] border-2 border-black hover:bg-[#90e8b5] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none transition-all cursor-pointer font-bold"
                    >
                      {updatingOrderId === order.id ? (
                        <>
                          <RefreshCw size={16} className="animate-spin stroke-[2.5]" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} className="stroke-[2.5]" />
                          Mark Ready
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Recently Completed Orders (Ready) */}
        {readyOrders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4 select-none">
              <CheckCircle size={20} className="text-[#006e3a] stroke-[2.5]" />
              <h2 className="font-headline-md text-[18px] font-bold text-on-surface-variant">
                Ready for Pickup ({readyOrders.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {readyOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-[#b2f0cf] border-2 border-black rounded-xl p-3.5 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-black text-white px-2.5 py-1 rounded-lg font-bold text-[14px]">
                      {order.tableNumber}
                    </div>
                    <div>
                      <span className="font-bold text-[13px] text-black">#{order.id.substring(4, 9)}</span>
                      <span className="block text-[11px] font-semibold text-[#006e3a]">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <span className="bg-[#006e3a] text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase border border-black">
                    ✓ Ready
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Logout Confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-surface w-full max-w-sm p-6 rounded-xl border-3 border-on-surface shadow-[8px_8px_0px_0px_rgba(30,27,21,1)] z-10 flex flex-col items-center gap-5 text-center"
            >
              <div className="bg-error-container text-on-error-container p-3 rounded-xl border-2 border-black inline-flex items-center justify-center transform -rotate-6 shadow-[3px_3px_0px_0px_#000000]">
                <LogOut size={26} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-headline-md text-[20px] font-bold text-on-surface">
                  Sign Out of Kitchen?
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant/90 mt-2">
                  You will need to log in again to see incoming orders.
                </p>
              </div>
              <div className="flex gap-4 w-full mt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 neo-brutal-btn bg-white text-black font-bold py-2.5 rounded-lg text-sm cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    await signOut();
                  }}
                  className="flex-1 neo-brutal-btn bg-error text-on-error font-bold py-2.5 rounded-lg text-sm cursor-pointer select-none"
                >
                  Confirm Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

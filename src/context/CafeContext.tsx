/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Table, MenuItem, Order, OrderItem, Settings } from '../types';
import { supabase } from '../supabaseClient';
import { api } from '../api';
import { useAuth } from './AuthContext';

interface CafeContextType {
  tables: Table[];
  orders: Order[];
  menu: MenuItem[];
  settings: Settings;
  updateTableStatus: (tableId: string, status: Table['status']) => void;
  updateTableCapacity: (tableId: string, capacity: number) => void;
  createOrder: (tableId: string, items: OrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateMenuItem: (updatedItem: MenuItem) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateSettings: (settings: Settings) => void;
  clearTable: (tableId: string) => void;
  addTable: (table: Omit<Table, 'id' | 'status' | 'currentOrderId' | 'timerStart'>) => Promise<void>;
  removeTable: (tableId: string) => Promise<void>;
  seatGroup: (tableIds: string[]) => void;
}

const CafeContext = createContext<CafeContextType | undefined>(undefined);

const DEFAULT_SETTINGS: Settings = {
  storeName: '',
  taxRate: 0.05,
  currency: '₹',
};

const SETTINGS_SAVE_DELAY_MS = 600;

/**
 * Data for the counter/owner dashboard of ONE cafe. Only mounted for signed-in
 * members, so it loads on mount. The API scopes every call to the caller's cafe;
 * the Realtime channel is filtered by cafe_id (and RLS enforces it server-side).
 */
export const CafeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cafeId } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [settingsData, tablesData, menuData, ordersData] = await Promise.all([
        api<Settings>('/api/settings'),
        api<Table[]>('/api/tables'),
        api<MenuItem[]>('/api/menu'),
        api<Order[]>('/api/orders'),
      ]);
      setSettings(settingsData);
      setTables(tablesData);
      setMenu(menuData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Error loading cafe data:', err);
    }
  }, []);

  const reloadTablesAndOrders = useCallback(async () => {
    const [tablesData, ordersData] = await Promise.all([
      api<Table[]>('/api/tables'),
      api<Order[]>('/api/orders'),
    ]);
    setTables(tablesData);
    setOrders(ordersData);
  }, []);

  useEffect(() => {
    if (!cafeId) return;
    // Data fetch on mount; state is only set after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    // Live sync across this cafe's devices only.
    const filter = `cafe_id=eq.${cafeId}`;
    const channel = supabase
      .channel(`counter-sync-${cafeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter }, () => { loadData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cafeId, loadData]);

  useEffect(() => () => {
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
  }, []);

  const clearTable = useCallback(async (tableId: string) => {
    try {
      await api(`/api/tables/${tableId}/clear`, { method: 'POST' });
      await reloadTablesAndOrders();
    } catch (err) {
      console.error('Error clearing table:', err);
    }
  }, [reloadTablesAndOrders]);

  const updateTableStatus = useCallback(async (tableId: string, status: Table['status']) => {
    try {
      const body = status === 'occupied'
        ? { status, timerStart: Date.now() }
        : { status, timerStart: null, currentOrderId: null, groupId: null };
      const updated = await api<Table>(`/api/tables/${tableId}`, { method: 'PUT', body: JSON.stringify(body) });
      setTables(prev => prev.map(t => t.id === tableId ? updated : t));
    } catch (err) {
      console.error('Error updating table status:', err);
    }
  }, []);

  const updateTableCapacity = useCallback(async (tableId: string, capacity: number) => {
    try {
      const updated = await api<Table>(`/api/tables/${tableId}`, { method: 'PUT', body: JSON.stringify({ capacity }) });
      setTables(prev => prev.map(t => t.id === tableId ? updated : t));
    } catch (err) {
      console.error('Error updating table capacity:', err);
    }
  }, []);

  /**
   * Save the item list for a table / walk-in. Creates the order if none is open,
   * updates it otherwise, and deletes it (freeing the table) when the list is empty.
   * The server computes subtotal / tax / total from the cafe's own menu prices.
   */
  const createOrder = useCallback(async (tableId: string, items: OrderItem[]) => {
    try {
      const isWalkIn = tableId.startsWith('walk-in');
      const table = isWalkIn ? null : tables.find(t => t.id === tableId);
      if (!isWalkIn && !table) return;

      const existingActiveOrder = table?.currentOrderId
        ? orders.find(o => o.id === table.currentOrderId && o.status !== 'paid')
        : orders.find(o => o.tableId === tableId && o.status !== 'paid');

      if (items.length === 0) {
        if (existingActiveOrder) {
          await api(`/api/orders/${existingActiveOrder.id}`, { method: 'DELETE' });
        }
        if (!isWalkIn) {
          await clearTable(tableId);
        } else {
          setOrders(await api<Order[]>('/api/orders'));
        }
        return;
      }

      if (existingActiveOrder) {
        const updated = await api<Order>(`/api/orders/${existingActiveOrder.id}`, {
          method: 'PUT',
          body: JSON.stringify({ items }),
        });
        setOrders(prev => prev.map(o => o.id === existingActiveOrder.id ? updated : o));
      } else {
        await api<Order>('/api/orders', { method: 'POST', body: JSON.stringify({ tableId, items }) });
        await reloadTablesAndOrders();
      }
    } catch (err) {
      console.error('Error creating/updating order:', err);
    }
  }, [tables, orders, clearTable, reloadTablesAndOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    try {
      await api(`/api/orders/${orderId}`, { method: 'PUT', body: JSON.stringify({ status }) });
      // 'paid' frees tables on the server, so refresh both lists.
      await reloadTablesAndOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  }, [reloadTablesAndOrders]);

  const updateMenuItem = useCallback(async (updatedItem: MenuItem) => {
    try {
      const updated = await api<MenuItem>(`/api/menu/${updatedItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedItem),
      });
      setMenu(prev => prev.map(m => m.id === updatedItem.id ? updated : m));
    } catch (err) {
      console.error('Error updating menu item:', err);
    }
  }, []);

  const addMenuItem = useCallback(async (item: Omit<MenuItem, 'id'>) => {
    try {
      const created = await api<MenuItem>('/api/menu', { method: 'POST', body: JSON.stringify(item) });
      setMenu(prev => [...prev, created]);
    } catch (err) {
      console.error('Error adding menu item:', err);
    }
  }, []);

  /** Updates the UI immediately and saves to the server after typing pauses. */
  const updateSettings = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(async () => {
      try {
        await api<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(newSettings) });
      } catch (err) {
        console.error('Error saving store settings:', err);
      }
    }, SETTINGS_SAVE_DELAY_MS);
  }, []);

  const addTable = useCallback(async (tableData: Omit<Table, 'id' | 'status' | 'currentOrderId' | 'timerStart'>) => {
    if (tables.some(t => t.number.toLowerCase() === tableData.number.toLowerCase())) {
      throw new Error(`Table number ${tableData.number} already exists.`);
    }
    const created = await api<Table>('/api/tables', { method: 'POST', body: JSON.stringify(tableData) });
    setTables(prev => [...prev, created].sort((a, b) => a.number.localeCompare(b.number)));
  }, [tables]);

  const removeTable = useCallback(async (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    if (table.status === 'occupied') {
      throw new Error(`Cannot remove table ${table.number} because it is occupied.`);
    }
    await api(`/api/tables/${tableId}`, { method: 'DELETE' });
    setTables(prev => prev.filter(t => t.id !== tableId));
  }, [tables]);

  const seatGroup = useCallback(async (tableIds: string[]) => {
    if (tableIds.length === 0) return;
    try {
      await api('/api/tables/seat-group', { method: 'POST', body: JSON.stringify({ tableIds }) });
      await reloadTablesAndOrders();
    } catch (err) {
      console.error('Error seating group:', err);
    }
  }, [reloadTablesAndOrders]);

  return (
    <CafeContext.Provider value={{
      tables,
      orders,
      menu,
      settings,
      updateTableStatus,
      updateTableCapacity,
      createOrder,
      updateOrderStatus,
      updateMenuItem,
      addMenuItem,
      updateSettings,
      clearTable,
      addTable,
      removeTable,
      seatGroup
    }}>
      {children}
    </CafeContext.Provider>
  );
};

export const useCafe = () => {
  const context = useContext(CafeContext);
  if (context === undefined) {
    throw new Error('useCafe must be used within a CafeProvider');
  }
  return context;
};

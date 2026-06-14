/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Table, MenuItem, Order, OrderItem, Settings } from '../types';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  storeName: "Patel Sandwichwala",
  taxRate: 0.05,
  currency: '₹',
};

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ''}`
  };
};

export const CafeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const loadData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [settingsRes, tablesRes, menuRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/api/settings`, { headers }),
        fetch(`${API_URL}/api/tables`, { headers }),
        fetch(`${API_URL}/api/menu`, { headers }),
        fetch(`${API_URL}/api/orders`, { headers })
      ]);

      if (!settingsRes.ok || !tablesRes.ok || !menuRes.ok || !ordersRes.ok) {
        throw new Error('Failed to load cafe data from backend API');
      }

      const settingsData = await settingsRes.json();
      const tablesData = await tablesRes.json();
      const menuData = await menuRes.json();
      const ordersData = await ordersRes.json();

      setSettings(settingsData);
      setTables(tablesData);
      setMenu(menuData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Error loading initial cafe data:', err);
    }
  }, []);

  useEffect(() => {
    // Listen for auth events to load/unload state dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadData();
      } else if (event === 'SIGNED_OUT') {
        setTables([]);
        setOrders([]);
        setMenu([]);
        setSettings(DEFAULT_SETTINGS);
      }
    });

    // Handle initial state if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  const clearTable = useCallback(async (tableId: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/tables/${tableId}/clear`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Failed to clear table state on backend.');

      // Reload tables and orders to keep client state synced
      const [tRes, oRes] = await Promise.all([
        fetch(`${API_URL}/api/tables`, { headers }),
        fetch(`${API_URL}/api/orders`, { headers })
      ]);
      setTables(await tRes.json());
      setOrders(await oRes.json());
    } catch (err) {
      console.error('Error clearing table:', err);
    }
  }, []);

  const updateTableStatus = useCallback(async (tableId: string, status: Table['status']) => {
    try {
      const headers = await getAuthHeaders();
      const table = tables.find(t => t.id === tableId);
      if (!table) return;

      const timerStart = status === 'occupied' ? Date.now() : null;
      const currentOrderId = status !== 'occupied' ? null : table.currentOrderId;

      const res = await fetch(`${API_URL}/api/tables/${tableId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...table,
          status,
          timerStart,
          currentOrderId
        })
      });
      if (!res.ok) throw new Error('Failed to update table status.');
      const updated = await res.json();
      setTables(prev => prev.map(t => t.id === tableId ? updated : t));
    } catch (err) {
      console.error('Error updating table status:', err);
    }
  }, [tables]);

  const updateTableCapacity = useCallback(async (tableId: string, capacity: number) => {
    try {
      const headers = await getAuthHeaders();
      const table = tables.find(t => t.id === tableId);
      if (!table) return;

      const res = await fetch(`${API_URL}/api/tables/${tableId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...table,
          capacity
        })
      });
      if (!res.ok) throw new Error('Failed to update table capacity.');
      const updated = await res.json();
      setTables(prev => prev.map(t => t.id === tableId ? updated : t));
    } catch (err) {
      console.error('Error updating table capacity:', err);
    }
  }, [tables]);

  const createOrder = useCallback(async (tableId: string, items: OrderItem[]) => {
    try {
      const headers = await getAuthHeaders();
      const isWalkIn = tableId.startsWith('walk-in');
      const table = isWalkIn
        ? { number: 'Walk-in', currentOrderId: undefined }
        : tables.find(t => t.id === tableId);
      if (!table) return;

      const existingActiveOrder = !isWalkIn && table.currentOrderId
        ? orders.find(o => o.id === table.currentOrderId && o.status !== 'paid')
        : orders.find(o => o.tableId === tableId && o.status !== 'paid');

      if (items.length === 0) {
        if (existingActiveOrder) {
          // Delete active order since it's empty
          const res = await fetch(`${API_URL}/api/orders/${existingActiveOrder.id}`, {
            method: 'DELETE',
            headers
          });
          if (!res.ok) throw new Error('Failed to delete empty order.');
        }
        if (!isWalkIn) {
          await clearTable(tableId);
        } else {
          // Refresh walk-in order list
          const oRes = await fetch(`${API_URL}/api/orders`, { headers });
          setOrders(await oRes.json());
        }
        return;
      }

      // Calculate checkout totals
      const sub = items.reduce((acc, curr) => {
        const item = menu.find(m => m.id === curr.menuItemId);
        return acc + (item ? item.price * curr.quantity : 0);
      }, 0);

      const taxVal = parseFloat((sub * settings.taxRate).toFixed(2));
      const totalVal = parseFloat((sub * (1 + settings.taxRate)).toFixed(2));

      if (existingActiveOrder) {
        // Update the existing order on the server
        const res = await fetch(`${API_URL}/api/orders/${existingActiveOrder.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            items,
            status: existingActiveOrder.status,
            subtotal: sub,
            tax: taxVal,
            total: totalVal
          })
        });
        if (!res.ok) throw new Error('Failed to update active order.');
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === existingActiveOrder.id ? updated : o));
      } else {
        // Create new order on server
        const orderId = `ord-${Date.now()}`;
        const timestamp = Date.now();
        const res = await fetch(`${API_URL}/api/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id: orderId,
            tableId,
            tableNumber: table.number,
            items,
            status: 'pending',
            timestamp,
            subtotal: sub,
            tax: taxVal,
            total: totalVal
          })
        });
        if (!res.ok) throw new Error('Failed to create order on server.');

        // Refresh database state
        const [tRes, oRes] = await Promise.all([
          fetch(`${API_URL}/api/tables`, { headers }),
          fetch(`${API_URL}/api/orders`, { headers })
        ]);
        setTables(await tRes.json());
        setOrders(await oRes.json());
      }
    } catch (err) {
      console.error('Error creating/updating order:', err);
    }
  }, [tables, orders, menu, settings.taxRate, clearTable]);

  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    try {
      const headers = await getAuthHeaders();
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...order,
          status
        })
      });
      if (!res.ok) throw new Error('Failed to update order status.');

      // Reload tables and orders since state transitions (like 'paid') clear tables automatically in the DB.
      const [tRes, oRes] = await Promise.all([
        fetch(`${API_URL}/api/tables`, { headers }),
        fetch(`${API_URL}/api/orders`, { headers })
      ]);
      setTables(await tRes.json());
      setOrders(await oRes.json());
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  }, [orders]);

  const updateMenuItem = useCallback(async (updatedItem: MenuItem) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/menu/${updatedItem.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedItem)
      });
      if (!res.ok) throw new Error('Failed to update menu item.');
      const updated = await res.json();
      setMenu(prev => prev.map(m => m.id === updatedItem.id ? updated : m));
    } catch (err) {
      console.error('Error updating menu item:', err);
    }
  }, []);

  const addMenuItem = useCallback(async (item: Omit<MenuItem, 'id'>) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/menu`, {
        method: 'POST',
        headers,
        body: JSON.stringify(item)
      });
      if (!res.ok) throw new Error('Failed to create menu item.');
      const created = await res.json();
      setMenu(prev => [...prev, created]);
    } catch (err) {
      console.error('Error adding menu item:', err);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Settings) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(newSettings)
      });
      if (!res.ok) throw new Error('Failed to save store settings.');
      const updated = await res.json();
      setSettings(updated);
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  }, []);

  const addTable = useCallback(async (tableData: Omit<Table, 'id' | 'status' | 'currentOrderId' | 'timerStart'>) => {
    const headers = await getAuthHeaders();

    const exists = tables.some(t => t.number.toLowerCase() === tableData.number.toLowerCase());
    if (exists) {
      throw new Error(`Table number ${tableData.number} already exists.`);
    }

    const res = await fetch(`${API_URL}/api/tables`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tableData)
    });

    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error || 'Failed to add table.');
    }

    const created = await res.json();
    setTables(prev => [...prev, created].sort((a, b) => a.number.localeCompare(b.number)));
  }, [tables]);

  const removeTable = useCallback(async (tableId: string) => {
    const headers = await getAuthHeaders();

    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    if (table.status === 'occupied') {
      throw new Error(`Cannot remove table ${table.number} because it is occupied.`);
    }

    const res = await fetch(`${API_URL}/api/tables/${tableId}`, {
      method: 'DELETE',
      headers
    });

    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error || 'Failed to remove table.');
    }

    setTables(prev => prev.filter(t => t.id !== tableId));
  }, [tables]);

  const seatGroup = useCallback(async (tableIds: string[]) => {
    if (tableIds.length === 0) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/api/tables/seat-group`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tableIds })
      });
      if (!res.ok) throw new Error('Failed to seat group.');

      // Refresh seating states
      const [tRes, oRes] = await Promise.all([
        fetch(`${API_URL}/api/tables`, { headers }),
        fetch(`${API_URL}/api/orders`, { headers })
      ]);
      setTables(await tRes.json());
      setOrders(await oRes.json());
    } catch (err) {
      console.error('Error seating group:', err);
    }
  }, []);

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

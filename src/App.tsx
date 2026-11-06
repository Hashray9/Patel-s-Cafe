import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, errorMessage } from './api';
import { CafeProvider, useCafe } from './context/CafeContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TableCard } from './components/TableCard';
import { TableModal } from './components/TableModal';
import { OrderPanel } from './components/OrderPanel';
import { OrderListItem } from './components/OrderListItem';
import { MenuCard } from './components/MenuCard';
import { MenuModal } from './components/MenuModal';
import { ReportsView } from './components/ReportsView';
import type { Table, MenuItem } from './types';
import {
  Plus,
  Search,
  ReceiptText,
  PlusCircle,
  Sliders,
  Armchair,
  Trash2,
  User,
  AlertTriangle,
  Lock,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import type { UserRole } from './types';
import { StaffManager } from './components/StaffManager';

const ROLE_BADGES: Record<UserRole, string> = {
  owner: '👑 Owner',
  counter: '🏢 Counter / Cashier',
  cook: '👨‍🍳 Kitchen / Cook',
};

const DashboardContent: React.FC = () => {
  const { userEmail, userRole, cafeName } = useAuth();
  const isOwner = userRole === 'owner';
  const {
    tables,
    orders,
    menu,
    settings,
    updateSettings,
    addTable,
    removeTable
  } = useCafe();

  const [activeTab, setActiveTab] = useState('home');

  // Selection and Modal controls
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [activeOrderTableId, setActiveOrderTableId] = useState<string | null>(null);

  // Menu Modal controls
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | undefined>(undefined);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  // Menu tab filtering
  const [menuFilter, setMenuFilter] = useState<'all' | MenuItem['category']>('all');
  const [menuSearch, setMenuSearch] = useState('');

  // Orders queue view filter: 'table' = Seated Table orders, 'walk-in' = Counter/Walk-in orders
  const [ordersView, setOrdersView] = useState<'table' | 'walk-in'>('table');

  // Add Table states
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableIsOutdoor, setNewTableIsOutdoor] = useState(false);
  const [tableError, setTableError] = useState('');
  const [tableSuccess, setTableSuccess] = useState('');

  // Reset modal state
  const [resetModal, setResetModal] = useState<'tables' | 'menu' | 'orders' | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleExecuteReset = async () => {
    if (!resetModal) return;
    setResetLoading(true);

    try {
      const endpoint = {
        tables: '/api/settings/clear-tables',
        menu: '/api/settings/clear-menu',
        orders: '/api/settings/clear-orders',
      }[resetModal];
      await api(endpoint, { method: 'POST' });
      window.location.reload();
    } catch (err) {
      alert('Failed to reset: ' + errorMessage(err));
    } finally {
      setResetLoading(false);
      setResetModal(null);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setTableError('');
    setTableSuccess('');

    if (!newTableNumber.trim()) {
      setTableError('Table number is required.');
      return;
    }

    const formattedNumber = newTableNumber.trim();

    try {
      await addTable({
        number: formattedNumber,
        capacity: newTableCapacity,
        isOutdoor: newTableIsOutdoor
      });
      setTableSuccess(`Table ${formattedNumber} added successfully!`);
      setNewTableNumber('');
      setNewTableCapacity(4);
      setNewTableIsOutdoor(false);
      setTimeout(() => setTableSuccess(''), 3000);
    } catch (err: unknown) {
      setTableError(err instanceof Error ? err.message : 'Failed to add table.');
    }
  };

  const handleRemoveTable = async (tableId: string, tableNumber: string) => {
    setTableError('');
    setTableSuccess('');

    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.status === 'occupied') {
      alert(`Cannot remove Table ${tableNumber} because it is currently occupied with an active order.`);
      return;
    }

    if (window.confirm(`Are you sure you want to remove Table ${tableNumber}? This action cannot be undone.`)) {
      try {
        await removeTable(tableId);
        setTableSuccess(`Table ${tableNumber} was removed.`);
        setTimeout(() => setTableSuccess(''), 3000);
      } catch (err: unknown) {
        setTableError(err instanceof Error ? err.message : 'Failed to remove table.');
      }
    }
  };

  const handleOpenOrder = useCallback((tableId: string) => {
    setActiveOrderTableId(tableId);
  }, []);

  // Quick Action: Place a walk-in counter order
  const handleQuickWalkIn = useCallback(() => {
    handleOpenOrder('walk-in-' + Date.now());
  }, [handleOpenOrder]);

  const handleTableClick = useCallback((table: Table) => {
    setSelectedTable(table);
    setIsTableModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-background pb-[88px] md:pb-8 pt-20">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6">

        {/* VIEW 1: FLOOR PLAN (HOME) */}
        {activeTab === 'home' && (
          <div className="space-y-6 max-w-[480px] md:max-w-none mx-auto">
            {/* Floor plan headers and Quick Actions */}
            <div className="space-y-5">


              {/* Quick Actions (only Walk-in) */}
              <div className="flex w-full">
                <button
                  onClick={handleQuickWalkIn}
                  className="neo-brutal-btn bg-white text-black py-3 px-6 rounded-[10px] border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] font-label-bold text-label-bold flex items-center justify-center gap-2 select-none"
                >
                  <Plus size={16} className="stroke-[3]" />
                  New Walk-in
                </button>
              </div>
            </div>

            {/* Bento Grid Floor Plan (T-7 & T-8 span 2 columns) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pt-1">
              {tables.map(table => (
                <div key={table.id} className={table.isOutdoor ? 'col-span-2' : ''}>
                  <TableCard
                    table={table}
                    onClick={() => handleTableClick(table)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: KITCHEN ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 select-none">
              {/* Toggle Buttons */}
              <div className="flex bg-[#efe7dd] border-2 border-black p-1 rounded-xl shadow-[3px_3px_0px_0px_#000000]">
                <button
                  onClick={() => setOrdersView('table')}
                  className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg font-headline-md font-bold text-[14px] border-2 transition-all cursor-pointer ${
                    ordersView === 'table'
                      ? 'bg-[#ffd982] text-black border-black shadow-[2px_2px_0px_0px_#000000]'
                      : 'bg-transparent text-on-surface-variant border-transparent hover:text-black'
                  }`}
                >
                  Table Orders ({orders.filter(o => o.status !== 'paid' && !o.tableId.startsWith('walk-in')).length})
                </button>
                <button
                  onClick={() => setOrdersView('walk-in')}
                  className={`flex-1 sm:flex-initial px-5 py-2 rounded-lg font-headline-md font-bold text-[14px] border-2 transition-all cursor-pointer ${
                    ordersView === 'walk-in'
                      ? 'bg-[#ffd982] text-black border-black shadow-[2px_2px_0px_0px_#000000]'
                      : 'bg-transparent text-on-surface-variant border-transparent hover:text-black'
                  }`}
                >
                  Walk-in Orders ({orders.filter(o => o.status !== 'paid' && o.tableId.startsWith('walk-in')).length})
                </button>
              </div>

              {/* Action Button: Create New Walk-in/Counter Order */}
              <button
                onClick={() => handleOpenOrder('walk-in-' + Date.now())}
                className="neo-brutal-btn bg-white text-black py-2.5 px-5 rounded-lg font-label-bold text-[14px] flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_#000000] border-2 border-black hover:bg-surface-container-high transition-all cursor-pointer"
              >
                <Plus size={16} className="stroke-[3]" />
                New Walk-in Order
              </button>
            </div>

            {(() => {
              const filteredOrders = orders
                .filter(o => o.status !== 'paid')
                .filter(o => {
                  const isWalkIn = o.tableId.startsWith('walk-in');
                  return ordersView === 'walk-in' ? isWalkIn : !isWalkIn;
                });

              return (
                <>
                  {/* List queue grid */}
                  {filteredOrders.length === 0 ? (
                    <div className="neo-brutal-card rounded-xl p-12 bg-surface text-center max-w-md mx-auto space-y-4">
                      <ReceiptText size={48} className="mx-auto text-on-surface-variant/40 stroke-[1.5]" />
                      <h3 className="font-headline-md text-headline-md text-on-surface">No Active Orders</h3>

                      {ordersView === 'table' && (
                        <button
                          onClick={() => setActiveTab('home')}
                          className="neo-brutal-btn bg-primary-container text-on-primary-container px-6 py-2 rounded-lg font-label-bold text-label-bold cursor-pointer"
                        >
                          Go to Floor Plan
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredOrders.map(order => (
                        <OrderListItem key={order.id} order={order} onOpenOrder={handleOpenOrder} />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* VIEW 3: MENU MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-end pb-2 select-none">
              <button
                onClick={() => {
                  setSelectedMenuItem(undefined);
                  setIsMenuModalOpen(true);
                }}
                className="w-full lg:w-auto neo-brutal-btn bg-primary-container text-on-primary-container px-5 py-3 rounded-lg font-label-bold text-label-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle size={16} className="stroke-[2.5]" />
                Add Menu Item
              </button>
            </div>

            {/* Filter and Search controls */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Category tabs */}
              <div className="flex overflow-x-auto gap-2 pb-1.5 md:pb-0 flex-1 no-scrollbar">
                {(['all', 'sandwich', 'slice', 'pizza', 'maggi', 'milkshake', 'puff', 'bhel', 'fries', 'burger', 'tea-coffee', 'thepla-paratha', 'extra'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setMenuFilter(cat)}
                    className={`px-4 py-2 rounded-lg font-label-bold text-[13px] border-2 border-on-surface capitalize whitespace-nowrap transition-all select-none ${menuFilter === cat
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface hover:bg-surface-container-high'
                      }`}
                  >
                    {cat === 'all' 
                      ? 'All' 
                      : cat === 'tea-coffee' 
                        ? 'Tea / Coffee' 
                        : cat === 'thepla-paratha' 
                          ? 'Thepla / Paratha' 
                          : cat}
                  </button>
                ))}
              </div>

              {/* Search bar */}
              <div className="relative md:w-80">
                <input
                  type="text"
                  placeholder="Search item name..."
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                  className="w-full neo-brutal-input pl-10 pr-4 py-2 text-[14px] rounded-lg shadow-[2px_2px_0px_0px_rgba(30,27,21,1)]"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 stroke-[2.5]" />
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {menu
                .filter(item => menuFilter === 'all' ? true : item.category === menuFilter)
                .filter(item => item.name.toLowerCase().includes(menuSearch.toLowerCase()))
                .map(item => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    onEdit={() => {
                      setSelectedMenuItem(item);
                      setIsMenuModalOpen(true);
                    }}
                  />
                ))
              }
            </div>
          </div>
        )}

        {/* VIEW 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="font-display-lg text-[32px] md:text-display-lg leading-tight">
                App Settings
              </h1>
              <p className="font-body-md text-on-surface-variant font-medium">
                {isOwner ? 'Store configuration, tables, staff and data resets.' : 'Your account and cafe workspace.'}
              </p>
            </div>

            {/* Account & Session Info Card */}
            <div className="neo-brutal-card bg-surface rounded-xl p-6 space-y-4">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 border-b-2 border-on-surface pb-2">
                <User size={20} className="stroke-[2.5]" />
                Active Session & Role
              </h3>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-surface-container-low rounded-lg border-2 border-black">
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">Logged In Account</span>
                    <span className="font-headline-md text-[16px] font-bold text-black">{userEmail || 'Unknown'}</span>
                  </div>
                  <span className="mt-2 sm:mt-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-[13px] bg-[#ffd982] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                    {userRole ? ROLE_BADGES[userRole] : '—'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface-container-low rounded-lg border-2 border-black">
                  <div>
                    <span className="block text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">Cafe</span>
                    <span className="font-headline-md text-[16px] font-bold text-black">{cafeName}</span>
                  </div>
                  <span className="mt-1 sm:mt-0 text-[11px] font-bold bg-[#b2f0cf] text-[#006e3a] px-2 py-0.5 rounded border border-black">
                    Scoped Workspace
                  </span>
                </div>
              </div>
            </div>

            {!isOwner && (
              <div className="neo-brutal-card bg-surface rounded-xl p-6 flex items-start gap-3">
                <Lock size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
                <p className="font-body-md text-[13.5px] text-on-surface-variant font-medium">
                  Store settings, tables, staff and data resets can only be changed by an owner of this cafe.
                </p>
              </div>
            )}

            {isOwner && (
            <>
            {/* Configuration Forms */}
            <div className="neo-brutal-card bg-surface rounded-xl p-6 space-y-6">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 border-b-2 border-on-surface pb-2">
                <Sliders size={20} className="stroke-[2.5]" />
                General Info
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block font-label-bold text-label-bold text-on-surface mb-1">
                    Store Brand Name
                  </label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={e => updateSettings({ ...settings, storeName: e.target.value })}
                    className="w-full neo-brutal-input text-[14px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-bold text-label-bold text-on-surface mb-1">
                      Local Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      max={0.5}
                      value={settings.taxRate}
                      onChange={e => updateSettings({ ...settings, taxRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className="w-full neo-brutal-input text-[14px]"
                    />
                  </div>

                  <div>
                    <label className="block font-label-bold text-label-bold text-on-surface mb-1">
                      Billing Currency
                    </label>
                    <input
                      type="text"
                      value={settings.currency}
                      onChange={e => updateSettings({ ...settings, currency: e.target.value })}
                      className="w-full neo-brutal-input text-[14px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Manage Tables Card */}
            <div className="neo-brutal-card bg-surface rounded-xl p-6 space-y-6">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 border-b-2 border-on-surface pb-2 select-none">
                <Armchair size={20} className="stroke-[2.5]" />
                Manage Tables
              </h3>

              {/* Success and Error Alerts */}
              {tableError && (
                <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] border-2 border-black rounded-lg font-bold text-[14px]">
                  {tableError}
                </div>
              )}
              {tableSuccess && (
                <div className="p-3 bg-[#b2f0cf] text-[#006e3a] border-2 border-black rounded-lg font-bold text-[14px]">
                  {tableSuccess}
                </div>
              )}

              {/* Table List */}
              <div className="space-y-3">
                <h4 className="font-label-bold text-label-bold text-on-surface select-none">
                  Current Tables ({tables.length})
                </h4>
                {tables.length === 0 ? (
                  <p className="text-on-surface-variant font-medium text-[14px] italic py-2">
                    No tables configured. Add a table below.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1 no-scrollbar">
                    {tables.map(table => {
                      const isOccupied = table.status === 'occupied';
                      return (
                        <div
                          key={table.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000000] transition-all ${
                            isOccupied ? 'bg-[#ffdad6]' : 'bg-[#b2f0cf]'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-headline-md font-bold text-[18px] text-black">
                              Table {table.number}
                            </span>
                            <span className="text-[12px] font-semibold text-black/70 flex items-center gap-1 mt-0.5">
                              {table.capacity} Seaters • {table.isOutdoor ? 'Outdoor' : 'Indoor'}
                              {isOccupied && (
                                <span className="bg-[#ba1a1a] text-white px-1.5 py-0.2 rounded text-[10px] uppercase font-extrabold border border-black ml-1.5">
                                  Occupied
                                </span>
                              )}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveTable(table.id, table.number)}
                            className="p-2 bg-white text-black hover:bg-error-container hover:text-error border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                            title={`Delete Table ${table.number}`}
                          >
                            <Trash2 size={16} className="stroke-[2.5]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Table Form */}
              <form onSubmit={handleAddTable} className="border-t-2 border-on-surface pt-4.5 space-y-4">
                <h4 className="font-label-bold text-label-bold text-on-surface select-none">
                  Add New Table
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-label-bold text-[12px] text-on-surface mb-1">
                      Table Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. T-7"
                      value={newTableNumber}
                      onChange={e => setNewTableNumber(e.target.value)}
                      className="w-full neo-brutal-input text-[14px] py-2 px-3 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block font-label-bold text-[12px] text-on-surface mb-1">
                      Capacity (Seaters)
                    </label>
                    <select
                      value={newTableCapacity}
                      onChange={e => setNewTableCapacity(parseInt(e.target.value))}
                      className="w-full neo-brutal-input text-[14px] py-2 px-3 rounded-lg bg-surface border-2 border-black font-semibold shadow-[2px_2px_0px_0px_#000000]"
                    >
                      <option value={2}>2 Seater</option>
                      <option value={4}>4 Seater</option>
                      <option value={6}>6 Seater</option>
                      <option value={8}>8 Seater</option>
                      <option value={10}>10 Seater</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-label-bold text-[12px] text-on-surface mb-1">
                      Zone / Location
                    </label>
                    <div className="flex items-center h-10 gap-4">
                      <label className="flex items-center gap-2 font-body-md text-[14px] cursor-pointer font-bold select-none">
                        <input
                          type="checkbox"
                          checked={newTableIsOutdoor}
                          onChange={e => setNewTableIsOutdoor(e.target.checked)}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        Outdoor Area
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full neo-brutal-btn bg-primary-container text-on-primary-container py-3 rounded-lg font-label-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_#000000] border-2 border-black"
                >
                  <Plus size={16} className="stroke-[3]" />
                  Add Table to Floor
                </button>
              </form>
            </div>

            {/* Staff & Roles */}
            <StaffManager />

            {/* Store Layout & Menu Reset (Danger Zone) */}
            <div className="neo-brutal-card bg-[#fff5f5] border-3 border-[#ba1a1a] rounded-xl p-6 space-y-4 shadow-[4px_4px_0px_0px_#ba1a1a]">
              <h3 className="font-headline-md text-headline-md text-[#ba1a1a] flex items-center gap-2 border-b-2 border-[#ba1a1a]/30 pb-2 select-none">
                <AlertTriangle size={20} className="stroke-[2.5]" />
                Store Layout & Menu Reset
              </h3>

              <p className="font-body-md text-[13px] text-black/80 font-medium">
                Setting up a fresh cafe or resetting this branch? You can clear tables, custom menu, or order history safely below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModal('tables')}
                  className="neo-brutal-btn bg-white hover:bg-red-50 text-[#ba1a1a] border-2 border-black py-2.5 px-3 rounded-lg font-bold text-[13px] shadow-[2px_2px_0px_0px_#000000] cursor-pointer text-center"
                >
                  Clear Table Layout
                </button>

                <button
                  type="button"
                  onClick={() => setResetModal('menu')}
                  className="neo-brutal-btn bg-white hover:bg-red-50 text-[#ba1a1a] border-2 border-black py-2.5 px-3 rounded-lg font-bold text-[13px] shadow-[2px_2px_0px_0px_#000000] cursor-pointer text-center"
                >
                  Clear All Menu Items
                </button>

                <button
                  type="button"
                  onClick={() => setResetModal('orders')}
                  className="neo-brutal-btn bg-white hover:bg-red-50 text-[#ba1a1a] border-2 border-black py-2.5 px-3 rounded-lg font-bold text-[13px] shadow-[2px_2px_0px_0px_#000000] cursor-pointer text-center"
                >
                  Clear All Orders
                </button>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* VIEW 5: PERFORMANCE REPORTS */}
        {activeTab === 'reports' && <ReportsView />}

      </main>

      {/* BOTTOM NAV (Mobile viewports only) */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* MODALS AND PANELS */}
      <AnimatePresence>
        {selectedTable && isTableModalOpen && (
          <TableModal
            key={selectedTable.id}
            table={selectedTable}
            isOpen={isTableModalOpen}
            onClose={() => {
              setIsTableModalOpen(false);
              setSelectedTable(null);
            }}
            onOpenOrder={handleOpenOrder}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeOrderTableId && (
          <OrderPanel
            key={activeOrderTableId}
            tableId={activeOrderTableId}
            isOpen={activeOrderTableId !== null}
            onClose={() => setActiveOrderTableId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuModalOpen && (
          <MenuModal
            key={selectedMenuItem?.id || 'new'}
            item={selectedMenuItem}
            isOpen={isMenuModalOpen}
            onClose={() => {
              setIsMenuModalOpen(false);
              setSelectedMenuItem(undefined);
            }}
          />
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {resetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !resetLoading && setResetModal(null)}
              className="absolute inset-0 bg-on-surface/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              className="relative bg-surface w-full max-w-sm p-6 rounded-xl border-3 border-black shadow-[8px_8px_0px_0px_#000000] z-10 text-black space-y-4"
            >
              <div className="flex items-center gap-2.5 text-[#ba1a1a]">
                <AlertTriangle size={24} className="stroke-[2.5]" />
                <h3 className="font-headline-md text-[20px] font-bold">
                  {resetModal === 'tables' && 'Clear All Tables?'}
                  {resetModal === 'menu' && 'Clear All Menu Items?'}
                  {resetModal === 'orders' && 'Clear All Orders?'}
                </h3>
              </div>

              <p className="text-[13.5px] font-medium text-on-surface-variant">
                {resetModal === 'tables' && 'This will remove all floor plan tables for this cafe. You can add new tables anytime.'}
                {resetModal === 'menu' && 'This will remove all menu items for this cafe. You will be able to add custom items from scratch.'}
                {resetModal === 'orders' && 'This will delete all past and active orders for this cafe and reset tables to available.'}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={() => setResetModal(null)}
                  className="flex-1 neo-brutal-btn bg-white text-black py-2.5 rounded-lg font-bold text-[13px] border-2 border-black shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={resetLoading}
                  onClick={handleExecuteReset}
                  className="flex-1 neo-brutal-btn bg-[#ba1a1a] text-white py-2.5 rounded-lg font-bold text-[13px] border-2 border-black shadow-[2px_2px_0px_0px_#000000] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {resetLoading ? 'Clearing...' : 'Confirm Clear'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import { AuthProvider } from './context/AuthContext';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { CookDashboard } from './components/CookDashboard';
import { CreateCafe } from './components/CreateCafe';

const MainApp: React.FC = () => {
  const { session, loading, userRole, cafeId, isPasswordReset, membershipError, refreshMembership, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-body-md text-sm font-semibold text-on-surface">Initializing system...</span>
        </div>
      </div>
    );
  }

  // Show password reset UI when user arrives via the email link
  if (isPasswordReset && session) {
    return <ResetPassword />;
  }

  if (!session) {
    return <Login />;
  }

  if (membershipError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm neo-brutal-card bg-surface p-6 space-y-4 text-center">
          <AlertTriangle size={32} className="mx-auto text-[#ba1a1a] stroke-[2.5]" />
          <h2 className="font-headline-md text-[20px] font-bold">Can&apos;t reach the server</h2>
          <p className="text-[13.5px] font-medium text-on-surface-variant">{membershipError}</p>
          <div className="flex gap-3">
            <button
              onClick={signOut}
              className="flex-1 neo-brutal-btn bg-white text-black py-2.5 rounded-lg font-bold text-[13px] border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={14} className="stroke-[2.5]" /> Sign out
            </button>
            <button
              onClick={refreshMembership}
              className="flex-1 neo-brutal-btn bg-primary-container text-on-primary-container py-2.5 rounded-lg font-bold text-[13px] border-2 border-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className="stroke-[2.5]" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but not part of any cafe yet -> create one (becomes owner)
  if (!cafeId || !userRole) {
    return <CreateCafe />;
  }

  // Show Kitchen Display System for cook role
  if (userRole === 'cook') {
    return <CookDashboard />;
  }

  // Owner & counter: full management portal (owner-only sections are gated inside)
  return (
    <CafeProvider>
      <DashboardContent />
    </CafeProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};
export default App;

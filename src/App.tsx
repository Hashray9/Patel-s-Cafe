import React, { useState } from 'react';
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
  Sparkles,
  Plus,
  Search,
  ReceiptText,
  PlusCircle,
  Sliders,
  RefreshCw
} from 'lucide-react';

const DashboardContent: React.FC = () => {
  const {
    tables,
    orders,
    menu,
    settings,
    updateSettings,
    simulateData
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



  // Quick Action: Place a walk-in counter order
  const handleQuickWalkIn = () => {
    handleOpenOrder('walk-in-' + Date.now());
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setIsTableModalOpen(true);
  };

  const handleOpenOrder = (tableId: string) => {
    setActiveOrderTableId(tableId);
  };

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
                      <p className="font-body-md text-on-surface-variant font-medium">
                        {ordersView === 'table'
                          ? "No active table orders at the moment. Seat walk-in guests at tables to assign orders."
                          : "No active counter or walk-in takeaway orders. Click '+ New Walk-in Order' to create one."
                        }
                      </p>
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
                Store config options and simulation diagnostics tool.
              </p>
            </div>

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

            {/* Diagnostics and Mock data Feed */}
            <div className="neo-brutal-card bg-surface rounded-xl p-6 space-y-4">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 border-b-2 border-on-surface pb-2">
                <RefreshCw size={18} className="stroke-[2.5] text-primary" />
                Data Simulation Mode
              </h3>
              <p className="font-body-md text-[14px] text-on-surface-variant font-medium">
                Need to demonstrate the app with active customers? The simulation tool will populate dummy seated orders, timers, and reservations.
              </p>

              <button
                onClick={() => {
                  simulateData();
                  alert("Live mock feed simulated! Head to Floor Plan or Orders page.");
                }}
                className="w-full neo-brutal-btn bg-secondary-container text-on-secondary-container py-3 rounded-lg font-label-bold text-[14px] flex items-center justify-center gap-2"
              >
                <Sparkles size={16} className="stroke-[2.5] text-secondary" />
                Populate Live Mock Feed
              </button>
            </div>
          </div>
        )}

        {/* VIEW 5: PERFORMANCE REPORTS */}
        {activeTab === 'reports' && <ReportsView />}

      </main>

      {/* BOTTOM NAV (Mobile viewports only) */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* MODALS AND PANELS */}
      {selectedTable && (
        <TableModal
          table={selectedTable}
          isOpen={isTableModalOpen}
          onClose={() => {
            setIsTableModalOpen(false);
            setSelectedTable(null);
          }}
          onOpenOrder={handleOpenOrder}
        />
      )}

      {activeOrderTableId && (
        <OrderPanel
          tableId={activeOrderTableId}
          isOpen={activeOrderTableId !== null}
          onClose={() => setActiveOrderTableId(null)}
        />
      )}

      <MenuModal
        item={selectedMenuItem}
        isOpen={isMenuModalOpen}
        onClose={() => {
          setIsMenuModalOpen(false);
          setSelectedMenuItem(undefined);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CafeProvider>
      <DashboardContent />
    </CafeProvider>
  );
};
export default App;

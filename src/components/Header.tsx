import React from 'react';
import { Coffee, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useCafe } from '../context/CafeContext';
import { supabase } from '../supabaseClient';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { settings, orders } = useCafe();
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <header className="fixed top-0 w-full z-40 bg-primary text-on-primary flex justify-between items-center px-4 md:px-8 h-16 border-b-3 border-on-surface shadow-[4px_4px_0px_0px_rgba(30,27,21,1)]">
      <div className="flex items-center gap-3">
        <div className="bg-primary-container text-on-primary-container p-1.5 rounded-md border-2 border-on-surface flex items-center justify-center transform hover:rotate-12 transition-transform duration-200 cursor-pointer">
          <Coffee size={22} className="stroke-[2.5]" />
        </div>
        <span className="font-headline-md text-[20px] md:text-headline-md font-bold tracking-tight text-on-primary select-none">
          {settings.storeName}
        </span>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => setActiveTab('home')}
            className={`font-label-bold text-label-bold text-on-primary pb-1 transition-all border-b-2 hover:border-on-primary ${
              activeTab === 'home' ? 'border-on-primary font-bold' : 'border-transparent opacity-80 hover:opacity-100'
            }`}
          >
            Floor Plan
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`font-label-bold text-label-bold text-on-primary pb-1 transition-all border-b-2 hover:border-on-primary flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'border-on-primary font-bold' : 'border-transparent opacity-80 hover:opacity-100'
            }`}
          >
            Orders
            {pendingCount > 0 && (
              <span className="bg-error text-on-error text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-on-surface">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`font-label-bold text-label-bold text-on-primary pb-1 transition-all border-b-2 hover:border-on-primary ${
              activeTab === 'menu' ? 'border-on-primary font-bold' : 'border-transparent opacity-80 hover:opacity-100'
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`font-label-bold text-label-bold text-on-primary pb-1 transition-all border-b-2 hover:border-on-primary ${
              activeTab === 'reports' ? 'border-on-primary font-bold' : 'border-transparent opacity-80 hover:opacity-100'
            }`}
          >
            Reports
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-lg border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none hover:bg-surface-container-high ${
              activeTab === 'settings'
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-white text-black'
            }`}
            title="Open App Settings"
          >
            <SettingsIcon size={18} className="stroke-[2.5]" />
          </button>

          <button
            onClick={async () => {
              if (window.confirm("Are you sure you want to log out of Patel's Cafe?")) {
                await supabase.auth.signOut();
              }
            }}
            className="p-2 rounded-lg border-2 border-black bg-white text-black hover:bg-error-container hover:text-error transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none"
            title="Log Out"
          >
            <LogOut size={18} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </header>
  );
};

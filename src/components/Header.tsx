import React, { useState } from 'react';
import { Coffee, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useCafe } from '../context/CafeContext';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { settings, orders } = useCafe();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <>
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
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-lg border-2 border-black bg-white text-black hover:bg-error-container hover:text-error transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none"
              title="Log Out"
            >
              <LogOut size={18} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* Neo-Brutalist Log Out Confirmation Dialog */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />

            {/* Modal Window */}
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-surface w-full max-w-sm p-6 rounded-xl border-3 border-on-surface shadow-[8px_8px_0px_0px_rgba(30,27,21,1)] z-10 flex flex-col items-center gap-5 text-center"
            >
              {/* Heading Icon */}
              <div className="bg-error-container text-on-error-container p-3 rounded-xl border-2 border-black inline-flex items-center justify-center transform -rotate-6 shadow-[3px_3px_0px_0px_#000000]">
                <LogOut size={26} className="stroke-[2.5]" />
              </div>

              <div>
                <h3 className="font-headline-md text-[20px] font-bold text-on-surface">
                  Sign Out of Session?
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant/90 mt-2">
                  Are you sure you want to log out of Patel's Cafe? You will need to input credentials to access the floor plan and menu again.
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
                    await supabase.auth.signOut();
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
    </>
  );
};

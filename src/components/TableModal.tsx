import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, CreditCard, Armchair } from 'lucide-react';
import type { Table } from '../types';
import { useCafe } from '../context/CafeContext';

interface TableModalProps {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  onOpenOrder: (tableId: string) => void;
}

export const TableModal: React.FC<TableModalProps> = ({ table, isOpen, onClose, onOpenOrder }) => {
  const { updateTableStatus, orders, updateOrderStatus, clearTable, settings } = useCafe();

  if (!isOpen) return null;

  const activeOrder = orders.find(o => o.tableId === table.id && o.status !== 'paid');

  const handleWalkIn = () => {
    updateTableStatus(table.id, 'occupied');
    onClose();
    onOpenOrder(table.id);
  };

  const handleCheckout = () => {
    if (activeOrder) {
      updateOrderStatus(activeOrder.id, 'paid');
    } else {
      clearTable(table.id);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 15, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-surface w-full max-w-md p-6 rounded-xl border-3 border-on-surface shadow-[8px_8px_0px_0px_rgba(30,27,21,1)] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-on-surface">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Manage Table {table.number}
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant/80">
                Current Status: <span className="capitalize font-bold">{table.status}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md border-2 border-on-surface hover:bg-surface-container-high active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(30,27,21,1)] transition-all bg-surface"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Body Content depending on state */}
          <div className="mb-6 space-y-4">
            
            {/* CAPACITY BLOCK */}
            <div className="bg-surface-container-low p-3.5 rounded-lg border-2 border-on-surface">
              <div className="flex items-center gap-2 text-on-surface">
                <Armchair size={18} className="stroke-[2.5]" />
                <span className="font-body-md text-body-md font-bold">{table.capacity} Seaters Available</span>
              </div>
            </div>

            {/* AVAILABLE TABLE UI */}
            {table.status === 'available' && (
              <div className="space-y-4">
                <button
                  onClick={handleWalkIn}
                  className="w-full neo-brutal-btn bg-primary-container text-on-primary-container p-4 rounded-xl font-headline-md text-[18px] flex items-center justify-center gap-2"
                >
                  <Play size={18} className="stroke-[2.5] fill-current" />
                  Seat Walk-in Guests
                </button>
              </div>
            )}

            {/* OCCUPIED TABLE UI */}
            {table.status === 'occupied' && (
              <div className="space-y-3">
                {activeOrder ? (
                  <div className="bg-surface-container p-4 rounded-xl border-2 border-on-surface">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-label-bold text-label-bold text-on-surface-variant">
                        Order #{activeOrder.id.substring(4, 9)}
                      </span>
                      <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-on-surface">
                        {activeOrder.status}
                      </span>
                    </div>
                    <div className="text-[20px] font-headline-md font-bold mb-3">
                      Total: {settings.currency}{activeOrder.total.toFixed(2)}
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenOrder(table.id);
                      }}
                      className="w-full neo-brutal-btn bg-surface text-on-surface py-2.5 rounded-lg font-label-bold text-[14px] flex items-center justify-center gap-1.5"
                    >
                      View & Manage Items
                    </button>
                  </div>
                ) : (
                  <div className="bg-surface-container p-4 rounded-xl border-2 border-on-surface text-center">
                    <p className="font-body-md text-body-md text-on-surface-variant mb-3">
                      Guests seated but no active items ordered yet.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenOrder(table.id);
                      }}
                      className="w-full neo-brutal-btn bg-primary-container text-on-primary-container py-2.5 rounded-lg font-label-bold text-[14px]"
                    >
                      Take Order
                    </button>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  className="w-full neo-brutal-btn bg-tertiary-fixed text-on-surface p-3 rounded-xl font-label-bold text-[15px] flex items-center justify-center gap-2"
                >
                  <CreditCard size={18} className="stroke-[2.5]" />
                  Finalize Bill & Clear Table
                </button>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default TableModal;

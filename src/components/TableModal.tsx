import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Link, User, Users } from 'lucide-react';
import type { Table } from '../types';
import { useCafe } from '../context/CafeContext';

interface TableModalProps {
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  onOpenOrder: (tableId: string) => void;
}

export const TableModal: React.FC<TableModalProps> = ({ table, isOpen, onClose, onOpenOrder }) => {
  const { updateTableStatus, orders, updateOrderStatus, clearTable, settings, seatGroup, tables } = useCafe();
  const [modalView, setModalView] = React.useState<'main' | 'seat-group'>('main');
  const [selectedTables, setSelectedTables] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setModalView('main');
      setSelectedTables([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeOrder = table.currentOrderId
    ? orders.find(o => o.id === table.currentOrderId && o.status !== 'paid')
    : orders.find(o => o.tableId === table.id && o.status !== 'paid');

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
                Manage Table {table.number} {table.groupId && '(Group)'}
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

          {modalView === 'main' ? (
            /* Main Seating / Managing View */
            <div className="space-y-4">
              

              {/* AVAILABLE TABLE UI */}
              {table.status === 'available' && (
                <div className="space-y-4">
                  <button
                    onClick={handleWalkIn}
                    className="w-full neo-brutal-btn bg-primary-container text-on-primary-container p-4 rounded-xl font-headline-md text-[18px] flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(30,27,21,1)] border-3 border-on-surface cursor-pointer"
                  >
                    <User size={18} className="stroke-[2.5]" />
                    Individual
                  </button>
                  <button
                    onClick={() => setModalView('seat-group')}
                    className="w-full neo-brutal-btn bg-secondary-container text-on-secondary-container p-4 rounded-xl font-headline-md text-[18px] flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(30,27,21,1)] border-3 border-on-surface cursor-pointer"
                  >
                    <Users size={18} className="stroke-[2.5]" />
                    Group
                  </button>
                </div>
              )}

              {/* OCCUPIED TABLE UI */}
              {table.status === 'occupied' && (
                <div className="space-y-3">
                  {table.groupId && (
                    <div className="bg-[#d8e2ff] text-[#001a43] p-3.5 rounded-lg border-2 border-on-surface flex items-center gap-2 font-bold select-none">
                      <Link size={18} className="stroke-[3]" />
                      <span>
                        Group Seating: {tables.filter(t => t.groupId === table.groupId).map(t => t.number).sort((a, b) => a.localeCompare(b)).join(' + ')}
                      </span>
                    </div>
                  )}

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
                    {table.groupId ? 'Finalize Bill & Clear Group' : 'Finalize Bill & Clear Table'}
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* Seating Group Selection View */
            <div className="space-y-4">

              {/* Visual Floor Map Grid */}
              <div className="space-y-2">
                <h4 className="font-label-bold text-label-bold text-on-surface select-none">
                  Restaurant Floor Layout
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1 no-scrollbar pt-1">
                  {tables.map(t => {
                    const isCurrent = t.id === table.id;
                    const isOccupied = t.status === 'occupied';
                    const isChecked = selectedTables.includes(t.id);
                    
                    // Compute styling for mini-nodes
                    let nodeStyle = '';
                    if (isCurrent || isChecked) {
                      nodeStyle = 'bg-[#ffd982] border-black text-black border-[3px] shadow-[3px_3px_0px_0px_#000000]';
                    } else if (isOccupied) {
                      nodeStyle = 'bg-[#ffdad6] border-black/25 text-black/35 cursor-not-allowed border-2 opacity-50';
                    } else {
                      nodeStyle = 'bg-surface hover:bg-surface-container-high border-black border-2 cursor-pointer shadow-[2px_2px_0px_0px_#000000]';
                    }

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          if (isCurrent || isOccupied) return;
                          if (isChecked) {
                            setSelectedTables(prev => prev.filter(id => id !== t.id));
                          } else {
                            setSelectedTables(prev => [...prev, t.id]);
                          }
                        }}
                        className={`p-3 rounded-lg flex flex-col justify-between select-none transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[70px] ${nodeStyle}`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="font-bold text-[15px]">{t.number}</span>
                          {isCurrent && (
                            <span className="text-[9px] bg-black text-[#ffd982] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-tight">
                              Self
                            </span>
                          )}
                          {isChecked && (
                            <span className="text-[9px] bg-black text-[#ffd982] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-tight">
                              Link
                            </span>
                          )}
                          {isOccupied && !isCurrent && (
                            <span className="text-[9px] bg-black/15 text-black/40 px-1 py-0.2 rounded font-extrabold uppercase tracking-tight">
                              Busy
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] opacity-75 mt-2 font-semibold">
                          {t.capacity} Seaters {t.isOutdoor ? '• Out' : '• In'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalView('main')}
                  className="flex-1 neo-brutal-btn bg-surface text-on-surface py-3 rounded-xl font-label-bold text-[14px] border-2 border-black shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={selectedTables.length === 0}
                  onClick={() => {
                    seatGroup([table.id, ...selectedTables]);
                    onClose();
                    onOpenOrder(table.id);
                  }}
                  className="flex-1 neo-brutal-btn bg-[#ffd982] text-black py-3 rounded-xl font-label-bold text-[14px] border-2 border-black shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
                >
                  Confirm & Seat Group
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default TableModal;

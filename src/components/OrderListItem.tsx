import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, PlusCircle, CreditCard } from 'lucide-react';
import type { Order } from '../types';
import { useCafe } from '../context/CafeContext';

interface OrderListItemProps {
  order: Order;
  onOpenOrder: (tableId: string) => void;
}

export const OrderListItem: React.FC<OrderListItemProps> = ({ order, onOpenOrder }) => {
  const { menu, settings, updateOrderStatus } = useCafe();
  const [isOpen, setIsOpen] = useState(false);

  const [showConfirmPaid, setShowConfirmPaid] = useState(false);

  const handlePaid = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent toggling collapse when clicking paid button
    setShowConfirmPaid(true);
  };

  const handleUpdate = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent toggling collapse when clicking update button
    onOpenOrder(order.tableId);
  };

  return (
    <motion.div
      layout
      className="bg-surface border-2 border-on-surface rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(30,27,21,1)] flex flex-col"
    >
      {/* Primary header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between min-h-[64px] cursor-pointer hover:bg-surface-container-low select-none transition-colors border-b-2 border-on-surface"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="bg-inverse-surface text-inverse-on-surface px-3 py-1.5 rounded-lg border-2 border-on-surface font-headline-md text-[16px] tracking-tight">
            {order.tableNumber}
          </div>

          <div className="min-w-0">
            <h4 className="font-label-bold text-[14px] text-on-surface flex items-center gap-2">
              Order #{order.id.substring(4, 9)}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="bg-[#ffd982] text-black px-2.5 py-1 rounded-md text-[13px] font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
            {settings.currency}{order.total.toFixed(2)}
          </span>
          {isOpen ? <ChevronUp size={20} className="stroke-[2.5]" /> : <ChevronDown size={20} className="stroke-[2.5]" />}
        </div>
      </div>

      {/* Button Row - Always visible for quick access */}
      <div className="p-3 bg-surface-container flex gap-2.5 border-b-2 border-on-surface select-none">
        <button
          onClick={handleUpdate}
          className="flex-1 neo-brutal-btn bg-white text-black py-2 rounded-lg font-label-bold text-[13px] flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000000]"
        >
          <PlusCircle size={15} className="stroke-[2.5]" />
          Update Order
        </button>

        <button
          onClick={handlePaid}
          className="flex-1 neo-brutal-btn bg-[#b2f0cf] text-black py-2 rounded-lg font-label-bold text-[13px] flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_#000000]"
        >
          <CreditCard size={15} className="stroke-[2.5]" />
          Mark Paid
        </button>
      </div>

      {/* Collapsible item summary list */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden bg-surface-container-lowest"
          >
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="font-label-bold text-[11px] text-on-surface-variant uppercase tracking-wider">
                  Ordered Items
                </p>
                <div className="divide-y-2 divide-on-surface/10">
                  {order.items.map((item, idx) => {
                    const menuItem = menu.find(m => m.id === item.menuItemId);
                    return (
                      <div key={idx} className="py-2 flex justify-between items-start text-[14px]">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-on-surface">
                            {item.quantity}x {menuItem?.name || 'Unknown Item'}
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-on-tertiary-container font-semibold mt-0.5 bg-tertiary-container px-2 py-0.5 rounded border border-on-surface/15 inline-block">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-on-surface">
                          {settings.currency}{((menuItem?.price || 0) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pricing totals */}
              <div className="pt-3 border-t-2 border-dashed border-on-surface/20 flex flex-col items-end gap-1">
                <div className="text-[12px] font-bold text-on-surface-variant flex justify-between w-full max-w-[200px]">
                  <span>Subtotal:</span>
                  <span>{settings.currency}{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="text-[12px] font-bold text-on-surface-variant flex justify-between w-full max-w-[200px]">
                  <span>Tax:</span>
                  <span>{settings.currency}{order.tax.toFixed(2)}</span>
                </div>
                <div className="text-[15px] font-headline-md font-bold text-on-surface flex justify-between w-full max-w-[200px] pt-1 border-t-2 border-on-surface">
                  <span>Total:</span>
                  <span>{settings.currency}{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-app Payment Confirmation Modal */}
      <AnimatePresence>
        {showConfirmPaid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmPaid(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-xs cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative bg-surface w-full max-w-sm p-6 rounded-xl border-3 border-black shadow-[8px_8px_0px_0px_#000000] z-10 select-none text-black"
            >
              <h3 className="font-headline-md text-[20px] font-bold border-b-2 border-black pb-2 mb-3">
                Confirm Payment
              </h3>
              
              <p className="font-body-md text-[14px] text-on-surface-variant font-semibold mb-6">
                Has the customer at <span className="font-bold text-black">{order.tableNumber}</span> paid their bill of <span className="font-bold text-black">{settings.currency}{order.total.toFixed(2)}</span>?
                <span className="block mt-2 text-[12.5px] text-error font-medium">
                  {order.tableId.startsWith('walk-in') 
                    ? "This will complete and clear this counter order."
                    : "This will empty the table and clear its active order database."
                  }
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmPaid(false)}
                  className="flex-1 neo-brutal-btn bg-white text-black py-2.5 rounded-lg font-label-bold text-[13px] shadow-[2.5px_2.5px_0px_0px_#000000] border-2 border-black hover:bg-surface-container-high transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateOrderStatus(order.id, 'paid');
                    setShowConfirmPaid(false);
                  }}
                  className="flex-1 neo-brutal-btn bg-[#b2f0cf] text-black py-2.5 rounded-lg font-label-bold text-[13px] shadow-[2.5px_2.5px_0px_0px_#000000] border-2 border-black hover:bg-surface-container-high transition-all cursor-pointer font-bold animate-pulse"
                >
                  Confirm Paid
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default OrderListItem;

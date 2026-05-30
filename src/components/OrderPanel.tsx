import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCafe } from '../context/CafeContext';
import type { OrderItem, MenuItem } from '../types';

interface OrderPanelProps {
  tableId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({ tableId, isOpen, onClose }) => {
  const { tables, menu, orders, createOrder, settings } = useCafe();
  const isWalkIn = tableId.startsWith('walk-in');
  const table = isWalkIn
    ? { id: tableId, number: 'Walk-in', capacity: 0 }
    : tables.find(t => t.id === tableId);
  const activeOrder = orders.find(o => o.tableId === tableId && o.status !== 'paid');

  // local cart state
  const [cart, setCart] = useState<OrderItem[]>(() => {
    if (activeOrder) {
      return [...activeOrder.items];
    }
    return [];
  });

  const [activeCategory, setActiveCategory] = useState<'all' | MenuItem['category']>('all');

  if (!isOpen || !table) return null;

  const categories: ('all' | MenuItem['category'])[] = ['all', 'sandwich', 'slice', 'pizza', 'maggi', 'milkshake', 'puff', 'bhel', 'fries', 'burger', 'tea-coffee', 'thepla-paratha', 'extra'];

  const filteredMenu = activeCategory === 'all' 
    ? menu.filter(item => item.isAvailable)
    : menu.filter(item => item.category === activeCategory && item.isAvailable);

  const handleAddToCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === itemId);
      if (existing) {
        return prev.map(i => i.menuItemId === itemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItemId: itemId, quantity: 1, notes: '' }];
    });
  };

  const handleUpdateQuantity = (itemId: string, change: number) => {
    setCart(prev => {
      return prev.map(i => {
        if (i.menuItemId === itemId) {
          const newQty = i.quantity + change;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean) as OrderItem[];
    });
  };

  const getItemQty = (itemId: string) => {
    return cart.find(c => c.menuItemId === itemId)?.quantity || 0;
  };

  const calculateSubtotal = () => {
    return cart.reduce((acc, curr) => {
      const item = menu.find(m => m.id === curr.menuItemId);
      return acc + (item ? item.price * curr.quantity : 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const tax = parseFloat((subtotal * settings.taxRate).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  const handleSubmit = () => {
    if (cart.length === 0) return;
    createOrder(table.id, cart);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-surface/40 backdrop-blur-xs"
        />

        {/* Panel Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative bg-surface w-full max-w-lg md:max-w-xl h-full border-l-[3px] border-black shadow-[-6px_0px_0px_0px_#000000] flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 border-b-[3px] border-black flex justify-between items-center bg-primary text-on-primary select-none">
            <div>
              <h2 className="font-headline-md text-headline-md leading-none">
                Order: {isWalkIn ? 'Walk-in' : `Table ${table.number}`}
              </h2>
              {!isWalkIn && (
                <p className="font-label-sm text-[11px] mt-1 text-on-primary/90">
                  Seating capacity: {table.capacity} guests
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md border-2 border-black hover:bg-surface-container-high text-black active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_#000000] transition-all bg-surface"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Categories Navigation */}
          <div className="p-3 bg-surface-container-low border-b-2 border-black overflow-x-auto flex gap-2 no-scrollbar select-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg font-label-bold text-[12px] whitespace-nowrap border-2 border-black transition-all select-none ${
                  activeCategory === cat
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'bg-surface hover:bg-surface-container-high hover:translate-y-[1px]'
                }`}
              >
                <span className="capitalize">
                  {cat === 'all' 
                    ? 'All Items' 
                    : cat === 'tea-coffee' 
                      ? 'Tea / Coffee' 
                      : cat === 'thepla-paratha' 
                        ? 'Thepla / Paratha' 
                        : cat}
                </span>
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-background">
            {filteredMenu.length === 0 ? (
              <div className="text-center py-12">
                <p className="font-body-md text-on-surface-variant font-bold">No available items in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {filteredMenu.map(item => {
                  const qty = getItemQty(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 bg-surface border-2 border-black rounded-xl flex flex-col justify-between transition-all shadow-[3px_3px_0px_0px_#000000] hover:shadow-[5px_5px_0px_0px_#000000] ${
                        qty > 0 ? 'bg-[#ffd982]/20 border-primary border-[2px]' : ''
                      }`}
                    >
                      <div>
                        {/* Item Image */}
                        {item.image ? (
                          <div className="relative h-28 w-full overflow-hidden rounded-lg border-2 border-black mb-2.5 bg-surface-container-high">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="relative h-28 w-full overflow-hidden rounded-lg border-2 border-black mb-2.5 bg-surface-container-high flex items-center justify-center">
                            <span className="text-[24px] font-bold text-on-surface-variant/40 select-none uppercase">
                              {item.category.slice(0, 2)}
                            </span>
                          </div>
                        )}

                        {/* Name & Tags */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                            {item.category}
                          </span>
                          <h4 className="font-label-bold text-[14px] text-black leading-tight line-clamp-2">
                            {item.name}
                          </h4>
                          <div className="flex gap-1 pt-0.5">
                            {item.dietary.map(diet => (
                              <span
                                key={diet}
                                className={`text-[8px] font-bold px-1 py-0.2 rounded border border-black uppercase ${
                                  diet === 'Vegan' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-secondary-fixed text-on-secondary-fixed'
                                }`}
                              >
                                {diet}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pricing and Counter */}
                      <div className="mt-4 pt-2.5 border-t border-dashed border-black/15 flex flex-col gap-2">
                        <div className="flex justify-between items-center select-none">
                          <span className="text-[13px] font-bold text-black">
                            {settings.currency}{item.price.toFixed(2)}
                          </span>
                        </div>

                        {/* Direct Incremental/Decremental Buttons */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-surface-container-high rounded-lg border-2 border-black p-1">
                            <button
                              onClick={() => qty > 0 && handleUpdateQuantity(item.id, -1)}
                              disabled={qty === 0}
                              className={`p-1 rounded border border-black active:translate-y-[0.5px] transition-all ${
                                qty === 0 
                                  ? 'bg-surface-dim opacity-40 cursor-not-allowed text-black/40' 
                                  : 'bg-surface hover:bg-surface-container-highest text-black'
                              }`}
                            >
                              <Minus size={11} className="stroke-[3]" />
                            </button>
                            <span className="font-label-bold text-[13.5px] px-1 font-bold text-black min-w-[20px] text-center">
                              {qty}
                            </span>
                            <button
                              onClick={() => handleAddToCart(item.id)}
                              className="p-1 rounded bg-surface border border-black hover:bg-surface-container-highest active:translate-y-[0.5px] text-black transition-all"
                            >
                              <Plus size={11} className="stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Billing Footer Summary */}
          {cart.length > 0 && (
            <div className="p-4 bg-surface border-t-[3px] border-black space-y-2.5 select-none">
              <div className="text-[12px] font-bold space-y-1 text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                  <span>{settings.currency}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax GST ({(settings.taxRate * 100).toFixed(0)}%)</span>
                  <span>{settings.currency}{tax.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex justify-between text-[17px] font-headline-md font-bold text-black pt-2 border-t-2 border-dashed border-black/20">
                <span>Total Amount Due</span>
                <span>{settings.currency}{total.toFixed(2)}</span>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full mt-2.5 neo-brutal-btn bg-primary-container text-on-primary-container py-3.5 rounded-[10px] border-[3px] border-black shadow-[4px_4px_0px_0px_#000000] font-headline-md text-[16px] flex items-center justify-center gap-1.5"
              >
                <ShoppingBag size={18} className="stroke-[2.5]" />
                Confirm & Send Order
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default OrderPanel;

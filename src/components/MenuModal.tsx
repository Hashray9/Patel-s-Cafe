import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import type { MenuItem } from '../types';
import { useCafe } from '../context/CafeContext';

interface MenuModalProps {
  item?: MenuItem; // if undefined, we are adding a new item
  isOpen: boolean;
  onClose: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({ item, onClose }) => {
  const { addMenuItem, updateMenuItem } = useCafe();

  const [name, setName] = useState(item ? item.name : '');
  const [price, setPrice] = useState(item ? item.price.toFixed(2) : '');
  const [category, setCategory] = useState<MenuItem['category']>(item ? item.category : 'sandwich');
  const [isAvailable, setIsAvailable] = useState(item ? item.isAvailable : true);
  const isVegan = item ? item.dietary.includes('Vegan') : false;
  const isGF = item ? item.dietary.includes('GF') : false;
  const [image, setImage] = useState(item ? item.image || '' : '');

  // Custom Dropdown Open State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedPrice = Math.max(0, parseFloat(price) || 0);
    const dietary: MenuItem['dietary'] = [];
    if (isVegan) dietary.push('Vegan');
    if (isGF) dietary.push('GF');

    const itemData = {
      name: name.trim(),
      price: parsedPrice,
      category,
      isAvailable,
      dietary,
      image: image.trim() || undefined
    };

    if (item) {
      updateMenuItem({
        ...item,
        ...itemData
      });
    } else {
      addMenuItem(itemData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.9, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 15, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-surface w-full max-w-md p-6 rounded-xl border-3 border-on-surface shadow-[8px_8px_0px_0px_rgba(30,27,21,1)] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-on-surface">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {item ? 'Modify Menu Item' : 'New Menu Item'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md border-2 border-on-surface hover:bg-surface-container-high text-on-surface active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_0px_rgba(30,27,21,1)] transition-all bg-surface"
            >
              <X size={18} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-label-bold text-label-bold text-on-surface mb-1">
                Item Name
              </label>
              <input
                type="text"
                placeholder="e.g. Cardamom Croissant"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full neo-brutal-input text-[14px]"
                required
              />
            </div>

            <div>
              <label className="block font-label-bold text-label-bold text-on-surface mb-1">
                Image URL or Path
              </label>
              <input
                type="text"
                placeholder="e.g. /images/grilled_sandwich.webp"
                value={image}
                onChange={e => setImage(e.target.value)}
                className="w-full neo-brutal-input text-[14px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-bold text-label-bold text-on-surface mb-1">
                  Price (₹)
                </label>
                <input
                  type="text"
                  placeholder="120.00"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full neo-brutal-input text-[14px]"
                  required
                />
              </div>

              <div className="relative">
                <label className="block font-label-bold text-label-bold text-on-surface mb-1">
                  Category
                </label>
                
                {/* Custom Category Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full neo-brutal-input py-2 pr-8 pl-3 font-bold text-[14px] bg-white text-black shadow-[2px_2px_0px_0px_#000000] border-2 border-black rounded-lg capitalize cursor-pointer flex items-center justify-between relative select-none hover:bg-surface-container-low transition-colors active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                  >
                    <span className="capitalize">
                      {category === 'tea-coffee' 
                        ? 'Tea / Coffee' 
                        : category === 'thepla-paratha' 
                          ? 'Thepla / Paratha' 
                          : category}
                    </span>
                    <ChevronDown size={15} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 stroke-[2.5] ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCategoryDropdownOpen && (
                    <>
                      {/* Click-away backdrop */}
                      <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsCategoryDropdownOpen(false)} />
                      
                      {/* Options List */}
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50">
                        {(['sandwich', 'slice', 'pizza', 'maggi', 'milkshake', 'puff', 'bhel', 'fries', 'burger', 'tea-coffee', 'thepla-paratha', 'extra'] as const).map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setCategory(cat);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 font-bold text-[13px] text-left text-black hover:bg-surface-container-high transition-colors capitalize border-b last:border-b-0 border-on-surface/10 ${
                              category === cat ? 'bg-primary-container' : 'bg-white'
                            }`}
                          >
                            {cat === 'tea-coffee' 
                              ? 'Tea / Coffee' 
                              : cat === 'thepla-paratha' 
                                ? 'Thepla / Paratha' 
                                : cat}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Checkboxes / Switches */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between pt-2">
                <span className="font-label-bold text-label-bold text-on-surface">
                  Available to Order (In Stock)
                </span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={() => setIsAvailable(!isAvailable)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container border-2 border-on-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-on-surface after:border-on-surface after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tertiary-fixed"></div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 neo-brutal-btn bg-primary-container text-on-primary-container py-3 rounded-lg font-headline-md text-[16px]"
            >
              {item ? 'Save Alterations' : 'Add to Menu'}
            </button>
          </form>
        </motion.div>
      </div>
  );
};

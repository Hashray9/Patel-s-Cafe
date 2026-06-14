import React from 'react';
import { Edit2, Ban, CheckCircle2 } from 'lucide-react';
import type { MenuItem } from '../types';
import { useCafe } from '../context/CafeContext';

interface MenuCardProps {
  item: MenuItem;
  onEdit: () => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onEdit }) => {
  const { updateMenuItem, settings } = useCafe();
  const nameMatch = item.name.match(/^(.*?)\s*(\(.*?\))$/);
  const mainName = nameMatch ? nameMatch[1] : item.name;
  const modifier = nameMatch ? nameMatch[2] : '';

  const handleToggleAvailability = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateMenuItem({
      ...item,
      isAvailable: !item.isAvailable
    });
  };

  return (
    <div
      className={`p-3.5 bg-surface border-2 border-black rounded-xl flex flex-col justify-between transition-all shadow-[3px_3px_0px_0px_#000000] hover:shadow-[5px_5px_0px_0px_#000000] select-none ${
        !item.isAvailable ? 'opacity-75 bg-surface-container-high' : ''
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
            {!item.isAvailable && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                <span className="bg-[#ffdad6] text-[#410002] text-[9px] font-bold px-2 py-0.5 rounded border border-black uppercase tracking-wider shadow-[1px_1px_0px_0px_#000000]">
                  Out of Stock
                </span>
              </div>
            )}
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
          <h4 className="text-black leading-tight line-clamp-2 min-h-[38px] flex flex-wrap items-center">
            <span className="font-extrabold text-[15.5px]">{mainName}</span>
            {modifier && (
              <span className="text-[12px] font-bold text-on-surface-variant/75 ml-1 select-none">
                {modifier}
              </span>
            )}
          </h4>
          <div className="flex gap-1 pt-0.5">
            {item.dietary.map(diet => (
              <span
                key={diet}
                className={`text-[8px] font-bold px-1.5 py-0.2 rounded border border-black uppercase ${
                  diet === 'Vegan' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-secondary-fixed text-on-secondary-fixed'
                }`}
              >
                {diet}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing and Action row */}
      <div className="mt-4 pt-2.5 border-t border-dashed border-black/15 flex flex-col gap-2">
        <div className="flex justify-between items-center select-none">
          <span className="text-[13px] font-bold text-black">
            {settings.currency}{item.price.toFixed(2)}
          </span>
        </div>

        {/* Management Controls in place of counter */}
        <div className="flex gap-2 items-center">
          <button
            onClick={handleToggleAvailability}
            className={`flex-1 py-1.5 px-2 rounded-lg border-2 border-black font-label-bold text-[11px] flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_#000000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer ${
              item.isAvailable
                ? 'bg-[#b2f0cf] text-black font-bold'
                : 'bg-[#ffdad6] text-black font-bold'
            }`}
          >
            {item.isAvailable ? (
              <>
                <CheckCircle2 size={11} className="stroke-[2.5]" />
                <span>In Stock</span>
              </>
            ) : (
              <>
                <Ban size={11} className="stroke-[2.5]" />
                <span>Stock Out</span>
              </>
            )}
          </button>

          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-surface-container-high active:translate-x-[0.5px] active:translate-y-[0.5px] shadow-[2px_2px_0px_0px_#000000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer text-black"
            title="Edit Item Details"
          >
            <Edit2 size={12} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default MenuCard;

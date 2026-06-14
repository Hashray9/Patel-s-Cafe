import React from 'react';
import { motion } from 'framer-motion';
import { Armchair, Link } from 'lucide-react';
import type { Table } from '../types';
import { getGroupColor } from '../utils/groupColors';

interface TableCardProps {
  table: Table;
  onClick: () => void;
}

export const TableCard: React.FC<TableCardProps> = ({ table, onClick }) => {
  const groupColor = getGroupColor(table.groupId);

  const getCardStyleClasses = () => {
    if (table.groupId) {
      // Dynamic group colors override standard occupied style
      return `${groupColor.bg} ${groupColor.border} ${groupColor.text}`;
    }

    switch (table.status) {
      case 'available':
        return 'bg-[#b2f0cf] border-black text-black'; // Available light green
      case 'occupied':
        return 'bg-[#ffdad6] border-black text-black'; // Occupied light pink
      default:
        return 'bg-[#b2f0cf] border-black text-black';
    }
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ y: 2, scale: 0.98 }}
      className={`border-[3px] shadow-[6px_6px_0px_0px_#000000] active:shadow-[2px_2px_0px_0px_#000000] rounded-[12px] p-4.5 flex flex-col justify-between transition-shadow cursor-pointer ${getCardStyleClasses()} ${
        table.isOutdoor ? 'min-h-[175px] h-full' : 'aspect-square'
      } select-none`}
    >
      {/* Top Header Row */}
      <div className="flex justify-between items-start">
        <span className="font-headline-md text-[24px] md:text-headline-md font-bold tracking-tight text-black">
          {table.number}
        </span>
        <div className="bg-transparent flex items-center justify-center p-0.5 text-black">
          {table.isOutdoor ? (
            /* Custom Umbrella Table SVG */
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[20px] h-[20px]"
            >
              <path d="M12 2v20M5 12h14M12 7a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5zM8 21h8" />
            </svg>
          ) : (
            <Armchair size={19} className="stroke-[2.5]" />
          )}
        </div>
      </div>

      {/* Seater Capacity / Status Badges */}
      <div className="flex flex-wrap gap-1.5 mt-auto items-center">
        {table.isOutdoor && (
          <p className="font-label-bold text-[12px] font-extrabold text-black leading-none bg-black/10 px-2 py-0.5 rounded-full border border-black/20">
            Outdoor
          </p>
        )}
        {table.groupId && (
          <span className={`font-label-bold text-[12px] font-extrabold ${groupColor.text} ${groupColor.badgeBg} border-[2px] ${groupColor.border} px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[2px_2px_0px_0px_#000000]`}>
            <Link size={10} className="stroke-[3.5]" />
            Group
          </span>
        )}
      </div>
    </motion.div>
  );
};
export default TableCard;

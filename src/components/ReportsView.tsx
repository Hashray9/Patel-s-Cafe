import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, Award, Activity, ChevronDown, FileText } from 'lucide-react';
import { useCafe } from '../context/CafeContext';
import { jsPDF } from 'jspdf';

export const ReportsView: React.FC = () => {
  const { orders, menu, settings } = useCafe();

  // Parse all months with active sales
  const monthsList = useMemo(() => {
    const list = new Set<string>();
    orders.forEach(o => {
      if (o.status === 'paid') {
        const d = new Date(o.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        list.add(key);
      }
    });
    return Array.from(list).sort().reverse(); // newest first
  }, [orders]);

  // Selected Month State
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const activeMonth = selectedMonth || monthsList[0] || '';

  const formatMonthLabel = (monthKey: string) => {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Today's Revenue calculation
  const todayRevenue = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startMs = startOfToday.getTime();

    return orders
      .filter(o => o.status === 'paid' && o.timestamp >= startMs)
      .reduce((acc, curr) => acc + curr.total, 0);
  }, [orders]);

  // Month Stats (Sales count and Revenue)
  const monthStats = useMemo(() => {
    if (!activeMonth) return { revenue: 0, count: 0, list: [] };
    const monthOrders = orders.filter(o => {
      if (o.status !== 'paid') return false;
      const d = new Date(o.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === activeMonth;
    });
    const rev = monthOrders.reduce((acc, curr) => acc + curr.total, 0);
    return { revenue: rev, count: monthOrders.length, list: monthOrders };
  }, [orders, activeMonth]);

  // All Items performance inside the selected month
  const itemPerformance = useMemo(() => {
    if (!activeMonth) return [];

    const salesMap: { [id: string]: { name: string; price: number; category: string; qty: number; revenue: number } } = {};

    // Initialize all menu items
    menu.forEach(item => {
      salesMap[item.id] = {
        name: item.name,
        price: item.price,
        category: item.category,
        qty: 0,
        revenue: 0,
      };
    });

    // Aggregate monthly quantities
    monthStats.list.forEach(order => {
      order.items.forEach(item => {
        if (salesMap[item.menuItemId]) {
          salesMap[item.menuItemId].qty += item.quantity;
          salesMap[item.menuItemId].revenue += item.quantity * salesMap[item.menuItemId].price;
        }
      });
    });

    // Convert map to sorted list (highest quantities first)
    return Object.keys(salesMap)
      .map(id => ({ id, ...salesMap[id] }))
      .sort((a, b) => b.qty - a.qty);
  }, [menu, monthStats, activeMonth]);

  // Top 3 Items of the selected month
  const topThree = useMemo(() => {
    return itemPerformance.slice(0, 3).filter(item => item.qty > 0);
  }, [itemPerformance]);







  // Custom Dropdown Open States
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    const storeName = settings.storeName || "Brew & Bold";
    const currencyStr = settings.currency === '₹' ? 'INR' : settings.currency;
    
    // Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(30, 27, 21);
    doc.text(storeName, 15, 20);
    
    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Category-wise Sales Performance Report", 15, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 26);
    
    doc.setDrawColor(30, 27, 21);
    doc.setLineWidth(0.5);
    doc.line(15, 30, 195, 30);
    
    let currentY = 38;
    
    const categoriesList: string[] = [
      'sandwich', 'slice', 'pizza', 'maggi', 'milkshake', 'puff', 
      'bhel', 'fries', 'burger', 'tea-coffee', 'thepla-paratha', 'extra'
    ];
    
    // Helper to get printable category names
    const getCategoryName = (cat: string) => {
      switch(cat) {
        case 'tea-coffee': return 'Tea & Coffee';
        case 'thepla-paratha': return 'Thepla & Paratha';
        default: return cat.charAt(0).toUpperCase() + cat.slice(1);
      }
    };
    
    // Group menu items by category and compute sales metrics
    const groupedData = categoriesList.map(cat => {
      const catItems = menu.filter(item => item.category === cat);
      const itemsPerformance = catItems.map(item => {
        let qty = 0;
        orders.forEach(o => {
          if (o.status === 'paid') {
            o.items.forEach(oi => {
              if (oi.menuItemId === item.id) {
                qty += oi.quantity;
              }
            });
          }
        });
        return {
          name: item.name,
          price: item.price,
          qty,
          revenue: qty * item.price
        };
      }).sort((a, b) => b.qty - a.qty);
      
      const catTotalQty = itemsPerformance.reduce((acc, curr) => acc + curr.qty, 0);
      const catTotalRevenue = itemsPerformance.reduce((acc, curr) => acc + curr.revenue, 0);
      
      return {
        category: cat,
        name: getCategoryName(cat),
        items: itemsPerformance,
        totalQty: catTotalQty,
        totalRevenue: catTotalRevenue
      };
    }).filter(catGroup => catGroup.items.length > 0); // only show categories that have items in the menu
    
    // Draw categories
    groupedData.forEach((group) => {
      // Check if we need a new page for category header + table headers + first item + subtotal
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      // Category Header Bar
      doc.setFillColor(239, 231, 221); // surface-container-high
      doc.rect(15, currentY, 180, 7, "F");
      doc.setDrawColor(30, 27, 21);
      doc.setLineWidth(0.3);
      doc.rect(15, currentY, 180, 7, "S");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 27, 21);
      doc.text(group.name, 18, currentY + 4.8);
      
      currentY += 7;
      
      // Draw Table Headers inside category
      doc.setFillColor(30, 27, 21);
      doc.rect(15, currentY, 180, 7, "F");
      
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("#", 17, currentY + 4.8);
      doc.text("Item Name", 27, currentY + 4.8);
      doc.text("Price", 127, currentY + 4.8);
      doc.text("Units Sold", 152, currentY + 4.8);
      doc.text("Revenue", 172, currentY + 4.8);
      
      currentY += 7;
      
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(30, 27, 21);
      
      group.items.forEach((item, index) => {
        // Pagination check for items
        if (currentY > 280) {
          doc.addPage();
          currentY = 20;
          
          // Re-draw Table Headers on new page
          doc.setFillColor(30, 27, 21);
          doc.rect(15, currentY, 180, 7, "F");
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text("#", 17, currentY + 4.8);
          doc.text("Item Name", 27, currentY + 4.8);
          doc.text("Price", 127, currentY + 4.8);
          doc.text("Units Sold", 152, currentY + 4.8);
          doc.text("Revenue", 172, currentY + 4.8);
          currentY += 7;
          doc.setFont("Helvetica", "normal");
        }
        
        // Zebra striping
        if (index % 2 === 1) {
          doc.setFillColor(250, 246, 238); // light surface container low
          doc.rect(15, currentY, 180, 6, "F");
        }
        
        doc.setFontSize(8.5);
        doc.setTextColor(30, 27, 21);
        doc.text(String(index + 1), 17, currentY + 4.2);
        
        let nameStr = item.name;
        if (nameStr.length > 50) {
          nameStr = nameStr.substring(0, 48) + "...";
        }
        doc.text(nameStr, 27, currentY + 4.2);
        doc.text(`${currencyStr} ${item.price.toFixed(2)}`, 127, currentY + 4.2);
        doc.text(String(item.qty), 152, currentY + 4.2);
        doc.text(`${currencyStr} ${item.revenue.toFixed(2)}`, 172, currentY + 4.2);
        
        // Subtle divider line
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(15, currentY + 6, 195, currentY + 6);
        
        currentY += 6;
      });
      
      // Category total subtotal row
      if (currentY > 280) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFillColor(245, 240, 232); // intermediate highlight beige
      doc.rect(15, currentY, 180, 6.5, "F");
      
      doc.setDrawColor(30, 27, 21);
      doc.setLineWidth(0.3);
      doc.line(15, currentY, 195, currentY);
      doc.line(15, currentY + 6.5, 195, currentY + 6.5);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 27, 21);
      doc.text(`${group.name} Subtotal`, 27, currentY + 4.5);
      doc.text(String(group.totalQty), 152, currentY + 4.5);
      doc.text(`${currencyStr} ${group.totalRevenue.toFixed(2)}`, 172, currentY + 4.5);
      
      currentY += 13; // spacing before next category
    });
    
    // Grand Total Row
    const grandTotalQty = groupedData.reduce((acc, curr) => acc + curr.totalQty, 0);
    const grandTotalRevenue = groupedData.reduce((acc, curr) => acc + curr.totalRevenue, 0);
    
    if (currentY > 275) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFillColor(255, 217, 130); // light yellow primary-container color
    doc.rect(15, currentY, 180, 9, "F");
    
    doc.setDrawColor(30, 27, 21);
    doc.setLineWidth(0.5);
    doc.rect(15, currentY, 180, 9, "S");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 27, 21);
    doc.text("GRAND TOTAL SUMMARY", 27, currentY + 5.8);
    doc.text(String(grandTotalQty), 152, currentY + 5.8);
    doc.text(`${currencyStr} ${grandTotalRevenue.toFixed(2)}`, 172, currentY + 5.8);
    
    // Save PDF
    doc.save(`Patel_Cafe_Category_Report_${new Date().toISOString().substring(0, 10)}.pdf`);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sandwich': return 'bg-[#ffd982] text-black border border-black';
      case 'slice': return 'bg-[#ffdad6] text-black border border-black';
      case 'pizza': return 'bg-[#b2f0cf] text-black border border-black';
      case 'maggi': return 'bg-[#d1bcff] text-black border border-black';
      case 'milkshake': return 'bg-[#93c5fd] text-black border border-black';
      case 'puff': return 'bg-[#fed7aa] text-black border border-black';
      case 'bhel': return 'bg-[#99f6e4] text-black border border-black';
      case 'fries': return 'bg-[#fca5a5] text-black border border-black';
      case 'burger': return 'bg-[#ffd982] text-black border border-black';
      case 'tea-coffee': return 'bg-[#d1bcff] text-black border border-black';
      case 'thepla-paratha': return 'bg-[#b2f0cf] text-black border border-black';
      case 'extra': return 'bg-surface-variant text-on-surface border border-black';
      default: return 'bg-surface-container text-on-surface border border-black';
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Selector dropdown wrapper */}
      <div className="flex justify-between items-center select-none pb-1 relative">
        <h2 className="font-headline-md text-[18px] md:text-[22px] font-bold text-on-surface">Revenue Metrics</h2>
        <div className="flex items-center gap-2 relative">
          <Calendar size={16} className="text-on-surface-variant stroke-[2.5]" />

          {/* Custom Month Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="neo-brutal-input py-1.5 pr-8 pl-3 font-bold text-[13.5px] bg-white text-black shadow-[2px_2px_0px_0px_#000000] border-2 border-black rounded-lg capitalize cursor-pointer flex items-center justify-between min-w-[155px] relative select-none hover:bg-surface-container-low transition-colors active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
            >
              <span>{formatMonthLabel(activeMonth) || 'Select Month'}</span>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 stroke-[2.5] ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMonthDropdownOpen && (
              <>
                {/* Click-away backdrop */}
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsMonthDropdownOpen(false)} />

                {/* Options List */}
                <div className="absolute right-0 top-full mt-1.5 min-w-[170px] bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50 max-h-60 overflow-y-auto">
                  {monthsList.map(month => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(month);
                        setIsMonthDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 font-bold text-[13px] text-left text-black hover:bg-surface-container-high transition-colors capitalize border-b last:border-b-0 border-on-surface/10 ${activeMonth === month ? 'bg-primary-container' : 'bg-white'
                        }`}
                    >
                      {formatMonthLabel(month)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overview Cards Row */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 select-none">
        {/* Today's Revenue card */}
        <div className="neo-brutal-card rounded-xl p-3 md:p-5 bg-[#b2f0cf] text-black flex flex-col justify-between h-24 sm:h-28 md:h-32 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
          <div className="flex justify-between items-start">
            <span className="font-label-bold text-[9.5px] sm:text-[11px] md:text-[12px] text-black/75 font-bold uppercase tracking-wider truncate">
              Today's Sales
            </span>
            <Activity size={16} className="text-black stroke-[2.5] hidden sm:block" />
          </div>
          <div className="font-headline-md text-[24px] sm:text-[32px] md:text-[40px] font-bold mt-auto leading-none truncate">
            {settings.currency}{todayRevenue.toFixed(2)}
          </div>
        </div>

        {/* Month's Revenue MTD card */}
        <div className="neo-brutal-card rounded-xl p-3 md:p-5 bg-[#ffd982] text-black flex flex-col justify-between h-24 sm:h-28 md:h-32 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
          <div className="flex justify-between items-start">
            <span className="font-label-bold text-[9.5px] sm:text-[11px] md:text-[12px] text-black/75 font-bold uppercase tracking-wider truncate">
              Month Sales MTD
            </span>
            <TrendingUp size={16} className="text-black stroke-[2.5] hidden sm:block" />
          </div>
          <div className="font-headline-md text-[24px] sm:text-[32px] md:text-[40px] font-bold mt-auto leading-none truncate">
            {settings.currency}{monthStats.revenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Top Sellers and Bar Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


        {/* Top 3 Selling Items Card */}
        <div className="neo-brutal-card rounded-xl p-6 bg-white text-black flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-headline-md text-[18px] font-bold border-b-2 border-black pb-2 flex items-center gap-2">
              <Award size={18} className="stroke-[2.5] text-primary" />
              Top 3 Item Standouts
            </h3>

            <div className="space-y-4 pt-2">
              {topThree.length === 0 ? (
                <p className="font-body-md text-on-surface-variant font-medium text-center py-12">
                  No standby sales data.
                </p>
              ) : (
                topThree.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-surface-container-low border-2 border-black rounded-lg flex items-center justify-between shadow-[2.5px_2.5px_0px_0px_#000000]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-primary-container text-black border-2 border-black rounded-full flex items-center justify-center font-headline-md font-bold text-[13px]">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-label-bold text-[13.5px] font-bold leading-tight text-black">
                          {item.name}
                        </h4>
                        <span className={`text-[8px] font-bold px-1 py-0.1 border border-black uppercase rounded ${getCategoryColor(item.category)}`}>
                          {item.category === 'tea-coffee'
                            ? 'Tea/Coffee'
                            : item.category === 'thepla-paratha'
                              ? 'Thepla/Paratha'
                              : item.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right select-none">
                      <div className="font-headline-md text-[14.5px] font-bold text-black">
                        {item.qty} sold
                      </div>
                      <div className="text-[10px] text-on-surface-variant font-bold">
                        ₹{item.revenue.toFixed(0)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGeneratePDF}
        className="w-full neo-brutal-btn bg-[#ffd982] text-black py-2.5 rounded-lg font-bold text-[14px] flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer select-none"
      >
        <FileText size={16} className="stroke-[2.5]" />
        Full Report
      </button>
    </div>
  );
};
export default ReportsView;

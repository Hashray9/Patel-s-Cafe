import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Calendar, Award, Coffee, Activity, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
import { useCafe } from '../context/CafeContext';

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

  useEffect(() => {
    if (monthsList.length > 0 && !selectedMonth) {
      setSelectedMonth(monthsList[0]);
    }
  }, [monthsList, selectedMonth]);

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
    if (!selectedMonth) return { revenue: 0, count: 0, list: [] };
    const monthOrders = orders.filter(o => {
      if (o.status !== 'paid') return false;
      const d = new Date(o.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
    const rev = monthOrders.reduce((acc, curr) => acc + curr.total, 0);
    return { revenue: rev, count: monthOrders.length, list: monthOrders };
  }, [orders, selectedMonth]);

  // All Items performance inside the selected month
  const itemPerformance = useMemo(() => {
    if (!selectedMonth) return [];

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
  }, [menu, monthStats, selectedMonth]);

  // Top 3 Items of the selected month
  const topThree = useMemo(() => {
    return itemPerformance.slice(0, 3).filter(item => item.qty > 0);
  }, [itemPerformance]);

  // Average ticket revenue
  const averageOrderValue = useMemo(() => {
    return monthStats.count > 0 ? monthStats.revenue / monthStats.count : 0;
  }, [monthStats]);

  // Max quantity for chart scale
  const maxQty = useMemo(() => {
    const max = Math.max(...itemPerformance.map(i => i.qty), 0);
    return max > 0 ? max : 10;
  }, [itemPerformance]);

  // Calculate Y-axis ticks (4 divisions)
  const yTicks = useMemo(() => {
    const step = Math.ceil(maxQty / 4) || 1;
    return [step * 4, step * 3, step * 2, step, 0];
  }, [maxQty]);

  // Fullscreen Landscape Toggle States
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Custom Dropdown Open States
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      const isCurrentlyFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFs);
      if (!isCurrentlyFs) {
        if (window.screen.orientation && window.screen.orientation.unlock) {
          try {
            window.screen.orientation.unlock();
          } catch (e) {}
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const handleFullscreenToggle = async () => {
    const container = document.getElementById('chart-container-wrapper');
    if (!container) return;

    if (!isFullscreen) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        }
        // Force landscape mode
        if (window.screen.orientation && window.screen.orientation.lock) {
          try {
            await (window.screen.orientation.lock as any)('landscape');
          } catch (e) {
            console.log("Landscape lock error:", e);
          }
        }
      } catch (err) {
        console.error("Failed to enter fullscreen:", err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch (err) {
        console.error("Failed to exit fullscreen:", err);
      }
    }
  };

  // Cycle through unique colors for bar rendering
  const getBarColor = (index: number) => {
    const colors = [
      'bg-[#ffd982]', // Yellow
      'bg-[#b2f0cf]', // Green
      'bg-[#ffdad6]', // Pink/Red
      'bg-[#d1bcff]', // Purple
      'bg-[#93c5fd]', // Blue
      'bg-[#fed7aa]', // Light Orange
      'bg-[#99f6e4]', // Teal
      'bg-[#fca5a5]', // Coral
    ];
    return colors[index % colors.length];
  };

  // Individual Item Selection State
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  useEffect(() => {
    if (menu.length > 0 && !selectedItemId) {
      setSelectedItemId(menu[0].id);
    }
  }, [menu, selectedItemId]);

  // Selected Item Global Sales Metrics
  const individualPerformance = useMemo(() => {
    if (!selectedItemId) return null;

    const menuItem = menu.find(m => m.id === selectedItemId);
    if (!menuItem) return null;

    let totalQty = 0;
    let totalRevenue = 0;
    let lastOrdered: number | null = null;
    const monthlyTrend: { [month: string]: number } = {};

    orders.forEach(o => {
      if (o.status === 'paid') {
        const d = new Date(o.timestamp);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        o.items.forEach(item => {
          if (item.menuItemId === selectedItemId) {
            totalQty += item.quantity;
            totalRevenue += item.quantity * menuItem.price;
            if (!lastOrdered || o.timestamp > lastOrdered) {
              lastOrdered = o.timestamp;
            }
            monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + item.quantity;
          }
        });
      }
    });

    return {
      item: menuItem,
      totalQty,
      totalRevenue,
      lastOrdered,
      monthlyTrend,
    };
  }, [orders, menu, selectedItemId]);

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
              <span>{formatMonthLabel(selectedMonth) || 'Select Month'}</span>
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
                      className={`w-full px-3.5 py-2 font-bold text-[13px] text-left text-black hover:bg-surface-container-high transition-colors capitalize border-b last:border-b-0 border-on-surface/10 ${
                        selectedMonth === month ? 'bg-primary-container' : 'bg-white'
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
      <div className="grid grid-cols-3 gap-3 md:gap-6 select-none">
        {/* Today's Revenue card */}
        <div className="neo-brutal-card rounded-xl p-3 md:p-5 bg-[#b2f0cf] text-black flex flex-col justify-between h-24 sm:h-28 md:h-32 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
          <div className="flex justify-between items-start">
            <span className="font-label-bold text-[9.5px] sm:text-[11px] md:text-[12px] text-black/75 font-bold uppercase tracking-wider truncate">
              Today's Sales
            </span>
            <Activity size={16} className="text-black stroke-[2.5] hidden sm:block" />
          </div>
          <div className="font-headline-md text-[16px] sm:text-[20px] md:text-[28px] font-bold mt-auto leading-none truncate">
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
          <div className="font-headline-md text-[16px] sm:text-[20px] md:text-[28px] font-bold mt-auto leading-none truncate">
            {settings.currency}{monthStats.revenue.toFixed(2)}
          </div>
        </div>

        {/* Average Order Value card */}
        <div className="neo-brutal-card rounded-xl p-3 md:p-5 bg-[#ffdad6] text-black flex flex-col justify-between h-24 sm:h-28 md:h-32 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
          <div className="flex justify-between items-start">
            <span className="font-label-bold text-[9.5px] sm:text-[11px] md:text-[12px] text-black/75 font-bold uppercase tracking-wider truncate">
              Avg Order Bill
            </span>
            <Coffee size={16} className="text-black stroke-[2.5] hidden sm:block" />
          </div>
          <div className="font-headline-md text-[16px] sm:text-[20px] md:text-[28px] font-bold mt-auto leading-none truncate">
            {settings.currency}{averageOrderValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Top Sellers and Bar Graph Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Graph Card */}
        <div
          id="chart-container-wrapper"
          className={`bg-white text-black flex flex-col transition-all duration-300 ${
            isFullscreen
              ? 'fixed inset-0 z-50 p-6 md:p-8 w-screen h-screen justify-between overflow-hidden portrait:transform portrait:fixed portrait:top-1/2 portrait:left-1/2 portrait:-translate-x-1/2 portrait:-translate-y-1/2 portrait:rotate-90 portrait:w-[100vh] portrait:h-[100vw]'
              : 'neo-brutal-card rounded-xl p-6 lg:col-span-2 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black'
          }`}
        >
          <div className="flex justify-between items-center border-b-2 border-black pb-2 select-none">
            <h3 className="font-headline-md text-[18px] font-bold flex items-center gap-2">
              <TrendingUp size={18} className="stroke-[2.5]" />
              Item Sales Volume Distribution
            </h3>
            
            {/* Fullscreen Toggle Button */}
            <button
              onClick={handleFullscreenToggle}
              className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-surface-container-high transition-all shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_#000000] cursor-pointer flex items-center justify-center"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Landscape View"}
            >
              {isFullscreen ? <Minimize2 size={16} className="stroke-[2.5]" /> : <Maximize2 size={16} className="stroke-[2.5]" />}
            </button>
          </div>

          {itemPerformance.length === 0 ? (
            <p className="font-body-md text-on-surface-variant font-medium text-center py-12">
              No paid transactions recorded in this period.
            </p>
          ) : (
            <div className={`flex pt-6 select-none ${isFullscreen ? 'h-[calc(100vh-120px)] portrait:h-[calc(100vw-120px)]' : 'h-[330px]'}`}>
              {/* Y-Axis Column */}
              <div 
                style={{ height: 'calc(100% - 40px)' }}
                className="flex flex-col justify-between text-right pr-3 text-[11px] font-mono font-bold text-on-surface-variant select-none pb-4 leading-none w-10"
              >
                {yTicks.map((tick, i) => (
                  <span key={i}>{tick}</span>
                ))}
              </div>

              {/* Main Chart Container */}
              <div className="flex-1 flex flex-col h-full relative">
                {/* Scrollable grid area for bars */}
                <div className="relative flex-1 border-l-3 border-black overflow-x-auto pb-10 scrollbar-thin">
                  {/* Horizontal Gridlines */}
                  <div className="absolute inset-x-0 bottom-10 top-6 flex flex-col justify-between pointer-events-none select-none">
                    {yTicks.slice(0, 4).map((_, i) => (
                      <div key={i} className="w-full border-t border-dashed border-gray-200 h-0" />
                    ))}
                    <div className="w-full h-0" /> {/* Spacer */}
                  </div>

                  {/* Horizontal X-Axis line */}
                  <div className="absolute inset-x-0 bottom-10 h-[3px] bg-black pointer-events-none z-20" />

                  {/* Bars wrapper */}
                  <div className="absolute inset-x-0 bottom-10 top-6 flex items-end justify-start gap-8 px-4">
                    {itemPerformance.map((item, index) => {
                      // Normalize against the highest tick (yTicks[0]) to calculate height
                      const pct = yTicks[0] > 0 ? (item.qty / yTicks[0]) * 100 : 0;
                      const barHeight = Math.max(pct, 0); // clamp to positive

                      return (
                        <div key={item.id} className="relative flex flex-col items-center justify-end flex-shrink-0 w-12 h-full group">
                          {/* The Vertical Bar */}
                          <div
                            style={{ height: `${barHeight}%` }}
                            className={`w-10 rounded-t border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000000] active:translate-y-0 active:shadow-[1px_1px_0px_0px_#000000] transition-all cursor-pointer relative ${
                              item.qty > 0 ? getBarColor(index) : 'bg-gray-100 border-dashed opacity-40'
                            }`}
                          >
                            {/* Quantity tooltip badge on hover */}
                            <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 rounded text-[10px] font-bold border border-black whitespace-nowrap z-30 shadow-[2px_2px_0px_0px_#ffd982] left-1/2 -translate-x-1/2">
                              {item.qty} units ({settings.currency}{item.revenue.toFixed(0)})
                            </div>

                            {/* Always-visible Quantity Badge */}
                            {item.qty > 0 && (
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9.5px] font-black text-black bg-white px-1 py-0.2 border border-black rounded shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] z-10 whitespace-nowrap">
                                {item.qty}
                              </span>
                            )}
                          </div>

                          {/* X-Axis Label - positioned below the 100% height grid bounds */}
                          <div className="absolute top-full mt-2.5 w-16 text-center select-none">
                            <span 
                              title={item.name}
                              className="text-[10.5px] font-bold font-label-bold block truncate leading-tight text-black"
                            >
                              {item.name}
                            </span>
                             <span className="text-[7.5px] uppercase font-mono tracking-tighter text-on-surface-variant font-bold leading-none block">
                               {item.category === 'tea-coffee' 
                                 ? 'Tea/Coffee' 
                                 : item.category === 'thepla-paratha' 
                                   ? 'Thepla/Paratha' 
                                   : item.category}
                             </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Padding for labels */}
                <div className="h-[50px] pointer-events-none" />
              </div>
            </div>
          )}
        </div>

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

      {/* Individual Item Performance Analytics Section */}
      <div className="neo-brutal-card rounded-xl p-6 bg-white text-black space-y-4 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-black pb-2.5">
          <h3 className="font-headline-md text-[18px] font-bold flex items-center gap-2">
            <Coffee size={18} className="stroke-[2.5] text-secondary" />
            Individual Item Deep-Dive
          </h3>

          {/* Custom Item Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsItemDropdownOpen(!isItemDropdownOpen)}
              className="neo-brutal-input py-1.5 pr-8 pl-3 font-bold text-[13.5px] bg-white text-black shadow-[2px_2px_0px_0px_#000000] border-2 border-black rounded-lg capitalize cursor-pointer flex items-center justify-between min-w-[185px] w-full sm:w-auto relative select-none hover:bg-surface-container-low transition-colors active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
            >
              <span>{menu.find(m => m.id === selectedItemId)?.name || 'Select Item'}</span>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 stroke-[2.5] ${isItemDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isItemDropdownOpen && (
              <>
                {/* Click-away backdrop */}
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsItemDropdownOpen(false)} />
                
                {/* Options List */}
                <div className="absolute right-0 top-full mt-1.5 min-w-[200px] w-full bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50 max-h-60 overflow-y-auto">
                  {menu.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setIsItemDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 font-bold text-[13px] text-left text-black hover:bg-surface-container-high transition-colors capitalize border-b last:border-b-0 border-on-surface/10 ${
                        selectedItemId === item.id ? 'bg-primary-container' : 'bg-white'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {individualPerformance ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Total Units Dispatched
              </span>
              <div className="font-headline-md text-[26px] font-bold leading-none text-black flex items-center gap-1.5">
                {individualPerformance.totalQty} Units
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Total Earnings Earned
              </span>
              <div className="font-headline-md text-[26px] font-bold leading-none text-black">
                {settings.currency}{individualPerformance.totalRevenue.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <p className="font-body-md text-on-surface-variant font-medium text-center py-6">
            Item details unavailable.
          </p>
        )}
      </div>
    </div>
  );
};
export default ReportsView;

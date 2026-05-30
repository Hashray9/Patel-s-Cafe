import { Home, ReceiptText, SquareMenu, TrendingUp } from 'lucide-react';
import type { Order } from '../types';
import { useCafe } from '../context/CafeContext';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { orders } = useCafe();
  const pendingCount = orders.filter((o: Order) => o.status === 'pending').length;

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'orders', label: 'Orders', icon: ReceiptText, badge: pendingCount },
    { id: 'menu', label: 'Menu', icon: SquareMenu },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 py-3.5 bg-[#fff8f2] border-t-[3px] border-black md:hidden">
      {tabs.map(tab => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-2 px-4.5 mx-0.5 transition-all select-none ${
              isActive
                ? 'bg-[#ffd982] text-black border-[2px] border-black rounded-[10px] shadow-[3px_3px_0px_0px_#000000] font-bold'
                : 'text-on-surface-variant/80 hover:text-black border-[2px] border-transparent font-medium'
            }`}
          >
            <IconComponent size={20} className="stroke-[2.5]" />
            <span className="font-label-sm text-[11px] mt-0.5 tracking-tight font-bold">
              {tab.label}
            </span>
            {tab.badge && tab.badge > 0 ? (
              <span className="absolute top-0.5 right-2 bg-[#ba1a1a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-black">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
export default Navigation;

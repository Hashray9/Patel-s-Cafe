export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied';
  currentOrderId?: string;
  timerStart?: number; // timestamp when table became occupied
  isOutdoor?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'sandwich' | 'slice' | 'pizza' | 'maggi' | 'milkshake' | 'puff' | 'bhel' | 'fries' | 'burger' | 'tea-coffee' | 'thepla-paratha' | 'extra';
  isAvailable: boolean;
  dietary: ('Vegan' | 'GF')[];
  image?: string;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableId: string;
  tableNumber: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid';
  timestamp: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Settings {
  storeName: string;
  taxRate: number; // e.g., 0.08 for 8%
  currency: string; // e.g., '$'
}

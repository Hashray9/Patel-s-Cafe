import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Table, MenuItem, Order, OrderItem, Settings } from '../types';

interface CafeContextType {
  tables: Table[];
  orders: Order[];
  menu: MenuItem[];
  settings: Settings;
  updateTableStatus: (tableId: string, status: Table['status']) => void;
  updateTableCapacity: (tableId: string, capacity: number) => void;
  createOrder: (tableId: string, items: OrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateMenuItem: (updatedItem: MenuItem) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateSettings: (settings: Settings) => void;
  clearTable: (tableId: string) => void;
  simulateData: () => void;
}

const CafeContext = createContext<CafeContextType | undefined>(undefined);

const DEFAULT_MENU: MenuItem[] = [
  // --- Sandwich ---
  { id: 'm-1', name: 'Bread Butter (Normal)', price: 50.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-2', name: 'Bread Butter (Grill)', price: 70.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-3', name: 'Vegitable (Normal)', price: 60.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-4', name: 'Vegitable (Grill)', price: 80.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-5', name: 'Aloo Matar (Normal)', price: 60.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-6', name: 'Aloo Matar (Grill)', price: 80.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-7', name: 'Aloo Veg. Mix (Normal)', price: 90.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-8', name: 'Aloo Veg. Mix (Grill)', price: 110.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-9', name: 'Butter Chatani (Normal)', price: 50.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-10', name: 'Butter Chatani (Grill)', price: 70.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-11', name: 'Cheese (Normal)', price: 100.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-12', name: 'Cheese (Grill)', price: 120.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-13', name: 'Cheese Jam', price: 110.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-14', name: 'Cheese Chatani (Normal)', price: 110.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-15', name: 'Cheese Chatani (Grill)', price: 130.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-16', name: 'Vegitable Cheese (Normal)', price: 110.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-17', name: 'Vegitable Cheese (Grill)', price: 130.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-18', name: 'Aloo Mater Cheese (Normal)', price: 110.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-19', name: 'Aloo Mater Cheese (Grill)', price: 130.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-20', name: 'Butter Jam', price: 50.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-21', name: 'Chocolate', price: 60.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-22', name: 'Chocolate Cheese', price: 110.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-23', name: 'Rabadi', price: 60.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-24', name: 'Cheese Rabadi', price: 110.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-25', name: 'Chocolate Rabadi', price: 70.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-26', name: 'Chocolate Cheese Rabadi', price: 120.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-27', name: 'Three In One (Aloo,Veg,Cheese)', price: 170.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/normal_sandwich.png' },
  { id: 'm-28', name: 'Boss', price: 200.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-29', name: 'Nam Karan', price: 200.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-30', name: 'Peri Peri', price: 200.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-31', name: 'Paneer Tandoori', price: 200.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-32', name: 'Ghughara', price: 200.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },
  { id: 'm-33', name: 'Patel Special', price: 200.00, category: 'sandwich', isAvailable: true, dietary: [], image: '/images/grilled_sandwich.png' },

  // --- Slice ---
  { id: 'm-34', name: 'Butter Slice', price: 20.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-35', name: 'Sing Sev Slice', price: 30.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/cheese_slice.png' },
  { id: 'm-36', name: 'Cheese Slice', price: 50.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/cheese_slice.png' },
  { id: 'm-37', name: 'Jam Slice', price: 30.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-38', name: 'Cheese Jam Slice', price: 60.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/cheese_slice.png' },
  { id: 'm-39', name: 'Cheese Chatani Slice', price: 60.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/cheese_slice.png' },
  { id: 'm-40', name: 'Chocolate Slice', price: 35.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-41', name: 'Chocolate Cheese Slice', price: 60.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-42', name: 'Rabadi Slice', price: 35.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },
  { id: 'm-43', name: 'Cheese Rabadi Slice', price: 60.00, category: 'slice', isAvailable: true, dietary: [], image: '/images/chocolate_sandwich.png' },

  // --- Pizza ---
  { id: 'm-44', name: 'Italian Pizza', price: 130.00, category: 'pizza', isAvailable: true, dietary: [], image: '/images/margherita_pizza.png' },
  { id: 'm-45', name: 'Double Cheese Italian Pizza', price: 160.00, category: 'pizza', isAvailable: true, dietary: [], image: '/images/margherita_pizza.png' },
  { id: 'm-46', name: 'Margherita Pizza', price: 160.00, category: 'pizza', isAvailable: true, dietary: [], image: '/images/margherita_pizza.png' },
  { id: 'm-47', name: 'Double Cheese Margherita Pizza', price: 210.00, category: 'pizza', isAvailable: true, dietary: [], image: '/images/margherita_pizza.png' },
  { id: 'm-48', name: 'Paneer Pizza', price: 240.00, category: 'pizza', isAvailable: true, dietary: [], image: '/images/paneer_pizza.png' },
  { id: 'm-49', name: 'Cheese Chili Toast', price: 110.00, category: 'pizza', isAvailable: true, dietary: [], image: '/images/paneer_pizza.png' },

  // --- Maggi ---
  { id: 'm-50', name: 'Masala Maggi (Normal)', price: 80.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/masala_maggi.png' },
  { id: 'm-51', name: 'Masala Maggi (Cheese)', price: 120.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/cheese_maggi.png' },
  { id: 'm-52', name: 'Butter Masala Maggi (Normal)', price: 90.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/masala_maggi.png' },
  { id: 'm-53', name: 'Butter Masala Maggi (Cheese)', price: 130.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/cheese_maggi.png' },
  { id: 'm-54', name: 'Veg. Masala Maggi (Normal)', price: 100.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/masala_maggi.png' },
  { id: 'm-55', name: 'Veg. Masala Maggi (Cheese)', price: 140.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/cheese_maggi.png' },
  { id: 'm-56', name: 'Veg. Butter Masala Maggi (Normal)', price: 110.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/masala_maggi.png' },
  { id: 'm-57', name: 'Veg. Butter Masala Maggi (Cheese)', price: 150.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/cheese_maggi.png' },
  { id: 'm-58', name: 'Bhurji Masala Maggi (Cheese)', price: 160.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/cheese_maggi.png' },
  { id: 'm-59', name: 'Veg. Bhurji Masala Maggi (Cheese)', price: 170.00, category: 'maggi', isAvailable: true, dietary: [], image: '/images/cheese_maggi.png' },

  // --- Milkshake ---
  { id: 'm-60', name: 'Kaju Anjeer Milkshake', price: 250.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/kaju_anjeer_milkshake.png' },
  { id: 'm-61', name: 'Bournvita Milkshake', price: 130.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/milkshake_chocolate.png' },
  { id: 'm-62', name: 'Oreo Milkshake', price: 130.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/milkshake_chocolate.png' },
  { id: 'm-63', name: 'Kitkat Milkshake', price: 130.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/milkshake_chocolate.png' },
  { id: 'm-64', name: 'Cold Coffee', price: 130.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/milkshake_chocolate.png' },
  { id: 'm-65', name: 'Chocolate Milkshake', price: 130.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/milkshake_chocolate.png' },
  { id: 'm-66', name: 'Rose Milkshake', price: 110.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/milkshake_strawberry.png' },
  { id: 'm-67', name: 'Venila Milkshake', price: 110.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/milkshake_strawberry.png' },
  { id: 'm-68', name: 'Strawberry Milkshake', price: 110.00, category: 'milkshake', isAvailable: true, dietary: [], image: '/images/milkshake_strawberry.png' },

  // --- Puff ---
  { id: 'm-69', name: 'Veg. Puff (Normal)', price: 30.00, category: 'puff', isAvailable: true, dietary: [], image: '/images/veg_puff.png' },
  { id: 'm-70', name: 'Veg. Puff (Cheese)', price: 70.00, category: 'puff', isAvailable: true, dietary: [], image: '/images/veg_puff.png' },
  { id: 'm-71', name: 'Mayo Puff (Normal)', price: 45.00, category: 'puff', isAvailable: true, dietary: [], image: '/images/veg_puff.png' },
  { id: 'm-72', name: 'Mayo Puff (Cheese)', price: 80.00, category: 'puff', isAvailable: true, dietary: [], image: '/images/veg_puff.png' },
  { id: 'm-73', name: 'Special Mayo Puff (Normal)', price: 70.00, category: 'puff', isAvailable: true, dietary: [], image: '/images/veg_puff.png' },
  { id: 'm-74', name: 'Special Mayo Puff (Cheese)', price: 100.00, category: 'puff', isAvailable: true, dietary: [], image: '/images/veg_puff.png' },

  // --- Bhel ---
  { id: 'm-75', name: 'Bhel', price: 90.00, category: 'bhel', isAvailable: true, dietary: [], image: '/images/bhel.png' },
  { id: 'm-76', name: 'Cheese Bhel', price: 130.00, category: 'bhel', isAvailable: true, dietary: [], image: '/images/bhel.png' },

  // --- French Fries ---
  { id: 'm-77', name: 'Salted French Fries', price: 110.00, category: 'fries', isAvailable: true, dietary: [], image: '/images/french_fries.png' },
  { id: 'm-78', name: 'Peri Peri French Fries', price: 120.00, category: 'fries', isAvailable: true, dietary: [], image: '/images/french_fries.png' },
  { id: 'm-79', name: 'Mayo French Fries', price: 150.00, category: 'fries', isAvailable: true, dietary: [], image: '/images/french_fries.png' },

  // --- Burger ---
  { id: 'm-80', name: 'Aloo Tikki Burger (Normal)', price: 80.00, category: 'burger', isAvailable: true, dietary: [], image: '/images/burger.png' },
  { id: 'm-81', name: 'Aloo Tikki Burger (Cheese)', price: 110.00, category: 'burger', isAvailable: true, dietary: [], image: '/images/burger.png' },
  { id: 'm-82', name: 'Cryspy Veg. Burger (Normal)', price: 90.00, category: 'burger', isAvailable: true, dietary: [], image: '/images/burger.png' },
  { id: 'm-83', name: 'Cryspy Veg. Burger (Cheese)', price: 120.00, category: 'burger', isAvailable: true, dietary: [], image: '/images/burger.png' },
  { id: 'm-84', name: 'Mexican Burger (Normal)', price: 110.00, category: 'burger', isAvailable: true, dietary: [], image: '/images/burger.png' },
  { id: 'm-85', name: 'Mexican Burger (Cheese)', price: 130.00, category: 'burger', isAvailable: true, dietary: [], image: '/images/burger.png' },
  { id: 'm-86', name: 'Tandoori Burger (Normal)', price: 110.00, category: 'burger', isAvailable: true, dietary: [], image: '/images/burger.png' },
  { id: 'm-87', name: 'Tandoori Burger (Cheese)', price: 130.00, category: 'burger', isAvailable: true, dietary: [], image: '/images/burger.png' },

  // --- Tea / Coffee ---
  { id: 'm-88', name: 'Tea', price: 25.00, category: 'tea-coffee', isAvailable: true, dietary: [], image: '/images/tea_coffee.png' },
  { id: 'm-89', name: 'Coffee', price: 30.00, category: 'tea-coffee', isAvailable: true, dietary: [], image: '/images/tea_coffee.png' },
  { id: 'm-90', name: 'Hot Bournvita', price: 50.00, category: 'tea-coffee', isAvailable: true, dietary: [], image: '/images/tea_coffee.png' },

  // --- Thepla / Paratha ---
  { id: 'm-91', name: 'Thepla (4 pcs)', price: 60.00, category: 'thepla-paratha', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-92', name: 'Butter thepla (4 pcs)', price: 80.00, category: 'thepla-paratha', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-93', name: 'Special Cheese Mayo thepla', price: 120.00, category: 'thepla-paratha', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-94', name: 'Aloo Paratha (Dahi)', price: 110.00, category: 'thepla-paratha', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-95', name: 'Butter Aloo Paratha (Dahi)', price: 130.00, category: 'thepla-paratha', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-96', name: 'Cheese Aloo Paratha (Dahi)', price: 150.00, category: 'thepla-paratha', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-97', name: 'Cheese Butter Aloo Paratha (Dahi)', price: 170.00, category: 'thepla-paratha', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },

  // --- Extra ---
  { id: 'm-98', name: 'Masala Khichadi (Dahi)', price: 160.00, category: 'extra', isAvailable: true, dietary: [], image: '/images/bhel.png' },
  { id: 'm-99', name: 'Bhakhari', price: 30.00, category: 'extra', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-100', name: 'Dahi', price: 20.00, category: 'extra', isAvailable: true, dietary: [], image: '/images/butter_slice.png' },
  { id: 'm-101', name: 'Extra Cheese', price: 40.00, category: 'extra', isAvailable: true, dietary: [], image: '/images/cheese_slice.png' },
];

const DEFAULT_TABLES: Table[] = [
  { id: 't-1', number: 'T-1', capacity: 4, status: 'available' },
  { id: 't-2', number: 'T-2', capacity: 2, status: 'occupied', timerStart: Date.now() - 45 * 60 * 1000 },
  { id: 't-3', number: 'T-3', capacity: 6, status: 'available' },
  { id: 't-4', number: 'T-4', capacity: 2, status: 'available' },
  { id: 't-5', number: 'T-5', capacity: 4, status: 'occupied', timerStart: Date.now() - 15 * 60 * 1000 },
  { id: 't-6', number: 'T-6', capacity: 2, status: 'occupied', timerStart: Date.now() - 10 * 60 * 1000 },
];

const DEFAULT_SETTINGS: Settings = {
  storeName: "Patel Sandwichwala",
  taxRate: 0.05, // 5% GST standard in India
  currency: '₹',
};

export const CafeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tables, setTables] = useState<Table[]>(() => {
    const saved = localStorage.getItem('cafe_tables_v5');
    return saved ? JSON.parse(saved) : DEFAULT_TABLES;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('cafe_orders_v5');
    if (saved) return JSON.parse(saved);

    // Generate programmatic mock sales for the past 90 days to populate reports
    const historicalOrders: Order[] = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Helper menu list mapping prices
    const itemsList = [
      { id: 'm-1', price: 50.00 }, { id: 'm-2', price: 70.00 }, { id: 'm-3', price: 60.00 }, { id: 'm-4', price: 80.00 },
      { id: 'm-5', price: 60.00 }, { id: 'm-6', price: 80.00 }, { id: 'm-7', price: 90.00 }, { id: 'm-8', price: 110.00 },
      { id: 'm-9', price: 50.00 }, { id: 'm-10', price: 70.00 }, { id: 'm-11', price: 100.00 }, { id: 'm-12', price: 120.00 },
      { id: 'm-13', price: 110.00 }, { id: 'm-14', price: 110.00 }, { id: 'm-15', price: 130.00 }, { id: 'm-16', price: 110.00 },
      { id: 'm-17', price: 130.00 }, { id: 'm-18', price: 110.00 }, { id: 'm-19', price: 130.00 }, { id: 'm-20', price: 50.00 },
      { id: 'm-21', price: 60.00 }, { id: 'm-22', price: 110.00 }, { id: 'm-23', price: 60.00 }, { id: 'm-24', price: 110.00 },
      { id: 'm-25', price: 70.00 }, { id: 'm-26', price: 120.00 }, { id: 'm-27', price: 170.00 }, { id: 'm-28', price: 200.00 },
      { id: 'm-29', price: 200.00 }, { id: 'm-30', price: 200.00 }, { id: 'm-31', price: 200.00 }, { id: 'm-32', price: 200.00 },
      { id: 'm-33', price: 200.00 }, { id: 'm-34', price: 20.00 }, { id: 'm-35', price: 30.00 }, { id: 'm-36', price: 50.00 },
      { id: 'm-37', price: 30.00 }, { id: 'm-38', price: 60.00 }, { id: 'm-39', price: 60.00 }, { id: 'm-40', price: 35.00 },
      { id: 'm-41', price: 60.00 }, { id: 'm-42', price: 35.00 }, { id: 'm-43', price: 60.00 }, { id: 'm-44', price: 130.00 },
      { id: 'm-45', price: 160.00 }, { id: 'm-46', price: 160.00 }, { id: 'm-47', price: 210.00 }, { id: 'm-48', price: 240.00 },
      { id: 'm-49', price: 110.00 }, { id: 'm-50', price: 80.00 }, { id: 'm-51', price: 120.00 }, { id: 'm-52', price: 90.00 },
      { id: 'm-53', price: 130.00 }, { id: 'm-54', price: 100.00 }, { id: 'm-55', price: 140.00 }, { id: 'm-56', price: 110.00 },
      { id: 'm-57', price: 150.00 }, { id: 'm-58', price: 160.00 }, { id: 'm-59', price: 170.00 }, { id: 'm-60', price: 250.00 },
      { id: 'm-61', price: 130.00 }, { id: 'm-62', price: 130.00 }, { id: 'm-63', price: 130.00 }, { id: 'm-64', price: 130.00 },
      { id: 'm-65', price: 130.00 }, { id: 'm-66', price: 110.00 }, { id: 'm-67', price: 110.00 }, { id: 'm-68', price: 110.00 },
      { id: 'm-69', price: 30.00 }, { id: 'm-70', price: 70.00 }, { id: 'm-71', price: 45.00 }, { id: 'm-72', price: 80.00 },
      { id: 'm-73', price: 70.00 }, { id: 'm-74', price: 100.00 }, { id: 'm-75', price: 90.00 }, { id: 'm-76', price: 130.00 },
      { id: 'm-77', price: 110.00 }, { id: 'm-78', price: 120.00 }, { id: 'm-79', price: 150.00 }, { id: 'm-80', price: 80.00 },
      { id: 'm-81', price: 110.00 }, { id: 'm-82', price: 90.00 }, { id: 'm-83', price: 120.00 }, { id: 'm-84', price: 110.00 },
      { id: 'm-85', price: 130.00 }, { id: 'm-86', price: 110.00 }, { id: 'm-87', price: 130.00 }, { id: 'm-88', price: 25.00 },
      { id: 'm-89', price: 30.00 }, { id: 'm-90', price: 50.00 }, { id: 'm-91', price: 60.00 }, { id: 'm-92', price: 80.00 },
      { id: 'm-93', price: 120.00 }, { id: 'm-94', price: 110.00 }, { id: 'm-95', price: 130.00 }, { id: 'm-96', price: 150.00 },
      { id: 'm-97', price: 170.00 }, { id: 'm-98', price: 160.00 }, { id: 'm-99', price: 30.00 }, { id: 'm-100', price: 20.00 },
      { id: 'm-101', price: 40.00 }
    ];

    const makePaidOrder = (daysAgo: number, items: OrderItem[]) => {
      const sub = items.reduce((acc, curr) => {
        const item = itemsList.find(m => m.id === curr.menuItemId);
        return acc + (item ? item.price * curr.quantity : 0);
      }, 0);
      const tax = parseFloat((sub * 0.05).toFixed(2));
      const total = parseFloat((sub + tax).toFixed(2));
      const timestamp = now - daysAgo * oneDay - Math.random() * 8 * 60 * 60 * 1000; // random shift
      return {
        id: `ord-hist-${daysAgo}-${Math.floor(Math.random() * 1000)}`,
        tableId: `t-${Math.floor(Math.random() * 6) + 1}`,
        tableNumber: `T-${Math.floor(Math.random() * 6) + 1}`,
        items,
        status: 'paid' as const,
        timestamp,
        subtotal: sub,
        tax,
        total
      };
    };

    // Seed 3 orders for today (paid)
    historicalOrders.push(makePaidOrder(0, [{ menuItemId: 'm-1', quantity: 3 }, { menuItemId: 'm-5', quantity: 2 }]));
    historicalOrders.push(makePaidOrder(0, [{ menuItemId: 'm-3', quantity: 2 }, { menuItemId: 'm-7', quantity: 1 }]));
    historicalOrders.push(makePaidOrder(0, [{ menuItemId: 'm-8', quantity: 2, notes: 'Extra sweet' }]));

    // Seed past 90 days (1 to 2 orders per day)
    for (let i = 1; i <= 90; i++) {
      const orderCount = Math.random() > 0.4 ? 2 : 1;
      for (let j = 0; j < orderCount; j++) {
        const item1 = itemsList[Math.floor(Math.random() * itemsList.length)];
        const item2 = itemsList[Math.floor(Math.random() * itemsList.length)];
        const orderItems = [
          { menuItemId: item1.id, quantity: Math.floor(Math.random() * 2) + 1 },
        ];
        if (Math.random() > 0.5) {
          orderItems.push({ menuItemId: item2.id, quantity: Math.floor(Math.random() * 2) + 1 });
        }
        historicalOrders.push(makePaidOrder(i, orderItems));
      }
    }

    // Seated active dummy orders
    const items1: OrderItem[] = [{ menuItemId: 'm-1', quantity: 2, notes: 'Extra spicy' }, { menuItemId: 'm-8', quantity: 1 }];
    const items2: OrderItem[] = [{ menuItemId: 'm-3', quantity: 1 }, { menuItemId: 'm-5', quantity: 1 }];
    const items3: OrderItem[] = [{ menuItemId: 'm-6', quantity: 1, notes: 'No onions' }];

    const calcTotal = (items: OrderItem[]) => {
      const sub = items.reduce((acc, curr) => {
        const item = itemsList.find(m => m.id === curr.menuItemId);
        return acc + (item ? item.price * curr.quantity : 0);
      }, 0);
      return {
        subtotal: sub,
        tax: parseFloat((sub * DEFAULT_SETTINGS.taxRate).toFixed(2)),
        total: parseFloat((sub * (1 + DEFAULT_SETTINGS.taxRate)).toFixed(2))
      };
    };

    const dummyOrders: Order[] = [
      {
        id: 'ord-t2',
        tableId: 't-2',
        tableNumber: 'T-2',
        items: items1,
        status: 'pending',
        timestamp: Date.now() - 45 * 60 * 1000,
        ...calcTotal(items1)
      },
      {
        id: 'ord-t5',
        tableId: 't-5',
        tableNumber: 'T-5',
        items: items2,
        status: 'pending',
        timestamp: Date.now() - 15 * 60 * 1000,
        ...calcTotal(items2)
      },
      {
        id: 'ord-t6',
        tableId: 't-6',
        tableNumber: 'T-6',
        items: items3,
        status: 'pending',
        timestamp: Date.now() - 10 * 60 * 1000,
        ...calcTotal(items3)
      }
    ];

    return [...dummyOrders, ...historicalOrders];
  });

  const [menu, setMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('cafe_menu_v5');
    return saved ? JSON.parse(saved) : DEFAULT_MENU;
  });

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('cafe_settings_v5');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('cafe_tables_v5', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('cafe_orders_v5', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('cafe_menu_v5', JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    localStorage.setItem('cafe_settings_v5', JSON.stringify(settings));
  }, [settings]);

  // Sync currentOrderId in tables with existing orders
  useEffect(() => {
    let updated = false;
    const newTables = tables.map(t => {
      const activeOrder = orders.find(o => o.tableId === t.id && o.status !== 'paid');
      if (activeOrder && t.currentOrderId !== activeOrder.id) {
        updated = true;
        return { ...t, currentOrderId: activeOrder.id, status: 'occupied' as const };
      }
      if (!activeOrder && t.status === 'occupied' && t.currentOrderId) {
        updated = true;
        return { ...t, currentOrderId: undefined, status: 'available' as const, timerStart: undefined };
      }
      return t;
    });
    if (updated) {
      setTables(newTables);
    }
  }, [orders]);

  const updateTableStatus = (tableId: string, status: Table['status']) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status,
          timerStart: status === 'occupied' ? Date.now() : undefined,
          currentOrderId: status !== 'occupied' ? undefined : t.currentOrderId
        };
      }
      return t;
    }));
  };

  const updateTableCapacity = (tableId: string, capacity: number) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, capacity } : t));
  };

  const createOrder = (tableId: string, items: OrderItem[]) => {
    const isWalkIn = tableId.startsWith('walk-in');
    const table = isWalkIn
      ? { number: 'Walk-in' }
      : tables.find(t => t.id === tableId);
    if (!table) return;

    if (items.length === 0) {
      setOrders(prev => prev.filter(o => !(o.tableId === tableId && o.status !== 'paid')));
      if (!isWalkIn) {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'available', currentOrderId: undefined, timerStart: undefined } : t));
      }
      return;
    }

    const sub = items.reduce((acc, curr) => {
      const item = menu.find(m => m.id === curr.menuItemId);
      return acc + (item ? item.price * curr.quantity : 0);
    }, 0);

    const taxVal = parseFloat((sub * settings.taxRate).toFixed(2));
    const totalVal = parseFloat((sub * (1 + settings.taxRate)).toFixed(2));

    const existingActiveOrder = orders.find(o => o.tableId === tableId && o.status !== 'paid');

    if (existingActiveOrder) {
      setOrders(prev => prev.map(o => o.id === existingActiveOrder.id ? {
        ...o,
        items,
        subtotal: sub,
        tax: taxVal,
        total: totalVal
      } : o));
    } else {
      const orderId = `ord-${Date.now()}`;
      const newOrder: Order = {
        id: orderId,
        tableId,
        tableNumber: table.number,
        items,
        status: 'pending',
        timestamp: Date.now(),
        subtotal: sub,
        tax: taxVal,
        total: totalVal
      };
      setOrders(prev => [...prev, newOrder]);
      if (!isWalkIn) {
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'occupied', currentOrderId: orderId, timerStart: Date.now() } : t));
      }
    }
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, status };
      }
      return o;
    }));

    if (status === 'paid') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        clearTable(order.tableId);
      }
    }
  };

  const clearTable = (tableId: string) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: 'available', currentOrderId: undefined, timerStart: undefined } : t));
  };

  const updateMenuItem = (updatedItem: MenuItem) => {
    setMenu(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
  };

  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: `m-${Date.now()}`
    };
    setMenu(prev => [...prev, newItem]);
  };

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
  };

  const simulateData = () => {
    // Reset to defaults with live timestamps
    const cleanTables: Table[] = DEFAULT_TABLES.map((t, idx) => {
      if (t.status === 'occupied') {
        return { ...t, timerStart: Date.now() - (15 * (idx + 1)) * 60 * 1000 };
      }
      return t;
    });

    const items1: OrderItem[] = [{ menuItemId: 'm-1', quantity: 2, notes: 'Extra spicy chai' }, { menuItemId: 'm-8', quantity: 1 }];
    const items2: OrderItem[] = [{ menuItemId: 'm-3', quantity: 1 }, { menuItemId: 'm-5', quantity: 2 }];
    const items3: OrderItem[] = [{ menuItemId: 'm-6', quantity: 1 }];

    const calcTotal = (items: OrderItem[]) => {
      const sub = items.reduce((acc, curr) => {
        const item = menu.find(m => m.id === curr.menuItemId);
        return acc + (item ? item.price * curr.quantity : 0);
      }, 0);
      return {
        subtotal: sub,
        tax: parseFloat((sub * settings.taxRate).toFixed(2)),
        total: parseFloat((sub * (1 + settings.taxRate)).toFixed(2))
      };
    };

    const liveOrders: Order[] = [
      {
        id: 'ord-t2',
        tableId: 't-2',
        tableNumber: 'T-2',
        items: items1,
        status: 'preparing',
        timestamp: Date.now() - 45 * 60 * 1000,
        ...calcTotal(items1)
      },
      {
        id: 'ord-t5',
        tableId: 't-5',
        tableNumber: 'T-5',
        items: items2,
        status: 'pending',
        timestamp: Date.now() - 15 * 60 * 1000,
        ...calcTotal(items2)
      },
      {
        id: 'ord-t6',
        tableId: 't-6',
        tableNumber: 'T-6',
        items: items3,
        status: 'ready',
        timestamp: Date.now() - 10 * 60 * 1000,
        ...calcTotal(items3)
      }
    ];

    setTables(cleanTables);
    setOrders(liveOrders);
  };

  return (
    <CafeContext.Provider value={{
      tables,
      orders,
      menu,
      settings,
      updateTableStatus,
      updateTableCapacity,
      createOrder,
      updateOrderStatus,
      updateMenuItem,
      addMenuItem,
      updateSettings,
      clearTable,
      simulateData
    }}>
      {children}
    </CafeContext.Provider>
  );
};

export const useCafe = () => {
  const context = useContext(CafeContext);
  if (context === undefined) {
    throw new Error('useCafe must be used within a CafeProvider');
  }
  return context;
};

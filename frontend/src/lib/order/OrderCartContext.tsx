'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Product } from '@/gen/product_pb';
import { moneyToNumber } from '@/lib/utils/format';

export interface CartItem {
  id: string; // Unique ID for the cart item (allows same product with different toppings)
  productId: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
  image_url?: string;
  selectedToppings: { id: string; name: string; price: number }[];
}

interface OrderCartContextType {
  items: CartItem[];
  tableId: string | null;
  setTableId: (id: string | null) => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  total: number;
}

const OrderCartContext = createContext<OrderCartContextType | undefined>(undefined);

export function OrderCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tableId, setTableId] = useState<string | null>(null);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems(prev => {
      // Check if item already exists with exact same productId (for now, ignoring toppings diff)
      const existingItemIndex = prev.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex > -1) {
        const newItems = [...prev];
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity
        };
        return newItems;
      }

      const newItem: CartItem = {
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: moneyToNumber(product.price),
        quantity,
        note: '',
        image_url: product.imageUrl,
        selectedToppings: []
      };
      
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const toppingPriceSum = item.selectedToppings.reduce((tSum, t) => tSum + t.price, 0);
      return sum + (item.price + toppingPriceSum) * item.quantity;
    }, 0);
  }, [items]);

  const tax = useMemo(() => subtotal * 0.1, [subtotal]); // 10% VAT
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const value = useMemo(() => ({
    items,
    tableId,
    setTableId,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    tax,
    total
  }), [items, tableId, addItem, removeItem, updateQuantity, clearCart, subtotal, tax, total]);

  return (
    <OrderCartContext.Provider value={value}>
      {children}
    </OrderCartContext.Provider>
  );
}

export function useOrderCart() {
  const context = useContext(OrderCartContext);
  if (context === undefined) {
    throw new Error('useOrderCart must be used within an OrderCartProvider');
  }
  return context;
}

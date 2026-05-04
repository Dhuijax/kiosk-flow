'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

interface Item {
  name: string;
  quantity: number;
  price: number;
}

interface CheckoutSummaryProps {
  items: Item[];
  subtotal: number;
  tax: number;
  total: number;
}

export default function CheckoutSummary({ items, subtotal, tax, total }: CheckoutSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="bg-navy-900/50 border border-slate-800/50 rounded-3xl overflow-hidden backdrop-blur-md flex flex-col h-full">
      <div className="p-6 border-b border-slate-800/50 bg-navy-800/30">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-blue-soft" />
          </div>
          Tóm tắt đơn hàng
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {items.map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex justify-between items-start"
          >
            <div className="flex-1">
              <p className="text-slate-200 text-sm font-bold flex items-center gap-2">
                <span className="text-blue-soft font-mono">x{item.quantity}</span>
                {item.name}
              </p>
            </div>
            <p className="text-slate-400 text-sm font-mono">{formatCurrency(item.price * item.quantity)}</p>
          </motion.div>
        ))}
      </div>

      <div className="p-8 bg-navy-800/30 border-t border-slate-800/50 space-y-3">
        <div className="flex justify-between text-slate-500 text-sm">
          <span>Tạm tính</span>
          <span className="font-mono">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500 text-sm">
          <span>Thuế (10%)</span>
          <span className="font-mono">{formatCurrency(tax)}</span>
        </div>
        <div className="pt-4 border-t border-slate-800/50 flex justify-between items-end">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Tổng thanh toán</p>
            <p className="text-3xl text-blue-electric font-black font-mono">
              {formatCurrency(total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

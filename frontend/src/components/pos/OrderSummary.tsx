'use client';

import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard } from 'lucide-react';
import { useOrderCart } from '@/lib/order/OrderCartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function OrderSummary({ onCheckout }: { onCheckout?: () => void }) {
  const { items, removeItem, updateQuantity, subtotal, total, tax } = useOrderCart();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div aria-label="Tóm tắt đơn hàng" className="w-[380px] border-l border-slate-800/50 bg-navy-900/50 flex flex-col hidden lg:flex h-full">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800/50 bg-navy-800/30">
        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-soft" />
          Đơn hàng
        </h2>
        <span className="px-2.5 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-400 border border-slate-700/50">
          {items.reduce((acc, item) => acc + item.quantity, 0)} món
        </span>
      </div>
      
      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-6 gap-4 opacity-30"
            >
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-300 text-sm">Giỏ hàng trống</p>
                <p className="text-xs text-slate-500">Chạm vào sản phẩm để thêm</p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-navy-800/40 p-4 rounded-2xl border border-slate-800/50 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-slate-200 text-sm truncate">{item.name}</h3>
                      <p className="text-blue-soft text-xs font-mono font-bold">{formatCurrency(item.price)}</p>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center bg-slate-900/50 rounded-xl border border-slate-800/50 p-1">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-slate-200">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <p className="font-mono font-black text-slate-200 text-sm">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Summary */}
      <div className="p-6 border-t border-slate-800/50 bg-navy-900/80">
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-slate-500 text-xs">
            <span>Tạm tính</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500 text-xs">
            <span>Thuế (10%)</span>
            <span className="font-mono">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-white font-bold text-lg pt-3 mt-1 border-t border-slate-800/50">
            <span>Tổng cộng</span>
            <span className="text-blue-soft font-mono font-black">{formatCurrency(total)}</span>
          </div>
        </div>
        
        <button 
          onClick={onCheckout}
          disabled={items.length === 0}
          className={cn(
            "w-full py-4 flex items-center justify-center gap-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
            items.length > 0 
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-[0.98]" 
              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
          )}
        >
          <CreditCard size={18} />
          Thanh toán
        </button>
      </div>
    </div>
  );
}

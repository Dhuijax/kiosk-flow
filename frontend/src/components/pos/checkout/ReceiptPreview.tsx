'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReceiptData {
  orderNumber: string;
  cashierName: string;
  date: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  notes?: string;
}

interface ReceiptPreviewProps {
  data: ReceiptData;
  onClose?: () => void;
  onPrint?: () => void;
}

export default function ReceiptPreview({ data, onClose, onPrint }: ReceiptPreviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="flex flex-col items-center gap-10 py-10 h-full">
      {/* Receipt Paper */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-[420px] bg-white text-foreground p-10 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative Top */}
        <div className="absolute top-0 left-0 w-full h-2 bg-interaction" />
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-2">KIOSKFLOW POS</h1>
          <p className="text-[10px] text-foreground/40 font-black uppercase tracking-[0.2em] leading-relaxed">
            123 ĐƯỜNG CÔNG NGHỆ, TP. HỒ CHÍ MINH<br />
            HOTLINE: 1900 1234
          </p>
        </div>

        {/* Info Box */}
        <div className="border-y border-dashed border-foreground/10 py-6 mb-8 space-y-2 text-[11px] font-black uppercase italic tracking-tighter">
          <div className="flex justify-between">
            <span className="opacity-40">Số đơn:</span>
            <span>#{data.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-40">Thời gian:</span>
            <span>{data.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-40">Thu ngân:</span>
            <span className="text-interaction">{data.cashierName}</span>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4 mb-10">
          {data.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start text-xs font-black uppercase italic tracking-tighter">
              <div className="flex-1 pr-6">
                <p className="leading-tight">{item.name}</p>
                <p className="text-[10px] opacity-40 not-italic mt-1">{item.quantity} x {formatCurrency(item.price)}</p>
              </div>
              <span className="text-sm">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-dashed border-foreground/10 pt-6 space-y-3 mb-10">
          <div className="flex justify-between text-xs font-black uppercase italic tracking-tighter opacity-60">
            <span>Tạm tính</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs font-black uppercase italic tracking-tighter opacity-60">
            <span>Thuế VAT (10%)</span>
            <span>{formatCurrency(data.tax)}</span>
          </div>
          <div className="flex justify-between text-2xl font-black pt-4 mt-4 border-t border-foreground/5 uppercase italic tracking-tighter">
            <span>TỔNG CỘNG</span>
            <span className="text-primary">{formatCurrency(data.total)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-foreground/5 p-6 rounded-2xl mb-10 border border-foreground/5">
          <div className="flex justify-between text-[11px] font-black uppercase italic tracking-tighter">
            <span className="opacity-20 tracking-[0.3em]">Hình thức</span>
            <span className="text-interaction">{data.paymentMethod}</span>
          </div>
          {data.notes && (
            <div className="mt-4 pt-4 border-t border-foreground/5">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-20 mb-2">Ghi chú</p>
              <p className="text-[10px] italic font-bold opacity-60">&quot;{data.notes}&quot;</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-6">
          <div className="inline-block p-4 bg-foreground/5 rounded-2xl border border-foreground/5">
            <div className="w-28 h-28 bg-white border border-foreground/10 flex flex-col items-center justify-center p-2">
              <div className="w-full h-full bg-foreground/5 rounded animate-pulse" />
            </div>
          </div>
          <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.4em]">Cảm ơn & Hẹn gặp lại!</p>
        </div>

        {/* Paper Edge Zigzag */}
        <div className="absolute -bottom-1 left-0 w-full flex">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-6 h-3 bg-background rotate-45 -translate-y-1.5" />
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-6">
        <button 
          onClick={onPrint}
          className="btn-dynamic px-10 py-4 text-sm"
        >
          <Printer size={20} className="stroke-[3]" />
          <span>IN HÓA ĐƠN</span>
        </button>
        <button 
          onClick={onClose}
          className="px-10 py-4 bg-background border border-foreground/10 rounded-2xl font-black text-sm uppercase italic tracking-tighter text-foreground/40 hover:text-foreground transition-all shadow-sm"
        >
          <X size={20} className="stroke-[3]" />
          <span>ĐÓNG</span>
        </button>
      </div>
    </div>
  );
}

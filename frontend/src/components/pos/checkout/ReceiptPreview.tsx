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
    <div className="flex flex-col items-center gap-8 py-8 h-full">
      {/* Receipt Paper */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-[380px] bg-white text-slate-900 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        {/* Decorative Top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-1">KioskFlow POS</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-tight">
            123 Đường Công Nghệ, TP. Hồ Chí Minh<br />
            Hotline: 1900 1234
          </p>
        </div>

        {/* Info Box */}
        <div className="border-y border-dashed border-slate-300 py-4 mb-6 space-y-1 text-[11px] font-medium">
          <div className="flex justify-between">
            <span className="text-slate-400">Số đơn:</span>
            <span>#{data.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Thời gian:</span>
            <span>{data.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Thu ngân:</span>
            <span className="uppercase">{data.cashierName}</span>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3 mb-8">
          {data.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start text-xs">
              <div className="flex-1 pr-4">
                <p className="font-bold">{item.name}</p>
                <p className="text-[10px] text-slate-500">{item.quantity} x {formatCurrency(item.price)}</p>
              </div>
              <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-dashed border-slate-300 pt-4 space-y-2 mb-8">
          <div className="flex justify-between text-xs font-medium">
            <span>Tạm tính</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs font-medium">
            <span>Thuế VAT (10%)</span>
            <span>{formatCurrency(data.tax)}</span>
          </div>
          <div className="flex justify-between text-base font-black pt-2 mt-2 border-t border-slate-200">
            <span>TỔNG CỘNG</span>
            <span className="text-blue-700">{formatCurrency(data.total)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-slate-50 p-4 rounded-xl mb-8">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-slate-400 uppercase tracking-widest text-[9px]">Hình thức</span>
            <span className="text-blue-600">{data.paymentMethod}</span>
          </div>
          {data.notes && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">Ghi chú</p>
              <p className="text-[10px] italic">&quot;{data.notes}&quot;</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <div className="inline-block p-2 bg-slate-100 rounded-lg">
            {/* Mock QR Code Placeholder */}
            <div className="w-24 h-24 bg-white border border-slate-200 flex flex-col items-center justify-center p-2">
              <div className="w-full h-full bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cảm ơn & Hẹn gặp lại!</p>
        </div>

        {/* Paper Edge Zigzag */}
        <div className="absolute -bottom-1 left-0 w-full flex">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-5 h-2 bg-navy-950 rotate-45 -translate-y-1" />
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-4">
        <button 
          onClick={onPrint}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all"
        >
          <Printer size={18} />
          In hóa đơn
        </button>
        <button 
          onClick={onClose}
          className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all"
        >
          <X size={18} />
          Đóng
        </button>
      </div>
    </div>
  );
}

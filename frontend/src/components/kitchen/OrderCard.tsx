'use client';

import { useEffect, useState } from "react";
import { Order, OrderItem, OrderStatus } from "@/gen/order_pb";
import { motion } from "framer-motion";
import { Clock, CheckCircle, Play, User, Hash, Coffee, UtensilsCrossed, AlertTriangle } from "lucide-react";

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  isHistory?: boolean;
}

export function OrderCard({ order, onUpdateStatus, isHistory }: OrderCardProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isHistory) return;
    
    const interval = setInterval(() => {
      const created = Number(order.createdAt?.seconds || 0) * 1000;
      setElapsed(Math.floor((Date.now() - created) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [order.createdAt, isHistory]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLate = elapsed > 900; // 15 mins

  const drinks = order.items.filter(i => 
    i.productName.toLowerCase().includes("trà") || 
    i.productName.toLowerCase().includes("ly") || 
    i.productName.toLowerCase().includes("cà phê") ||
    i.productName.toLowerCase().includes("nước")
  );
  const food = order.items.filter(i => !drinks.includes(i));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className={`flex flex-col bg-surface border rounded-3xl p-8 transition-all relative overflow-hidden group ${
        isHistory 
          ? "border-foreground/10 opacity-60 grayscale shadow-none" 
          : isLate 
            ? "border-red-500 shadow-xl shadow-red-500/10 bg-red-50" 
            : "border-foreground/10 shadow-lg hover:shadow-xl hover:border-interaction/30"
      }`}
    >
      {/* Late Alert Overlay */}
      {isLate && !isHistory && (
        <div className="absolute top-0 left-0 w-full h-2 bg-red-500 animate-pulse" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary border border-white/20 text-white rounded-2xl px-4 py-2 font-black text-2xl flex items-center gap-2 shadow-lg italic tracking-tighter">
              <Hash size={20} className="stroke-[4]" />
              <span>{order.orderNumber}</span>
            </div>
            {isLate && !isHistory && (
              <div className="bg-red-500 text-white p-2 rounded-xl animate-bounce">
                <AlertTriangle size={20} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-background border border-foreground/10 rounded-lg w-fit">
            <span className="text-[10px] font-black uppercase italic tracking-widest text-foreground">
              {order.tableName || "MANG ĐI"}
            </span>
          </div>
        </div>
        
        {!isHistory && (
          <div className={`flex flex-col items-end gap-1 ${isLate ? "text-red-600" : "text-interaction"}`}>
            <div className="flex items-center gap-2 font-mono font-black text-2xl tracking-tighter italic">
              <Clock size={20} className="stroke-[3]" />
              <span>{formatTime(elapsed)}</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Thời gian chờ</span>
          </div>
        )}
      </div>

      {/* Customer Info */}
      <div className="flex items-center gap-3 mb-8 p-3 bg-background/50 border border-foreground/10 rounded-2xl">
        <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center">
          <User size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Khách hàng</p>
          <p className="font-black text-foreground uppercase italic tracking-tighter leading-tight">{order.customerName || "KHÁCH LẺ"}</p>
        </div>
      </div>

      {/* Items Section */}
      <div className="flex-1 space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {food.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground/30 px-1">
              <UtensilsCrossed size={14} />
              <h4 className="text-[10px] uppercase font-black tracking-[0.2em]">Bếp nóng</h4>
            </div>
            <div className="space-y-3">
              {food.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          </div>
        )}

        {drinks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-interaction/40 px-1">
              <Coffee size={14} />
              <h4 className="text-[10px] uppercase font-black tracking-[0.2em]">Pha chế</h4>
            </div>
            <div className="space-y-3">
              {drinks.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      {!isHistory && (
        <div className="mt-8 pt-8 border-t border-foreground/5 flex gap-4">
          {order.status === OrderStatus.CONFIRMED ? (
            <button
              onClick={() => onUpdateStatus(order.id, OrderStatus.PREPARING)}
              className="flex-1 bg-interaction text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase italic tracking-tighter text-lg border border-interaction/20 shadow-lg hover:bg-interaction/90"
            >
              <Play size={24} fill="currentColor" className="stroke-[3]" />
              BẮT ĐẦU NẤU
            </button>
          ) : (
            <button
              onClick={() => onUpdateStatus(order.id, OrderStatus.SERVED)}
              className="flex-1 bg-primary text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase italic tracking-tighter text-lg border border-primary/20 shadow-lg hover:bg-primary/90"
            >
              <CheckCircle size={24} className="stroke-[3]" />
              XONG & GIAO MÓN
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="flex flex-col bg-background border border-foreground/10 rounded-2xl p-4 hover:border-interaction/30 transition-colors shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center text-xl font-black italic border border-foreground/10 shadow-sm">
            {item.quantity}
          </div>
          <div>
            <span className="font-black text-foreground uppercase italic tracking-tighter text-lg leading-tight block">{item.productName}</span>
            {item.toppings.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {item.toppings.map(t => (
                  <span key={t.id} className="text-[10px] font-black uppercase italic tracking-tighter bg-interaction/5 text-interaction/60 px-2 py-0.5 rounded-lg border border-interaction/10">
                    + {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {item.note && (
        <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-xl text-xs text-foreground font-bold flex items-start gap-2">
          <span className="text-accent uppercase italic font-black">Note:</span>
          <span className="opacity-60">&quot;{item.note}&quot;</span>
        </div>
      )}
    </div>
  );
}


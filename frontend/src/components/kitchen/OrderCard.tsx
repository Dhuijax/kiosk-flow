"use client";

import { useEffect, useState } from "react";
import { Order, OrderItem, OrderStatus } from "@/gen/order_pb";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle, Play, User, Hash } from "lucide-react";
import { clsx } from "clsx";

interface OrderCardProps {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  isHistory?: boolean;
}

export function OrderCard({ order, onUpdateStatus, isHistory }: OrderCardProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isHistory) return;
    
    // Simple timer
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

  // Group items by a simple rule (mocking category grouping for now as proto doesn't have category_name in OrderItem)
  // In a real app, we'd either include category_name in proto or have a map.
  // We'll treat items with "Drink" in name differently for visual grouping if possible.
  const drinks = order.items.filter(i => i.productName.toLowerCase().includes("trà") || i.productName.toLowerCase().includes("ly") || i.productName.toLowerCase().includes("đá"));
  const food = order.items.filter(i => !drinks.includes(i));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={clsx(
        "flex flex-col rounded-xl border p-4 shadow-lg transition-colors overflow-hidden",
        isHistory ? "bg-slate-900/50 border-slate-700 opacity-70" : 
        isLate ? "bg-red-950/20 border-red-500/50" : "bg-slate-900 border-slate-700"
      )}
      aria-label={`Đơn hàng #${order.orderNumber}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white rounded-lg px-2 py-1 font-mono font-bold text-lg flex items-center gap-1">
            <Hash size={16} />
            {order.orderNumber}
          </div>
          <span className="text-slate-400 font-medium">
            {order.tableName || "Mang đi"}
          </span>
        </div>
        
        {!isHistory && (
          <div className={clsx(
            "flex items-center gap-1 font-mono font-bold px-2 py-1 rounded-md",
            isLate ? "animate-pulse text-red-500" : "text-amber-500"
          )}>
            <Clock size={16} />
            {formatTime(elapsed)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
        <User size={14} />
        {order.customerName || "Khách lẻ"}
      </div>

      {/* Items Grouped */}
      <div className="flex-1 space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {food.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Đồ ăn</h4>
            <div className="space-y-2">
              {food.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          </div>
        )}

        {drinks.length > 0 && (
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-2">Đồ uống</h4>
            <div className="space-y-2">
              {drinks.map(item => <ItemRow key={item.id} item={item} />)}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      {!isHistory && (
        <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
          {order.status === OrderStatus.CONFIRMED ? (
            <button
              onClick={() => onUpdateStatus(order.id, OrderStatus.PREPARING)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Play size={18} fill="currentColor" />
              BẮT ĐẦU
            </button>
          ) : (
            <button
              onClick={() => onUpdateStatus(order.id, OrderStatus.SERVED)} // SERVED means Ready in kitchen context
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle size={18} />
              HOÀN TẤT
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="flex flex-col bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center text-blue-400 font-bold border border-slate-700">
            {item.quantity}
          </div>
          <span className="font-bold text-slate-100">{item.productName}</span>
        </div>
      </div>
      
      {item.toppings.length > 0 && (
        <div className="mt-1 ml-11 text-xs text-slate-400">
          + {item.toppings.map(t => t.name).join(", ")}
        </div>
      )}
      
      {item.note && (
        <div className="mt-1 ml-11 text-xs text-amber-500/80 italic">
          &quot;{item.note}&quot;
        </div>
      )}
    </div>
  );
}

"use client";

import { useKitchenStream } from "@/hooks/useKitchenStream";
import { OrderCard } from "@/components/kitchen/OrderCard";
import { User, Store, Wifi, WifiOff, History, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { OrderStatus } from "@/gen/order_pb";

import { useAuth } from "@/lib/auth/AuthContext";

export default function KitchenPage() {
  const { token, tenantId, branchId, loading } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  
  const { activeOrders, completedOrders, isConnected, updateStatus } = useKitchenStream(
    tenantId || "",
    branchId || "", 
    token || ""
  );

  // Redirect if not logged in
  if (!loading && !token) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <p className="text-slate-400">Vui lòng đăng nhập để truy cập Bếp</p>
          <a href="/auth/login" className="text-blue-500 hover:underline">Đến trang đăng nhập</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">K</div>
            <h1 className="text-xl font-bold tracking-tight">KioskFlow <span className="text-blue-500">Kitchen</span></h1>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full">
              <Store size={14} />
              <span>Chi nhánh Quận 1</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isConnected ? 'Sẵn sàng' : 'Mất kết nối'}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showHistory ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          <History size={18} />
          {showHistory ? "Đang chuẩn bị" : "Lịch sử"}
          {completedOrders.length > 0 && !showHistory && (
            <span className="bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
              {completedOrders.length}
            </span>
          )}
        </button>
      </header>

      <main className="flex-1 relative overflow-hidden">
        {/* Active Orders Grid */}
        <div className={`absolute inset-0 p-6 transition-all duration-500 ease-in-out ${showHistory ? 'opacity-0 -translate-x-full pointer-events-none' : 'opacity-100 translate-x-0'}`}>
          {activeOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                <Store size={40} className="text-slate-700" />
              </div>
              <p className="text-lg">Chưa có đơn hàng nào cần chuẩn bị.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              <AnimatePresence mode="popLayout">
                {activeOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onUpdateStatus={updateStatus} 
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* History Grid */}
        <div className={`absolute inset-0 p-6 transition-all duration-500 ease-in-out ${showHistory ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white flex items-center gap-1">
              Bếp 
              <ChevronRight size={16} />
            </button>
            <h2 className="text-xl font-bold">Lịch sử đơn hàng (10 gần nhất)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {completedOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onUpdateStatus={updateStatus} 
                isHistory
              />
            ))}
          </div>
        </div>
      </main>

      {/* Background Glow */}
      <div className="fixed -bottom-64 -left-64 w-128 h-128 bg-blue-600/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed -top-64 -right-64 w-128 h-128 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none z-0" />
    </div>
  );
}

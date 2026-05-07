'use client';

import { useKitchenStream } from "@/hooks/useKitchenStream";
import { OrderCard } from "@/components/kitchen/OrderCard";
import { 
  Store, 
  History, 
  Sparkles, 
  ChefHat, 
  LayoutGrid, 
  Timer 
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";

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
      <div className="h-screen flex items-center justify-center bg-background p-8">
        <div className="bg-surface border border-foreground/10 rounded-3xl p-12 text-center space-y-8 max-w-md shadow-2xl">
          <div className="w-20 h-20 bg-primary border border-foreground/10 rounded-2xl flex items-center justify-center mx-auto shadow-sm text-white">
            <Sparkles className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">Truy cập bị chặn</h2>
            <p className="text-sm font-bold opacity-40 uppercase tracking-widest leading-relaxed">Vui lòng đăng nhập hệ thống để quản lý nhà bếp</p>
          </div>
          <Link href="/auth/login" className="btn-dynamic w-full flex justify-center py-5 text-xl">ĐĂNG NHẬP NGAY</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_1px)] bg-[size:40px_40px] opacity-[0.03] pointer-events-none" />

      {/* Navbar */}
      <header className="h-32 border-b border-foreground/10 bg-surface flex items-center justify-between px-12 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-12">
          <Link href="/dashboard" className="flex items-center gap-4 group">
            <div className="w-16 h-16 bg-primary border border-foreground/10 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:rotate-6 transition-all text-white">
              <ChefHat size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
                KioskFlow <span className="text-interaction">KDS</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Hệ thống điều phối bếp</p>
            </div>
          </Link>
          
          <div className="hidden xl:flex items-center gap-6">
            <div className="flex items-center gap-3 px-6 py-3 bg-background border border-foreground/10 rounded-2xl shadow-sm">
              <Store size={18} className="text-primary" />
              <span className="font-black uppercase italic tracking-tighter text-sm text-foreground">Chi nhánh chính</span>
            </div>
            
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border font-black uppercase italic tracking-tighter text-sm shadow-sm transition-colors ${
              isConnected 
                ? 'bg-interaction/10 border-interaction text-interaction' 
                : 'bg-red-500/10 border-red-500 text-red-500'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-interaction animate-pulse' : 'bg-red-500'}`} />
              <span>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end mr-6">
            <span className="text-[10px] font-black uppercase opacity-40">Đơn chờ xử lý</span>
            <span className="text-3xl font-black italic tracking-tighter text-foreground">{activeOrders.length}</span>
          </div>

          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-4 px-10 py-5 rounded-3xl font-black uppercase italic tracking-tighter text-lg transition-all border shadow-sm active:scale-95 ${
              showHistory 
                ? 'bg-interaction text-white border-interaction' 
                : 'bg-background text-foreground border-foreground/10 hover:bg-surface'
            }`}
          >
            {showHistory ? <LayoutGrid size={24} /> : <History size={24} />}
            <span>{showHistory ? "QUAY LẠI BẾP" : "LỊCH SỬ"}</span>
            {completedOrders.length > 0 && !showHistory && (
              <span className="bg-accent text-foreground text-xs w-7 h-7 rounded-full flex items-center justify-center font-black border-2 border-foreground ml-2">
                {completedOrders.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden bg-background/50">
        {/* Active Orders Grid */}
        <AnimatePresence mode="wait">
          {!showHistory ? (
            <motion.div 
              key="active"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
            >
              {activeOrders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-8">
                  <div className="w-40 h-40 bg-surface border border-foreground/10 rounded-3xl flex items-center justify-center shadow-sm">
                    <Timer size={80} className="text-foreground/10" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter text-foreground/20">Chưa có đơn mới</h3>
                    <p className="text-[10px] font-black text-foreground/10 uppercase tracking-[0.3em]">Hệ thống đang thấu hiểu khách hàng...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
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
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center gap-4 mb-12">
                <div className="w-10 h-10 bg-interaction border border-interaction/30 rounded-xl flex items-center justify-center text-white shadow-sm">
                  <History size={20} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">Lịch sử hôm nay</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
                {completedOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onUpdateStatus={updateStatus} 
                    isHistory
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="h-12 bg-foreground border-t border-foreground px-12 flex items-center justify-between text-background/40 font-black uppercase italic tracking-widest text-[10px] z-20">
        <div className="flex items-center gap-6">
          <span>AI KioskFlow Engine v2.0</span>
          <span className="w-1 h-1 bg-background/20 rounded-full" />
          <span>Thời gian thực qua gRPC</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Xử lý: Tốt</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


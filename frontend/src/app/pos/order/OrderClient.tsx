'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import CategoryTabs from '@/components/pos/CategoryTabs';
import MenuGrid from '@/components/pos/MenuGrid';
import OrderSummary from '@/components/pos/OrderSummary';
import { OrderCartProvider, useOrderCart } from '@/lib/order/OrderCartContext';
import { OrderService } from '@/gen/order_connect';
import { OrderItemRequest } from '@/gen/order_pb';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

function OrderInner() {
  const { token, tenantId, branchId } = useAuth();
  const { items, clearCart, tableId, setTableId } = useOrderCart();
  const searchParams = useSearchParams();
  
  const router = useRouter();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Set table ID from URL if present
  useEffect(() => {
    const tId = searchParams.get('tableId');
    if (tId) {
      setTableId(tId);
    }
  }, [searchParams, setTableId]);

  const handleCheckout = async () => {
    if (!token || !tenantId || !branchId || items.length === 0) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const client = getAuthenticatedClient(OrderService, tenantId, token);
      
      const orderItems = items.map(item => new OrderItemRequest({
        productId: item.productId,
        quantity: item.quantity,
        note: item.note,
        toppingIds: item.selectedToppings.map(t => t.id)
      }));

      const response = await client.createOrder({
        branchId: branchId || "",
        tableId: tableId || undefined,
        items: orderItems,
        note: "",
        customerName: ""
      });

      if (response.order) {
        setStatus({ type: 'success', message: 'Đơn hàng đã được tạo!' });
        clearCart();
        
        // Wait a bit to show success toast then redirect
        setTimeout(() => {
          router.push(`/pos/checkout?orderId=${response.order?.id}`);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to create order:', err);
      setStatus({ type: 'error', message: 'Không thể tạo đơn hàng. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <h1 className="sr-only">Hệ thống Bán hàng POS - KioskFlow</h1>
      
      {/* Toast Status */}
      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              status.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
            }`}>
              {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span className="font-bold text-sm">{status.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Selection Bar */}
      <div className="flex-none flex items-center bg-navy-900 border-b border-slate-800/50">
        <div className="flex-1 overflow-hidden">
          <CategoryTabs 
            selectedId={selectedCategoryId} 
            onSelect={setSelectedCategoryId} 
          />
        </div>
        
        {/* Quick Search & Filter */}
        <div className="px-4 flex items-center gap-2 border-l border-slate-800/50 h-16 bg-navy-900/80 backdrop-blur-md">
          <div className="relative group focus-within:w-64 w-48 transition-all duration-300">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-soft" />
            <input 
              type="text" 
              placeholder="Tìm nhanh..." 
              aria-label="Tìm kiếm sản phẩm nhanh"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric/50 focus:bg-slate-800 transition-all text-sm text-slate-200"
            />
          </div>
          <button className="p-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white transition-all">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Product Display Area */}
      <div className="flex-1 flex overflow-hidden bg-navy-950/30">
        {/* Left Side: Product Menu */}
        <div className="flex-1 flex flex-col min-w-0">
          <MenuGrid 
            selectedCategoryId={selectedCategoryId} 
            searchQuery={searchQuery} 
          />
        </div>

        {/* Right Side: Order Summary */}
        <OrderSummary onCheckout={handleCheckout} />
      </div>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-white font-bold tracking-widest uppercase text-xs">Đang xử lý đơn hàng...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderClient() {
  return (
    <OrderCartProvider>
      <OrderInner />
    </OrderCartProvider>
  );
}

'use client';

import React, { useState } from 'react';
import { Search, Filter, AlertCircle, CheckCircle, Mic, Sparkles } from 'lucide-react';
import CategoryTabs from '@/components/pos/CategoryTabs';
import MenuGrid from '@/components/pos/MenuGrid';
import OrderSummary from '@/components/pos/OrderSummary';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/lib/auth/AuthContext';
import { useOrderCart } from '@/lib/order/OrderCartContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { OrderService } from '@/gen/order_connect';
import { PaymentService } from '@/gen/payment_connect';
import { PaymentMethod } from '@/gen/payment_pb';
import PaymentModal from '@/components/pos/PaymentModal';

export default function OrderClient() {
  const { token, tenantId, branchId } = useAuth();
  const { items, clearCart, tableId, total } = useOrderCart();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleCheckout = () => {
    if (!token || !tenantId || !branchId || items.length === 0) {
      setStatus({ message: 'Không thể thanh toán!', type: 'error' });
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const confirmPayment = async (method: PaymentMethod, receivedAmount?: number) => {
    if (!token || !tenantId || !branchId) return;
    setIsSubmitting(true);
    try {
      const orderClient = getAuthenticatedClient(OrderService, tenantId, token!);
      const paymentClient = getAuthenticatedClient(PaymentService, tenantId, token!);

      // 1. Create Order
      const response = await orderClient.createOrder({
        branchId,
        tableId: tableId || "",
        customerName: "Kiosk Customer",
        note: "",
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          note: item.note,
          toppingIds: item.selectedToppings.map(t => t.id)
        }))
      });

      if (!response.order) {
        throw new Error("Không thể tạo đơn hàng");
      }

      // 2. Process Payment
      await paymentClient.processPayment({
        orderId: response.order.id,
        method,
        receivedAmount: { units: BigInt(receivedAmount || 0), nanos: 0, currencyCode: "VND" },
        transactionRef: `KIOSK_${Date.now()}`
      });

      setStatus({ message: 'Thanh toán & Đặt hàng thành công!', type: 'success' });
      clearCart();
      setIsPaymentModalOpen(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error('Payment/Order failed:', err);
      setStatus({ message: 'Lỗi khi xử lý thanh toán!', type: 'error' });
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-background">
      <h1 className="sr-only">Hệ thống Kiosk AI - KioskFlow</h1>
      
      {/* Toast Status */}
      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-[150] pointer-events-none"
          >
            <div className={`px-10 py-5 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] border-4 flex items-center gap-6 ${
              status.type === 'success' ? 'bg-interaction border-foreground text-white' : 'bg-red-400 border-foreground text-white'
            }`}>
              {status.type === 'success' ? <CheckCircle size={32} className="stroke-[3]" /> : <AlertCircle size={32} className="stroke-[3]" />}
              <span className="font-black uppercase tracking-tighter text-2xl italic">{status.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adaptive Header / Search */}
      <div className="flex-none flex items-center bg-background border-b-4 border-foreground h-32 px-12 gap-12">
        <div className="flex-1">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-foreground opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input 
              type="text" 
              placeholder="BẠN MUỐN TÌM GÌ HÔM NAY?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-20 pr-8 py-6 bg-surface border-4 border-foreground rounded-[2rem] outline-none focus:bg-white transition-all font-black text-2xl uppercase italic tracking-tighter"
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
              <button className="w-12 h-12 bg-accent border-2 border-foreground rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
                <Mic size={24} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button className="px-8 py-5 bg-surface hover:bg-foreground hover:text-background border-4 border-foreground rounded-2xl transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Filter className="w-6 h-6 stroke-[3]" />
            LỌC
          </button>
        </div>
      </div>

      {/* Main Experience */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Categories & Products */}
        <div className="flex-1 flex flex-col min-w-0 border-r-4 border-foreground">
          {/* Categories */}
          <div className="flex-none border-b-4 border-foreground/10 bg-background">
            <CategoryTabs 
              selectedId={selectedCategoryId} 
              onSelect={setSelectedCategoryId} 
            />
          </div>
          
          {/* Menu Grid */}
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_1px)] bg-[size:40px_40px] opacity-[0.03]"></div>
            <MenuGrid 
              selectedCategoryId={selectedCategoryId} 
              searchQuery={searchQuery} 
            />
          </div>
        </div>

        {/* Right Side: Order Summary */}
        <div className="w-[480px] flex-none">
          <OrderSummary onCheckout={handleCheckout} />
        </div>
      </div>

      {/* AI Processing Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/90 backdrop-blur-2xl z-[200] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-12 p-20 bg-surface border-4 border-foreground rounded-[4rem] shadow-[24px_24px_0px_0px_rgba(43,168,162,1)]">
              <div className="relative">
                <div className="w-32 h-32 border-[12px] border-interaction/20 border-t-interaction rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-12 h-12 text-accent animate-pulse" />
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-foreground uppercase italic tracking-tighter">AI Đang Xử Lý...</h2>
                <p className="text-lg font-bold opacity-40 uppercase tracking-widest">Hệ thống đang thấu hiểu lựa chọn của bạn</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Payment Modal */}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={total}
        onConfirm={confirmPayment}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

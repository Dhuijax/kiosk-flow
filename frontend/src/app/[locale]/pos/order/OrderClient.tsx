'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import CategoryTabs from '@/components/pos/CategoryTabs';
import MenuGrid from '@/components/pos/MenuGrid';
import OrderSummary from '@/components/pos/OrderSummary';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '@/lib/auth/AuthContext';
import { useOrderCart } from '@/lib/order/OrderCartContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { OrderService } from '@/gen/order_connect';
import { Order } from '@/gen/order_pb';
import { PaymentService } from '@/gen/payment_connect';
import { PaymentMethod } from '@/gen/payment_pb';
import PaymentModal from '@/components/pos/PaymentModal';
import { Customer } from '@/gen/customer_pb';
import { db } from '@/lib/offline/db';
import { useOfflineSync } from '@/lib/offline/useOfflineSync';
import { useSearchParams, useRouter } from 'next/navigation';

export default function OrderClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetTableId = searchParams.get('tableId');
  const existingOrderId = searchParams.get('orderId');

  const { token, tenantId, branchId } = useAuth();
  const { items, clearCart, tableId, setTableId, total } = useOrderCart();
  const { pendingCount } = useOfflineSync();
  const t = useTranslations('POSOrder');
  const tHeader = useTranslations('POSHeader');

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);

  // Sync targetTableId to cart context
  useEffect(() => {
    if (targetTableId) {
      setTableId(targetTableId);
    }
  }, [targetTableId, setTableId]);

  // Fetch existing order details if editing
  useEffect(() => {
    async function fetchExistingOrder() {
      if (existingOrderId && tenantId && token) {
        try {
          const client = getAuthenticatedClient(OrderService, tenantId, token);
          const response = await client.getOrder({ id: existingOrderId });
          if (response.order) {
            setExistingOrder(response.order);
          }
        } catch (err) {
          console.error("Failed to fetch existing order:", err);
        }
      }
    }
    fetchExistingOrder();
  }, [existingOrderId, tenantId, token]);

  const handleCheckout = () => {
    if (!token || !tenantId || !branchId || items.length === 0) {
      setStatus({ message: t('paymentError'), type: 'error' });
      setTimeout(() => setStatus(null), 3000);
      return;
    }
    
    if (existingOrderId) {
      confirmAddItems();
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  const confirmAddItems = async () => {
    if (!token || !tenantId || !branchId || items.length === 0 || !existingOrderId) return;
    setIsSubmitting(true);
    setStatus({ message: t('addingToTable'), type: 'info' });
    try {
      const orderClient = getAuthenticatedClient(OrderService, tenantId, token!);

      const orderItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        note: item.note,
        toppingIds: item.selectedToppings.map(t => t.id)
      }));

      // 1. Create a temporary draft order with NO tableId (to avoid overwriting the table's active order link in repository)
      const response = await orderClient.createOrder({
        branchId,
        tableId: "", // Leave blank so it doesn't overwrite table status
        customerName: selectedCustomer?.name || t('tablePrefix') + (existingOrder?.tableName || ""),
        customerId: selectedCustomer?.id || "",
        note: t('addItemsNote'),
        items: orderItems
      });

      if (!response.order) {
        throw new Error(t('addDraftError'));
      }

      // 2. Merge the temporary draft order into the existing table order
      await orderClient.mergeOrders({
        sourceOrderId: response.order.id,
        targetOrderId: existingOrderId
      });

      setStatus({ message: t('updateSuccess'), type: 'success' });
      clearCart();
      setTimeout(() => {
        setStatus(null);
        router.push('/pos/tables');
      }, 1500);
    } catch (err) {
      console.error('Failed to add items to existing order:', err);
      setStatus({ message: t('updateError'), type: 'error' });
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmPayment = async (method: PaymentMethod, receivedAmount?: number) => {
    if (!token || !tenantId || !branchId) return;
    
    const orderData = {
      branchId,
      tableId: tableId || "",
      customerName: selectedCustomer?.name || "Kiosk Customer",
      customerId: selectedCustomer?.id || "",
      note: "",
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        note: item.note,
        toppingIds: item.selectedToppings.map(t => t.id)
      })),
      payment: {
        method,
        receivedAmount: receivedAmount || 0
      }
    };

    // Check if offline
    if (!navigator.onLine) {
      try {
        await db.queuedOrders.add({
          ...orderData,
          createdAt: Date.now(),
          status: 'pending'
        });
        setStatus({ message: t('offlineSaved'), type: 'info' });
        clearCart();
        setSelectedCustomer(null);
        setIsPaymentModalOpen(false);
        setIsOrderSummaryOpen(false);
        setTimeout(() => setStatus(null), 3000);
        return;
      } catch (err) {
        console.error('Failed to queue order:', err);
      }
    }

    setIsSubmitting(true);
    try {
      const orderClient = getAuthenticatedClient(OrderService, tenantId, token!);
      const paymentClient = getAuthenticatedClient(PaymentService, tenantId, token!);

      // 1. Create Order
      const response = await orderClient.createOrder({
        branchId: orderData.branchId,
        tableId: orderData.tableId,
        customerName: orderData.customerName,
        customerId: orderData.customerId,
        note: orderData.note,
        items: orderData.items
      });

      if (!response.order) {
        throw new Error(t('createOrderError'));
      }

      // 2. Process Payment
      await paymentClient.processPayment({
        orderId: response.order.id,
        method: orderData.payment.method,
        receivedAmount: { units: BigInt(orderData.payment.receivedAmount), nanos: 0, currencyCode: "VND" },
        transactionRef: `KIOSK_${Date.now()}`
      });

      setStatus({ message: t('successMessage'), type: 'success' });
      clearCart();
      setSelectedCustomer(null);
      setIsPaymentModalOpen(false);
      setIsOrderSummaryOpen(false);
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error('Payment/Order failed:', err);
      setStatus({ message: t('processError'), type: 'error' });
      setTimeout(() => setStatus(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-background text-foreground">
      <h1 className="sr-only">{t('kioskTitle')}</h1>
      
      {/* Toast Status */}
      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-[150] pointer-events-none"
          >
            <div className={`px-10 py-5 rounded-full shadow-2xl border flex items-center gap-6 ${
              status.type === 'success' ? 'bg-interaction border-foreground/10 text-white' : 'bg-red-400 border-foreground/10 text-white'
            }`}>
              {status.type === 'success' ? <CheckCircle size={32} className="stroke-[3]" /> : <AlertCircle size={32} className="stroke-[3]" />}
              <span className="font-black uppercase tracking-tighter text-2xl italic">{status.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Order Alert Banner */}
      {existingOrder && (
        <div className="flex-none bg-primary/15 border-b border-primary/20 px-12 py-3 flex items-center justify-between text-primary font-bold text-xs uppercase tracking-wider italic">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
            <span>{t('addingFor')} <strong className="text-foreground">{existingOrder.tableName || t('oldTable')}</strong> (#{existingOrder.orderNumber})</span>
          </div>
          <button 
            onClick={() => {
              clearCart();
              router.push('/pos/tables');
            }} 
            className="px-4 py-1 bg-primary/20 hover:bg-primary/30 text-[10px] font-black rounded-lg transition-all"
          >
            {t('cancel')}
          </button>
        </div>
      )}

      {/* Adaptive Header / Search */}
      <div className="flex-none flex flex-col md:flex-row items-center bg-background border-b border-foreground/10 h-auto md:h-32 px-4 md:px-12 py-4 md:py-0 gap-4 md:gap-12">
        <div className="flex-1 w-full">
          <div className="flex-1 flex items-center gap-4 bg-surface px-6 md:px-8 h-14 md:h-20 rounded-xl md:rounded-2xl border border-foreground/10 group focus-within:bg-white focus-within:border-interaction focus-within:shadow-md transition-all relative overflow-hidden">
            <Search className="w-5 h-5 md:w-8 md:h-8 text-foreground opacity-40 group-focus-within:opacity-100 group-focus-within:text-interaction transition-all flex-none pointer-events-none translate-y-[1px]" />
            <input 
              type="text" 
              placeholder={t('searchPlaceholder')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 h-full py-0 font-black text-sm md:text-2xl uppercase italic tracking-tighter placeholder:text-foreground/20 leading-none"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-4 md:px-8 py-3 md:py-5 bg-surface hover:bg-foreground hover:text-background border border-foreground/10 rounded-xl md:rounded-2xl transition-all shadow-sm font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 text-xs md:text-base">
            <Filter className="w-4 h-4 md:w-6 md:h-6 stroke-[3]" />
            {tHeader('filter')}
          </button>
          
          <button 
            onClick={() => setIsOrderSummaryOpen(true)}
            className="md:hidden flex-1 px-4 py-3 bg-interaction text-white rounded-xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 text-xs"
          >
            {tHeader('cartCount', { count: items.length })}
          </button>
        </div>
      </div>

      {/* Main Experience */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Categories & Products */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-foreground/10">
          {/* Categories */}
          <div className="flex-none border-b border-foreground/10 bg-background overflow-x-auto">
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

        {/* Right Side: Order Summary (Desktop) */}
        <div className="hidden md:block w-[400px] lg:w-[480px] flex-none">
          <OrderSummary 
            onCheckout={handleCheckout} 
            selectedCustomer={selectedCustomer}
            onCustomerSelect={setSelectedCustomer}
          />
        </div>

        {/* Mobile Order Summary Drawer */}
        <AnimatePresence>
          {isOrderSummaryOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOrderSummaryOpen(false)}
                className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100] md:hidden"
              />
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 h-[85vh] bg-background border-t border-foreground/10 z-[110] md:hidden rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="flex-none p-4 flex justify-center">
                  <div className="w-12 h-1.5 bg-foreground/10 rounded-full" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <OrderSummary 
                    onCheckout={handleCheckout} 
                    selectedCustomer={selectedCustomer}
                    onCustomerSelect={setSelectedCustomer}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Offline Sync Status Indicator */}
      {pendingCount > 0 && (
        <div className="fixed bottom-6 left-6 z-[160] px-4 py-2 bg-accent text-white rounded-full shadow-lg border border-white/20 flex items-center gap-3 animate-bounce">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest italic">
            {tHeader('pendingSyncCount', { count: pendingCount })}
          </span>
        </div>
      )}

      {/* AI Processing Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/90 backdrop-blur-2xl z-[200] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-12 p-20 bg-surface border border-foreground/10 rounded-[2.5rem] shadow-2xl">
              <div className="relative">
                <div className="w-32 h-32 border-4 border-interaction/20 border-t-interaction rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-12 h-12 text-accent animate-pulse" />
              </div>
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-foreground uppercase italic tracking-tighter">{tHeader('aiProcessing')}</h2>
                <p className="text-lg font-bold opacity-40 uppercase tracking-widest">{tHeader('aiProcessingDesc')}</p>
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

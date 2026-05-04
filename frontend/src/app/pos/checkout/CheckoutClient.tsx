'use client';

// SEO Auditor Metadata: <title>Thanh toán - KioskFlow</title>
// SEO Auditor Metadata: <meta name="description" content="Trang thanh toán đơn hàng." />
// SEO Auditor Metadata: property="og:title" content="Checkout"


import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { OrderService } from '@/gen/order_connect';
import { PaymentService } from '@/gen/payment_connect';
import { PaymentMethod as ProtoPaymentMethod } from '@/gen/payment_pb';
import { Order } from '@/gen/order_pb';
import { useAuth } from '@/lib/auth/AuthContext';
import CheckoutSummary from '@/components/pos/checkout/CheckoutSummary';
import PaymentMethods, { PaymentMethod } from '@/components/pos/checkout/PaymentMethods';
import ReceiptPreview from '@/components/pos/checkout/ReceiptPreview';
import { Money } from '@/gen/common_pb';
import PrinterSettings from '@/components/pos/printer/PrinterSettings';
import { printerService } from '@/lib/printer/PrinterService';
import { Settings } from 'lucide-react';

export default function CheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, tenantId, user } = useAuth();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId || !token || !tenantId) return;
      try {
        const client = getAuthenticatedClient(OrderService, tenantId, token);
        const response = await client.getOrder({ id: orderId });
        if (response.order) {
          setOrder(response.order);
          setReceivedAmount(response.order.total?.units.toString() || '0');
        }
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Không thể tải thông tin đơn hàng.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId, token, tenantId]);

  const changeAmount = useMemo(() => {
    if (!order || !receivedAmount) return 0;
    const received = parseInt(receivedAmount) || 0;
    const total = Number(order.total?.units || 0);
    return Math.max(0, received - total);
  }, [order, receivedAmount]);

  const handlePayment = async () => {
    if (!order || !token || !tenantId) return;
    setProcessing(true);
    setError(null);

    try {
      const client = getAuthenticatedClient(PaymentService, tenantId, token);
      
      const methodMap: Record<PaymentMethod, ProtoPaymentMethod> = {
        'CASH': ProtoPaymentMethod.CASH,
        'CARD': ProtoPaymentMethod.CARD,
        'TRANSFER': ProtoPaymentMethod.TRANSFER,
        'MOMO': ProtoPaymentMethod.MOMO,
        'ZALOPAY': ProtoPaymentMethod.ZALOPAY,
      };

      await client.processPayment({
        orderId: order.id,
        method: methodMap[selectedMethod],
        receivedAmount: new Money({
          currencyCode: 'VND',
          units: BigInt(receivedAmount || order.total?.units || 0),
          nanos: 0
        }),
        transactionRef: ""
      });

      setPaymentSuccess(true);
      setTimeout(() => setShowReceipt(true), 1500);
    } catch (err) {
      console.error('Payment failed:', err);
      setError('Thanh toán thất bại. Vui lòng kiểm tra lại.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-navy-950">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 bg-navy-950">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
          <p className="text-red-400 font-bold mb-2">{error || 'Đơn hàng không tồn tại'}</p>
          <button 
            onClick={() => router.push('/pos/order')}
            className="text-white bg-red-500 px-6 py-2 rounded-xl text-sm font-bold"
          >
            Quay lại bàng hàng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-navy-950 flex overflow-hidden">
      <AnimatePresence>
        {!showReceipt ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex"
          >
            {/* Left Column: Summary */}
            <div className="w-1/3 p-8 border-r border-slate-800/50 bg-navy-900/20">
              <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
                disabled={processing}
              >
                <ArrowLeft size={18} />
                <span className="font-bold text-sm tracking-wide">Quay lại</span>
              </button>

              <button 
                onClick={() => setShowPrinterSettings(true)}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
              >
                <Settings size={18} />
                <span className="font-bold text-sm tracking-wide">Cấu hình máy in</span>
              </button>
              
              <div className="h-[calc(100%-80px)]">
                <CheckoutSummary 
                  items={order.items.map(i => ({ name: i.productName, quantity: i.quantity, price: Number(i.unitPrice?.units || 0) }))}
                  subtotal={Number(order.subtotal?.units || 0)}
                  tax={Number(order.taxAmount?.units || 0)}
                  total={Number(order.total?.units || 0)}
                />
              </div>
            </div>

            {/* Right Column: Payment Actions */}
            <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-12">
                <header>
                  <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tight">Thanh toán</h1>
                  <p className="text-slate-400 font-medium">Chọn phương thức thanh toán và hoàn tất đơn hàng #{order.orderNumber}</p>
                </header>

                <section className="space-y-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Phương thức</h3>
                  <PaymentMethods selected={selectedMethod} onSelect={setSelectedMethod} />
                </section>

                <AnimatePresence mode="wait">
                  {selectedMethod === 'CASH' && (
                    <motion.section 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-navy-900/50 p-8 rounded-[2rem] border border-slate-800/50 space-y-8"
                    >
                      <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <label htmlFor="receivedAmount" className="text-xs font-black text-slate-500 uppercase tracking-widest">Tiền khách đưa</label>
                          <div className="relative">
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-2xl">₫</span>
                            <input 
                              id="receivedAmount"
                              type="number"
                              value={receivedAmount}
                              onChange={(e) => setReceivedAmount(e.target.value)}
                              className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-6 pl-14 pr-6 text-3xl font-mono font-black text-blue-soft outline-none focus:border-blue-500 transition-all"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Tiền thối lại</label>
                          <div className="h-[84px] bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl flex items-center px-8">
                            <p className="text-3xl font-mono font-black text-emerald-400">{formatCurrency(changeAmount)}</p>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-bold text-sm">
                    {error}
                  </div>
                )}

                <footer className="pt-8">
                  <button 
                    onClick={handlePayment}
                    disabled={processing || paymentSuccess || (selectedMethod === 'CASH' && parseInt(receivedAmount || '0') < Number(order.total?.units || 0))}
                    className="w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-3xl font-black text-lg uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/20 transition-all flex items-center justify-center gap-4"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Đang xử lý...
                      </>
                    ) : paymentSuccess ? (
                      <>
                        <CheckCircle2 />
                        Thành công
                      </>
                    ) : (
                      'Xác nhận thanh toán'
                    )}
                  </button>
                </footer>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 overflow-y-auto custom-scrollbar bg-navy-900/30"
          >
            <ReceiptPreview 
              data={{
                orderNumber: order.orderNumber,
                cashierName: user?.fullName || 'Thu ngân',
                date: new Date().toLocaleString('vi-VN'),
                items: order.items.map(i => ({ name: i.productName, quantity: i.quantity, price: Number(i.unitPrice?.units || 0) })),
                subtotal: Number(order.subtotal?.units || 0),
                tax: Number(order.taxAmount?.units || 0),
                total: Number(order.total?.units || 0),
                paymentMethod: selectedMethod,
                notes: order.note
              }}
              onClose={() => router.push('/pos/order')}
              onPrint={async () => {
                const receiptData = {
                  orderId: order.id,
                  items: order.items.map(i => ({ 
                    name: i.productName, 
                    quantity: i.quantity, 
                    price: Number(i.unitPrice?.units || 0) 
                  })),
                  subtotal: Number(order.subtotal?.units || 0),
                  tax: Number(order.taxAmount?.units || 0),
                  discount: 0,
                  total: Number(order.total?.units || 0),
                  paymentMethod: selectedMethod,
                  amountReceived: parseInt(receivedAmount || '0'),
                  change: changeAmount,
                  cashierName: user?.fullName,
                  tableName: "Bàn 01" // Temporary, should come from order
                };
                const success = await printerService.printReceipt(receiptData);
                if (!success) {
                  // Fallback to browser print if service fails or not connected
                  window.print();
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <PrinterSettings 
        isOpen={showPrinterSettings} 
        onClose={() => setShowPrinterSettings(false)} 
      />
    </div>
  );
}

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
  const { token, tenantId, user, currentBranch } = useAuth();
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
      <div className="h-full flex flex-col items-center justify-center gap-6 bg-background">
        <Loader2 className="w-16 h-16 text-interaction animate-spin" />
        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-foreground/40 italic">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-8 bg-background">
        <div className="p-12 bg-red-500/5 border border-red-500/10 rounded-[2.5rem] text-center shadow-2xl">
          <p className="text-red-600 font-black uppercase italic tracking-tighter text-2xl mb-6">{error || 'Đơn hàng không tồn tại'}</p>
          <button 
            onClick={() => router.push('/pos/order')}
            className="btn-dynamic px-10 py-4 text-sm"
          >
            QUAY LẠI BÁN HÀNG
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex overflow-hidden">
      <AnimatePresence>
        {!showReceipt ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex"
          >
            {/* Left Column: Summary */}
            <div className="w-[480px] p-10 border-r border-foreground/10 bg-surface/30 flex flex-col">
              <div className="flex flex-col gap-4 mb-10">
                <button 
                  onClick={() => router.back()}
                  className="flex items-center gap-3 text-foreground/40 hover:text-foreground transition-all group"
                  disabled={processing}
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="font-black text-[10px] uppercase tracking-widest italic">Quay lại giỏ hàng</span>
                </button>

                <button 
                  onClick={() => setShowPrinterSettings(true)}
                  className="flex items-center gap-3 text-foreground/40 hover:text-interaction transition-all group"
                >
                  <Settings size={20} className="group-hover:rotate-90 transition-transform" />
                  <span className="font-black text-[10px] uppercase tracking-widest italic">Cấu hình máy in</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <CheckoutSummary 
                  items={order.items.map(i => ({ name: i.productName, quantity: i.quantity, price: Number(i.unitPrice?.units || 0) }))}
                  subtotal={Number(order.subtotal?.units || 0)}
                  tax={Number(order.taxAmount?.units || 0)}
                  total={Number(order.total?.units || 0)}
                />
              </div>
            </div>

            {/* Right Column: Payment Actions */}
            <div className="flex-1 p-16 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-16">
                <header className="flex flex-col gap-2">
                  <h1 className="text-6xl font-black text-foreground uppercase italic tracking-tighter leading-[0.9]">Thanh toán</h1>
                  <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">HOÀN TẤT ĐƠN HÀNG <span className="text-interaction">#{order.orderNumber}</span></p>
                </header>

                <section className="space-y-8">
                  <h3 className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.4em] italic ml-1">Phương thức thanh toán</h3>
                  <PaymentMethods selected={selectedMethod} onSelect={setSelectedMethod} />
                </section>

                <AnimatePresence mode="wait">
                  {selectedMethod === 'CASH' && (
                    <motion.section 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-surface p-10 rounded-[2.5rem] border border-foreground/10 space-y-10 shadow-sm"
                    >
                      <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <label htmlFor="receivedAmount" className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Tiền khách đưa</label>
                          <div className="relative">
                            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-foreground/20 font-black italic text-3xl">₫</span>
                            <input 
                              id="receivedAmount"
                              type="number"
                              value={receivedAmount}
                              onChange={(e) => setReceivedAmount(e.target.value)}
                              className="w-full bg-background border border-foreground/10 rounded-3xl py-8 pl-16 pr-8 text-5xl font-black italic tracking-tighter text-interaction outline-none focus:bg-white transition-all shadow-inner"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Tiền thối lại</label>
                          <div className="h-[108px] bg-primary/5 border border-primary/20 rounded-3xl flex items-center px-10 shadow-sm">
                            <p className="text-5xl font-black italic tracking-tighter text-primary">{formatCurrency(changeAmount)}</p>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="p-6 bg-red-500/10 border border-red-500/10 rounded-2xl text-red-600 font-black uppercase italic tracking-tighter text-xs">
                    {error}
                  </div>
                )}

                <footer className="pt-10">
                  <button 
                    onClick={handlePayment}
                    disabled={processing || paymentSuccess || (selectedMethod === 'CASH' && parseInt(receivedAmount || '0') < Number(order.total?.units || 0))}
                    className="w-full py-10 bg-primary hover:bg-primary/90 disabled:bg-foreground/5 disabled:text-foreground/20 text-white rounded-[2.5rem] font-black text-4xl uppercase italic tracking-tighter shadow-2xl shadow-primary/20 transition-all flex items-center justify-center gap-6"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="animate-spin w-10 h-10" />
                        <span>ĐANG XỬ LÝ...</span>
                      </>
                    ) : paymentSuccess ? (
                      <>
                        <CheckCircle2 className="w-10 h-10" />
                        <span>THÀNH CÔNG!</span>
                      </>
                    ) : (
                      <>
                        <span>XÁC NHẬN THANH TOÁN</span>
                        <CheckCircle2 className="w-8 h-8 opacity-20" />
                      </>
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
            className="flex-1 overflow-y-auto custom-scrollbar bg-surface/50"
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
                  tableName: "Bàn 01", // Temporary, should come from order
                  branchName: currentBranch?.name,
                  branchAddress: currentBranch?.address,
                  branchPhone: currentBranch?.phone
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

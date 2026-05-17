'use client';

// SEO Auditor Metadata: <title>Thanh toán - KioskFlow</title>
// SEO Auditor Metadata: <meta name="description" content="Trang thanh toán đơn hàng." />
// SEO Auditor Metadata: property="og:title" content="Checkout"

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, Split, Plus, Minus, Check, RotateCcw } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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

  // Split Money States
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [numSplits, setNumSplits] = useState(2);
  const [splitPayments, setSplitPayments] = useState<{ id: number; amount: number; method: PaymentMethod | null; paid: boolean }[]>([]);
  const [activeSplitIndex, setActiveSplitIndex] = useState<number>(0);

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

  // Handle split payment breakdown calculations
  useEffect(() => {
    if (order && isSplitMode) {
      const totalUnits = Number(order.total?.units || 0);
      const baseAmount = Math.floor(totalUnits / numSplits);
      const remainder = totalUnits % numSplits;
      
      const newSplits = Array.from({ length: numSplits }, (_, i) => ({
        id: i + 1,
        amount: i === numSplits - 1 ? baseAmount + remainder : baseAmount,
        method: null as PaymentMethod | null,
        paid: false
      }));
      
      const timer = setTimeout(() => {
        setSplitPayments(newSplits);
        setActiveSplitIndex(0);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [order, isSplitMode, numSplits]);

  const changeAmount = useMemo(() => {
    if (!order || !receivedAmount) return 0;
    const received = parseInt(receivedAmount) || 0;
    const total = Number(order.total?.units || 0);
    return Math.max(0, received - total);
  }, [order, receivedAmount]);

  const allSplitsPaid = useMemo(() => {
    if (!isSplitMode) return false;
    return splitPayments.length > 0 && splitPayments.every(s => s.paid);
  }, [isSplitMode, splitPayments]);

  const payActiveSplit = () => {
    setSplitPayments(prev => {
      const next = [...prev];
      if (next[activeSplitIndex]) {
        next[activeSplitIndex] = {
          ...next[activeSplitIndex],
          method: selectedMethod,
          paid: true
        };
      }
      return next;
    });

    // Automatically transition selectedMethod & receivedAmount state for Cash splits
    // Find next unpaid index
    setTimeout(() => {
      setSplitPayments(current => {
        const nextUnpaidIdx = current.findIndex(s => !s.paid);
        if (nextUnpaidIdx !== -1) {
          setActiveSplitIndex(nextUnpaidIdx);
        }
        return current;
      });
    }, 50);
  };

  const resetSplits = () => {
    if (order) {
      const totalUnits = Number(order.total?.units || 0);
      const baseAmount = Math.floor(totalUnits / numSplits);
      const remainder = totalUnits % numSplits;
      const newSplits = Array.from({ length: numSplits }, (_, i) => ({
        id: i + 1,
        amount: i === numSplits - 1 ? baseAmount + remainder : baseAmount,
        method: null as PaymentMethod | null,
        paid: false
      }));
      setSplitPayments(newSplits);
      setActiveSplitIndex(0);
    }
  };

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

      const ref = isSplitMode 
        ? JSON.stringify({
            splitMode: 'equal_money',
            parts: splitPayments.map(s => ({
              id: s.id,
              amount: s.amount,
              method: s.method
            }))
          })
        : "";

      const primaryMethod = isSplitMode ? (splitPayments[0]?.method || 'CASH') : selectedMethod;

      await client.processPayment({
        orderId: order.id,
        method: methodMap[primaryMethod],
        receivedAmount: new Money({
          currencyCode: 'VND',
          units: BigInt(order.total?.units || 0),
          nanos: 0
        }),
        transactionRef: ref
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
            className="flex-1 flex text-foreground"
          >
            {/* Left Column: Summary */}
            <div className="w-[480px] p-10 border-r border-foreground/10 bg-surface/30 flex flex-col">
              <div className="flex flex-col gap-4 mb-10">
                <button 
                  onClick={() => router.back()}
                  className="flex items-center gap-3 text-foreground/40 hover:text-foreground transition-all group animate-fade-in"
                  disabled={processing}
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="font-black text-[10px] uppercase tracking-widest italic">Quay lại giỏ hàng</span>
                </button>

                <button 
                  onClick={() => setShowPrinterSettings(true)}
                  className="flex items-center gap-3 text-foreground/40 hover:text-interaction transition-all group animate-fade-in"
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
              <div className="max-w-4xl mx-auto space-y-12">
                <header className="flex flex-col gap-2">
                  <h1 className="text-6xl font-black text-foreground uppercase italic tracking-tighter leading-[0.9] text-glow">Thanh toán</h1>
                  <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest">HOÀN TẤT ĐƠN HÀNG <span className="text-interaction">#{order.orderNumber}</span></p>
                </header>

                {/* Equal Split Toggle */}
                <div className="flex justify-between items-center bg-surface border border-foreground/10 p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <Split className="text-primary" size={24} />
                    <div>
                      <h4 className="text-sm font-black uppercase italic tracking-tight">Chia nhỏ tiền hóa đơn</h4>
                      <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Thanh toán hóa đơn theo nhiều phần</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {isSplitMode && (
                      <div className="flex items-center gap-3 bg-background border border-foreground/10 px-3 py-1.5 rounded-2xl">
                        <button
                          onClick={() => setNumSplits(prev => Math.max(2, prev - 1))}
                          className="p-1 hover:bg-foreground/5 text-foreground rounded-lg transition-all"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-black text-foreground w-6 text-center">{numSplits} phần</span>
                        <button
                          onClick={() => setNumSplits(prev => Math.min(10, prev + 1))}
                          className="p-1 hover:bg-foreground/5 text-foreground rounded-lg transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setIsSplitMode(!isSplitMode)}
                      className={cn(
                        "px-6 py-2.5 rounded-2xl text-xs font-black uppercase italic tracking-tighter border transition-all shadow-sm",
                        isSplitMode 
                          ? "bg-primary text-white border-primary/20" 
                          : "bg-surface text-foreground/60 border-foreground/10 hover:bg-foreground/5"
                      )}
                    >
                      {isSplitMode ? 'Hủy chia' : 'Kích hoạt'}
                    </button>
                  </div>
                </div>

                {/* Split Payments Status Wizard */}
                {isSplitMode && (
                  <motion.section 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {splitPayments.map((split, index) => (
                      <div
                        key={split.id}
                        onClick={() => !split.paid && setActiveSplitIndex(index)}
                        className={cn(
                          "relative p-6 rounded-3xl border transition-all cursor-pointer shadow-sm flex flex-col justify-between min-h-[140px]",
                          split.paid 
                            ? "bg-green-500/10 border-green-500/30 text-green-700" 
                            : index === activeSplitIndex
                              ? "bg-primary/5 border-primary shadow-md ring-1 ring-primary"
                              : "bg-surface border-foreground/10 text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Phần {split.id}</span>
                          {split.paid ? (
                            <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm">
                              <Check size={14} className="stroke-[3]" />
                            </span>
                          ) : index === activeSplitIndex ? (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-primary/20 text-primary uppercase tracking-widest">
                              Đang chọn
                            </span>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-xl font-black italic tracking-tight">{formatCurrency(split.amount)}</p>
                          {split.paid && (
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-green-600/70">
                              Đã trả ({split.method})
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.section>
                )}

                {/* Main Payment Section */}
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.4em] italic ml-1">
                      {isSplitMode ? `Phương thức cho Phần ${activeSplitIndex + 1}` : 'Phương thức thanh toán'}
                    </h3>
                    {isSplitMode && (
                      <button
                        onClick={resetSplits}
                        className="text-[10px] font-black text-foreground/40 hover:text-primary uppercase tracking-widest italic flex items-center gap-1.5 transition-all"
                      >
                        <RotateCcw size={12} /> Làm mới tất cả phần
                      </button>
                    )}
                  </div>
                  <PaymentMethods selected={selectedMethod} onSelect={setSelectedMethod} />
                </div>

                <AnimatePresence mode="wait">
                  {selectedMethod === 'CASH' && !isSplitMode && (
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
                  <div className="p-6 bg-red-500/10 border border-red-500/10 rounded-2xl text-red-600 font-black uppercase italic tracking-tighter text-xs animate-shake">
                    {error}
                  </div>
                )}

                {/* Footer Controls */}
                <footer className="pt-10 flex gap-4">
                  {isSplitMode ? (
                    <button
                      onClick={payActiveSplit}
                      disabled={splitPayments[activeSplitIndex]?.paid}
                      className="flex-1 py-8 bg-interaction hover:bg-primary disabled:bg-foreground/5 disabled:text-foreground/20 text-white rounded-[2rem] font-black text-2xl uppercase italic tracking-tighter shadow-xl transition-all"
                    >
                      Thanh toán Phần {activeSplitIndex + 1}
                    </button>
                  ) : null}

                  <button 
                    onClick={handlePayment}
                    disabled={
                      processing || 
                      paymentSuccess || 
                      (isSplitMode && !allSplitsPaid) ||
                      (!isSplitMode && selectedMethod === 'CASH' && parseInt(receivedAmount || '0') < Number(order.total?.units || 0))
                    }
                    className={cn(
                      "flex-[2] py-8 rounded-[2rem] font-black text-3xl uppercase italic tracking-tighter shadow-2xl transition-all flex items-center justify-center gap-6 border border-primary/20",
                      isSplitMode 
                        ? allSplitsPaid 
                          ? "bg-primary hover:bg-primary/90 text-white cursor-pointer"
                          : "bg-foreground/5 text-foreground/20 cursor-not-allowed border-none shadow-none"
                        : "bg-primary hover:bg-primary/90 text-white cursor-pointer"
                    )}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="animate-spin w-8 h-8" />
                        <span>ĐANG XỬ LÝ...</span>
                      </>
                    ) : paymentSuccess ? (
                      <>
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                        <span>THÀNH CÔNG!</span>
                      </>
                    ) : isSplitMode && !allSplitsPaid ? (
                      <span>VUI LÒNG TRẢ HẾT CÁC PHẦN</span>
                    ) : (
                      <>
                        <span>{isSplitMode ? 'HOÀN TẤT THANH TOÁN CHIA' : 'XÁC NHẬN THANH TOÁN'}</span>
                        <CheckCircle2 className="w-6 h-6 opacity-20" />
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
                paymentMethod: isSplitMode ? 'MIXED' : selectedMethod,
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
                  paymentMethod: isSplitMode ? 'MIXED' : selectedMethod,
                  amountReceived: isSplitMode ? Number(order.total?.units || 0) : parseInt(receivedAmount || '0'),
                  change: isSplitMode ? 0 : changeAmount,
                  cashierName: user?.fullName,
                  tableName: "Bàn 01",
                  branchName: currentBranch?.name,
                  branchAddress: currentBranch?.address,
                  branchPhone: currentBranch?.phone
                };
                const success = await printerService.printReceipt(receiptData);
                if (!success) {
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

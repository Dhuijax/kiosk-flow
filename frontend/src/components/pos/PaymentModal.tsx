'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Banknote, 
  QrCode, 
  CreditCard, 
  CheckCircle, 
  ArrowRight,
  Calculator,
  Wallet,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatVND } from '@/lib/utils/format';
import { PaymentMethod } from '@/gen/payment_pb';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Portal from '@/components/ui/Portal';
import { useTranslations } from 'next-intl';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (method: PaymentMethod, receivedAmount?: number) => Promise<void>;
  isSubmitting: boolean;
}

export default function PaymentModal({ isOpen, onClose, total, onConfirm, isSubmitting }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [receivedAmount, setReceivedAmount] = useState<number>(total);
  const [prevTotal, setPrevTotal] = useState<number>(total);
  const t = useTranslations('PaymentModal');

  // Adjust state when total changes
  if (total !== prevTotal) {
    setPrevTotal(total);
    setReceivedAmount(total);
  }

  const [timestamp, setTimestamp] = useState<number>(0);
  const change = Math.max(0, receivedAmount - total);

  useEffect(() => {
    // Set timestamp asynchronously to avoid cascading render warning and purity check
    Promise.resolve().then(() => {
      setTimestamp(Date.now());
    });
  }, []);

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  const methods = [
    { id: PaymentMethod.CASH, name: t('cash'), icon: Banknote, color: 'bg-primary' },
    { id: PaymentMethod.TRANSFER, name: t('qrScan'), icon: QrCode, color: 'bg-interaction' },
    { id: PaymentMethod.CARD, name: t('swipeCard'), icon: CreditCard, color: 'bg-foreground' },
  ];

  const quickAmounts = [
    total,
    Math.ceil(total / 50000) * 50000,
    Math.ceil(total / 100000) * 100000,
    Math.ceil(total / 200000) * 200000,
    500000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total);

  const handleConfirm = () => {
    onConfirm(selectedMethod, selectedMethod === PaymentMethod.CASH ? receivedAmount : total);
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl" 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-foreground/10 rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row"
            >
              {/* Left Side: Method Selection */}
              <div className="flex-1 p-12 border-r border-foreground/10 space-y-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground leading-tight">{t('title')}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">{t('subtitle')}</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {methods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelect(method.id)}
                      className={cn(
                        "flex items-center justify-between p-8 rounded-3xl border transition-all group relative overflow-hidden",
                        selectedMethod === method.id 
                          ? `${method.color} text-white border-transparent shadow-lg scale-[1.02]` 
                          : "bg-background text-foreground/40 border-foreground/5 hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-6 relative z-10">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl border border-foreground/10 flex items-center justify-center shadow-sm",
                          selectedMethod === method.id ? "bg-white/20" : "bg-foreground/5"
                        )}>
                          <method.icon size={32} className="stroke-[3]" />
                        </div>
                        <span className="text-2xl font-black uppercase italic tracking-tighter">{method.name}</span>
                      </div>
                      <div className={cn(
                        "w-10 h-10 rounded-full border border-foreground/10 flex items-center justify-center relative z-10",
                        selectedMethod === method.id ? "bg-white text-foreground" : "bg-background"
                      )}>
                        {selectedMethod === method.id && <CheckCircle size={20} className="stroke-[3]" />}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-8 bg-background rounded-3xl border border-foreground/10 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent border-2 border-foreground rounded-xl flex items-center justify-center text-foreground">
                      <Wallet size={24} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest opacity-40">{t('totalPayment')}</span>
                  </div>
                  <span className="text-4xl font-black italic tracking-tighter text-foreground">{formatVND(total)}</span>
                </div>
              </div>

              {/* Right Side: Action Area */}
              <div className="flex-1 p-12 bg-background flex flex-col">
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    {selectedMethod === PaymentMethod.CASH && (
                      <motion.div 
                        key="cash"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                      >
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-4">{t('receivedAmount')}</label>
                          <div className="relative">
                            <Banknote className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 text-foreground opacity-20" />
                            <input 
                              type="number"
                              value={receivedAmount}
                              onChange={(e) => setReceivedAmount(Number(e.target.value))}
                              className="w-full pl-20 pr-8 py-6 bg-surface border border-foreground/10 rounded-3xl text-4xl font-black italic tracking-tighter text-foreground outline-none focus:bg-white transition-all shadow-md"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          {quickAmounts.map((amt) => (
                            <button
                              key={amt}
                              onClick={() => setReceivedAmount(amt)}
                              className="py-4 bg-surface border border-foreground/10 rounded-2xl font-black text-sm hover:bg-accent transition-all shadow-sm"
                            >
                              {formatVND(amt)}
                            </button>
                          ))}
                        </div>

                        <div className="p-8 bg-foreground text-background rounded-3xl border border-foreground/5 shadow-xl flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{t('changeDue')}</p>
                            <p className="text-4xl font-black italic tracking-tighter text-accent">{formatVND(change)}</p>
                          </div>
                          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-foreground">
                            <Calculator size={32} />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {selectedMethod === PaymentMethod.TRANSFER && (
                      <motion.div 
                        key="transfer"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col items-center justify-center space-y-8"
                      >
                        <div className="bg-white p-8 rounded-3xl border border-foreground/10 shadow-2xl relative group">
                          <div className="w-64 h-64 bg-background border border-foreground/5 flex items-center justify-center overflow-hidden">
                            <Image 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=vietqr://payment?amount=${total}&note=ORDER_${timestamp}`}
                              alt="VietQR"
                              width={256}
                              height={256}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary border border-white/20 rounded-2xl flex items-center justify-center text-white rotate-12 group-hover:rotate-0 transition-transform shadow-lg">
                            <QrCode size={24} />
                          </div>
                        </div>
                        <div className="text-center space-y-2">
                          <p className="text-2xl font-black uppercase italic tracking-tighter text-foreground">{t('scanToPay')}</p>
                          <p className="text-sm font-bold opacity-40 uppercase tracking-widest">{t('scanSupport')}</p>
                        </div>
                      </motion.div>
                    )}

                    {selectedMethod === PaymentMethod.CARD && (
                      <motion.div 
                        key="card"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col items-center justify-center h-full space-y-12"
                      >
                        <div className="relative">
                          <div className="w-64 h-64 bg-surface border border-foreground/10 rounded-full flex items-center justify-center shadow-xl">
                            <CreditCard size={120} className="text-foreground animate-pulse" />
                          </div>
                          <Sparkles className="absolute -top-4 -right-4 w-16 h-16 text-accent animate-float" />
                        </div>
                        <div className="text-center space-y-4">
                          <h3 className="text-3xl font-black uppercase italic tracking-tighter text-foreground leading-tight">{t('pleaseSwipe')}</h3>
                          <p className="text-sm font-bold opacity-40 uppercase tracking-widest leading-relaxed">{t('connectingPos')}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={isSubmitting || (selectedMethod === PaymentMethod.CASH && receivedAmount < total)}
                  className={cn(
                    "w-full py-8 mt-12 rounded-3xl font-black text-3xl uppercase italic tracking-tighter flex items-center justify-center gap-6 border transition-all",
                    isSubmitting 
                      ? "bg-muted text-foreground/20 border-foreground/10 cursor-not-allowed" 
                      : "bg-interaction text-white border-interaction shadow-lg hover:bg-interaction/90"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>{t('processing')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('confirmPayment')}</span>
                      <ArrowRight size={32} className="stroke-[4]" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

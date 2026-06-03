'use client';

import React from 'react';
import { Banknote, CreditCard, Landmark, Smartphone, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'MOMO' | 'ZALOPAY';

interface Method {
  id: PaymentMethod;
  icon: React.ReactNode;
  color: string;
}

const methods: Method[] = [
  { id: 'CASH', icon: <Banknote />, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  { id: 'CARD', icon: <CreditCard />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { id: 'TRANSFER', icon: <Landmark />, color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
  { id: 'MOMO', icon: <Smartphone />, color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  { id: 'ZALOPAY', icon: <Zap />, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
];

interface PaymentMethodsProps {
  selected: PaymentMethod;
  onSelect: (method: PaymentMethod) => void;
}

export default function PaymentMethods({ selected, onSelect }: PaymentMethodsProps) {
  const t = useTranslations('PaymentMethods');

  return (
    <div aria-label={t('ariaLabel')} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {methods.map((method) => (
        <motion.button
          key={method.id}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(method.id)}
          className={cn(
            "p-6 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all relative overflow-hidden group",
            selected === method.id 
              ? cn("border-blue-500 bg-blue-500/10", method.color.split(' ')[0])
              : "border-slate-800 bg-navy-900/50 hover:border-slate-700"
          )}
        >
          {selected === method.id && (
            <motion.div 
              layoutId="active-method"
              className="absolute inset-0 bg-blue-500/5 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}
          
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
            method.color
          )}>
            {React.cloneElement(method.icon as React.ReactElement<{ size: number }>, { size: 28 })}
          </div>
          
          <span className={cn(
            "font-black text-xs uppercase tracking-widest",
            selected === method.id ? "text-white" : "text-slate-400"
          )}>
            {t(method.id.toLowerCase() as 'cash' | 'card' | 'transfer' | 'momo' | 'zalopay')}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

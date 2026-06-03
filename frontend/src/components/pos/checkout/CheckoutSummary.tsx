'use client';

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { formatVND } from '@/lib/utils/format';

interface Item {
  name: string;
  quantity: number;
  price: number;
}

interface CheckoutSummaryProps {
  items: Item[];
  subtotal: number;
  tax: number;
  total: number;
}

export default function CheckoutSummary({ items, subtotal, tax, total }: CheckoutSummaryProps) {
  const t = useTranslations('CheckoutSummary');

  return (
    <div className="bg-surface border border-foreground/10 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-8 border-b border-foreground/10 bg-background/50">
        <h2 className="text-xl font-black text-foreground uppercase italic tracking-tighter flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-interaction/10 flex items-center justify-center text-interaction shadow-sm">
            <ShoppingBag className="w-6 h-6 stroke-[3]" />
          </div>
          {t('title')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        {items.map((item, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex justify-between items-start group"
          >
            <div className="flex-1 pr-4">
              <p className="text-foreground text-sm font-black uppercase italic tracking-tighter flex items-center gap-3">
                <span className="text-interaction not-italic">x{item.quantity}</span>
                {item.name}
              </p>
            </div>
            <p className="text-foreground/40 text-sm font-bold tracking-tighter">{formatVND(item.price * item.quantity)}</p>
          </motion.div>
        ))}
      </div>

      <div className="p-10 bg-background/50 border-t border-foreground/10 space-y-4">
        <div className="flex justify-between text-foreground/40 text-xs font-black uppercase italic tracking-tighter">
          <span>{t('subtotal')}</span>
          <span className="">{formatVND(subtotal)}</span>
        </div>
        <div className="flex justify-between text-foreground/40 text-xs font-black uppercase italic tracking-tighter">
          <span>{t('tax')}</span>
          <span className="">{formatVND(tax)}</span>
        </div>
        <div className="pt-6 border-t border-foreground/10 flex justify-between items-end">
          <div>
            <p className="text-foreground/20 text-[10px] uppercase tracking-[0.2em] font-black italic mb-2">{t('total')}</p>
            <p className="text-4xl text-primary font-black italic tracking-tighter leading-none">
              {formatVND(total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

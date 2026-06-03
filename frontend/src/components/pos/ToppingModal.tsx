'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Check, Sparkles, ShoppingBag } from 'lucide-react';
import { Product, Topping } from '@/gen/product_pb';
import { formatVND, moneyToNumber } from '@/lib/utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Portal from '@/components/ui/Portal';
import { useTranslations } from 'next-intl';

interface ToppingModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (toppings: Topping[], quantity: number) => void;
}

export default function ToppingModal({ product, isOpen, onClose, onConfirm }: ToppingModalProps) {
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [quantity, setQuantity] = useState(1);
  const t = useTranslations('ToppingModal');

  if (!isOpen) return null;

  const basePrice = moneyToNumber(product.price);
  const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + moneyToNumber(topping.price), 0);
  const totalPrice = (basePrice + toppingsPrice) * quantity;

  const toggleTopping = (topping: Topping) => {
    setSelectedToppings(prev => 
      prev.find(t => t.id === topping.id)
        ? prev.filter(t => t.id !== topping.id)
        : [...prev, topping]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedToppings, quantity);
    onClose();
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-12 bg-background/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-surface border border-foreground/10 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
            >
              {/* Left: Product Image & Info */}
              <div className="w-full md:w-2/5 bg-background border-b md:border-b-0 md:border-r border-foreground/10 flex flex-col p-8 md:p-12">
                <div className="relative aspect-square w-full rounded-3xl overflow-hidden border border-foreground/10 mb-8">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-10">
                      <ShoppingBag size={80} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>{t('featured')}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
                    {product.name}
                  </h2>
                  <p className="text-sm font-bold opacity-40 uppercase tracking-widest leading-relaxed">
                    {product.description || t('defaultDesc')}
                  </p>
                  <div className="pt-4 border-t-2 border-foreground/5">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('basePrice')}</span>
                    <p className="text-3xl font-black text-primary italic tracking-tighter">{formatVND(basePrice)}</p>
                  </div>
                </div>
              </div>

              {/* Right: Customization */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-8 md:p-12 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                      {t('addTopping')} <span className="px-3 py-1 bg-interaction text-white rounded-lg text-xs not-italic">{t('optional')}</span>
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {product.toppings.length > 0 ? (
                      product.toppings.map(topping => {
                        const isSelected = selectedToppings.find(t => t.id === topping.id);
                        return (
                          <button
                            key={topping.id}
                            onClick={() => toggleTopping(topping)}
                            className={`
                              group p-4 rounded-2xl border transition-all flex items-center justify-between gap-4
                              ${isSelected 
                                ? 'bg-interaction border-interaction shadow-md scale-[1.02]' 
                                : 'bg-background border-foreground/10 hover:border-foreground/40'}
                            `}
                          >
                            <div className="flex flex-col items-start">
                              <span className={`text-sm font-black uppercase italic tracking-tighter ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                {topping.name}
                              </span>
                              <span className={`text-[10px] font-bold ${isSelected ? 'text-white/60' : 'text-foreground/40'}`}>
                                + {formatVND(moneyToNumber(topping.price))}
                              </span>
                            </div>
                            <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-white border-transparent text-interaction' : 'bg-foreground/5 border-foreground/10'
                            }`}>
                              {isSelected && <Check size={16} strokeWidth={4} />}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="col-span-2 py-12 text-center bg-background rounded-3xl border border-dashed border-foreground/10">
                        <p className="text-sm font-black uppercase italic tracking-tighter opacity-20">{t('noTopping')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-8 md:p-12 bg-background border-t border-foreground/10 flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6 bg-surface p-2 border border-foreground/10 rounded-3xl shadow-sm">
                    <button 
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-12 h-12 flex items-center justify-center text-foreground hover:bg-foreground/5 rounded-2xl transition-colors"
                    >
                      <Minus size={24} strokeWidth={3} />
                    </button>
                    <span className="w-12 text-center text-3xl font-black italic tracking-tighter">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-12 h-12 flex items-center justify-center text-foreground hover:bg-foreground/5 rounded-2xl transition-colors"
                    >
                      <Plus size={24} strokeWidth={3} />
                    </button>
                  </div>

                  <div className="flex items-center gap-8 w-full sm:w-auto">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('totalPrice')}</span>
                      <p className="text-4xl font-black text-primary italic tracking-tighter">{formatVND(totalPrice)}</p>
                    </div>
                    <button 
                      onClick={handleConfirm}
                      className="flex-1 sm:flex-none btn-dynamic px-12 py-6 text-xl group"
                    >
                      <span>{t('addToCart')}</span>
                      <ShoppingBag className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

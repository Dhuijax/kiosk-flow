'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIngredient } from '@/hooks/useIngredient';
import { Ingredient, CreateIngredientRequest, UpdateIngredientRequest, DeleteIngredientRequest } from '@/gen/ingredient_pb';
import { Money } from '@/gen/common_pb';
import { protoInt64 } from '@bufbuild/protobuf';
import Portal from '@/components/ui/Portal';
import { useTranslations } from 'next-intl';

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ingredient: Ingredient | null; // null for Create
}

export default function IngredientModal({ isOpen, onClose, onSuccess, ingredient }: IngredientModalProps) {
  const t = useTranslations('Inventory');
  const { createIngredient, updateIngredient, deleteIngredient, loading } = useIngredient();
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [costPrice, setCostPrice] = useState('0');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (ingredient) {
        setName(ingredient.name);
        setUnit(ingredient.unit);
        const price = Number(ingredient.costPrice?.units || 0);
        setCostPrice(price.toString());
        setIsActive(ingredient.isActive);
      } else {
        setName('');
        setUnit('');
        setCostPrice('0');
        setIsActive(true);
      }
      setError('');
    }, 0);
    return () => clearTimeout(timer);
  }, [ingredient, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const priceValue = parseFloat(costPrice);
    if (isNaN(priceValue)) {
      setError(t('ingredientModal.errInvalidPrice'));
      return;
    }

    const money = new Money({
      currencyCode: 'VND',
      units: protoInt64.parse(Math.floor(priceValue)),
      nanos: 0,
    });

    try {
      if (ingredient) {
        // Update
        const res = await updateIngredient(new UpdateIngredientRequest({
          id: ingredient.id,
          name: name !== ingredient.name ? name : undefined,
          unit: unit !== ingredient.unit ? unit : undefined,
          costPrice: money,
          isActive: isActive !== ingredient.isActive ? isActive : undefined,
        }));
        if (res) {
          onSuccess();
          onClose();
        }
      } else {
        // Create
        const res = await createIngredient(new CreateIngredientRequest({
          name,
          unit,
          costPrice: money,
          isActive,
        }));
        if (res) {
          onSuccess();
          onClose();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('ingredientModal.errCommon'));
    }
  };

  const handleDelete = async () => {
    if (!ingredient) return;
    if (!confirm(t('ingredientModal.deleteConfirm', { name: ingredient.name }))) return;

    try {
      const res = await deleteIngredient(new DeleteIngredientRequest({ id: ingredient.id }));
      if (res?.success) {
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('ingredientModal.errDelete'));
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="ai-card w-full max-w-lg flex flex-col p-0 shadow-2xl bg-surface border border-foreground/10 rounded-[2.5rem] overflow-hidden"
          >
            <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-interaction/10 flex items-center justify-center border border-interaction/20">
                  <Save className="w-6 h-6 text-interaction stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground uppercase italic tracking-tighter leading-tight">
                    {ingredient ? t('ingredientModal.titleUpdate') : t('ingredientModal.titleCreate')} <span className="text-interaction">{t('ingredientModal.titleIngredient')}</span>
                  </h2>
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mt-1 italic">{t('ingredientModal.subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group">
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 col-span-full">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('ingredientModal.labelName')}</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('ingredientModal.placeholderName')}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction focus:shadow-md transition-all font-black text-lg italic tracking-tighter shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('ingredientModal.labelUnit')}</label>
                  <input 
                    type="text" 
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={t('ingredientModal.placeholderUnit')}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm uppercase italic tracking-tighter shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('ingredientModal.labelCostPrice')}</label>
                  <input 
                    type="number" 
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm italic tracking-tighter shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 p-6 bg-foreground/5 rounded-2xl border border-foreground/5">
                <input 
                  type="checkbox" 
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-6 h-6 rounded-lg border-foreground/10 text-interaction focus:ring-interaction cursor-pointer"
                />
                <label htmlFor="is_active" className="text-sm font-black uppercase italic tracking-tighter cursor-pointer">{t('ingredientModal.labelActive')}</label>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-600 text-[10px] font-black uppercase italic tracking-tighter bg-red-500/10 p-4 rounded-2xl border border-red-500/10">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                {ingredient && (
                  <button 
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm group"
                    title={t('ingredientModal.deleteTitle')}
                  >
                    <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={loading}
                  className="btn-dynamic flex-1 py-5 text-lg"
                >
                  {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : ingredient ? t('ingredientModal.btnUpdate') : t('ingredientModal.btnCreate')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}

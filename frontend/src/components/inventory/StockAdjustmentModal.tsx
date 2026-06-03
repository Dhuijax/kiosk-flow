'use client';

import { useState } from 'react';
import { X, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { InventoryService } from '@/gen/inventory_connect';

import Portal from '@/components/ui/Portal';
import { useTranslations } from 'next-intl';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: {
    id: string;
    name: string;
    currentQuantity: number;
    branchId: string;
  } | null;
}

// REASON_OPTIONS constants removed since we define them dynamically inside component now

export default function StockAdjustmentModal({ isOpen, onClose, onSuccess, product }: StockAdjustmentModalProps) {
  const t = useTranslations('Inventory');
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [changeAmount, setChangeAmount] = useState('');
  const [reason, setReason] = useState('RESTOCK');
  const [note, setNote] = useState('');

  const reasonOptions = [
    { value: 'RESTOCK', label: t('stockAdjustmentModal.reasons.restock') },
    { value: 'DAMAGED', label: t('stockAdjustmentModal.reasons.damaged') },
    { value: 'EXPIRED', label: t('stockAdjustmentModal.reasons.expired') },
    { value: 'LOST', label: t('stockAdjustmentModal.reasons.lost') },
    { value: 'CORRECTION', label: t('stockAdjustmentModal.reasons.correction') },
    { value: 'SALE_RETURN', label: t('stockAdjustmentModal.reasons.saleReturn') },
  ];

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId) return;

    const amount = parseFloat(changeAmount);
    if (isNaN(amount) || amount === 0) {
      setError(t('stockAdjustmentModal.errInvalidQuantity'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const client = getAuthenticatedClient(InventoryService, token, tenantId);
      await client.updateStock({
        productId: product.id,
        branchId: product.branchId,
        quantityChange: amount,
        type: reason.toLowerCase(),
        note: note,
      });

      onSuccess();
      onClose();
      setChangeAmount('');
      setNote('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('stockAdjustmentModal.errCommon'));
    } finally {
      setLoading(false);
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
            className="ai-card w-full max-w-md flex flex-col p-0 shadow-2xl bg-surface border border-foreground/10 rounded-[2rem] overflow-hidden"
          >
            <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-interaction stroke-[3]" />
                <h2 className="text-xl font-black text-foreground uppercase italic tracking-tighter leading-tight">{t('stockAdjustmentModal.title')}</h2>
              </div>
              <button onClick={onClose} className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="p-6 bg-foreground/5 rounded-2xl border border-foreground/5">
                <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1 italic">{t('stockAdjustmentModal.productLabel')}</p>
                <p className="text-xl font-black text-foreground uppercase italic tracking-tighter">{product.name}</p>
                <p className="text-interaction text-[10px] font-black uppercase tracking-widest mt-2">{t('stockAdjustmentModal.currentLabel')} <span className="text-sm italic">{product.currentQuantity}</span></p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('stockAdjustmentModal.labelChangeAmount')}</label>
                <input 
                  type="number" 
                  step="0.001"
                  required
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  placeholder={t('stockAdjustmentModal.placeholderChangeAmount')}
                  className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-xl italic tracking-tighter shadow-sm"
                />
                <p className="text-[10px] text-foreground/20 italic font-bold uppercase tracking-wider">{t('stockAdjustmentModal.helpText')}</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('stockAdjustmentModal.labelReason')}</label>
                <div className="relative">
                  <select 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all appearance-none font-bold text-sm uppercase italic tracking-tighter shadow-sm"
                  >
                    {reasonOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('stockAdjustmentModal.labelNote')}</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-xs uppercase italic shadow-sm resize-none"
                  placeholder={t('stockAdjustmentModal.placeholderNote')}
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-600 text-[10px] font-black uppercase italic tracking-tighter bg-red-500/10 p-4 rounded-2xl border border-red-500/10">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="btn-dynamic w-full py-5 text-lg"
              >
                {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : t('stockAdjustmentModal.btnConfirm')}
              </button>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}

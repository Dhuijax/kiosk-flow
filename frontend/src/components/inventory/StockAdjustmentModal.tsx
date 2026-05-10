'use client';

import { useState } from 'react';
import { X, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { InventoryService } from '@/gen/inventory_connect';

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

const REASON_OPTIONS = [
  { value: 'RESTOCK', label: 'Nhập hàng mới' },
  { value: 'DAMAGED', label: 'Hàng hư hỏng' },
  { value: 'EXPIRED', label: 'Hết hạn sử dụng' },
  { value: 'LOST', label: 'Thất thoát' },
  { value: 'CORRECTION', label: 'Điều chỉnh kiểm kho' },
  { value: 'SALE_RETURN', label: 'Khách trả hàng' },
];

export default function StockAdjustmentModal({ isOpen, onClose, onSuccess, product }: StockAdjustmentModalProps) {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [changeAmount, setChangeAmount] = useState('');
  const [reason, setReason] = useState('RESTOCK');
  const [note, setNote] = useState('');

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId) return;

    const amount = parseFloat(changeAmount);
    if (isNaN(amount) || amount === 0) {
      setError('Vui lòng nhập số lượng hợp lệ');
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
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi điều chỉnh kho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl">
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
              <h2 className="text-xl font-black text-foreground uppercase italic tracking-tighter leading-tight">Điều chỉnh tồn kho</h2>
            </div>
            <button onClick={onClose} className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="p-6 bg-foreground/5 rounded-2xl border border-foreground/5">
              <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1 italic">Sản phẩm</p>
              <p className="text-xl font-black text-foreground uppercase italic tracking-tighter">{product.name}</p>
              <p className="text-interaction text-[10px] font-black uppercase tracking-widest mt-2">Hiện tại: <span className="text-sm italic">{product.currentQuantity}</span></p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Số lượng thay đổi (+/-)</label>
              <input 
                type="number" 
                step="0.001"
                required
                value={changeAmount}
                onChange={(e) => setChangeAmount(e.target.value)}
                placeholder="VD: -5 HOẶC 10"
                className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-xl italic tracking-tighter shadow-sm"
              />
              <p className="text-[10px] text-foreground/20 italic font-bold uppercase tracking-wider">Nhập số âm để giảm kho, số dương để tăng kho.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Lý do điều chỉnh</label>
              <div className="relative">
                <select 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all appearance-none font-bold text-sm uppercase italic tracking-tighter shadow-sm"
                >
                  {REASON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label.toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Ghi chú thêm</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-xs uppercase italic shadow-sm resize-none"
                placeholder="CHI TIẾT VỀ LÝ DO ĐIỀU CHỈNH..."
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
              {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'XÁC NHẬN ĐIỀU CHỈNH'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

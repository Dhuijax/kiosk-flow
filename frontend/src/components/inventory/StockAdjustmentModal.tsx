import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { UpdateStockRequest } from '@/gen/inventory_pb';

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
  { value: 'Kiểm kho định kỳ', label: 'Kiểm kho định kỳ' },
  { value: 'Hàng hỏng/Hết hạn', label: 'Hàng hỏng/Hết hạn' },
  { value: 'Thất thoát', label: 'Thất thoát' },
  { value: 'Hàng mẫu/Tặng', label: 'Hàng mẫu/Tặng' },
  { value: 'Nhập hàng sai', label: 'Nhập hàng sai số lượng' },
  { value: 'Khác', label: 'Lý do khác' },
];

export default function StockAdjustmentModal({ isOpen, onClose, onSuccess, product }: StockAdjustmentModalProps) {
  const { updateStock, loading, error } = useInventory();
  const [changeAmount, setChangeAmount] = useState<string>('');
  const [reason, setReason] = useState(REASON_OPTIONS[0].value);
  const [note, setNote] = useState('');

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(changeAmount);
    if (isNaN(amount) || amount === 0) return;

    const request = new UpdateStockRequest({
      productId: product.id,
      branchId: product.branchId,
      quantityChange: amount,
      type: 'adjustment',
      note: `[${reason}] ${note}`.trim(),
    });

    const result = await updateStock(request);
    if (result) {
      onSuccess();
      onClose();
      // Reset form
      setChangeAmount('');
      setNote('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-xl font-bold text-white">Điều chỉnh tồn kho</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <p className="text-slate-400 text-sm mb-1">Sản phẩm</p>
            <p className="text-white font-semibold">{product.name}</p>
            <p className="text-blue-soft text-xs">Hiện tại: <span className="font-mono">{product.currentQuantity}</span></p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Số lượng thay đổi (+/-)</label>
            <input 
              type="number" 
              step="0.001"
              required
              value={changeAmount}
              onChange={(e) => setChangeAmount(e.target.value)}
              placeholder="VD: -5 hoặc 10"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric focus:ring-1 focus:ring-blue-electric/20 transition-all font-mono"
            />
            <p className="text-[10px] text-slate-500 italic">Nhập số âm để giảm kho, số dương để tăng kho.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Lý do điều chỉnh</label>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric transition-all text-white appearance-none"
            >
              {REASON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Ghi chú thêm</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric transition-all text-sm"
              placeholder="Chi tiết về lý do điều chỉnh..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={loading || !changeAmount || parseFloat(changeAmount) === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-electric hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Xác nhận</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

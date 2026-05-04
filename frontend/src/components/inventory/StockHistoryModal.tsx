import React, { useState, useEffect, useCallback } from 'react';
import { X, History, User, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { StockHistoryEntry, GetStockHistoryRequest } from '@/gen/inventory_pb';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    branchId: string;
  } | null;
}

export default function StockHistoryModal({ isOpen, onClose, product }: StockHistoryModalProps) {
  const { getStockHistory, loading } = useInventory();
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);

  const fetchHistory = useCallback(async () => {
    if (!product) return;
    const response = await getStockHistory(new GetStockHistoryRequest({
      productId: product.id,
      branchId: product.branchId,
      pagination: { pageSize: 50, page: 1 }
    }));
    setHistory(response.entries);
  }, [product, getStockHistory]);

  useEffect(() => {
    if (isOpen && product) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [isOpen, product, fetchHistory]);

  if (!isOpen || !product) return null;

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'purchase': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'adjustment': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'transfer': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'sale': return 'Bán hàng';
      case 'purchase': return 'Nhập hàng';
      case 'adjustment': return 'Điều chỉnh';
      case 'transfer': return 'Chuyển kho';
      case 'return': return 'Trả hàng';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-2xl rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-soft" />
            <h2 className="text-xl font-bold text-white">Lịch sử kho: {product.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {loading && history.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-electric border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm">Đang tải lịch sử...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-4 opacity-50">
              <History className="w-12 h-12 text-slate-700" />
              <p className="text-slate-500">Chưa có giao dịch nào được ghi lại</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 z-10">
                <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold text-center italic">Thời gian</th>
                  <th className="px-6 py-3 font-semibold">Loại</th>
                  <th className="px-6 py-3 font-semibold text-right">Biến động</th>
                  <th className="px-6 py-3 font-semibold">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <span className="text-slate-300 text-xs font-mono">{new Date(entry.createdAt).toLocaleDateString('vi-VN')}</span>
                        <span className="text-slate-500 text-[10px]">{new Date(entry.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getBadgeStyle(entry.type)}`}>
                        {getTypeName(entry.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`flex items-center justify-end gap-1 font-mono font-bold ${entry.quantityChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {entry.quantityChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {Math.abs(entry.quantityChange)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        <p className="text-slate-300 text-xs truncate" title={entry.note || ''}>{entry.note || 'Không có ghi chú'}</p>
                        <div className="flex items-center gap-1.5 opacity-60">
                          <User className="w-2.5 h-2.5" />
                          <span className="text-[10px] text-slate-400 truncate">{entry.createdBy || 'Hệ thống'}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800/50 flex justify-between items-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-2">
            <FileText className="w-3 h-3" />
            Tối đa 50 giao dịch gần nhất
          </p>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

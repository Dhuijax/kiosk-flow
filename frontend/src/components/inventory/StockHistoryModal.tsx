import React, { useState, useEffect, useCallback } from 'react';
import { X, History, User, FileText } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { StockHistoryEntry, GetStockHistoryRequest } from '@/gen/inventory_pb';

import Portal from '@/components/ui/Portal';

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
      case 'sale': return 'bg-red-500/10 text-red-600 border-red-500/10';
      case 'purchase': return 'bg-green-500/10 text-green-600 border-green-500/10';
      case 'adjustment': return 'bg-amber-500/10 text-amber-600 border-amber-500/10';
      case 'transfer': return 'bg-interaction/10 text-interaction border-interaction/10';
      default: return 'bg-foreground/5 text-foreground/40 border-foreground/10';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'sale': return 'Bán hàng';
      case 'purchase': return 'Nhập hàng';
      case 'adjustment': return 'Điều chỉnh';
      case 'transfer': return 'Chuyển kho';
      case 'return': return 'Trả hàng';
      default: return type.toUpperCase();
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl">
        <div className="w-full max-w-3xl bg-surface border border-foreground/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-10 py-8 border-b border-foreground/10 flex items-center justify-between bg-background/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-interaction/10 rounded-2xl flex items-center justify-center text-interaction shadow-sm">
                <History className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground uppercase italic tracking-tighter">Lịch sử kho</h2>
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">{product.name}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-foreground/5 rounded-full text-foreground/40 hover:text-foreground transition-all"
            >
              <X className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading && history.length === 0 ? (
              <div className="py-32 flex flex-col items-center gap-6">
                <div className="w-16 h-16 border-4 border-interaction border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/20 italic">Đang tải lịch sử...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-32 flex flex-col items-center gap-6 opacity-20">
                <History className="w-20 h-20" />
                <p className="text-sm font-black uppercase italic tracking-tighter">Chưa có giao dịch nào</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-background border-b border-foreground/10 z-10">
                  <tr className="text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] italic">
                    <th className="px-10 py-5 font-black">Thời gian</th>
                    <th className="px-10 py-5 font-black">Loại</th>
                    <th className="px-10 py-5 font-black text-right">Biến động</th>
                    <th className="px-10 py-5 font-black">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-foreground/[0.02] transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex flex-col">
                          <span className="text-foreground font-black text-sm italic tracking-tighter">{new Date(entry.createdAt).toLocaleDateString('vi-VN')}</span>
                          <span className="text-foreground/40 text-[10px] font-bold tracking-widest">{new Date(entry.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase italic tracking-tighter border ${getBadgeStyle(entry.type)}`}>
                          {getTypeName(entry.type)}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className={`flex items-center justify-end gap-2 font-black italic tracking-tighter text-lg ${entry.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.quantityChange >= 0 ? '+' : '-'}
                          {Math.abs(entry.quantityChange)}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-col gap-1.5 max-w-[240px]">
                          <p className="text-foreground text-xs font-bold leading-relaxed truncate" title={entry.note || ''}>{entry.note || 'Hệ thống tự động'}</p>
                          <div className="flex items-center gap-2 opacity-40">
                            <User className="w-3 h-3" />
                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{entry.createdBy || 'SYSTEM'}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-10 py-6 bg-background/30 border-t border-foreground/10 flex justify-between items-center">
            <p className="text-[10px] text-foreground/40 font-black uppercase tracking-[0.2em] italic flex items-center gap-3">
              <FileText className="w-4 h-4 opacity-40" />
              Tối đa 50 giao dịch gần nhất
            </p>
            <button 
              onClick={onClose}
              className="btn-dynamic px-8 py-3 text-xs"
            >
              ĐÓNG CỬA SỔ
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

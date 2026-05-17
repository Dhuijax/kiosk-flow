'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { 
  ShoppingBag, 
  Search, 
  PlusCircle, 
  Sparkles,
  RefreshCw,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { useProcurement } from '@/hooks/useProcurement';
import { PurchaseOrder } from '@/gen/procurement_pb';
import PurchaseOrderModal from '@/components/procurement/PurchaseOrderModal';
import { formatVND, formatDateTime } from '@/lib/utils/format';
import { useAuth } from '@/lib/auth/AuthContext';

export default function ProcurementPage() {
  const { branchId } = useAuth();
  const { listPurchaseOrders, loading } = useProcurement();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await listPurchaseOrders({ branchId });
      if (res && res.purchaseOrders) {
        setPurchaseOrders(res.purchaseOrders);
      }
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    }
  }, [listPurchaseOrders, branchId]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const toggleExpand = (id: string) => {
    setExpandedPoId(expandedPoId === id ? null : id);
  };

  return (
    <div className="space-y-12 pb-20 relative">
      {/* Title Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-interaction font-black uppercase text-xs tracking-widest">
            <Sparkles className="w-5 h-5" />
            <span>Giao dịch nhập kho vật tư</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            Lịch sử <span className="text-primary">Nhập hàng</span>
          </h1>
          <p className="text-foreground/40 font-bold flex items-center gap-2 italic">
            Ghi nhận và quản lý các phiếu nhập kho nguyên liệu, tăng số lượng tồn ngay lập tức.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 bg-surface p-4 border border-foreground/10 rounded-3xl shadow-sm">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-dynamic py-4 px-8 text-sm h-14"
          >
            <PlusCircle className="w-5 h-5" />
            <span>TẠO PHIẾU NHẬP KHO</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar for Inventory */}
      <div className="flex items-center gap-4 border-b border-foreground/10 pb-6">
        <Link 
          href="/dashboard/inventory" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          Tồn kho tổng quan
        </Link>
        <Link 
          href="/dashboard/inventory/ingredients" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          Danh sách nguyên liệu
        </Link>
        <Link 
          href="/dashboard/inventory/suppliers" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          Nhà cung cấp
        </Link>
        <Link 
          href="/dashboard/inventory/procurement" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest bg-interaction/10 text-interaction border border-interaction/20 transition-all"
        >
          Phiếu nhập hàng
        </Link>
      </div>

      {/* PO List Table */}
      {loading && purchaseOrders.length === 0 ? (
        <div className="py-24 flex items-center justify-center">
          <RefreshCw className="w-12 h-12 text-interaction animate-spin" />
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="py-24 bg-surface/50 border border-foreground/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 bg-interaction/5 rounded-3xl flex items-center justify-center border border-interaction/10 mb-6">
            <ShoppingBag className="w-10 h-10 text-interaction" />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground mb-2">Chưa có phiếu nhập nào</h3>
          <p className="text-foreground/40 max-w-md font-bold text-sm italic mb-8">Hệ thống chưa ghi nhận giao dịch nhập hàng nào cho chi nhánh này.</p>
          <button onClick={() => setIsModalOpen(true)} className="btn-dynamic py-4 px-8 text-sm">
            <PlusCircle className="w-5 h-5" />
            <span>TẠO PHIẾU NHẬP ĐẦU TIÊN</span>
          </button>
        </div>
      ) : (
        <div className="ai-card p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">Mã phiếu</th>
                  <th className="px-8 py-6">Nhà cung cấp</th>
                  <th className="px-8 py-6">Thời gian</th>
                  <th className="px-8 py-6 text-right">Tổng tiền nhập</th>
                  <th className="px-8 py-6 text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5 font-black uppercase tracking-tighter text-sm italic">
                {purchaseOrders.map((po) => {
                  const isExpanded = expandedPoId === po.id;
                  const total = Number(po.totalAmount?.units || 0);

                  return (
                    <Fragment key={po.id}>
                      <tr 
                        onClick={() => toggleExpand(po.id)}
                        className="hover:bg-foreground/5 transition-all cursor-pointer group"
                      >
                        <td className="px-8 py-6 font-black text-foreground/40 group-hover:text-foreground transition-colors">
                          #{po.id.substring(0, 8)}
                        </td>
                        <td className="px-8 py-6 flex items-center gap-3">
                          <Users className="w-5 h-5 text-interaction" />
                          <span>{po.supplierName || 'Nhà cung cấp ẩn'}</span>
                        </td>
                        <td className="px-8 py-6 font-bold text-xs opacity-40 uppercase tracking-widest normal-case">
                          {po.createdAt ? formatDateTime(new Date(po.createdAt)) : '...'}
                        </td>
                        <td className="px-8 py-6 text-right text-lg text-primary">
                          {formatVND(total)}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center text-foreground/40 group-hover:text-foreground">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-foreground/5/30">
                          <td colSpan={5} className="px-10 py-8 normal-case font-bold">
                            <div className="space-y-4">
                              <h4 className="text-xs font-black uppercase italic tracking-widest text-interaction">Danh sách nguyên liệu nhập kho:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {po.items.map((item, idx) => {
                                  const itemPrice = Number(item.unitPrice?.units || 0);
                                  return (
                                    <div key={idx} className="p-4 bg-background border border-foreground/10 rounded-2xl flex justify-between items-center shadow-sm">
                                      <div>
                                        <p className="text-sm font-black uppercase italic tracking-tighter text-foreground">{item.ingredientName}</p>
                                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest italic mt-1">Đơn giá: {formatVND(itemPrice)}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-black text-primary italic tracking-tighter">x{item.quantity}</p>
                                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest italic mt-1">T.Tiền: {formatVND(itemPrice * item.quantity)}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* PO creation dialog */}
      <PurchaseOrderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPurchaseOrders}
      />
    </div>
  );
}

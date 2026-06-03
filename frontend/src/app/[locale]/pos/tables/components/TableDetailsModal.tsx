'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableStatus } from '@/gen/table_pb';
import { Order, OrderItem, OrderItemTopping } from '@/gen/order_pb';
import { OrderService } from '@/gen/order_connect';
import { TableService } from '@/gen/table_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  X, Users, DollarSign, Calendar, CreditCard, ChevronRight, 
  ArrowRightLeft, Split, Plus, RefreshCw, AlertCircle, ShoppingBag,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVND } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';
import { TableQrModal } from './TableQrModal';

interface TableDetailsModalProps {
  table: Table | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const TableDetailsModal: React.FC<TableDetailsModalProps> = ({
  table,
  onClose,
  onRefresh,
}) => {
  const router = useRouter();
  const { tenantId, token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for Table Transfer
  const [showTransfer, setShowTransfer] = useState(false);
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [selectedTargetTableId, setSelectedTargetTableId] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  // States for Item Splitting
  const [showSplit, setShowSplit] = useState(false);
  const [splitQuantities, setSplitQuantities] = useState<Record<string, number>>({});
  const [splitting, setSplitting] = useState(false);
  
  // State for QR code viewing
  const [showQr, setShowQr] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!table?.currentOrderId || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const client = getAuthenticatedClient(OrderService, tenantId, token || undefined);
      const response = await client.getOrder({ id: table.currentOrderId });
      if (response.order) {
        setOrder(response.order);
      } else {
        setError('Không tìm thấy thông tin đơn hàng.');
      }
    } catch (err: unknown) {
      console.error('Failed to fetch order details:', err);
      setError('Lỗi khi tải thông tin đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [table, tenantId, token]);

  useEffect(() => {
    if (table && table.currentOrderId && tenantId) {
      const timer = setTimeout(() => {
        fetchOrderDetails();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [table, tenantId, fetchOrderDetails]);

  useEffect(() => {
    let active = true;
    if (showTransfer && tenantId && table) {
      const client = getAuthenticatedClient(TableService, tenantId, token || undefined);
      client.listTables({ floorPlanId: table.floorPlanId })
        .then(response => {
          if (active) {
            setAllTables(response.tables.filter(t => t.id !== table.id));
          }
        })
        .catch(err => {
          console.error('Failed to fetch tables:', err);
        });
    }
    return () => {
      active = false;
    };
  }, [showTransfer, tenantId, table, token]);

  const handleTransfer = async () => {
    if (!tenantId || !table || !selectedTargetTableId) return;
    setTransferring(true);
    try {
      const client = getAuthenticatedClient(TableService, tenantId, token || undefined);
      await client.transferTable({
        sourceTableId: table.id,
        targetTableId: selectedTargetTableId,
      });
      onRefresh();
      onClose();
    } catch (err: unknown) {
      console.error('Transfer failed:', err);
      alert('Chuyển bàn thất bại: ' + ((err as Error).message || 'Lỗi hệ thống'));
    } finally {
      setTransferring(false);
    }
  };

  const handleSplitQuantityChange = (itemId: string, maxQty: number, delta: number) => {
    setSplitQuantities(prev => {
      const current = prev[itemId] || 0;
      const next = Math.min(maxQty, Math.max(0, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const handleSplitItems = async () => {
    if (!tenantId || !table || !order) return;
    
    // Collect items to split
    const itemsToSplit = Object.entries(splitQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        orderItemId: itemId,
        quantity: qty
      }));

    if (itemsToSplit.length === 0) {
      alert('Vui lòng chọn ít nhất 1 món để tách!');
      return;
    }

    setSplitting(true);
    try {
      const client = getAuthenticatedClient(OrderService, tenantId, token || undefined);
      // Split items into a new target table if selected, or if target table is empty it creates a new order/takeaway
      await client.splitOrderItems({
        sourceOrderId: order.id,
        targetTableId: selectedTargetTableId || '', // optionally split to another table
        items: itemsToSplit
      });
      
      onRefresh();
      onClose();
    } catch (err: unknown) {
      console.error('Split failed:', err);
      alert('Tách món thất bại: ' + ((err as Error).message || 'Lỗi hệ thống'));
    } finally {
      setSplitting(false);
    }
  };

  if (!table) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-surface border border-foreground/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-foreground/10 bg-slate-900/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary font-black italic uppercase text-lg">
                {table.name}
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight italic">Chi tiết bàn</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/20 text-primary uppercase tracking-wider">
                    Đang dùng
                  </span>
                  <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest flex items-center gap-1">
                    <Users size={12} /> {table.capacity} Chỗ
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQr(true)}
                className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-2xl transition-all flex items-center justify-center"
                title="Xem mã QR bàn"
              >
                <QrCode size={18} />
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-2xl transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-foreground/40 text-xs font-black tracking-widest uppercase">Đang tải thông tin đơn hàng...</p>
              </div>
            ) : error ? (
              <div className="py-12 px-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center text-center gap-3">
                <AlertCircle size={36} className="text-red-500" />
                <p className="text-red-400 font-bold text-sm">{error}</p>
                <button
                  onClick={fetchOrderDetails}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase italic tracking-tighter"
                >
                  Thử lại
                </button>
              </div>
            ) : order ? (
              <>
                {/* Order Meta Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-foreground/5 p-4 rounded-2xl border border-foreground/5">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="text-primary" size={18} />
                    <div>
                      <p className="text-[9px] text-foreground/40 uppercase font-black tracking-wider">Mã đơn hàng</p>
                      <p className="text-xs font-black text-foreground font-mono">{order.orderNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="text-primary" size={18} />
                    <div>
                      <p className="text-[9px] text-foreground/40 uppercase font-black tracking-wider">Giờ vào</p>
                      <p className="text-xs font-bold text-foreground">
                        {order.createdAt ? new Date(Number(order.createdAt.seconds) * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-primary" size={18} />
                    <div>
                      <p className="text-[9px] text-foreground/40 uppercase font-black tracking-wider">Tổng cộng</p>
                      <p className="text-sm font-black text-interaction italic tracking-tight">{formatVND(Number(order.total?.units || 0))}</p>
                    </div>
                  </div>
                </div>

                {/* Mode Selector - Transfer / Split */}
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowTransfer(!showTransfer);
                      setShowSplit(false);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all border",
                      showTransfer 
                        ? "bg-primary text-white border-primary/20 shadow-md" 
                        : "bg-surface text-foreground/60 border-foreground/10 hover:bg-foreground/5"
                    )}
                  >
                    <ArrowRightLeft size={16} /> Chuyển / Gộp bàn
                  </button>
                  <button
                    onClick={() => {
                      setShowSplit(!showSplit);
                      setShowTransfer(false);
                      setSplitQuantities({});
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all border",
                      showSplit 
                        ? "bg-primary text-white border-primary/20 shadow-md" 
                        : "bg-surface text-foreground/60 border-foreground/10 hover:bg-foreground/5"
                    )}
                  >
                    <Split size={16} /> Tách món
                  </button>
                </div>

                {/* Transfer Section */}
                {showTransfer && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-4 overflow-hidden"
                  >
                    <h4 className="text-xs font-black uppercase text-primary italic tracking-wider">Chuyển hoặc Gộp đến bàn khác</h4>
                    <div className="flex gap-3">
                      <select
                        value={selectedTargetTableId}
                        onChange={(e) => setSelectedTargetTableId(e.target.value)}
                        className="flex-1 bg-background border border-foreground/10 text-foreground text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-primary font-bold uppercase tracking-tight"
                      >
                        <option value="">-- Chọn bàn đích --</option>
                        {allTables.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.status === TableStatus.OCCUPIED ? 'Đang dùng - Sẽ tự động gộp' : 'Trống'})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleTransfer}
                        disabled={transferring || !selectedTargetTableId}
                        className="px-6 bg-primary hover:bg-interaction disabled:bg-primary/40 text-white rounded-xl text-xs font-black uppercase italic tracking-tighter transition-all flex items-center gap-2 shadow-md"
                      >
                        {transferring ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          'Xác nhận'
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Split Section */}
                {showSplit && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-primary italic tracking-wider">Tách món ra đơn mới</h4>
                      <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Chọn số lượng để tách</p>
                    </div>

                    <div className="space-y-2 border-t border-foreground/5 pt-3 max-h-48 overflow-y-auto">
                      {order.items?.map((item: OrderItem) => (
                        <div key={item.id} className="flex items-center justify-between p-2 hover:bg-foreground/5 rounded-xl transition-all">
                          <div>
                            <p className="text-xs font-black text-foreground">{item.productName}</p>
                            <p className="text-[10px] text-foreground/40">Tối đa: {item.quantity}</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleSplitQuantityChange(item.id, item.quantity, -1)}
                              className="w-8 h-8 rounded-lg bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-xs font-black text-foreground/60 transition-all"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-xs font-black text-foreground">{splitQuantities[item.id] || 0}</span>
                            <button
                              onClick={() => handleSplitQuantityChange(item.id, item.quantity, 1)}
                              className="w-8 h-8 rounded-lg bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-xs font-black text-foreground/60 transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <select
                        value={selectedTargetTableId}
                        onChange={(e) => setSelectedTargetTableId(e.target.value)}
                        className="flex-1 bg-background border border-foreground/10 text-foreground text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-primary font-bold uppercase tracking-tight"
                      >
                        <option value="">Tạo đơn mang về mới (Takeaway)</option>
                        {allTables.map(t => (
                          <option key={t.id} value={t.id}>
                            Chuyển sang {t.name} ({t.status === TableStatus.OCCUPIED ? 'Đang dùng - Sẽ gộp món' : 'Trống'})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSplitItems}
                        disabled={splitting}
                        className="px-6 bg-primary hover:bg-interaction disabled:bg-primary/40 text-white rounded-xl text-xs font-black uppercase italic tracking-tighter transition-all flex items-center gap-2 shadow-md"
                      >
                        {splitting ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          'Xác nhận tách'
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Items List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 italic">Danh sách món ăn</h4>
                  <div className="space-y-3 border border-foreground/10 rounded-2xl p-4 max-h-[30vh] overflow-y-auto">
                    {order.items?.map((item: OrderItem) => (
                      <div key={item.id} className="flex flex-col gap-1 py-2 border-b border-foreground/5 last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-black text-foreground">{item.productName}</span>
                            <span className="ml-2 text-xs font-bold text-primary">x{item.quantity}</span>
                          </div>
                          <span className="text-xs font-black text-foreground/60">{formatVND(Number(item.subtotal?.units || 0))}</span>
                        </div>
                        {item.toppings && item.toppings.length > 0 && (
                          <div className="text-[10px] text-foreground/40 pl-3 border-l border-primary/20 font-bold uppercase tracking-wider space-y-0.5">
                            {item.toppings.map((t: OrderItemTopping) => (
                              <p key={t.id}>+ {t.name} (+{formatVND(Number(t.price?.units || 0))})</p>
                            ))}
                          </div>
                        )}
                        {item.note && (
                          <p className="text-[10px] text-accent font-bold pl-3 flex items-center gap-1 mt-0.5">
                            ★ {item.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotals Panel */}
                <div className="bg-foreground/5 p-4 rounded-2xl border border-foreground/5 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-foreground/60">
                    <span>Tạm tính</span>
                    <span>{formatVND(Number(order.subtotal?.units || 0))}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-foreground/60">
                    <span>Thuế VAT (10%)</span>
                    <span>{formatVND(Number(order.taxAmount?.units || 0))}</span>
                  </div>
                  <div className="h-px bg-foreground/10 my-2" />
                  <div className="flex justify-between items-center text-sm font-black text-foreground uppercase tracking-tight italic">
                    <span>Tổng hóa đơn</span>
                    <span className="text-base text-interaction">{formatVND(Number(order.total?.units || 0))}</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-foreground/10 bg-slate-900/20 flex gap-4">
            <button
              onClick={() => {
                if (order) {
                  router.push(`/pos/order?tableId=${table.id}&orderId=${order.id}`);
                  onClose();
                }
              }}
              className="flex-1 py-3 bg-foreground hover:bg-interaction text-background hover:text-white rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-2 border border-foreground/10"
            >
              <Plus size={16} /> Thêm món
            </button>
            <button
              onClick={() => {
                if (order) {
                  router.push(`/pos/checkout?orderId=${order.id}`);
                  onClose();
                }
              }}
              className="flex-1 py-3 bg-interaction hover:bg-primary text-white rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <DollarSign size={16} /> Thanh toán <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>

      {showQr && (
        <TableQrModal
          floorPlanName="Bàn đang hoạt động"
          tables={[table]}
          tenantId={tenantId || '7a5eee4e-431a-4dc0-88d3-047314116e23'}
          token={token || undefined}
          onClose={() => setShowQr(false)}
        />
      )}
    </AnimatePresence>
  );
};

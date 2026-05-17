'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderService } from '@/gen/order_connect';
import { Order, OrderStatus } from '@/gen/order_pb';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { Bell, Check, X, Coffee, Clock, User, Trash2, RefreshCw } from 'lucide-react';
import { formatVND } from '@/lib/utils/format';

export default function QRAlertListener() {
  const { tenantId, token, branchId } = useAuth();
  
  // Real-time notifications state
  const [activeAlerts, setActiveAlerts] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  
  // Audio Notification sound ref
  const audioPlayedRef = useRef<Record<string, boolean>>({});

  // Poll for DRAFT orders as fallback or initial load
  const fetchDraftOrders = useCallback(async () => {
    if (!tenantId || !branchId || !token) return;
    try {
      const client = getAuthenticatedClient(OrderService, tenantId, token);
      const response = await client.listOrders({
        branchId: branchId || undefined,
        status: OrderStatus.DRAFT,
        pagination: { page: 1, pageSize: 20 }
      });
      
      const draftOrders = response.orders.filter(o => o.status === OrderStatus.DRAFT);
      
      setActiveAlerts(prev => {
        // Find if we have new orders to alert
        draftOrders.forEach(o => {
          if (!prev.some(x => x.id === o.id) && !audioPlayedRef.current[o.id]) {
            audioPlayedRef.current[o.id] = true;
            // Play nice bell notification sound
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          }
        });
        return draftOrders;
      });
    } catch (err) {
      console.error('Failed to list draft table orders:', err);
    }
  }, [tenantId, branchId, token]);

  // Initial load and periodic polling every 7 seconds
  useEffect(() => {
    if (!tenantId || !branchId || !token) return;
    
    fetchDraftOrders();
    const interval = setInterval(fetchDraftOrders, 7000);
    
    return () => clearInterval(interval);
  }, [tenantId, branchId, token, fetchDraftOrders]);

  // Real-time server streaming connection
  useEffect(() => {
    if (!tenantId || !branchId || !token) return;
    
    const client = getAuthenticatedClient(OrderService, tenantId, token);
    const abortController = new AbortController();
    
    async function startStream() {
      try {
        const stream = client.streamOrders(
          { branchId: branchId || undefined },
          { signal: abortController.signal }
        );
        
        for await (const response of stream) {
          const updatedOrder = response.order;
          if (!updatedOrder) continue;
          
          if (updatedOrder.status === OrderStatus.DRAFT) {
            // New draft guest order! Add/update list
            setActiveAlerts(prev => {
              if (!prev.some(o => o.id === updatedOrder.id)) {
                if (!audioPlayedRef.current[updatedOrder.id]) {
                  audioPlayedRef.current[updatedOrder.id] = true;
                  const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav");
                  audio.volume = 0.5;
                  audio.play().catch(() => {});
                }
                return [updatedOrder, ...prev];
              }
              // If already exists, update details
              return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
            });
          } else {
            // If order was approved or cancelled, remove from active alerts list
            setActiveAlerts(prev => prev.filter(o => o.id !== updatedOrder.id));
            if (selectedOrder && selectedOrder.id === updatedOrder.id) {
              setSelectedOrder(null);
            }
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.warn('Real-time order stream disconnected, falling back to polling.', err);
        }
      }
    }
    
    startStream();
    
    return () => {
      abortController.abort();
    };
  }, [tenantId, branchId, token, selectedOrder]);

  // Fast approve action
  const handleApprove = async (orderId: string) => {
    if (!tenantId || !token) return;
    setApprovingId(orderId);
    try {
      const client = getAuthenticatedClient(OrderService, tenantId, token);
      await client.updateOrderStatus({
        id: orderId,
        status: OrderStatus.CONFIRMED
      });
      
      // Remove alert
      setActiveAlerts(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
      
      // Play success chime sound
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav");
      audio.volume = 0.4;
      audio.play().catch(() => {});

    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Failed to approve order:', err);
      alert('Không thể phê duyệt đơn hàng: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setApprovingId(null);
    }
  };

  // Reject / Cancel action
  const handleCancel = async (orderId: string) => {
    if (!tenantId || !token) return;
    if (!confirm('Bạn có chắc chắn muốn hủy bỏ yêu cầu đặt món này?')) return;
    
    setCancellingId(orderId);
    try {
      const client = getAuthenticatedClient(OrderService, tenantId, token);
      await client.cancelOrder({
        id: orderId,
        reason: 'Thu ngân từ chối duyệt'
      });
      
      // Remove alert
      setActiveAlerts(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }

    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Failed to cancel order:', err);
      alert('Không thể hủy đơn hàng: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setCancellingId(null);
    }
  };

  if (activeAlerts.length === 0) return null;

  return (
    <>
      {/* ----------------------------------------------------
          FLOATING ALERTS PANEL - TOAST CARDS
      ---------------------------------------------------- */}
      <div className="fixed bottom-6 right-6 z-[99] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeAlerts.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 50, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 50 }}
              className="pointer-events-auto bg-[#0F1322]/95 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                    <Coffee size={20} className="animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">{order.tableName || 'Bàn gọi món'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/20 text-indigo-400 uppercase tracking-widest">
                        QR Order
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <User size={12} className="opacity-75" />
                      Khách: {order.customerName || 'Vãng lai'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(order.id)}
                  disabled={cancellingId === order.id}
                  className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all"
                  title="Hủy đơn đặt"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Items Summary preview */}
              <div className="bg-black/30 rounded-xl p-2.5 text-xs flex justify-between items-center text-slate-300 font-medium">
                <span className="line-clamp-1 max-w-[200px]">
                  {order.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                </span>
                <span className="font-mono font-bold text-indigo-400 flex-shrink-0 ml-2">
                  {formatVND(Number(order.total?.units || 0))}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 mt-1">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[11px] font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-1.5 border border-slate-700/50"
                >
                  Xem chi tiết
                </button>
                <button
                  onClick={() => handleApprove(order.id)}
                  disabled={approvingId === order.id}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-[11px] font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15"
                >
                  {approvingId === order.id ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Phê duyệt
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------
          ORDER APPROVAL SHEET - DETAILED REVIEW MODAL
      ---------------------------------------------------- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-[#0F1322] border border-indigo-500/25 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-foreground/10 bg-slate-900/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                  <Bell size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground uppercase tracking-tight italic flex items-center gap-2">
                    Xác nhận yêu cầu gọi món
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Bàn: {selectedOrder.tableName}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-600"></span>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      Mã đơn: #{selectedOrder.orderNumber}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2.5 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body split */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Guest Meta info bar */}
              <div className="grid grid-cols-2 gap-3.5 bg-[#141A30] border border-slate-800/80 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <User className="text-indigo-400 flex-shrink-0" size={18} />
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">Khách đặt</span>
                    <p className="text-xs font-black text-white">{selectedOrder.customerName || 'Khách vãng lai'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-indigo-400 flex-shrink-0" size={18} />
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">Thời gian gửi</span>
                    <p className="text-xs font-bold text-white">
                      {selectedOrder.createdAt ? new Date(Number(selectedOrder.createdAt.seconds) * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items catalog breakdown list */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Chi tiết các món uống yêu cầu</h4>
                <div className="border border-slate-800/90 rounded-2xl p-4.5 bg-[#141A30]/30 flex flex-col gap-3 max-h-48 overflow-y-auto">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1 pb-3 border-b border-slate-800/80 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-white">{item.productName}</span>
                          <span className="ml-2 text-xs font-bold text-indigo-400 font-mono">x{item.quantity}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-300">{formatVND(Number(item.subtotal?.units || 0))}</span>
                      </div>
                      
                      {/* Topping details */}
                      {item.toppings && item.toppings.length > 0 && (
                        <div className="text-[10px] text-slate-400 pl-3 border-l border-indigo-500/20 font-bold uppercase tracking-wider space-y-0.5">
                          {item.toppings.map(t => (
                            <p key={t.id}>+ {t.name} (+{formatVND(Number(t.price?.units || 0))})</p>
                          ))}
                        </div>
                      )}
                      {item.note && (
                        <p className="text-[10px] text-amber-500 font-bold pl-3 mt-0.5">
                          ★ Ghi chú: {item.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* General Order Note */}
              {selectedOrder.note && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-[9px] uppercase font-black tracking-wider text-amber-500 flex items-center gap-1">
                    ★ Ghi chú từ bàn đặt
                  </span>
                  <p className="text-xs text-amber-200/90 font-medium italic">{selectedOrder.note}</p>
                </div>
              )}

              {/* Total Summary */}
              <div className="bg-[#141A30]/50 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Tạm tính</span>
                  <span>{formatVND(Number(selectedOrder.subtotal?.units || 0))}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Thuế VAT (10%)</span>
                  <span>{formatVND(Number(selectedOrder.taxAmount?.units || 0))}</span>
                </div>
                <div className="h-px bg-slate-800/80 my-1.5" />
                <div className="flex justify-between items-center text-sm font-black text-white uppercase tracking-tight italic">
                  <span>Tổng tiền</span>
                  <span className="text-lg text-indigo-400">{formatVND(Number(selectedOrder.total?.units || 0))}</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-6 border-t border-slate-800/90 bg-slate-900/30 flex gap-4">
              <button
                onClick={() => handleCancel(selectedOrder.id)}
                disabled={cancellingId === selectedOrder.id}
                className="flex-1 py-3.5 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Từ chối duyệt
              </button>
              <button
                onClick={() => handleApprove(selectedOrder.id)}
                disabled={approvingId === selectedOrder.id}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/15"
              >
                {approvingId === selectedOrder.id ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Phê duyệt ngay
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </>
  );
}

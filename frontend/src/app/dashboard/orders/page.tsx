'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Filter, 
  Receipt,
  Eye,
  CheckCircle2,
  Clock,
  Ban
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { OrderService } from '@/gen/order_connect';
import { Order, OrderStatus } from '@/gen/order_pb';

export default function OrdersPage() {
  const { token, tenantId, branchId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token || !tenantId || !branchId) return;
    
    setLoading(true);
    try {
      const orderClient = getAuthenticatedClient(OrderService, tenantId, token);
      const res = await orderClient.listOrders({ 
        branchId,
        pagination: { pageSize: 100, page: 1 }
      });
      
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId, branchId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        (order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) || 
        (order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesStatus = statusFilter === null || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      const dateA = a.createdAt ? new Date(Number(a.createdAt.seconds) * 1000).getTime() : 0;
      const dateB = b.createdAt ? new Date(Number(b.createdAt.seconds) * 1000).getTime() : 0;
      return dateB - dateA;
    });
  }, [orders, searchQuery, statusFilter]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED:
        return (
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black bg-interaction text-white border border-foreground/10 uppercase italic tracking-tighter shadow-sm">
            <CheckCircle2 className="w-3 h-3" /> Hoàn thành
          </span>
        );
      case OrderStatus.CANCELLED:
        return (
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black bg-red-500 text-white border border-foreground/10 uppercase italic tracking-tighter shadow-sm">
            <Ban className="w-3 h-3" /> Đã hủy
          </span>
        );
      case OrderStatus.PAID:
        return (
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black bg-blue-500 text-white border border-foreground/10 uppercase italic tracking-tighter shadow-sm">
            Đã thanh toán
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black bg-accent text-foreground border border-foreground/10 uppercase italic tracking-tighter shadow-sm">
            <Clock className="w-3 h-3" /> Đang xử lý
          </span>
        );
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatCurrency = (amount: any) => {
    if (!amount) return '0 đ';
    const num = Number(amount.units) + Number(amount.nanos) / 1e9;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = new Date(Number(timestamp.seconds) * 1000);
    return date.toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
            <Receipt className="w-5 h-5" />
            <span>Quản lý Bán hàng</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            Danh sách <span className="text-interaction">Đơn hàng</span>
          </h1>
          <p className="text-foreground/40 font-bold italic">Theo dõi toàn bộ lịch sử giao dịch và đơn hàng.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchOrders}
            className="w-14 h-14 bg-surface border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-interaction hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-6 h-6 stroke-[3] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="ai-card bg-surface flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 flex items-center gap-4 bg-background px-6 h-14 rounded-2xl border border-foreground/10 group focus-within:bg-white focus-within:border-interaction focus-within:shadow-md transition-all relative overflow-hidden">
          <Search className="w-6 h-6 text-foreground/20 group-focus-within:text-interaction flex-none pointer-events-none translate-y-[1px]" />
          <input 
            type="text" 
            placeholder="TÌM THEO MÃ ĐƠN HOẶC TÊN KHÁCH..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 h-full py-0 font-black text-sm uppercase italic tracking-tighter placeholder:text-foreground/20 leading-none"
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => setStatusFilter(statusFilter === OrderStatus.COMPLETED ? null : OrderStatus.COMPLETED)}
            className={`px-8 py-4 rounded-2xl border transition-all font-black uppercase italic tracking-tighter text-sm shadow-sm ${
              statusFilter === OrderStatus.COMPLETED
                ? 'bg-interaction text-white border-interaction' 
                : 'bg-background text-foreground/40 border-foreground/10 hover:border-foreground/40'
            }`}
          >
            Hoàn thành
          </button>
          <button 
            onClick={() => {
              setSearchQuery('');
              setStatusFilter(null);
            }}
            className="w-14 h-14 bg-surface border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-interaction hover:text-white transition-all shadow-sm"
            title="Xóa bộ lọc"
          >
            <Filter className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="ai-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Mã đơn</th>
                <th className="px-8 py-6">Khách hàng</th>
                <th className="px-8 py-6 text-center">Thời gian</th>
                <th className="px-8 py-6 text-right">Tổng tiền</th>
                <th className="px-8 py-6">Trạng thái</th>
                <th className="px-8 py-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-10">
                      <div className="h-10 bg-foreground/5 rounded-2xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                      <Receipt className="w-20 h-20" />
                      <p className="text-xl font-black uppercase italic tracking-tighter">Không tìm thấy đơn hàng</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-foreground/5 transition-all cursor-pointer">
                    <td className="px-8 py-6">
                      <span className="text-lg font-black text-foreground uppercase italic tracking-tighter group-hover:text-interaction transition-all">{order.orderNumber}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold">{order.customerName || 'Khách vãng lai'}</p>
                      {order.cashierName && (
                        <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest">Thu ngân: {order.cashierName}</p>
                      )}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-sm font-medium text-foreground/60">{formatDate(order.createdAt)}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-lg font-black italic tracking-tighter text-interaction">{formatCurrency(order.total)}</span>
                    </td>
                    <td className="px-8 py-6">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          className="w-12 h-12 bg-surface border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-interaction hover:text-white shadow-sm transition-all"
                          title="Chi tiết"
                        >
                          <Eye className="w-5 h-5 stroke-[3]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

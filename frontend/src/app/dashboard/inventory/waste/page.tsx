'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AlertTriangle, 
  PlusCircle, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  PieChart as PieIcon, 
  FileText,
  User
} from 'lucide-react';
import Link from 'next/link';
import { useInventory } from '@/hooks/useInventory';
import { WasteLogItem } from '@/gen/inventory_pb';
import LogWasteModal from '@/components/inventory/LogWasteModal';
import { formatVND, formatDateTime } from '@/lib/utils/format';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

export default function WasteManagementPage() {
  const { branchId } = useAuth();
  const { listWasteLogs, loading } = useInventory();
  const [wasteLogs, setWasteLogs] = useState<WasteLogItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchWasteLogs = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await listWasteLogs({ branchId });
      if (res && res.items) {
        setWasteLogs(res.items);
      }
    } catch (err) {
      console.error('Failed to load waste logs:', err);
    }
  }, [listWasteLogs, branchId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWasteLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWasteLogs]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCost = wasteLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalEvents = wasteLogs.length;

    // Reason frequency
    const reasonCounts: Record<string, { count: number; cost: number }> = {};
    wasteLogs.forEach(log => {
      const r = log.reason || 'OTHER';
      if (!reasonCounts[r]) {
        reasonCounts[r] = { count: 0, cost: 0 };
      }
      reasonCounts[r].count += 1;
      reasonCounts[r].cost += log.cost;
    });

    let mostCommonReason = 'Chưa xác định';
    let maxReasonCount = 0;
    Object.entries(reasonCounts).forEach(([reason, data]) => {
      if (data.count > maxReasonCount) {
        maxReasonCount = data.count;
        mostCommonReason = reason;
      }
    });

    // Item frequency
    const itemCosts: Record<string, number> = {};
    wasteLogs.forEach(log => {
      const name = log.productName || log.ingredientName || 'Ẩn danh';
      itemCosts[name] = (itemCosts[name] || 0) + log.cost;
    });

    let mostWastedItem = 'Chưa có';
    let maxItemCost = 0;
    Object.entries(itemCosts).forEach(([name, cost]) => {
      if (cost > maxItemCost) {
        maxItemCost = cost;
        mostWastedItem = name;
      }
    });

    return {
      totalCost,
      totalEvents,
      mostCommonReason,
      mostWastedItem,
      reasonBreakdown: reasonCounts
    };
  }, [wasteLogs]);

  // Translate reasons to Vietnamese human-readable format
  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'WRONG_RECIPE': return 'Sai công thức pha chế';
      case 'SPOILED': return 'Hết hạn/Hỏng kho';
      case 'DAMAGED': return 'Vật lý/Đổ vỡ';
      case 'EXPIRED': return 'Nguyên liệu hết hạn';
      case 'OTHER': return 'Lý do khác';
      default: return reason;
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'WRONG_RECIPE': return '#ffd23f'; // Yellow
      case 'SPOILED': return '#ef4444'; // Red
      case 'DAMAGED': return '#f97316'; // Orange
      case 'EXPIRED': return '#ec4899'; // Pink
      default: return '#10b981'; // Emerald
    }
  };

  // Recharts Data processing
  const chartDataByReason = useMemo(() => {
    return Object.entries(stats.reasonBreakdown).map(([reason, data]) => ({
      name: getReasonLabel(reason),
      value: data.cost,
      fill: getReasonColor(reason)
    }));
  }, [stats.reasonBreakdown]);

  const chartDataByItem = useMemo(() => {
    const itemCosts: Record<string, number> = {};
    wasteLogs.forEach(log => {
      const name = log.productName || log.ingredientName || 'Không tên';
      itemCosts[name] = (itemCosts[name] || 0) + log.cost;
    });

    return Object.entries(itemCosts)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5); // top 5 most wasted
  }, [wasteLogs]);

  return (
    <div className="space-y-12 pb-20 relative animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Title Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-red-500 font-black uppercase text-xs tracking-widest">
            <AlertTriangle className="w-5 h-5 stroke-[3]" />
            <span>QUẢN LÝ THẤT THOÁT & HAO HỤT VẬN HÀNH</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            Báo Hỏng & <span className="text-red-500">Hao Hụt</span>
          </h1>
          <p className="text-foreground/40 font-bold flex items-center gap-2 italic">
            Theo dõi, phân tích tổn thất tài chính và quản lý khấu trừ nguyên liệu/sản phẩm lỗi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 bg-surface p-4 border border-foreground/10 rounded-3xl shadow-sm">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-dynamic py-4 px-8 text-sm h-14 bg-red-500 hover:bg-red-600 hover:border-red-600"
          >
            <PlusCircle className="w-5 h-5" />
            <span>BÁO HỎNG VẬT TƯ</span>
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
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          Phiếu nhập hàng
        </Link>
        <Link 
          href="/dashboard/inventory/waste" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 transition-all"
        >
          Báo hỏng & hao hụt
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Tổng tổn thất tài chính', value: formatVND(stats.totalCost), sub: 'Thiệt hại tích lũy', icon: DollarSign, color: 'bg-red-500' },
          { label: 'Số vụ báo cáo hỏng', value: `${stats.totalEvents} lần`, sub: 'Lịch sử báo hỏng', icon: FileText, color: 'bg-orange-500' },
          { label: 'Lý do phổ biến nhất', value: getReasonLabel(stats.mostCommonReason), sub: 'Nguyên nhân chính', icon: AlertTriangle, color: 'bg-yellow-500' },
          { label: 'Thất thoát nặng nhất', value: stats.mostWastedItem, sub: 'Mặt hàng hao hụt lớn', icon: TrendingUp, color: 'bg-emerald-500' },
        ].map((metric, idx) => (
          <div
            key={idx}
            className="ai-card flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all shadow-sm border border-foreground/5"
          >
            <div className="flex justify-between items-start">
              <div className={`w-14 h-14 rounded-2xl border border-foreground/10 flex items-center justify-center text-white ${metric.color} shadow-sm group-hover:scale-110 transition-transform`}>
                <metric.icon size={26} className="stroke-[3]" />
              </div>
              <div className="font-mono text-[9px] font-black uppercase text-foreground/40 italic">
                Thời gian thực
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{metric.label}</p>
              <p className="text-xl md:text-2xl font-black italic tracking-tighter text-foreground leading-none uppercase truncate max-w-full">
                {metric.value}
              </p>
              <p className="text-[10px] text-foreground/50 font-bold mt-1 italic">{metric.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Loss Charts */}
      {wasteLogs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reason breakdown chart */}
          <div className="ai-card p-10 flex flex-col justify-between border border-foreground/5">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Phân tích cơ cấu</p>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Hao hụt theo nguyên nhân</h3>
            </div>
            
            <div className="h-[250px] w-full relative my-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataByReason}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartDataByReason.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number | string | unknown) => [formatVND(Number(value || 0)), 'Tổn thất']}
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface)', 
                      border: '1px solid rgba(0,0,0,0.1)', 
                      borderRadius: '16px',
                      fontWeight: '900',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <PieIcon className="w-6 h-6 text-red-500/60" />
                <span className="text-[10px] font-black uppercase opacity-40 mt-1">Lý do hỏng</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {chartDataByReason.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-foreground/5 pb-2 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="font-black uppercase italic tracking-tighter text-foreground/75">{item.name}</span>
                  </div>
                  <span className="font-mono font-black text-foreground">
                    {formatVND(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Wasted Items Chart */}
          <div className="lg:col-span-2 ai-card p-10 flex flex-col justify-between border border-foreground/5">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 font-bold">Thất thoát cao</p>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Sản phẩm / Nguyên liệu thiệt hại lớn</h3>
            </div>

            <div className="h-[300px] w-full my-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataByItem} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-foreground)" opacity={0.05} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--color-foreground)', fontWeight: 'bold', fontSize: 10, opacity: 0.5 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--color-foreground)', fontWeight: 'bold', fontSize: 10, opacity: 0.5 }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number | string | unknown) => [formatVND(Number(value || 0)), 'Hao hụt']}
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface)', 
                      border: '1px solid rgba(0,0,0,0.1)', 
                      borderRadius: '16px',
                      fontWeight: '900',
                    }}
                  />
                  <Bar dataKey="cost" fill="#ef4444" radius={[8, 8, 0, 0]} maxBarSize={45}>
                    {chartDataByItem.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getReasonColor(index.toString())} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-red-500/5 p-4 rounded-2xl flex items-center justify-between text-xs font-black uppercase italic tracking-tighter">
              <span className="text-red-500/70">Tổng hao hụt Top 5 sản phẩm/nguyên liệu:</span>
              <span className="text-red-500 text-sm">
                {formatVND(chartDataByItem.reduce((sum, item) => sum + item.cost, 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Waste Logs Table list */}
      {loading && wasteLogs.length === 0 ? (
        <div className="py-24 flex items-center justify-center">
          <RefreshCw className="w-12 h-12 text-red-500 animate-spin" />
        </div>
      ) : wasteLogs.length === 0 ? (
        <div className="py-24 bg-surface/50 border border-foreground/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 bg-red-500/5 rounded-3xl flex items-center justify-center border border-red-500/10 mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground mb-2">Chưa có bản ghi hao hụt</h3>
          <p className="text-foreground/40 max-w-md font-bold text-sm italic mb-8">
            Tuyệt vời! Hệ thống chưa ghi nhận hoặc báo cáo bất kỳ hao hụt vật tư hay sản phẩm hỏng nào ở chi nhánh này.
          </p>
          <button onClick={() => setIsModalOpen(true)} className="btn-dynamic py-4 px-8 text-sm bg-red-500 hover:bg-red-600 hover:border-red-600">
            <PlusCircle className="w-5 h-5" />
            <span>BÁO HỎNG LẦN ĐẦU TIÊN</span>
          </button>
        </div>
      ) : (
        <div className="ai-card p-0 overflow-hidden shadow-sm border border-foreground/5">
          <div className="p-8 border-b border-foreground/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-black uppercase italic tracking-tighter">Nhật ký chi tiết báo hỏng</h3>
            </div>
            <span className="text-[10px] font-black uppercase italic tracking-widest text-foreground/40">
              Tổng {wasteLogs.length} bản ghi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">Thời gian</th>
                  <th className="px-8 py-6">Chi tiết vật tư</th>
                  <th className="px-8 py-6">Phân loại</th>
                  <th className="px-8 py-6">Số lượng</th>
                  <th className="px-8 py-6">Lý do</th>
                  <th className="px-8 py-6 text-right">Ước tính thiệt hại</th>
                  <th className="px-8 py-6">Người báo cáo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5 font-black uppercase tracking-tighter text-sm italic">
                {wasteLogs.map((log) => {
                  const isProduct = !!log.productId;
                  const displayName = isProduct ? log.productName : log.ingredientName;
                  const badgeBg = isProduct ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20';

                  return (
                    <tr key={log.id} className="hover:bg-foreground/5 transition-all">
                      <td className="px-8 py-6 text-xs opacity-40 font-bold tracking-widest normal-case">
                        {log.createdAt ? formatDateTime(new Date(log.createdAt)) : '...'}
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="font-black text-foreground tracking-tighter text-base">{displayName || 'Không xác định'}</p>
                          {log.note && (
                            <p className="text-[10px] text-foreground/40 uppercase tracking-widest font-bold normal-case truncate max-w-[200px]">
                              Chú thích: {log.note}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${badgeBg}`}>
                          {isProduct ? 'Thành phẩm' : 'Nguyên liệu'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-lg text-foreground">
                        x{log.quantity}
                      </td>
                      <td className="px-8 py-6">
                        <span 
                          className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
                          style={{
                            backgroundColor: `${getReasonColor(log.reason)}15`,
                            color: getReasonColor(log.reason),
                            border: `1px solid ${getReasonColor(log.reason)}30`
                          }}
                        >
                          {getReasonLabel(log.reason)}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right text-lg text-red-500">
                        {formatVND(log.cost)}
                      </td>
                      <td className="px-8 py-6 text-xs text-foreground/50 font-bold normal-case flex items-center gap-2 py-8">
                        <User className="w-4 h-4 text-foreground/40" />
                        <span>{log.createdBy || 'Hệ thống'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log waste creation modal */}
      <LogWasteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchWasteLogs}
      />
    </div>
  );
}

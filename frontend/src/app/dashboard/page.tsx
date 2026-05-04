'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  Plus,
  RefreshCw,
  Calendar,
  Layers,
  Activity,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { ProductService } from '@/gen/product_connect';
import { AuthService } from '@/gen/auth_connect';
import { ReportService } from '@/gen/report_connect';
import { PeriodType } from '@/gen/report_pb';
import { formatISO, startOfDay, startOfWeek, startOfMonth, startOfYear, subDays } from 'date-fns';
import Link from 'next/link';
import { formatVND, moneyToNumber } from '@/lib/utils/format';
import RevenueChart from '@/components/dashboard/RevenueChart';
import TopProducts from '@/components/dashboard/TopProducts';
import DashboardFilters, { DateRange } from '@/components/dashboard/DashboardFilters';

export default function DashboardPage() {
  const { token, tenantId } = useAuth();
  
  // State for filters
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [branchId, setBranchId] = useState('');
  
  // Primary stats
  const [stats, setStats] = useState({
    productCount: 0,
    staffCount: 0,
    revenue: 0,
    orderCount: 0,
    aov: 0,
    loading: true
  });

  // Report data
  const [reportData, setReportData] = useState<{
    trends: { label: string; revenue: number; orders: number }[];
    topProducts: { name: string; quantity: number; revenue: number }[];
    loading: boolean;
  }>({
    trends: [],
    topProducts: [],
    loading: true
  });

  useEffect(() => {
    if (!token || !tenantId) return;

    const fetchData = async () => {
      setStats(prev => ({ ...prev, loading: true }));
      setReportData(prev => ({ ...prev, loading: true }));
      
      try {
        const prodClient = getAuthenticatedClient(ProductService, tenantId, token);
        const authClient = getAuthenticatedClient(AuthService, tenantId, token);
        const reportClient = getAuthenticatedClient(ReportService, tenantId, token);
        
        // Calculate dates
        const now = new Date();
        let startDate: Date;
        let periodType = PeriodType.DAILY;

        switch (dateRange) {
          case 'today': 
            startDate = startOfDay(now); 
            periodType = PeriodType.DAILY;
            break;
          case 'week': 
            startDate = startOfWeek(now, { weekStartsOn: 1 }); 
            periodType = PeriodType.DAILY;
            break;
          case 'month': 
            startDate = startOfMonth(now); 
            periodType = PeriodType.DAILY;
            break;
          case 'year': 
            startDate = startOfYear(now); 
            periodType = PeriodType.MONTHLY;
            break;
          default: startDate = subDays(now, 7);
        }

        const startStr = formatISO(startDate);
        const endStr = formatISO(now);

        const [prodRes, staffRes, summaryRes, topRes, trendRes] = await Promise.all([
          prodClient.listProducts({ pagination: { page: 1, pageSize: 1 } }),
          authClient.listStaff({}),
          reportClient.getRevenueSummary({ branchId, startDate: startStr, endDate: endStr }),
          reportClient.getTopProducts({ branchId, startDate: startStr, endDate: endStr, limit: 5 }),
          reportClient.getSalesByPeriod({ branchId, startDate: startStr, endDate: endStr, period: periodType })
        ]);

        setStats({
          productCount: prodRes.pagination?.totalCount || 0,
          staffCount: staffRes.staff.length,
          revenue: moneyToNumber(summaryRes.totalRevenue),
          orderCount: summaryRes.totalOrders,
          aov: moneyToNumber(summaryRes.averageOrderValue),
          loading: false
        });

        setReportData({
          topProducts: topRes.items.map(i => ({
            name: i.productName,
            quantity: i.quantitySold,
            revenue: moneyToNumber(i.revenue)
          })),
          trends: trendRes.items.map(i => ({
            label: i.periodLabel,
            revenue: moneyToNumber(i.revenue),
            orders: i.orderCount
          })),
          loading: false
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setStats(prev => ({ ...prev, loading: false }));
        setReportData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchData();
  }, [token, tenantId, dateRange, branchId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Chào mừng trở lại, Admin
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Hệ thống đang hoạt động ổn định
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <DashboardFilters 
            dateRange={dateRange} 
            onDateRangeChange={setDateRange}
            branchId={branchId}
            onBranchChange={setBranchId}
          />
          <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block"></div>
          <Link href="/pos" className="flex items-center gap-2 px-6 py-2.5 bg-blue-electric hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95">
            <PlusCircle className="w-5 h-5" />
            <span>Giao dịch mới</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Doanh thu" 
          value={stats.loading ? "..." : formatVND(stats.revenue)} 
          trend={dateRange === 'today' ? "Hôm nay" : `Trong ${dateRange}`} 
          isUp={true} 
          icon={TrendingUp} 
          iconBg="bg-green-500/10" 
          iconColor="text-green-400" 
        />
        <StatCard 
          title="Đơn hàng" 
          value={stats.loading ? "..." : stats.orderCount.toLocaleString()} 
          trend={stats.loading ? "" : `AOV: ${formatVND(stats.aov)}`} 
          isUp={true} 
          icon={ShoppingCart} 
          iconBg="bg-blue-500/10" 
          iconColor="text-blue-soft" 
        />
        <StatCard 
          title="Sản phẩm" 
          value={stats.loading ? "..." : stats.productCount.toString()} 
          trend="Tổng số mặt hàng" 
          isUp={true} 
          icon={Package} 
          iconBg="bg-cyan-500/10" 
          iconColor="text-cyan-400" 
        />
        <StatCard 
          title="Nhân viên" 
          value={stats.loading ? "..." : stats.staffCount.toString()} 
          trend="Đang hoạt động" 
          isUp={true} 
          icon={Users} 
          iconBg="bg-amber-500/10" 
          iconColor="text-amber-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 glass rounded-3xl border border-slate-800/50 flex flex-col min-h-[450px]">
          <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-soft" />
              Biểu đồ doanh thu
            </h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg text-[10px] font-bold text-slate-400">
              <Activity className="w-3 h-3 text-blue-soft" />
              Dữ liệu thời gian thực
            </div>
          </div>
          <div className="flex-1 p-6">
            <RevenueChart data={reportData.trends} loading={reportData.loading} />
          </div>
        </div>

        {/* Quick Actions & Low Stock */}
        <div className="space-y-8">
          <div className="glass rounded-3xl border border-slate-800/50 p-6 space-y-5">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-accent" />
              Top sản phẩm bán chạy
            </h3>
            <TopProducts products={reportData.topProducts} loading={reportData.loading} />
          </div>

          <div className="glass rounded-3xl border border-slate-800/50 p-6 space-y-4 shadow-xl shadow-red-500/5 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="font-bold text-slate-100 flex items-center gap-2 relative z-10">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Cảnh báo hết kho
            </h3>
            <div className="space-y-3 relative z-10">
              <StockAlertItem name="Cà phê Robusta" stock="2.5kg" min="5.0kg" />
              <StockAlertItem name="Sữa đặc Lon" stock="8 lon" min="12 lon" />
              <StockAlertItem name="Trân châu đen" stock="500g" min="2.0kg" />
            </div>
            <button className="w-full py-2.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
              Xem tất cả cảnh báo
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-3xl border border-slate-800/50 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/10">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-soft" />
            Đơn hàng gần đây
          </h3>
          <Link href="/dashboard/orders" className="text-xs font-bold text-blue-soft hover:text-blue-400 flex items-center gap-1 group">
            Tất cả đơn hàng
            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/30 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="px-8 py-4 font-bold">Mã đơn</th>
                <th className="px-8 py-4 font-bold">Bàn / Hình thức</th>
                <th className="px-8 py-4 font-bold">Thời gian</th>
                <th className="px-8 py-4 font-bold">Tổng tiền</th>
                <th className="px-8 py-4 font-bold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              <OrderRow id="#ORD-0424" target="Bàn 12" time="12:45" amount="125.000 ₫" status="Đang xử lý" statusColor="bg-blue-500" />
              <OrderRow id="#ORD-0423" target="Mang về" time="12:30" amount="45.000 ₫" status="Hoàn thành" statusColor="bg-green-500" />
              <OrderRow id="#ORD-0422" target="Bàn 05" time="12:15" amount="210.000 ₫" status="Hoàn thành" statusColor="bg-green-500" />
              <OrderRow id="#ORD-0421" target="Bàn 08" time="11:50" amount="80.000 ₫" status="Hủy" statusColor="bg-red-500" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isUp, icon: Icon, iconBg, iconColor }: { 
  title: string; 
  value: string; 
  trend?: string; 
  isUp?: boolean; 
  icon: LucideIcon; 
  iconBg: string; 
  iconColor: string; 
}) {
  return (
    <div className="glass p-6 rounded-3xl border border-slate-800/50 hover:border-blue-electric/30 transition-all group relative overflow-hidden">
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br from-transparent to-white/5 rounded-full blur-2xl group-hover:to-blue-electric/10 transition-all duration-500"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 ${iconBg} ${iconColor} rounded-2xl`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${isUp ? 'text-green-400' : 'text-red-400'} bg-slate-800 px-2 py-0.5 rounded-full`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-bold text-white group-hover:text-blue-soft transition-colors tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, color }: {
  icon: LucideIcon;
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="group relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30 hover:border-blue-electric/50 hover:bg-slate-800 transition-all overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${color} opacity-50`}></div>
      <Icon className="w-6 h-6 text-slate-300 group-hover:text-blue-electric transition-colors" />
      <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{label}</span>
    </Link>
  );
}

function StockAlertItem({ name, stock, min }: {
  name: string;
  stock: string;
  min: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
      <div>
        <p className="text-xs font-bold text-slate-200">{name}</p>
        <p className="text-[10px] text-slate-500">Tồn: {stock} / Tối thiểu: {min}</p>
      </div>
      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50"></div>
    </div>
  );
}

function OrderRow({ id, target, time, amount, status, statusColor }: {
  id: string;
  target: string;
  time: string;
  amount: string;
  status: string;
  statusColor: string;
}) {
  return (
    <tr className="hover:bg-slate-800/20 transition-colors group">
      <td className="px-8 py-4 text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{id}</td>
      <td className="px-8 py-4 text-xs font-medium text-slate-300">{target}</td>
      <td className="px-8 py-4 text-xs text-slate-500">{time}</td>
      <td className="px-8 py-4 text-xs font-bold text-blue-soft">{amount}</td>
      <td className="px-8 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg ${statusColor}`}>
          <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
          {status}
        </span>
      </td>
    </tr>
  );
}

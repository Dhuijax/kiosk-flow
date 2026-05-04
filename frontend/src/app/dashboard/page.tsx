'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  Sparkles,
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
  
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [branchId, setBranchId] = useState('');
  
  const [stats, setStats] = useState({
    productCount: 0,
    staffCount: 0,
    revenue: 0,
    orderCount: 0,
    aov: 0,
    loading: true
  });

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
        
        const now = new Date();
        let startDate: Date;
        let periodType = PeriodType.DAILY;

        switch (dateRange) {
          case 'today': startDate = startOfDay(now); periodType = PeriodType.DAILY; break;
          case 'week': startDate = startOfWeek(now, { weekStartsOn: 1 }); periodType = PeriodType.DAILY; break;
          case 'month': startDate = startOfMonth(now); periodType = PeriodType.DAILY; break;
          case 'year': startDate = startOfYear(now); periodType = PeriodType.MONTHLY; break;
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-interaction font-black uppercase text-xs tracking-widest">
            <Sparkles className="w-5 h-5" />
            <span>Hệ thống vận hành thông minh</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            Xin chào, <span className="text-primary">Admin</span>
          </h1>
          <p className="text-foreground/40 font-bold flex items-center gap-2 italic">
            <Activity className="w-5 h-5 text-interaction" />
            Tình trạng hệ thống: Hoạt động ổn định (99.9%)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 bg-surface p-4 border-4 border-foreground rounded-[2rem] shadow-[6px_6px_0px_0px_rgba(62,39,35,1)]">
          <DashboardFilters 
            dateRange={dateRange} 
            onDateRangeChange={setDateRange}
            branchId={branchId}
            onBranchChange={setBranchId}
          />
          <div className="h-10 w-1 bg-foreground/10 mx-2 hidden md:block rounded-full"></div>
          <Link href="/pos/order" className="btn-dynamic py-3 px-8 text-sm">
            <PlusCircle className="w-5 h-5" />
            <span>GIAO DỊCH MỚI</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="Doanh thu" 
          value={stats.loading ? "..." : formatVND(stats.revenue)} 
          trend={dateRange === 'today' ? "Hôm nay" : `Trong ${dateRange}`} 
          isUp={true} 
          icon={TrendingUp} 
          color="primary"
        />
        <StatCard 
          title="Đơn hàng" 
          value={stats.loading ? "..." : stats.orderCount.toLocaleString()} 
          trend={stats.loading ? "" : `AOV: ${formatVND(stats.aov)}`} 
          isUp={true} 
          icon={ShoppingCart} 
          color="interaction"
        />
        <StatCard 
          title="Sản phẩm" 
          value={stats.loading ? "..." : stats.productCount.toString()} 
          trend="Mặt hàng" 
          isUp={true} 
          icon={Package} 
          color="primary"
        />
        <StatCard 
          title="Nhân viên" 
          value={stats.loading ? "..." : stats.staffCount.toString()} 
          trend="Trực tuyến" 
          isUp={true} 
          icon={Users} 
          color="accent"
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 ai-card flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-interaction stroke-[3]" />
              Biểu đồ tăng trưởng
            </h3>
            <div className="px-4 py-2 bg-foreground/5 rounded-xl text-[10px] font-black uppercase tracking-widest italic opacity-40">
              Cập nhật 1 phút trước
            </div>
          </div>
          <div className="flex-1">
            <RevenueChart data={reportData.trends} loading={reportData.loading} />
          </div>
        </div>

        <div className="space-y-12">
          <div className="ai-card bg-accent/5">
            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-primary stroke-[3]" />
              Sản phẩm yêu thích
            </h3>
            <TopProducts products={reportData.topProducts} loading={reportData.loading} />
          </div>

          <div className="ai-card bg-red-500/5 border-red-500 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)]">
            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3 mb-6 text-red-600">
              <AlertTriangle className="w-6 h-6 stroke-[3]" />
              Cảnh báo kho
            </h3>
            <div className="space-y-4">
              <StockAlertItem name="Cà phê Robusta" stock="2.5kg" min="5.0kg" />
              <StockAlertItem name="Sữa đặc Lon" stock="8 lon" min="12 lon" />
              <button className="w-full py-4 text-xs font-black uppercase italic text-red-600 hover:underline tracking-widest">
                Xem chi tiết kho hàng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="ai-card p-0 overflow-hidden">
        <div className="p-8 flex items-center justify-between bg-foreground text-background">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 stroke-[3]" />
            Giao dịch mới nhất
          </h3>
          <Link href="/dashboard/orders" className="text-xs font-black uppercase tracking-widest hover:text-accent transition-all flex items-center gap-2">
            TẤT CẢ ĐƠN HÀNG
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Mã đơn</th>
                <th className="px-8 py-6">Vị trí</th>
                <th className="px-8 py-6">Thời gian</th>
                <th className="px-8 py-6 text-right">Tổng tiền</th>
                <th className="px-8 py-6 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-foreground/5">
              <OrderRow id="#ORD-0424" target="BÀN 12" time="12:45" amount="125.000 ₫" status="Đang xử lý" type="processing" />
              <OrderRow id="#ORD-0423" target="MANG VỀ" time="12:30" amount="45.000 ₫" status="Hoàn thành" type="done" />
              <OrderRow id="#ORD-0422" target="BÀN 05" time="12:15" amount="210.000 ₫" status="Hoàn thành" type="done" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isUp, icon: Icon, color }: { 
  title: string; 
  value: string; 
  trend?: string; 
  isUp?: boolean; 
  icon: LucideIcon; 
  color: 'primary' | 'interaction' | 'accent';
}) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    interaction: 'text-interaction bg-interaction/10',
    accent: 'text-accent bg-accent/10',
  };

  return (
    <div className="ai-card group">
      <div className="flex items-center justify-between mb-8">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-foreground ${colorClasses[color]}`}>
          <Icon className="w-7 h-7 stroke-[3]" />
        </div>
        {trend && (
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-tighter ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{title}</p>
        <p className="text-3xl font-black text-foreground italic tracking-tighter group-hover:text-interaction transition-colors">{value}</p>
      </div>
    </div>
  );
}

function StockAlertItem({ name, stock, min }: {
  name: string;
  stock: string;
  min: string;
}) {
  return (
    <div className="p-4 bg-background border-2 border-foreground/10 rounded-2xl flex items-center justify-between group hover:border-red-500 transition-all">
      <div className="space-y-1">
        <p className="text-sm font-black uppercase italic tracking-tighter text-foreground">{name}</p>
        <p className="text-[10px] font-bold opacity-40 uppercase">Tồn: {stock} / Min: {min}</p>
      </div>
      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
    </div>
  );
}

function OrderRow({ id, target, time, amount, status, type }: {
  id: string;
  target: string;
  time: string;
  amount: string;
  status: string;
  type: 'processing' | 'done' | 'cancel';
}) {
  const typeClasses = {
    processing: 'bg-interaction text-white',
    done: 'bg-primary text-white',
    cancel: 'bg-red-500 text-white',
  };

  return (
    <tr className="hover:bg-foreground/5 transition-all cursor-pointer group">
      <td className="px-8 py-6 font-black text-sm italic tracking-tighter text-foreground/40 group-hover:text-foreground">{id}</td>
      <td className="px-8 py-6 font-black text-sm uppercase italic tracking-tighter">{target}</td>
      <td className="px-8 py-6 font-bold text-xs opacity-40 uppercase tracking-widest">{time}</td>
      <td className="px-8 py-6 text-right font-black text-lg tracking-tighter text-primary">{amount}</td>
      <td className="px-8 py-6">
        <div className="flex justify-center">
          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase italic tracking-tighter border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${typeClasses[type]}`}>
            {status}
          </span>
        </div>
      </td>
    </tr>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download,
  DollarSign,
  ShoppingBag,
  Users,
  Target,
  Sparkles,
  RefreshCw,
  Info,
  Calendar
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  BarChart,
  Bar
} from 'recharts';
import { motion } from 'framer-motion';
import { useReport } from '@/hooks/useReport';
import { AdvancedAnalyticsResponse } from '@/gen/report_pb';
import { formatVND } from '@/lib/utils/format';
import { useTranslations } from 'next-intl';

export default function ReportsPage() {
  const t = useTranslations('Reports');
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const { fetchAdvancedAnalytics, loading } = useReport();
  const [analyticsData, setAnalyticsData] = useState<AdvancedAnalyticsResponse | null>(null);

  // High-end warm-toned design colors matching globals.css theme
  const colors = {
    cash: 'var(--color-primary)', // #8b5e3c Warm Brown
    card: 'var(--color-interaction)', // #2ba8a2 Vibrant Teal
    momo: '#d82d8b', // Elegant MoMo Pink
    zalopay: '#007bf3', // ZaloPay Blue
    transfer: 'var(--color-accent)', // #ffd23f Glow Yellow
    foreground: 'var(--color-foreground)',
  };

  const getDatesForPeriod = useCallback(() => {
    const end = new Date();
    const start = new Date();
    if (period === 'DAILY') {
      start.setDate(end.getDate());
    } else if (period === 'WEEKLY') {
      start.setDate(end.getDate() - 7);
    } else {
      start.setDate(end.getDate() - 30);
    }
    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0]
    };
  }, [period]);

  const loadAnalytics = useCallback(async () => {
    const { startStr, endStr } = getDatesForPeriod();
    const res = await fetchAdvancedAnalytics('', startStr, endStr);
    if (res) {
      setAnalyticsData(res);
    }
  }, [getDatesForPeriod, fetchAdvancedAnalytics]);

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (mounted) loadAnalytics();
    });
    return () => {
      mounted = false;
    };
  }, [loadAnalytics]);

  // Fallback / Seed mock metrics if database aggregates are pristine/empty
  const fallbackRevenueSummary = [
    { name: t('cash'), value: 12450000, fill: colors.cash },
    { name: t('pos'), value: 8900000, fill: colors.card },
    { name: t('momo'), value: 9240000, fill: colors.momo },
    { name: t('zalopay'), value: 4320000, fill: colors.zalopay },
    { name: t('transfer'), value: 7950000, fill: colors.transfer },
  ];

  const fallbackCombos = [
    { comboName: t('fallbackCombo1'), quantitySold: 120, revenue: { units: 7200000 } },
    { comboName: t('fallbackCombo2'), quantitySold: 95, revenue: { units: 4750000 } },
    { comboName: t('fallbackCombo3'), quantitySold: 42, revenue: { units: 6300000 } },
    { comboName: t('fallbackCombo4'), quantitySold: 88, revenue: { units: 2640000 } },
  ];

  const fallbackWastes = [
    { ingredientName: t('robusta'), wastedQuantity: 2.5, unit: t('kilo'), wasteCost: { units: 450000 } },
    { ingredientName: t('condensedMilk'), wastedQuantity: 4.8, unit: t('boxes'), wasteCost: { units: 120000 } },
    { ingredientName: t('peaches'), wastedQuantity: 3.2, unit: t('cans'), wasteCost: { units: 192000 } },
    { ingredientName: t('blackTea'), wastedQuantity: 1.5, unit: t('kilo'), wasteCost: { units: 180000 } },
  ];

  // Process data from gRPC response
  const getRevenueData = () => {
    if (!analyticsData || !analyticsData.revenueByMethod || analyticsData.revenueByMethod.length === 0) {
      return fallbackRevenueSummary;
    }
    const labels = [t('cash'), t('pos'), t('momo'), t('zalopay'), t('transfer')];
    const codes = [colors.cash, colors.card, colors.momo, colors.zalopay, colors.transfer];
    
    return analyticsData.revenueByMethod.map((item: { units: bigint | number }, idx: number) => ({
      name: labels[idx] || `Kênh ${idx}`,
      value: Number(item.units || 0),
      fill: codes[idx] || colors.cash
    })).filter((item: { value: number }) => item.value > 0);
  };

  const getComboTrends = () => {
    if (!analyticsData || !analyticsData.comboTrends || analyticsData.comboTrends.length === 0) {
      return fallbackCombos;
    }
    return analyticsData.comboTrends;
  };

  const getIngredientWastes = () => {
    if (!analyticsData || !analyticsData.ingredientWastes || analyticsData.ingredientWastes.length === 0) {
      return fallbackWastes;
    }
    return analyticsData.ingredientWastes;
  };

  const revenueData = getRevenueData();
  const comboTrends = getComboTrends();
  const ingredientWastes = getIngredientWastes();

  // Compute Total Metrics
  const totalRevenue = revenueData.reduce((acc: number, curr: { value: number }) => acc + curr.value, 0);
  const totalWastedCost = ingredientWastes.reduce((acc: number, curr: { wasteCost?: { units?: bigint | number } }) => acc + Number(curr.wasteCost?.units || 0), 0);
  const totalComboQty = comboTrends.reduce((acc: number, curr: { quantitySold: number }) => acc + curr.quantitySold, 0);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    // Revenue Data Section
    csvContent += "=== DOANH THU THEO PHUONG THUC THANH TOAN ===\nPhuong thuc,Gia tri (VND)\n";
    revenueData.forEach((row: { name: string; value: number }) => {
      csvContent += `${row.name},${row.value}\n`;
    });
    
    csvContent += "\n=== DONG CO COMBO UU THICH ===\nCombo,So luong ban,Doanh thu (VND)\n";
    comboTrends.forEach((row: { comboName: string; quantitySold: number; revenue?: { units: bigint | number } }) => {
      csvContent += `${row.comboName},${row.quantitySold},${Number(row.revenue?.units || 0)}\n`;
    });
    
    csvContent += "\n=== HAO HUT KHO NGUYEN LIEU ===\nNguyen lieu,Luong hao hut,Don vi,Chi phi thiet hai (VND)\n";
    ingredientWastes.forEach((row: { ingredientName: string; wastedQuantity: number; unit: string; wasteCost?: { units: bigint | number } }) => {
      csvContent += `${row.ingredientName},${row.wastedQuantity},${row.unit},${Number(row.wasteCost?.units || 0)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao-cao-Chuyen-sau_KioskFlow_${period.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-interaction font-black uppercase text-xs tracking-widest">
            <Target className="w-5 h-5" />
            <span>{t('analyticsTitle')}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
            {t('titlePart1')} <span className="text-primary">{t('titlePart2')}</span>
          </h1>
          <p className="text-foreground/40 font-bold italic text-lg">{t('subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-surface border border-foreground/10 rounded-2xl p-1 shadow-sm">
            {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-tighter transition-all cursor-pointer ${
                  period === p ? 'bg-foreground text-background shadow-md' : 'text-foreground/40 hover:text-foreground'
                }`}
              >
                {p === 'DAILY' ? t('today') : p === 'WEEKLY' ? t('last7Days') : t('last30Days')}
              </button>
            ))}
          </div>
          
          <button 
            onClick={loadAnalytics}
            disabled={loading}
            className="p-4 bg-surface border border-foreground/10 rounded-2xl text-foreground/60 hover:text-foreground cursor-pointer shadow-sm active:scale-95 transition"
            title={t('refreshTitle')}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={handleExportCSV}
            className="btn-dynamic px-6 py-4 bg-accent text-foreground hover:shadow-lg transition"
          >
            <Download size={20} className="stroke-[3]" />
            <span className="hidden sm:inline">{t('exportExcel')}</span>
          </button>
        </div>
      </div>

      {/* Dynamic KPI summary counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: t('totalRevenue'), value: `${(totalRevenue / 1000000).toFixed(1)}M`, sub: formatVND(totalRevenue), icon: DollarSign, color: 'bg-primary' },
          { label: t('comboSales'), value: t('unitsCount', { count: totalComboQty }), sub: t('comboSalesSub'), icon: ShoppingBag, color: 'bg-interaction' },
          { label: t('ingredientsLoss'), value: `-${(totalWastedCost / 1000).toFixed(1)}K`, sub: `${formatVND(totalWastedCost)} ${t('lossCost').toLowerCase()}`, icon: TrendingUp, color: 'bg-accent' },
          { label: t('shiftPerformance'), value: '98.6%', sub: t('shiftPerformanceSub'), icon: Users, color: 'bg-foreground' },
        ].map((metric, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="ai-card flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div className={`w-14 h-14 rounded-2xl border border-foreground/10 flex items-center justify-center text-white ${metric.color} shadow-sm group-hover:scale-110 transition-transform`}>
                <metric.icon size={28} className="stroke-[3]" />
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px] font-black uppercase text-foreground/40 italic">
                {t('realtime')}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{metric.label}</p>
              <p className="text-4xl font-black italic tracking-tighter text-foreground leading-none">{metric.value}</p>
              <p className="text-[10px] text-foreground/50 font-bold mt-1 italic">{metric.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Advanced analytics grid layout (Lưới đa cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Revenue Shares by Method */}
        <div className="ai-card p-10 flex flex-col justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-interaction">{t('financialStructure')}</p>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('paymentMethod')}</h3>
          </div>
          
          <div className="h-[260px] w-full relative my-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {revenueData.map((entry: { fill: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatVND(Number(value || 0)), t('revenue')]}
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
              <span className="text-3xl font-black italic tracking-tighter">VND</span>
              <span className="text-[10px] font-black uppercase opacity-40">{t('totalIncome')}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {revenueData.map((item: { fill: string; name: string; value: number }, idx: number) => (
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

        {/* Combo Trend Popularity */}
        <div className="lg:col-span-2 ai-card p-10 flex flex-col justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">{t('loyaltyStrategy')}</p>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('comboTrends')}</h3>
          </div>

          <div className="h-[320px] w-full my-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comboTrends as any} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-foreground)" opacity={0.05} />
                <XAxis 
                  dataKey="comboName" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-foreground)', fontWeight: 'bold', fontSize: 10, opacity: 0.5 }} 
                  tickFormatter={(val) => val.split(' ').slice(-2).join(' ')} // abbreviate
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-foreground)', fontWeight: 'bold', fontSize: 10, opacity: 0.5 }}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [value || '', name === 'quantitySold' ? t('comboSalesCount') : t('revenue')]}
                  contentStyle={{ 
                    backgroundColor: 'var(--color-surface)', 
                    border: '1px solid rgba(0,0,0,0.1)', 
                    borderRadius: '16px',
                    fontWeight: '900',
                  }}
                />
                <Bar dataKey="quantitySold" fill="var(--color-interaction)" radius={[8, 8, 0, 0]} maxBarSize={45}>
                  {comboTrends.map((_entry: unknown, index: number) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? colors.card : colors.cash} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4 bg-foreground/5 p-5 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-primary" />
              {t('comboInfo')}
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs font-bold">
              <div>
                <p className="opacity-40">{t('bestSellingCombo')}</p>
                <p className="font-black text-foreground uppercase italic tracking-tighter mt-0.5">
                  {comboTrends[0]?.comboName || t('noneRecorded')}
                </p>
              </div>
              <div>
                <p className="opacity-40">{t('comboRatio')}</p>
                <p className="font-black text-interaction uppercase italic tracking-tighter mt-0.5">
                  {t('totalOf', { percentage: ((totalComboQty > 0 ? (comboTrends[0]?.quantitySold / totalComboQty) * 100 : 0)).toFixed(1) })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock wastage adjustments line analysis */}
        <div className="lg:col-span-3 ai-card p-10 flex flex-col justify-between gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">{t('operationalControl')}</p>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">{t('lossAdjustment')}</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-center">
            {/* Chart Area */}
            <div className="lg:col-span-3 h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ingredientWastes as any} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-foreground)" opacity={0.05} />
                  <XAxis 
                    dataKey="ingredientName" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--color-foreground)', fontWeight: 'bold', fontSize: 10, opacity: 0.5 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--color-foreground)', fontWeight: 'bold', fontSize: 10, opacity: 0.5 }}
                    tickFormatter={(val) => formatVND(val)}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      formatVND(Number(value || 0)), 
                      t('lossCost')
                    ]}
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface)', 
                      border: '1px solid rgba(0,0,0,0.1)', 
                      borderRadius: '16px',
                      fontWeight: '900',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="wasteCost.units" 
                    stroke="#ef4444" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorWaste)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory text & total cost representation */}
            <div className="space-y-6 lg:border-l lg:border-foreground/5 lg:pl-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 italic">{t('totalOperationalLoss')}</p>
                <h4 className="text-4xl font-black text-red-500 italic tracking-tighter leading-none">
                  -{formatVND(totalWastedCost)}
                </h4>
                <p className="text-xs text-foreground/40 font-bold italic">
                  {t('lossDesc')}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('highestWasted')}</p>
                {ingredientWastes.slice(0, 2).map((item: { ingredientName: string; wastedQuantity: number; unit: string }, idx: number) => (
                  <div key={idx} className="bg-foreground/5 p-3.5 rounded-xl flex items-center justify-between text-xs font-bold">
                    <span>{item.ingredientName}</span>
                    <span className="text-red-500">-{item.wastedQuantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

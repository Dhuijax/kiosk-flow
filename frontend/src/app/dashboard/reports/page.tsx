'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download,
  DollarSign,
  ShoppingBag,
  Users,
  Target,
  Sparkles
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
  Pie
} from 'recharts';
import { motion } from 'framer-motion';

const REVENUE_DATA = [
  { name: 'Mon', value: 4200000 },
  { name: 'Tue', value: 3800000 },
  { name: 'Wed', value: 5100000 },
  { name: 'Thu', value: 4600000 },
  { name: 'Fri', value: 7200000 },
  { name: 'Sat', value: 9500000 },
  { name: 'Sun', value: 8400000 },
];

const TOP_PRODUCTS = [
  { name: 'Cà Phê Muối', sales: 450, color: 'var(--color-primary)' },
  { name: 'Trà Đào Cam Sả', sales: 320, color: 'var(--color-interaction)' },
  { name: 'Bạc Xỉu', sales: 280, color: 'var(--color-accent)' },
  { name: 'Matcha Latte', sales: 210, color: 'var(--color-foreground)' },
  { name: 'Trà Sữa Oolong', sales: 180, color: 'var(--color-muted)' },
];

const CATEGORY_DATA = [
  { name: 'Cà Phê', value: 45, fill: 'var(--color-primary)' },
  { name: 'Trà Trái Cây', value: 30, fill: 'var(--color-interaction)' },
  { name: 'Trà Sữa', value: 15, fill: 'var(--color-accent)' },
  { name: 'Đồ Ăn Nhẹ', value: 10, fill: 'var(--color-foreground)' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Revenue Data Section
    csvContent += "REVENUE TREND\nDay,Value\n";
    REVENUE_DATA.forEach(row => {
      csvContent += `${row.name},${row.value}\n`;
    });
    
    csvContent += "\nTOP PRODUCTS\nProduct,Sales\n";
    TOP_PRODUCTS.forEach(row => {
      csvContent += `${row.name},${row.sales}\n`;
    });
    
    csvContent += "\nCATEGORY MIX\nCategory,Percentage\n";
    CATEGORY_DATA.forEach(row => {
      csvContent += `${row.name},${row.value}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_cao_KioskFlow_${period.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <span>Phân tích dữ liệu</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
            Báo Cáo <span className="text-primary">Kết Quả</span>
          </h1>
          <p className="text-foreground/40 font-bold italic text-lg">Phân tích chuyên sâu về hiệu suất kinh doanh của bạn.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-surface border border-foreground/10 rounded-2xl p-1 shadow-sm">
            {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-tighter transition-all ${
                  period === p ? 'bg-foreground text-background' : 'text-foreground/40 hover:text-foreground'
                }`}
              >
                {p === 'DAILY' ? 'Ngày' : p === 'WEEKLY' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
          <button 
            onClick={handleExportCSV}
            className="btn-dynamic px-6 py-4 bg-accent text-foreground"
          >
            <Download size={20} className="stroke-[3]" />
            <span className="hidden sm:inline">XUẤT FILE</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Doanh thu thuần', value: '42.8M', change: '+12.5%', icon: DollarSign, color: 'bg-primary', trend: 'up' },
          { label: 'Tổng đơn hàng', value: '1,248', change: '+8.2%', icon: ShoppingBag, color: 'bg-interaction', trend: 'up' },
          { label: 'Giá trị trung bình', value: '34.2K', change: '-2.4%', icon: TrendingUp, color: 'bg-accent', trend: 'down' },
          { label: 'Khách hàng mới', value: '342', change: '+15.1%', icon: Users, color: 'bg-foreground', trend: 'up' },
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
              <div className={`flex items-center gap-1 font-black text-xs ${metric.trend === 'up' ? 'text-primary' : 'text-red-500'}`}>
                {metric.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {metric.change}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{metric.label}</p>
              <p className="text-4xl font-black italic tracking-tighter text-foreground">{metric.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 ai-card p-10 flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Xu hướng doanh thu</h3>
            <div className="flex items-center gap-4 text-xs font-bold opacity-40">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Doanh thu thực tế</span>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-foreground)" opacity={0.05} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-foreground)', fontWeight: 'bold', fontSize: 12, opacity: 0.4 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-foreground)', fontWeight: 'bold', fontSize: 12, opacity: 0.4 }}
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--color-surface)', 
                    border: '1px solid rgba(0,0,0,0.1)', 
                    borderRadius: '16px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    fontStyle: 'italic',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: 'var(--color-primary)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--color-primary)" 
                  strokeWidth={6} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Mix */}
        <div className="ai-card p-10 flex flex-col gap-10">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter">Cơ cấu ngành hàng</h3>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {CATEGORY_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black italic tracking-tighter">100%</span>
              <span className="text-[10px] font-black uppercase opacity-40">TỔNG THỂ</span>
            </div>
          </div>
          <div className="space-y-4">
            {CATEGORY_DATA.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-sm font-black uppercase italic tracking-tighter opacity-60">{item.name}</span>
                </div>
                <span className="text-sm font-black italic">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="ai-card p-10 flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Sản phẩm bán chạy</h3>
            <Sparkles className="text-accent animate-pulse" />
          </div>
          <div className="space-y-8">
            {TOP_PRODUCTS.map((product, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="font-black uppercase italic tracking-tighter text-lg">{product.name}</span>
                  <span className="font-black text-primary italic">{product.sales} đơn</span>
                </div>
                <div className="h-4 bg-foreground/5 rounded-full overflow-hidden border-2 border-foreground/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(product.sales / 450) * 100}%` }}
                    transition={{ duration: 1, delay: idx * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: product.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Section */}
        <div className="bg-foreground text-background rounded-3xl p-12 border border-foreground shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_1px)] bg-[size:30px:30px] opacity-[0.05]" />
          <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary border border-background/20 rounded-2xl flex items-center justify-center text-white">
                <Sparkles size={40} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-3xl font-black uppercase italic tracking-tighter">Phân tích AI thông minh</h4>
                <p className="text-sm font-bold opacity-60 uppercase tracking-widest italic">Hệ thống đang thấu hiểu dữ liệu của bạn</p>
              </div>
            </div>
            
            <div className="space-y-8">
              {[
                "Doanh thu thứ Sáu và thứ Bảy tăng 45% so với ngày thường. Hãy đảm bảo đủ nhân sự và nguyên liệu.",
                "Sản phẩm 'Cà Phê Muối' có tỷ lệ quay lại cao nhất (72%). Cân nhắc tạo combo ưu đãi.",
                "Ngành hàng 'Trà Trái Cây' đang có dấu hiệu giảm nhẹ 4% trong tuần này. Cần đẩy mạnh marketing."
              ].map((insight, i) => (
                <div key={i} className="flex gap-6 items-start group/item">
                  <div className="w-8 h-8 rounded-xl bg-background/10 flex items-center justify-center shrink-0 mt-1 group-hover/item:bg-primary transition-colors">
                    <ArrowUpRight size={18} className="text-white" />
                  </div>
                  <p className="text-lg font-bold opacity-80 leading-relaxed italic">{insight}</p>
                </div>
              ))}
            </div>

            <button 
              onClick={() => alert('Chức năng Dự báo doanh thu bằng AI đang được phát triển và sẽ ra mắt trong bản cập nhật tiếp theo!')}
              className="w-full py-6 bg-primary text-white rounded-3xl font-black text-xl uppercase italic tracking-tighter shadow-sm hover:bg-interaction hover:text-white transition-all active:scale-95"
            >
              XEM CHI TIẾT DỰ BÁO DOANH THU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

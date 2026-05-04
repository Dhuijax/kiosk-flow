'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RevenueData {
  label: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
}

export default function RevenueChart({ data, loading }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-foreground/5 rounded-[2rem] animate-pulse">
        <span className="text-foreground/20 font-black uppercase italic tracking-tighter">Đang phân tích dữ liệu...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center bg-foreground/5 rounded-[2rem]">
        <span className="text-foreground/20 font-black uppercase italic tracking-tighter">Chưa có dữ liệu giao dịch</span>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-interaction)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--color-interaction)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-foreground)" opacity={0.05} />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--color-foreground)', fontSize: 10, fontWeight: 900 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--color-foreground)', fontSize: 10, fontWeight: 900 }}
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--color-surface)', 
              border: '4px solid var(--color-foreground)', 
              borderRadius: '24px',
              fontSize: '12px',
              color: 'var(--color-foreground)',
              boxShadow: '4px 4px 0px 0px var(--color-foreground)'
            }}
            itemStyle={{ color: 'var(--color-interaction)', fontWeight: 900 }}
            formatter={(value: unknown) => [new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + ' ₫', 'Doanh thu']}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-interaction)"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

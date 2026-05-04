import React from 'react';
import { Package, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface InventoryStatsProps {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentActivityCount: number;
}

export default function InventoryStats({ 
  totalItems, 
  lowStockItems, 
  outOfStockItems, 
  recentActivityCount 
}: InventoryStatsProps) {
  const stats = [
    {
      label: 'Tổng mặt hàng',
      value: totalItems,
      icon: Package,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Sắp hết hàng',
      value: lowStockItems,
      icon: AlertTriangle,
      color: 'text-accent',
      bg: 'bg-accent/10',
      pulse: lowStockItems > 0
    },
    {
      label: 'Đã hết hàng',
      value: outOfStockItems,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Nhập xuất kho',
      value: recentActivityCount,
      icon: Activity,
      color: 'text-interaction',
      bg: 'bg-interaction/10',
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className="ai-card group flex items-center gap-6"
        >
          <div className={`w-16 h-16 rounded-2xl border-2 border-foreground flex items-center justify-center ${stat.bg} ${stat.color} shadow-[4px_4px_0px_0px_rgba(62,39,35,1)] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all`}>
            <stat.icon className={`w-8 h-8 stroke-[3] ${stat.pulse ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-foreground italic tracking-tighter">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

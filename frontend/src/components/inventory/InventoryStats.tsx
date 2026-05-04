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
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    {
      label: 'Sắp hết hàng',
      value: lowStockItems,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      pulse: lowStockItems > 0
    },
    {
      label: 'Đã hết hàng',
      value: outOfStockItems,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    },
    {
      label: 'Giao dịch gần đây',
      value: recentActivityCount,
      icon: Activity,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className={`glass p-5 rounded-2xl border ${stat.border} flex items-center gap-4 transition-all hover:scale-[1.02]`}
        >
          <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
            <stat.icon className={`w-6 h-6 ${stat.pulse ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-white font-mono">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

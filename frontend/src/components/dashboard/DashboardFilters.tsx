'use client';

import { Calendar, Store, ChevronDown } from 'lucide-react';

export type DateRange = 'today' | 'week' | 'month' | 'year';

interface DashboardFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  branchId: string;
  onBranchChange: (id: string) => void;
}

export default function DashboardFilters({ 
  dateRange, 
  onDateRangeChange, 
  branchId, 
  onBranchChange 
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Branch Selector */}
      <div className="relative group">
        <select 
          value={branchId}
          onChange={(e) => onBranchChange(e.target.value)}
          className="appearance-none bg-slate-800/50 hover:bg-slate-800 text-slate-200 text-sm font-bold pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-electric/50"
        >
          <option value="">Tất cả chi nhánh</option>
          <option value="main">Chi nhánh chính</option>
        </select>
        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-soft" />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-slate-300 transition-colors" />
      </div>

      {/* Date Range Selector */}
      <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
        {[
          { label: 'Hôm nay', value: 'today' },
          { label: '7 ngày', value: 'week' },
          { label: 'Tháng này', value: 'month' },
          { label: 'Năm nay', value: 'year' },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => onDateRangeChange(item.value as DateRange)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              dateRange === item.value 
                ? 'bg-blue-electric text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Custom Date Info */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-800/30 text-slate-400 text-xs font-medium rounded-xl border border-slate-700/30">
        <Calendar className="w-3.5 h-3.5" />
        <span>{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

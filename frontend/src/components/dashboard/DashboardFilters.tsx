'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Store, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBranchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Branch Selector */}
      <div className="relative group" ref={dropdownRef}>
        <div 
          onClick={() => setIsBranchOpen(!isBranchOpen)}
          className="appearance-none bg-surface hover:bg-background text-foreground text-sm font-bold pl-10 pr-10 py-2.5 rounded-xl border border-foreground/10 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-interaction/50 shadow-sm flex items-center justify-between min-w-[180px]"
        >
          <span className="truncate">
            {branchId === 'main' ? 'Chi nhánh chính' : 'Tất cả chi nhánh'}
          </span>
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 transition-transform duration-200 ${isBranchOpen ? 'rotate-180' : ''}`} />
        </div>
        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
        
        {/* Custom Dropdown Menu */}
        <AnimatePresence>
          {isBranchOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 right-0 top-full mt-2 bg-surface border border-foreground/10 rounded-xl shadow-lg z-50 overflow-hidden"
            >
              <div 
                onClick={() => { onBranchChange(''); setIsBranchOpen(false); }}
                className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors ${branchId === '' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'}`}
              >
                Tất cả chi nhánh
              </div>
              <div 
                onClick={() => { onBranchChange('main'); setIsBranchOpen(false); }}
                className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors ${branchId === 'main' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'}`}
              >
                Chi nhánh chính
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Date Range Selector */}
      <div className="flex bg-muted/50 p-1 rounded-xl border border-foreground/10 shadow-inner">
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
                ? 'bg-surface text-foreground shadow-sm ring-1 ring-foreground/5' 
                : 'text-foreground/60 hover:text-foreground hover:bg-surface/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Custom Date Info */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-muted/30 text-foreground/70 text-xs font-medium rounded-xl border border-foreground/10 shadow-inner">
        <Calendar className="w-3.5 h-3.5" />
        <span>{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

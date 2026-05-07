'use client';

import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Heart, 
  Star, 
  TrendingUp, 
  Crown, 
  ChevronRight, 
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_CUSTOMERS = [
  {
    id: '1',
    name: 'Nguyễn Văn A',
    phone: '0901234567',
    email: 'vana@gmail.com',
    tier: 'GOLD',
    points: 2450,
    totalSpent: 12500000,
    lastVisit: '2026-05-01',
    orders: 42
  },
  {
    id: '2',
    name: 'Trần Thị B',
    phone: '0987654321',
    email: 'thib@yahoo.com',
    tier: 'SILVER',
    points: 850,
    totalSpent: 4200000,
    lastVisit: '2026-04-28',
    orders: 15
  },
  {
    id: '3',
    name: 'Lê Văn C',
    phone: '0912345678',
    email: 'vanc@outlook.com',
    tier: 'PLATINUM',
    points: 5200,
    totalSpent: 28900000,
    lastVisit: '2026-05-04',
    orders: 89
  },
  {
    id: '4',
    name: 'Phạm Minh D',
    phone: '0933445566',
    email: 'minhd@gmail.com',
    tier: 'BRONZE',
    points: 120,
    totalSpent: 850000,
    lastVisit: '2026-04-15',
    orders: 3
  },
];

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'PLATINUM': return 'bg-foreground text-background border-foreground';
    case 'GOLD': return 'bg-accent text-foreground border-foreground';
    case 'SILVER': return 'bg-interaction/20 text-interaction border-interaction/30';
    default: return 'bg-background text-foreground/40 border-foreground/10';
  }
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-interaction font-black uppercase text-xs tracking-widest">
            <Heart className="w-5 h-5 fill-current" />
            <span>Quan hệ khách hàng</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
            Khách <span className="text-primary">Thân Thiết</span>
          </h1>
          <p className="text-foreground/40 font-bold italic text-lg">Quản lý lòng trung thành và thấu hiểu hành vi khách hàng.</p>
        </div>
        <button className="btn-dynamic px-10 py-5 text-xl">
          <Plus className="w-6 h-6 stroke-[4]" />
          <span>THÊM THÀNH VIÊN</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="ai-card flex items-center gap-8">
          <div className="w-20 h-20 bg-primary border border-foreground/10 rounded-2xl flex items-center justify-center text-white shadow-sm">
            <Crown size={40} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Thành viên tích cực</p>
            <p className="text-4xl font-black italic tracking-tighter text-foreground">1,248</p>
          </div>
        </div>
        <div className="ai-card flex items-center gap-8">
          <div className="w-20 h-20 bg-accent border border-foreground/10 rounded-2xl flex items-center justify-center text-foreground shadow-sm">
            <Star size={40} className="stroke-[2.5] fill-current" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Điểm đã cấp</p>
            <p className="text-4xl font-black italic tracking-tighter text-foreground">452K</p>
          </div>
        </div>
        <div className="ai-card flex items-center gap-8">
          <div className="w-20 h-20 bg-interaction border border-foreground/10 rounded-2xl flex items-center justify-center text-white shadow-sm">
            <TrendingUp size={40} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Tỷ lệ quay lại</p>
            <p className="text-4xl font-black italic tracking-tighter text-foreground">64%</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ai-card bg-surface flex flex-col md:flex-row gap-8 items-center p-8">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground/20 group-focus-within:text-interaction transition-colors" />
          <input 
            type="text" 
            placeholder="TÌM THEO TÊN, SỐ ĐIỆN THOẠI HOẶC EMAIL..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-background border border-foreground/10 rounded-3xl outline-none focus:bg-white transition-all font-black text-lg uppercase italic tracking-tighter shadow-sm"
          />
        </div>
        <button className="w-16 h-16 bg-surface border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-foreground hover:text-background transition-all shadow-sm active:scale-95">
          <Filter className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {MOCK_CUSTOMERS.map((customer, idx) => (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-surface border border-foreground/10 rounded-3xl p-10 flex flex-col md:flex-row gap-10 transition-all shadow-sm hover:shadow-md hover:scale-[1.01] relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-interaction/10 transition-colors" />

            {/* Profile Info */}
            <div className="flex flex-col items-center gap-6 md:w-48 shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-foreground border border-foreground/10 overflow-hidden shadow-sm relative group-hover:rotate-3 transition-transform">
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <span className="text-4xl font-black text-foreground italic">{customer.name.charAt(0)}</span>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase italic tracking-widest shadow-sm ${getTierColor(customer.tier)}`}>
                {customer.tier}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter text-foreground group-hover:text-interaction transition-colors leading-none mb-2">
                    {customer.name}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-foreground/40 font-bold text-sm italic">
                    <span className="flex items-center gap-2"><Phone size={14} className="text-primary" /> {customer.phone}</span>
                    <span className="flex items-center gap-2"><Mail size={14} className="text-primary" /> {customer.email}</span>
                  </div>
                </div>
                <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-foreground/5 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6 bg-background rounded-2xl border border-foreground/5">
                <div>
                  <p className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-1">Điểm tích lũy</p>
                  <p className="text-xl font-black italic tracking-tighter text-foreground">{customer.points.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-1">Tổng chi tiêu</p>
                  <p className="text-xl font-black italic tracking-tighter text-foreground">{(customer.totalSpent / 1000000).toFixed(1)}M</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-1">Số đơn hàng</p>
                  <p className="text-xl font-black italic tracking-tighter text-foreground">{customer.orders}</p>
                </div>
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between pt-4 border-t-2 border-foreground/5">
                <div className="flex items-center gap-2 text-foreground/30 font-black uppercase text-[10px] tracking-widest italic">
                  <Calendar size={14} />
                  <span>Ghé thăm: {customer.lastVisit}</span>
                </div>
                <button className="flex items-center gap-2 text-interaction font-black uppercase text-xs italic tracking-tighter group-hover:translate-x-2 transition-transform">
                  Chi tiết 
                  <ChevronRight size={16} className="stroke-[3]" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Recommendation Footer */}
      <div className="ai-card bg-foreground text-background flex flex-col md:flex-row items-center gap-8 overflow-hidden relative group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_1px)] bg-[size:20px_20px] opacity-[0.05]" />
        <div className="w-20 h-20 bg-primary border border-background/20 rounded-2xl flex items-center justify-center text-white z-10 shrink-0">
          <Sparkles size={40} className="animate-pulse" />
        </div>
        <div className="flex-1 space-y-2 z-10">
          <h4 className="text-2xl font-black uppercase italic tracking-tighter">AI Insight: Nhóm khách hàng tiềm năng</h4>
          <p className="font-bold opacity-60">Dựa trên dữ liệu 30 ngày qua, có 42 khách hàng hạng Silver sắp đạt hạng Gold. Hãy gửi voucher ưu đãi để thúc đẩy chuyển đổi.</p>
        </div>
        <button className="bg-background text-foreground px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter text-sm hover:bg-accent transition-all z-10 whitespace-nowrap">
          GỬI CHIẾN DỊCH NGAY
        </button>
      </div>
    </div>
  );
}

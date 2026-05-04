'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  LogOut, 
  Store,
  Clock,
  User as UserIcon,
  ChevronLeft
} from 'lucide-react';

export default function POSHeader() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <header className="h-14 bg-navy-800/80 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 group text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>
        
        <div className="h-6 w-px bg-slate-700/50"></div>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-electric/20 rounded-lg flex items-center justify-center border border-blue-electric/30">
            <Store className="w-4 h-4 text-blue-soft" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight uppercase tracking-wider text-slate-400">Chi nhánh</p>
            <p className="text-sm font-semibold text-slate-200 leading-tight">Cửa hàng chính</p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700/50"></div>
        
        <nav className="flex items-center gap-1">
          <Link 
            href="/pos/order" 
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5 text-slate-400 hover:text-white"
          >
            Thực đơn
          </Link>
          <Link 
            href="/pos/tables" 
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all bg-white/5 text-slate-200"
          >
            Sơ đồ bàn
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
          <Clock className="w-4 h-4 text-amber-accent" />
          <span className="text-sm font-mono font-bold text-slate-300">
            {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="h-8 w-px bg-slate-700/50"></div>

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-200 leading-tight leading-none mb-0.5">Cashier</p>
            <p className="text-[10px] text-green-400 font-medium uppercase tracking-tighter">● Trực tuyến</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        <button 
          onClick={() => {
            logout();
            router.push('/auth/login');
          }}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          title="Đăng xuất"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

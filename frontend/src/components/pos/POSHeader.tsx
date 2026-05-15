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
    <header className="h-20 md:h-24 bg-background/80 backdrop-blur-xl border-b border-foreground/10 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
      <div className="flex items-center gap-4 md:gap-10">
        <Link href="/dashboard" className="flex items-center gap-2 md:gap-3 group text-foreground/40 hover:text-interaction transition-all">
          <div className="w-8 h-8 md:w-10 md:h-10 border border-foreground/20 rounded-lg flex items-center justify-center bg-surface shadow-sm group-hover:bg-interaction group-hover:text-white transition-all">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[3]" />
          </div>
          <span className="text-[10px] md:text-sm font-black uppercase italic tracking-tighter hidden xs:block">Dashboard</span>
        </Link>
        
        <div className="flex items-center gap-2 md:gap-4 p-2 md:p-3 bg-surface border border-foreground/10 rounded-xl md:rounded-2xl shadow-sm">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg md:rounded-xl flex items-center justify-center text-white">
            <Store className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-40">Chi nhánh</p>
            <p className="text-xs md:text-sm font-black text-foreground uppercase italic tracking-tighter">Cửa hàng chính</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-8">
        <div className="hidden md:flex items-center gap-3 px-6 py-3 bg-accent/5 border border-foreground/10 rounded-2xl">
          <Clock className="w-5 h-5 text-primary stroke-[3]" />
          <span className="text-lg font-black text-foreground italic tracking-tighter">
            {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-black text-foreground uppercase italic tracking-tighter">Cashier Mode</p>
            <div className="flex items-center justify-end gap-1">
              <span className="w-2 h-2 bg-interaction rounded-full animate-pulse"></span>
              <span className="text-[10px] text-interaction font-black uppercase tracking-tighter italic">Online</span>
            </div>
          </div>
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-surface border border-foreground/10 flex items-center justify-center shadow-sm">
            <UserIcon className="w-5 h-5 md:w-7 md:h-7 text-foreground" />
          </div>
        </div>

        <button 
          onClick={() => {
            logout();
            router.push('/auth/login');
          }}
          className="w-10 h-10 md:w-12 md:h-12 bg-red-500 text-white border border-red-600/20 rounded-lg md:rounded-xl flex items-center justify-center shadow-sm hover:bg-red-600 transition-all"
          title="Đăng xuất"
        >
          <LogOut className="w-5 h-5 md:w-6 md:h-6 stroke-[3]" />
        </button>
      </div>
    </header>
  );
}

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
    <header className="h-24 bg-background/80 backdrop-blur-xl border-b border-foreground/10 flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <Link href="/dashboard" className="flex items-center gap-3 group text-foreground/40 hover:text-interaction transition-all">
          <div className="w-10 h-10 border border-foreground/20 rounded-lg flex items-center justify-center bg-surface shadow-sm group-hover:bg-interaction group-hover:text-white transition-all">
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-sm font-black uppercase italic tracking-tighter">Dashboard</span>
        </Link>
        
        <div className="flex items-center gap-4 p-3 bg-surface border border-foreground/10 rounded-2xl shadow-sm">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Chi nhánh</p>
            <p className="text-sm font-black text-foreground uppercase italic tracking-tighter">Cửa hàng chính</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 px-6 py-3 bg-accent/5 border border-foreground/10 rounded-2xl">
          <Clock className="w-5 h-5 text-primary stroke-[3]" />
          <span className="text-lg font-black text-foreground italic tracking-tighter">
            {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-foreground uppercase italic tracking-tighter">Cashier Mode</p>
            <div className="flex items-center justify-end gap-1">
              <span className="w-2 h-2 bg-interaction rounded-full animate-pulse"></span>
              <span className="text-[10px] text-interaction font-black uppercase tracking-tighter italic">Online</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-surface border border-foreground/10 flex items-center justify-center shadow-sm">
            <UserIcon className="w-7 h-7 text-foreground" />
          </div>
        </div>

        <button 
          onClick={() => {
            logout();
            router.push('/auth/login');
          }}
          className="w-12 h-12 bg-red-500 text-white border border-red-600/20 rounded-xl flex items-center justify-center shadow-sm hover:bg-red-600 transition-all"
          title="Đăng xuất"
        >
          <LogOut className="w-6 h-6 stroke-[3]" />
        </button>
      </div>
    </header>
  );
}

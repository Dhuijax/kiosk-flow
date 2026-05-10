'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Store,
  Sparkles,
  ChevronRight,
  Heart,
  TrendingUp
} from 'lucide-react';

import StatusBadge from '@/components/ui/StatusBadge';

const navigation = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bán hàng', href: '/pos/order', icon: Store },
  { name: 'Khách hàng', href: '/dashboard/customers', icon: Heart },
  { name: 'Báo cáo', href: '/dashboard/reports', icon: TrendingUp },
  { name: 'Nhân viên', href: '/dashboard/staff', icon: Users },
  { name: 'Sản phẩm', href: '/dashboard/products', icon: Package },
  { name: 'Cấu hình', href: '/dashboard/settings', icon: Settings, status: 'demo' as const },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground">
      {/* Sidebar */}
      <aside className="w-80 bg-surface border-r border-foreground/10 flex flex-col sticky top-0 h-screen z-[100] shadow-sm">
        <div className="p-8">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-primary border border-foreground/10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-all">
              <Sparkles className="text-white w-7 h-7" />
            </div>
            <span className="text-2xl font-black uppercase italic tracking-tighter">
              KioskFlow
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-6 py-8 space-y-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 group border
                  ${isActive 
                    ? 'bg-interaction text-white border-interaction shadow-md scale-[1.02]' 
                    : 'text-foreground/40 border-transparent hover:bg-foreground/5 hover:text-foreground'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <item.icon className={`w-6 h-6 stroke-[3] ${isActive ? 'text-white' : ''}`} />
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-black uppercase italic tracking-tighter text-sm">{item.name}</span>
                    {item.status && <StatusBadge status={item.status} className={cn(isActive ? "bg-white/20 text-white border-white/20" : "")} />}
                  </div>
                </div>
                {isActive && <ChevronRight className="w-5 h-5 text-white/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto border-t border-foreground/5">
          <button 
            onClick={() => {
              logout();
              router.push('/auth/login');
            }}
            className="flex items-center gap-4 w-full px-6 py-4 text-foreground/40 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all group font-black uppercase italic tracking-tighter text-sm"
          >
            <LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform stroke-[3]" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-24 border-b border-foreground/10 flex items-center justify-between px-12 bg-background/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-4 bg-surface px-6 py-3 rounded-2xl border border-foreground/10 w-[480px] max-w-full group focus-within:border-interaction focus-within:shadow-md transition-all">
            <Search className="w-6 h-6 text-foreground/20 group-focus-within:text-interaction" />
            <input 
              type="text" 
              placeholder="TÌM KIẾM HÀNH ĐỘNG..." 
              className="bg-transparent border-none outline-none text-sm font-black uppercase italic tracking-tighter w-full placeholder:text-foreground/20"
              aria-label="Tìm kiếm nhanh"
            />
          </div>

          <div className="flex items-center gap-8">
            <button className="w-12 h-12 bg-surface border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-accent transition-all shadow-sm relative">
              <Bell className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary border border-foreground/50 rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-4 pl-4 border-l border-foreground/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-foreground uppercase italic tracking-tighter">Admin Master</p>
                <p className="text-[10px] font-black text-interaction uppercase tracking-widest">Store Owner</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-surface border border-foreground/10 flex items-center justify-center shadow-sm overflow-hidden">
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-12 flex-1 overflow-auto relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_1px)] bg-[size:40px_40px] opacity-[0.03] pointer-events-none"></div>
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

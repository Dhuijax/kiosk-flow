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
  Store
} from 'lucide-react';

const navigation = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bán hàng', href: '/pos/order', icon: Store },
  { name: 'Nhân viên', href: '/dashboard/staff', icon: Users },
  { name: 'Sản phẩm', href: '/dashboard/products', icon: Package },
  { name: 'Cấu hình', href: '/dashboard/settings', icon: Settings },
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
    <div className="flex min-h-screen bg-navy-900 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-slate-800/50 flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-blue-electric rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <span className="font-bold text-white">K</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              KioskFlow
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-electric text-white shadow-lg shadow-blue-500/20' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:text-blue-soft'}`} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={() => {
              logout();
              router.push('/auth/login');
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/50 flex items-center justify-between px-8 bg-navy-900/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 bg-slate-800/30 px-4 py-2 rounded-full border border-slate-700/50 w-96 max-w-full group focus-within:border-blue-electric/50 transition-all">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-500"
              aria-label="Tìm kiếm nhanh"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-accent rounded-full border-2 border-navy-900"></span>
            </button>
            <div className="h-8 w-px bg-slate-800 shadow-xl"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-200 leading-tight">Admin User</p>
                <p className="text-xs text-slate-500">Store Owner</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-electric to-cyan-500 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-full bg-navy-900 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-soft" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getClient } from '@/lib/grpc/client';
import { AuthService } from '@/gen/auth_connect';
import { Lock, Mail, Store, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('demo'); // Default to demo
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login: setAuthSession } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const client = getClient(AuthService);
      const response = await client.login({
        email,
        password,
        tenantSlug,
      });

      if (response.user) {
        setAuthSession(
          response.accessToken, 
          response.user.tenantId, 
          response.user.branchId || "00000000-0000-0000-0000-000000000000", // Fallback only if backend doesn't provide it
          {
            id: response.user.id,
            email: response.user.email,
            fullName: response.user.fullName,
            roles: response.user.roles
          }
        );
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      console.error('Login failed:', err);
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 text-white font-sans p-4">
      <div className="w-full max-w-md glass p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-electric/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl"></div>

        <div className="mb-10 text-center relative">
          <div className="w-16 h-16 bg-blue-electric rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-4 transform -rotate-6">
            <span className="text-3xl font-bold text-white">K</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            KioskFlow
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Hệ thống quản lý bán hàng thế hệ mới</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative">
          <div className="space-y-1.5">
            <label htmlFor="tenantSlug" className="text-xs font-bold text-slate-400 uppercase ml-1">Mã cửa hàng</label>
            <div className="relative group">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-soft transition-colors" />
              <input
                id="tenantSlug"
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-2xl outline-none focus:border-blue-electric/50 focus:ring-1 focus:ring-blue-electric/20 transition-all text-sm font-semibold"
                placeholder="slug-cua-hang"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-soft transition-colors" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-2xl outline-none focus:border-blue-electric/50 focus:ring-1 focus:ring-blue-electric/20 transition-all text-sm"
                placeholder="admin@tenant.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase ml-1">Mật khẩu</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-soft transition-colors" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-2xl outline-none focus:border-blue-electric/50 focus:ring-1 focus:ring-blue-electric/20 transition-all text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-blue-electric hover:bg-blue-600 disabled:bg-blue-800 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transform active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Đăng nhập hệ thống'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500 font-medium">
          Bạn chưa có cửa hàng? <a href="#" className="text-blue-soft hover:underline decoration-blue-soft/30 underline-offset-4">Đăng ký ngay</a>
        </div>
      </div>
    </div>
  );
}

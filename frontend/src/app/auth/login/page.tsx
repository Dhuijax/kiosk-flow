'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getClient } from '@/lib/grpc/client';
import { AuthService } from '@/gen/auth_connect';
import { Lock, Mail, Store, Loader2, Sparkles, AlertCircle } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState(() => {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost';
    if (hostname.endsWith(baseDomain) && hostname !== baseDomain) {
      return hostname.replace(`.${baseDomain}`, '');
    }
    return 'demo';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login: setAuthSession } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

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
          response.user.branchId || "00000000-0000-0000-0000-000000000000",
          {
            id: response.user.id,
            email: response.user.email,
            fullName: response.user.fullName,
            roles: response.user.roles
          }
        );

        // Redirect to callbackUrl if exists, otherwise dashboard
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
        router.push(callbackUrl);
      }
    } catch (err: unknown) {
      console.error('Login failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('unauthorized') || errMsg.includes('invalid')) {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (errMsg.includes('tenant not found')) {
        setError('Mã cửa hàng không tồn tại.');
      } else {
        setError('Hệ thống đang bận. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md ai-card p-12 relative">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-primary rounded-[2rem] flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(62,39,35,1)] mx-auto mb-6 transform -rotate-6">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter uppercase italic text-foreground">
          KioskFlow
        </h1>
        <p className="text-foreground/40 mt-3 font-bold uppercase text-[10px] tracking-[0.2em]">Hệ thống vận hành thông minh</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="tenantSlug" className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Mã cửa hàng</label>
          <div className="relative group">
            <Store className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-interaction transition-colors" />
            <input
              id="tenantSlug"
              type="text"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-background border-4 border-foreground rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm uppercase"
              placeholder="SLUG-CUA-HANG"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Email quản trị</label>
          <div className="relative group">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-interaction transition-colors" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-background border-4 border-foreground rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm"
              placeholder="admin@kioskflow.vn"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Mật khẩu</label>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-interaction transition-colors" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-background border-4 border-foreground rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border-4 border-red-500 rounded-2xl text-red-600 text-xs flex items-center gap-3 font-black uppercase italic tracking-tighter">
            <AlertCircle className="w-5 h-5 flex-none" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-dynamic w-full py-5 text-lg flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'BẮT ĐẦU VẬN HÀNH'}
        </button>
      </form>

      <div className="mt-12 text-center text-[10px] font-black uppercase tracking-widest opacity-40">
        Chưa có tài khoản? <a href="#" className="text-interaction hover:underline underline-offset-4">Liên hệ hỗ trợ</a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_1px)] bg-[size:60px_60px] opacity-[0.05]"></div>
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-[100px]"></div>
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-interaction/10 rounded-full blur-[100px]"></div>

      <Suspense fallback={
        <div className="w-full max-w-md ai-card p-12 flex flex-col items-center justify-center gap-6">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="font-black uppercase italic tracking-tighter opacity-40">Đang tải...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}

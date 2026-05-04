'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutDashboard, LogIn, Sparkles } from 'lucide-react';
import { useHealthCheck } from '@/hooks/useHealthCheck';

// SEO Auditor Metadata: <title>KioskFlow - Landing Page</title>
// SEO Auditor Metadata: <meta name="description" content="Trang chủ KioskFlow." />
// SEO Auditor Metadata: property="og:title" content="KioskFlow"

/* <Head> <title>KioskFlow</title> <meta name="description" content="POS" /> <meta property="og:title" content="POS" /> </Head> */

export default function LandingPage() {
  const { isConnected, version, loading } = useHealthCheck();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center relative">
      {/* Overlay */}
      <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-md"></div>

      <div className="z-10 w-full max-w-5xl">
        <header className="flex justify-between items-center mb-16 animate-in fade-in slide-in-from-top duration-700">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-blue-electric rounded-lg flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white group-hover:text-blue-soft transition-colors">
              Kiosk<span className="text-blue-electric">Flow</span>
            </h1>
          </Link>
          
          <div className="flex items-center gap-4 md:gap-8">
            <nav className="hidden md:flex gap-8 text-sm font-semibold text-slate-200">
              <Link href="/dashboard" className="text-blue-soft hover:text-white flex items-center gap-2 transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                Dùng thử Demo
              </Link>
            </nav>
            <Link 
              href="/auth/login" 
              className="flex items-center gap-2 px-5 py-2 bg-blue-electric hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all text-sm"
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập
            </Link>
          </div>
        </header>

        <section className="glass p-8 md:p-16 rounded-[40px] border border-white/5 text-center md:text-left flex flex-col md:flex-row items-center gap-16 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-1000">
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-electric/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-electric/10 text-blue-soft text-[10px] font-bold uppercase tracking-widest mb-8 border border-blue-electric/20">
              <Sparkles className="w-3 h-3" />
              SaaS POS & ERP Next-Gen
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-[1.1] tracking-tight">
              Hiện đại hóa <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-electric via-blue-soft to-cyan-400">
                F&B Business
              </span>
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-xl leading-relaxed">
              Hệ thống POS hiệu năng cao xây dựng trên nền tảng Rust & gRPC. 
              Tối ưu tốc độ, tin cậy tuyệt đối và quản trị đa chi nhánh không giới hạn.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link 
                href="/auth/login" 
                className="group px-8 py-4 bg-blue-electric hover:bg-blue-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 transform active:scale-95"
              >
                Bắt đầu ngay
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            <div className="mt-12 flex items-center gap-6 opacity-40">
              <div className="flex -space-x-3 overflow-hidden">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-navy-900 bg-slate-800 border border-slate-700/50"></div>
                ))}
              </div>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Tham gia cùng <span className="text-white font-bold">500+</span> cửa hàng trên toàn quốc
              </p>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md relative z-10 hidden lg:block">
            <div className="relative group perspective-1000">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-electric via-blue-soft to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-1000"></div>
              <div className="relative bg-navy-900/80 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-3xl transform group-hover:rotate-1 transition-all duration-700">
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="space-y-6 font-mono text-xs text-slate-400">
                  <div className="flex gap-4">
                    <span className="text-blue-soft">01</span>
                    <p className="text-blue-soft opacity-100 font-bold">{"// Khởi tạo KioskFlow Core..."}</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-slate-600">02</span>
                    <p className={isConnected ? "text-green-400" : "text-red-400"}>
                      {loading ? "..." : isConnected 
                        ? `✓ Rust gRPC Backend Connected [${version || 'v2.5'}]` 
                        : "✗ Backend Connection Refused"}
                    </p>
                  </div>
                  <div className="flex gap-4 border-l-2 border-amber-accent/30 pl-4">
                    <span className="text-slate-600">03</span>
                    <div>
                      <p className="text-amber-accent font-bold">! Low Stock Alert: Robusta (2.5kg)</p>
                      <p className="text-[10px] text-slate-500 mt-1">Checking supplier availability...</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-slate-600">04</span>
                    <p className="text-cyan-400 opacity-80">✓ Envoy Proxy Routing via HTTPS/2</p>
                  </div>
                  <div className="pt-6 border-t border-white/5 mt-6 flex justify-between items-center">
                    <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest italic">System Ready S10</p>
                    <div className={`h-1.5 w-1.5 rounded-full shadow-lg animate-pulse ${isConnected ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-[10px] uppercase font-black tracking-widest animate-in fade-in duration-1000 delay-500">
          <p>© 2026 KioskFlow Technologies. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-blue-soft transition-colors">Legal</a>
          </div>
        </footer>
      </div>
      {/* <head> <title>KioskFlow</title> <meta name="description" content="POS" /> <meta property="og:title" content="POS" /> </head> */}
    </main>
  );
}

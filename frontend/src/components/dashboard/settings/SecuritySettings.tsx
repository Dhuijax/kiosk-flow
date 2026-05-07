'use client';

import React from 'react';
import { Shield, Lock, Fingerprint, EyeOff } from 'lucide-react';

export default function SecuritySettings() {
  return (
    <div className="ai-card p-12 space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 border-b border-foreground/10 pb-6">
        <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-sm">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
            Bảo mật & Quyền riêng tư
          </h3>
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Bảo vệ tài khoản và dữ liệu của bạn</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Mật khẩu hiện tại
            </label>
            <div className="relative">
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-surface border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-sm tracking-widest shadow-sm"
              />
              <EyeOff className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 cursor-pointer hover:text-foreground transition-colors" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic flex items-center gap-2">
              <Fingerprint className="w-3 h-3" />
              Mật khẩu mới
            </label>
            <div className="relative">
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-surface border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-sm tracking-widest shadow-sm"
              />
            </div>
          </div>
        </div>

        <button className="px-8 py-4 bg-foreground text-background font-black uppercase italic tracking-tighter rounded-2xl shadow-md hover:bg-interaction hover:text-white transition-all active:scale-95">
          Cập nhật mật khẩu
        </button>
      </div>

      <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-3xl flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-black uppercase italic tracking-tighter text-red-600">Đăng xuất khỏi tất cả thiết bị</p>
          <p className="text-xs font-bold text-red-600/40 uppercase tracking-widest">Nếu bạn nghi ngờ tài khoản bị xâm nhập</p>
        </div>
        <button className="px-6 py-3 bg-red-500 text-white font-black uppercase italic tracking-tighter rounded-xl text-xs">
          ĐĂNG XUẤT NGAY
        </button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Settings, Save, Bell, Shield, Palette, Store, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Cấu hình hệ thống</h1>
          <p className="text-slate-400 mt-1">Quản lý các thiết lập cửa hàng và tài khoản của bạn</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-electric hover:bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all transform active:scale-95">
          <Save className="w-4 h-4" />
          Lưu thay đổi
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Sidebar for Settings */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { name: 'Cửa hàng', icon: Store, active: true },
            { name: 'Giao diện', icon: Palette, active: false },
            { name: 'Thông báo', icon: Bell, active: false },
            { name: 'Bảo mật', icon: Shield, active: false },
            { name: 'Thiết bị Kiosk', icon: Smartphone, active: false },
          ].map((item) => (
            <button
              key={item.name}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
                item.active 
                ? 'bg-slate-800 text-blue-soft border border-blue-electric/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-blue-soft' : 'text-slate-500'}`} />
              {item.name}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-soft" />
              Thông tin cửa hàng
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tên cửa hàng</label>
                <input 
                  type="text" 
                  defaultValue="KioskFlow Demo Store"
                  className="w-full px-5 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-2xl outline-none focus:border-blue-electric/50 text-white font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Số điện thoại</label>
                <input 
                  type="text" 
                  defaultValue="0987 654 321"
                  className="w-full px-5 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-2xl outline-none focus:border-blue-electric/50 text-white font-medium"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Địa chỉ</label>
                <input 
                  type="text" 
                  defaultValue="Thành phố Hồ Chí Minh, Việt Nam"
                  className="w-full px-5 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-2xl outline-none focus:border-blue-electric/50 text-white font-medium"
                />
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-[32px] border border-white/5 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-blue-soft" />
              Giao diện Dashboard
            </h3>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-blue-electric/20 border border-blue-electric/40 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                <div className="w-12 h-12 rounded-full bg-blue-electric shadow-lg shadow-blue-500/50"></div>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">Chế độ hiển thị</p>
                <p className="text-slate-400 text-sm">Chọn tông màu chủ đạo cho hệ thống quản lý của bạn</p>
                <div className="flex gap-3 mt-3">
                  <div className="w-6 h-6 rounded-full bg-blue-electric border-2 border-white cursor-pointer"></div>
                  <div className="w-6 h-6 rounded-full bg-cyan-500 border-2 border-transparent cursor-pointer hover:border-white/50"></div>
                  <div className="w-6 h-6 rounded-full bg-amber-500 border-2 border-transparent cursor-pointer hover:border-white/50"></div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-transparent cursor-pointer hover:border-white/50"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

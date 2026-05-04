'use client';

import React from 'react';
import { Store } from 'lucide-react';

export default function StoreSettings() {
  return (
    <div className="ai-card p-12 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 border-b-4 border-foreground/10 pb-6">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(62,39,35,1)]">
          <Store className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
            Thông tin cửa hàng
          </h3>
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Thiết lập thông tin cơ bản của đơn vị</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Tên cửa hàng</label>
          <input 
            type="text" 
            defaultValue="KioskFlow Demo Store"
            className="w-full px-6 py-4 bg-surface border-4 border-foreground rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic tracking-tighter"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Số điện thoại</label>
          <input 
            type="text" 
            defaultValue="0987 654 321"
            className="w-full px-6 py-4 bg-surface border-4 border-foreground rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic tracking-tighter"
          />
        </div>
        <div className="md:col-span-2 space-y-3">
          <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Địa chỉ</label>
          <input 
            type="text" 
            defaultValue="Thành phố Hồ Chí Minh, Việt Nam"
            className="w-full px-6 py-4 bg-surface border-4 border-foreground rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic tracking-tighter"
          />
        </div>
      </div>
    </div>
  );
}

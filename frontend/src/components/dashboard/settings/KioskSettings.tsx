'use client';

import React from 'react';
import { Smartphone, Printer, Cpu, RefreshCw } from 'lucide-react';

export default function KioskSettings() {
  return (
    <div className="ai-card p-12 space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 border-b-4 border-foreground/10 pb-6">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(62,39,35,1)]">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
            Thiết bị Kiosk
          </h3>
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Cấu hình phần cứng và giao diện máy tính tiền</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Printer className="w-4 h-4 text-interaction" />
            Máy in hóa đơn
          </h4>
          <div className="space-y-4">
            <div className="p-6 bg-surface border-4 border-foreground rounded-[2rem] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Printer className="text-foreground/40" />
                <span className="font-black uppercase italic tracking-tighter text-sm">EPSON TM-T88VI</span>
              </div>
              <span className="px-3 py-1 bg-interaction/20 text-interaction rounded-lg text-[10px] font-black uppercase tracking-widest">CONNECTED</span>
            </div>
            <button className="w-full py-4 border-4 border-dashed border-foreground/20 rounded-[2rem] text-foreground/40 font-black uppercase italic tracking-tighter text-xs hover:border-foreground hover:text-foreground transition-all flex items-center justify-center gap-3">
              <RefreshCw className="w-4 h-4" />
              TÌM THIẾT BỊ MỚI
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent" />
            Hiệu năng Kiosk
          </h4>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-2">
                <span className="text-xs font-bold text-foreground/60 uppercase">Độ phân giải màn hình</span>
                <span className="text-xs font-black text-foreground">1920 x 1080</span>
             </div>
             <div className="flex items-center justify-between p-2">
                <span className="text-xs font-bold text-foreground/60 uppercase">Độ trễ AI Voice</span>
                <span className="text-xs font-black text-interaction">45ms (Fast)</span>
             </div>
             <div className="flex items-center justify-between p-2">
                <span className="text-xs font-bold text-foreground/60 uppercase">Phiên bản Client</span>
                <span className="text-xs font-black text-foreground">v2.4.0-stable</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

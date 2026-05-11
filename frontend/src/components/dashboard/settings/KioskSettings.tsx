'use client';

import React, { useState } from 'react';
import { Smartphone, Printer, Cpu, RefreshCw, Timer, Loader2, CheckCircle2 } from 'lucide-react';
import { KioskSettingsProps } from '@/hooks/useSettings';

export default function KioskSettings({ settings, updateTenantSettings }: KioskSettingsProps) {
  const [timeout, setTimeoutVal] = useState(settings?.kioskTimeoutSeconds || 60);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTenantSettings({
        themeColor: settings?.themeColor || 'Earth-Tones',
        kioskTimeoutSeconds: timeout,
        language: settings?.language || 'vi',
        currency: settings?.currency || 'VND'
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ai-card p-12 space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between border-b border-foreground/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
              Thiết bị Kiosk
            </h3>
            <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Cấu hình phần cứng và giao diện máy tính tiền</p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="btn-dynamic py-3 px-8 text-sm flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>ĐÃ LƯU</span>
            </>
          ) : (
            <span>LƯU CẤU HÌNH</span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
              <Timer className="w-4 h-4 text-accent" />
              Vận hành Kiosk
            </h4>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Thời gian chờ (Timeout - giây)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="30" 
                  max="300" 
                  step="30"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-surface border border-foreground/10 rounded-lg appearance-none cursor-pointer accent-primary shadow-sm"
                />
                <span className="w-16 text-center font-black italic text-lg text-primary">{timeout}s</span>
              </div>
              <p className="text-[10px] font-bold text-foreground/30 italic">Tự động xóa giỏ hàng sau thời gian không hoạt động.</p>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
              <Printer className="w-4 h-4 text-interaction" />
              Máy in hóa đơn
            </h4>
            <div className="space-y-4">
              <div className="p-6 bg-surface border border-foreground/10 rounded-3xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <Printer className="text-foreground/40" />
                  <span className="font-black uppercase italic tracking-tighter text-sm">EPSON TM-T88VI</span>
                </div>
                <span className="px-3 py-1 bg-interaction/20 text-interaction rounded-lg text-[10px] font-black uppercase tracking-widest">CONNECTED</span>
              </div>
              <button className="w-full py-4 border border-dashed border-foreground/20 rounded-3xl text-foreground/40 font-black uppercase italic tracking-tighter text-xs hover:border-foreground/40 hover:text-foreground transition-all flex items-center justify-center gap-3 shadow-sm">
                <RefreshCw className="w-4 h-4" />
                TÌM THIẾT BỊ MỚI
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent" />
            Hiệu năng Kiosk
          </h4>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-2 border-b border-foreground/5 pb-4">
                <span className="text-xs font-bold text-foreground/60 uppercase italic">Độ phân giải màn hình</span>
                <span className="text-xs font-black text-foreground italic">1920 x 1080</span>
             </div>
             <div className="flex items-center justify-between p-2 border-b border-foreground/5 pb-4">
                <span className="text-xs font-bold text-foreground/60 uppercase italic">Độ trễ AI Voice</span>
                <span className="text-xs font-black text-interaction italic">45ms (Fast)</span>
             </div>
             <div className="flex items-center justify-between p-2">
                <span className="text-xs font-bold text-foreground/60 uppercase italic">Phiên bản Client</span>
                <span className="text-xs font-black text-foreground italic">v2.4.0-stable</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

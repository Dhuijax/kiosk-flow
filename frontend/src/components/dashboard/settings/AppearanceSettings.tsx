'use client';

import React from 'react';
import { Palette, Sparkles, Monitor, Smartphone } from 'lucide-react';

export default function AppearanceSettings() {
  return (
    <div className="ai-card p-12 space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 border-b-4 border-foreground/10 pb-6">
        <div className="w-12 h-12 bg-interaction rounded-xl flex items-center justify-center text-white shadow-[4px_4px_0px_0px_rgba(62,39,35,1)]">
          <Palette className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
            Giao diện hệ thống
          </h3>
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Tùy chỉnh phong cách hiển thị Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Tông màu chủ đạo
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <ThemeOption name="Earth-Tones" active={true} color="bg-primary" />
            <ThemeOption name="Teal-Mode" active={false} color="bg-interaction" />
            <ThemeOption name="Amber-Sun" active={false} color="bg-accent" />
            <ThemeOption name="Dark-Coffee" active={false} color="bg-foreground" />
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            Chế độ hiển thị
          </h4>
          <div className="flex gap-4">
            <button className="flex-1 p-6 border-4 border-foreground rounded-[2rem] bg-surface flex flex-col items-center gap-3 shadow-[6px_6px_0px_0px_rgba(62,39,35,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <Monitor className="w-8 h-8 text-foreground" />
              <span className="font-black uppercase italic tracking-tighter text-xs">Máy tính</span>
            </button>
            <button className="flex-1 p-6 border-4 border-foreground/10 rounded-[2rem] bg-surface/50 flex flex-col items-center gap-3 opacity-50 hover:opacity-100 transition-all">
              <Smartphone className="w-8 h-8 text-foreground" />
              <span className="font-black uppercase italic tracking-tighter text-xs">Di động</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeOption({ name, active, color }: { name: string, active: boolean, color: string }) {
  return (
    <button className={`p-4 border-4 rounded-2xl flex items-center gap-4 transition-all ${
      active ? 'border-foreground bg-surface shadow-[4px_4px_0px_0px_rgba(62,39,35,1)]' : 'border-foreground/10 bg-surface/30 opacity-60 hover:opacity-100'
    }`}>
      <div className={`w-8 h-8 rounded-lg ${color} shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]`}></div>
      <span className="font-black uppercase italic tracking-tighter text-xs">{name}</span>
    </button>
  );
}

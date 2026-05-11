'use client';

import React, { useState } from 'react';
import { Palette, Sparkles, Monitor, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { AppearanceSettingsProps } from '@/hooks/useSettings';
import { useTheme, ThemeName } from '@/lib/theme/ThemeContext';

export default function AppearanceSettings({ settings, updateTenantSettings }: AppearanceSettingsProps) {
  const { currentTheme, setTheme } = useTheme();
  const [activeTheme, setActiveTheme] = useState<ThemeName>(settings?.themeColor as ThemeName || currentTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const themes: { name: ThemeName; color: string }[] = [
    { name: 'Earth-Tones', color: 'bg-primary' },
    { name: 'Teal-Mode', color: 'bg-interaction' },
    { name: 'Amber-Sun', color: 'bg-accent' },
    { name: 'Dark-Coffee', color: 'bg-foreground' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTenantSettings({
        themeColor: activeTheme,
        kioskTimeoutSeconds: settings?.kioskTimeoutSeconds || 60,
        language: settings?.language || 'vi',
        currency: settings?.currency || 'VND'
      });
      setTheme(activeTheme);
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
          <div className="w-12 h-12 bg-interaction rounded-xl flex items-center justify-center text-white shadow-sm">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
              Giao diện hệ thống
            </h3>
            <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Tùy chỉnh phong cách hiển thị Dashboard</p>
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
            <span>LƯU GIAO DIỆN</span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Tông màu chủ đạo
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {themes.map((t) => (
              <ThemeOption 
                key={t.name}
                name={t.name} 
                active={activeTheme === t.name} 
                color={t.color} 
                onClick={() => setActiveTheme(t.name)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            Chế độ hiển thị
          </h4>
          <div className="flex gap-4">
            <button className="flex-1 p-6 border border-interaction rounded-3xl bg-surface flex flex-col items-center gap-3 shadow-md hover:bg-interaction/5 transition-all">
              <Monitor className="w-8 h-8 text-foreground" />
              <span className="font-black uppercase italic tracking-tighter text-xs">Máy tính</span>
            </button>
            <button className="flex-1 p-6 border border-foreground/10 rounded-3xl bg-surface/50 flex flex-col items-center gap-3 opacity-50 hover:opacity-100 transition-all">
              <Smartphone className="w-8 h-8 text-foreground" />
              <span className="font-black uppercase italic tracking-tighter text-xs">Di động</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeOption({ name, active, color, onClick }: { name: string, active: boolean, color: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 border rounded-2xl flex items-center gap-4 transition-all w-full ${
        active ? 'border-interaction bg-surface shadow-md scale-[1.02]' : 'border-foreground/10 bg-surface/30 opacity-60 hover:opacity-100 shadow-sm'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg ${color} shadow-sm`}></div>
      <span className="font-black uppercase italic tracking-tighter text-xs">{name}</span>
    </button>
  );
}

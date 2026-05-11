'use client';

import React, { useState } from 'react';
import { 
  Palette, 
  Store, 
  Smartphone, 
  Sparkles,
  Bell,
  Shield
} from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import StoreSettings from '@/components/dashboard/settings/StoreSettings';
import AppearanceSettings from '@/components/dashboard/settings/AppearanceSettings';
import NotificationSettings from '@/components/dashboard/settings/NotificationSettings';
import SecuritySettings from '@/components/dashboard/settings/SecuritySettings';
import KioskSettings from '@/components/dashboard/settings/KioskSettings';
import StatusBadge from '@/components/ui/StatusBadge';

type SettingsTab = 'store' | 'appearance' | 'notifications' | 'security' | 'kiosk';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('store');
  const { storeInfo, settings, loading, updateStore, updateTenantSettings } = useSettings();

  const navItems = [
    { id: 'store', name: 'Cửa hàng', icon: Store },
    { id: 'appearance', name: 'Giao diện', icon: Palette },
    { id: 'notifications', name: 'Thông báo', icon: Bell },
    { id: 'security', name: 'Bảo mật', icon: Shield },
    { id: 'kiosk', name: 'Thiết bị Kiosk', icon: Smartphone, status: 'coming-soon' as const },
  ] as const;

  const renderContent = () => {
    if (loading && !storeInfo && !settings) {
      return (
        <div className="ai-card p-12 flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
          <div className="w-12 h-12 border-4 border-interaction border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black uppercase italic tracking-tighter text-foreground/40 italic">Đang tải cấu hình hệ thống...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'store': 
        return <StoreSettings 
          key={`store-${storeInfo?.id || 'empty'}`} 
          storeInfo={storeInfo} 
          updateStore={updateStore} 
        />;
      case 'appearance': 
        return <AppearanceSettings 
          key={`appearance-${settings?.themeColor || 'empty'}`}
          settings={settings} 
          updateTenantSettings={updateTenantSettings} 
        />;
      case 'notifications': 
        return <NotificationSettings />;
      case 'security': 
        return <SecuritySettings />;
      case 'kiosk': 
        return <KioskSettings 
          key={`kiosk-${settings?.kioskTimeoutSeconds || 'empty'}`}
          settings={settings} 
          updateTenantSettings={updateTenantSettings} 
        />;
      default: 
        return <StoreSettings storeInfo={storeInfo} updateStore={updateStore} />;
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-interaction font-black uppercase text-xs tracking-widest">
            <Sparkles className="w-5 h-5" />
            <span>Cấu hình toàn hệ thống</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            Thiết <span className="text-primary">Lập</span>
          </h1>
          <p className="text-foreground/40 font-bold flex items-center gap-2 italic">
            Quản lý vận hành và bảo mật cửa hàng của bạn
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-foreground/10 rounded-full shadow-sm">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 italic">Hệ thống đang trực tuyến</span>
          </div>
          <StatusBadge status="live" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="ai-card p-4 space-y-2 bg-surface/50">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all duration-300 border font-black uppercase italic tracking-tighter text-sm
                    ${isActive 
                      ? 'bg-interaction text-white border-interaction shadow-md scale-[1.02]' 
                      : 'text-foreground/40 border-transparent hover:bg-foreground/5 hover:text-foreground'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <item.icon className={`w-6 h-6 stroke-[3] ${isActive ? 'text-white' : ''}`} />
                    {item.name}
                  </div>
                  {'status' in item && <StatusBadge status={item.status} className={isActive ? "bg-white/20 text-white border-white/20" : ""} />}
                </button>
              );
            })}
          </div>
          
          <div className="p-6 bg-accent/10 border border-dashed border-accent/40 rounded-3xl text-center shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Hỗ trợ kỹ thuật</p>
            <p className="text-xs font-bold text-foreground opacity-60">Bạn cần giúp đỡ với cấu hình? <br /> Liên hệ AI Assistant.</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}


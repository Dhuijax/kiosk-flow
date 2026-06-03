'use client';

import React from 'react';
import { Bell, Mail, Smartphone, Zap, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function NotificationSettings() {
  const t = useTranslations('Dashboard.settings.notificationsTab');
  return (
    <div className="ai-card p-12 space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4 border-b border-foreground/10 pb-6">
        <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-foreground shadow-sm">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
            {t('title')}
          </h3>
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">{t('subtitle')}</p>
        </div>
      </div>

      <div className="space-y-6">
        <NotificationToggle 
          title={t('newOrderTitle')} 
          desc={t('newOrderDesc')} 
          icon={Zap} 
          defaultChecked={true}
        />
        <NotificationToggle 
          title={t('lowStockTitle')} 
          desc={t('lowStockDesc')} 
          icon={Smartphone} 
          defaultChecked={true}
        />
        <NotificationToggle 
          title={t('reportEmailTitle')} 
          desc={t('reportEmailDesc')} 
          icon={Mail} 
          defaultChecked={false}
        />
      </div>
    </div>
  );
}

function NotificationToggle({ title, desc, icon: Icon, defaultChecked }: { title: string, desc: string, icon: LucideIcon, defaultChecked: boolean }) {
  return (
    <div className="p-6 bg-surface border border-foreground/10 rounded-3xl flex items-center justify-between group hover:border-interaction/30 transition-all shadow-sm">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:border-foreground/20 transition-all shadow-sm">
          <Icon className="w-6 h-6 text-foreground/40 group-hover:text-foreground" />
        </div>
        <div>
          <p className="font-black uppercase italic tracking-tighter text-foreground">{title}</p>
          <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest mt-1">{desc}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
        <div className="w-14 h-8 bg-foreground/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-interaction border-2 border-foreground/20 peer-checked:border-foreground"></div>
      </label>
    </div>
  );
}

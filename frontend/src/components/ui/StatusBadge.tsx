'use client';

import React from 'react';
import { Sparkles, Construction } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'coming-soon' | 'demo' | 'beta';
  className?: string;
}

const statusConfig = {
  'coming-soon': {
    label: 'SẮP RA MẮT',
    icon: Construction,
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  'demo': {
    label: 'BẢN DEMO',
    icon: Sparkles,
    color: 'bg-primary/10 text-primary border-primary/20',
  },
  'beta': {
    label: 'BẢN BETA',
    icon: Sparkles,
    color: 'bg-interaction/10 text-interaction border-interaction/20',
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black tracking-[0.15em] uppercase",
      config.color,
      className
    )}>
      <Icon size={10} className="stroke-[3]" />
      <span>{config.label}</span>
    </div>
  );
}

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSettings } from '@/hooks/useSettings';

export type ThemeName = 'Earth-Tones' | 'Teal-Mode' | 'Amber-Sun' | 'Dark-Coffee';

interface ThemeConfig {
  primary: string;
  interaction: string;
  accent: string;
  background: string;
  foreground: string;
  surface: string;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  'Earth-Tones': {
    primary: '#8b5e3c',
    interaction: '#2ba8a2',
    accent: '#ffd23f',
    background: '#f7f5f2',
    foreground: '#3e2723',
    surface: '#ffffff',
  },
  'Teal-Mode': {
    primary: '#0d9488',
    interaction: '#0891b2',
    accent: '#2dd4bf',
    background: '#f0fdfa',
    foreground: '#134e4a',
    surface: '#ffffff',
  },
  'Amber-Sun': {
    primary: '#d97706',
    interaction: '#ea580c',
    accent: '#fbbf24',
    background: '#fffbeb',
    foreground: '#78350f',
    surface: '#ffffff',
  },
  'Dark-Coffee': {
    primary: '#4b3832',
    interaction: '#a0522d',
    accent: '#d2691e',
    background: '#1a1a1a',
    foreground: '#f5f5f5',
    surface: '#262626',
  },
};

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kioskflow-theme') as ThemeName;
      return (saved && THEMES[saved]) ? saved : 'Earth-Tones';
    }
    return 'Earth-Tones';
  });

  // Load from settings when available
  useEffect(() => {
    let mounted = true;
    if (settings?.themeColor && mounted) {
      const theme = settings.themeColor as ThemeName;
      if (THEMES[theme]) {
        Promise.resolve().then(() => {
          if (mounted) setCurrentTheme(theme);
        });
      }
    }
    return () => { mounted = false; };
  }, [settings]);

  // Apply theme to document
  useEffect(() => {
    const config = THEMES[currentTheme];
    const root = document.documentElement;

    Object.entries(config).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set data attribute for extra styling if needed
    root.setAttribute('data-theme', currentTheme);
    
    // Save to localStorage for quick boot
    localStorage.setItem('kioskflow-theme', currentTheme);
  }, [currentTheme]);


  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

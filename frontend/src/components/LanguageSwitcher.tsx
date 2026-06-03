'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: 'vi' | 'en') => {
    setIsOpen(false);
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-xl transition-all font-bold text-sm"
      >
        <span className="text-base leading-none">{currentLanguage.flag}</span>
        <span className="uppercase text-xs tracking-wider font-black">{currentLanguage.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click handler */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-44 bg-white/95 backdrop-blur-md border border-foreground/10 rounded-2xl shadow-xl p-1.5 z-50 flex flex-col gap-0.5"
            >
              {languages.map((lang) => {
                const isActive = lang.code === locale;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code as 'vi' | 'en')}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-xs font-black uppercase transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'hover:bg-foreground/5 text-foreground/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base leading-none">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

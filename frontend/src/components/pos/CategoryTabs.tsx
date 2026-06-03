'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Category } from '@/gen/category_pb';
import { CategoryService } from '@/gen/category_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface CategoryTabsProps {
  onSelect: (categoryId: string | null) => void;
  selectedId: string | null;
}

export default function CategoryTabs({ onSelect, selectedId }: CategoryTabsProps) {
  const { token, tenantId } = useAuth();
  const t = useTranslations('POSOrder');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const fetchCategories = useCallback(async () => {
    if (!token || !tenantId) return;
    setLoading(true);
    try {
      const client = getAuthenticatedClient(CategoryService, tenantId, token);
      const response = await client.listCategories({});
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCategories();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group w-full bg-background border-b border-foreground/10">
      <div className="flex items-center">
        {/* Scroll Left Button */}
        <button 
          onClick={() => scroll('left')}
          className="h-24 px-6 text-foreground/40 hover:text-interaction transition-colors z-10 border-r border-foreground/10"
        >
          <ChevronLeft className="w-8 h-8 stroke-[3]" />
        </button>

        {/* Tabs Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-x-auto no-scrollbar flex items-center h-24 px-8 gap-6"
        >
          <button
            onClick={() => onSelect(null)}
            className={`
              flex-none px-10 h-14 rounded-2xl flex items-center gap-3 font-black text-sm transition-all duration-300 border italic uppercase tracking-tighter
              ${selectedId === null 
                ? 'bg-interaction text-white border-interaction shadow-md scale-[1.02]' 
                : 'bg-surface text-foreground/40 border-foreground/10 hover:border-foreground/40 hover:text-foreground'}
            `}
          >
            <Layers className="w-5 h-5" />
            {t('allCategories')}
          </button>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-none w-40 h-14 bg-foreground/5 animate-pulse rounded-2xl" />
            ))
          ) : (
            categories.map(category => (
              <button
                key={category.id}
                onClick={() => onSelect(category.id)}
                className={`
                  flex-none px-10 h-14 rounded-2xl flex items-center gap-3 font-black text-sm transition-all duration-300 border whitespace-nowrap italic uppercase tracking-tighter
                  ${selectedId === category.id 
                    ? 'bg-interaction text-white border-interaction shadow-md scale-[1.02]' 
                    : 'bg-surface text-foreground/40 border-foreground/10 hover:border-foreground/40 hover:text-foreground'}
                `}
              >
                {category.name}
              </button>
            ))
          )}
        </div>

        {/* Scroll Right Button */}
        <button 
          onClick={() => scroll('right')}
          className="h-24 px-6 text-foreground/40 hover:text-interaction transition-colors z-10 border-l border-foreground/10"
        >
          <ChevronRight className="w-8 h-8 stroke-[3]" />
        </button>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

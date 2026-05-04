'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchCategories = useCallback(async () => {
    if (!token || !tenantId) return;
    setLoading(true);
    try {
      const client = getAuthenticatedClient(CategoryService, tenantId, token);
      const response = await client.listCategories({});
      // Only show top-level categories or all for POS tabs? 
      // Usually POS shows all major categories as tabs.
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group w-full bg-navy-900/50 border-b border-slate-800/50">
      <div className="flex items-center">
        {/* Scroll Left Button */}
        <button 
          onClick={() => scroll('left')}
          className="h-full px-2 text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Tabs Container */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-x-auto no-scrollbar flex items-center h-16 px-2 gap-2"
        >
          <button
            onClick={() => onSelect(null)}
            className={`
              flex-none px-6 h-11 rounded-xl flex items-center gap-2 font-bold text-sm transition-all duration-200
              ${selectedId === null 
                ? 'bg-blue-electric text-white shadow-lg shadow-blue-500/30 border border-blue-400/30' 
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50'}
            `}
          >
            <Layers className="w-4 h-4" />
            Tất cả
          </button>

          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-none w-32 h-11 bg-slate-800/50 animate-pulse rounded-xl" />
            ))
          ) : (
            categories.map(category => (
              <button
                key={category.id}
                onClick={() => onSelect(category.id)}
                className={`
                  flex-none px-6 h-11 rounded-xl flex items-center gap-2 font-bold text-sm transition-all duration-200 whitespace-nowrap
                  ${selectedId === category.id 
                    ? 'bg-blue-electric text-white shadow-lg shadow-blue-500/30 border border-blue-400/30' 
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50'}
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
          className="h-full px-2 text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors z-10"
        >
          <ChevronRight className="w-5 h-5" />
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

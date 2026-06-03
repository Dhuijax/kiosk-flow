'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Edit3,
  Box,
  ChevronLeft,
  Settings2
} from 'lucide-react';
import Link from 'next/link';
import { useIngredient } from '@/hooks/useIngredient';
import { Ingredient } from '@/gen/ingredient_pb';
import { PaginationRequest } from '@/gen/common_pb';
import IngredientModal from '@/components/inventory/IngredientModal';
import { useTranslations } from 'next-intl';

export default function IngredientsPage() {
  const t = useTranslations('Inventory');
  const { listIngredients, loading } = useIngredient();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  const fetchData = useCallback(async () => {
    const res = await listIngredients({
      search: searchQuery || undefined,
      pagination: new PaginationRequest({ pageSize: 100, page: 1 })
    });
    setIngredients(res.ingredients);
  }, [listIngredients, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return ingredients;
    return ingredients.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ingredients, searchQuery]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard/inventory" 
              className="w-10 h-10 bg-surface border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-interaction hover:text-white transition-all shadow-sm group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
              <Box className="w-5 h-5" />
              <span>{t('materials')}</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            {t('ingredientsCategory').split(' ')[0]} <span className="text-interaction">{t('ingredientsCategory').split(' ').slice(1).join(' ')}</span>
          </h1>
          <p className="text-foreground/40 font-bold italic">{t('ingredientsDesc')}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setSelectedIngredient(null);
              setIsModalOpen(true);
            }}
            className="btn-dynamic px-8 py-3 text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>{t('addIngredient')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="ai-card bg-surface flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 flex items-center gap-4 bg-background px-6 h-14 rounded-2xl border border-foreground/10 group focus-within:bg-white focus-within:border-interaction focus-within:shadow-md transition-all relative overflow-hidden">
          <Search className="w-6 h-6 text-foreground/20 group-focus-within:text-interaction flex-none pointer-events-none" />
          <input 
            type="text" 
            placeholder={t('searchIngredient')} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 h-full py-0 font-black text-sm uppercase italic tracking-tighter placeholder:text-foreground/20 leading-none"
          />
        </div>
        <button 
          onClick={fetchData}
          className="w-14 h-14 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-interaction hover:text-white transition-all shadow-sm"
        >
          <RefreshCw className={`w-6 h-6 stroke-[3] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Ingredients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && ingredients.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ai-card h-48 animate-pulse bg-foreground/5"></div>
          ))
        ) : filteredIngredients.length === 0 ? (
          <div className="col-span-full ai-card py-32 text-center flex flex-col items-center gap-6 opacity-20">
            <Box className="w-20 h-20" />
            <p className="text-xl font-black uppercase italic tracking-tighter">{t('noIngredients')}</p>
          </div>
        ) : (
          filteredIngredients.map((item) => (
            <div 
              key={item.id} 
              className="ai-card group hover:border-interaction hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedIngredient(item);
                    setIsModalOpen(true);
                  }}
                  className="w-10 h-10 bg-background border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-interaction hover:text-white shadow-sm transition-all"
                >
                  <Edit3 className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-foreground/5 border border-foreground/5 flex items-center justify-center text-interaction group-hover:scale-110 transition-transform">
                  <Box className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter group-hover:text-interaction transition-all leading-tight">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 rounded-lg bg-foreground/5 text-[10px] font-black uppercase tracking-widest text-foreground/40 border border-foreground/5">
                      {item.unit}
                    </span>
                    {!item.isActive && (
                      <span className="px-3 py-1 rounded-lg bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-500 border border-red-500/10">
                    {t('inactive')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-foreground/5 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest mb-1 italic">{t('estCost')}</p>
                  <p className="text-2xl font-black italic tracking-tighter text-foreground">
                    {Number(item.costPrice?.units || 0).toLocaleString()} <span className="text-sm font-bold opacity-30 not-italic uppercase ml-1">VND</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-background border border-foreground/10 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:bg-interaction group-hover:text-white transition-all">
                  <Settings2 className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <IngredientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        ingredient={selectedIngredient}
      />
    </div>
  );
}

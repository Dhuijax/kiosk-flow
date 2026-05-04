'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, Plus, Edit, Layers, Sparkles } from 'lucide-react';
import { Category } from '@/gen/category_pb';
import { CategoryService } from '@/gen/category_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface CategoryTreeProps {
  onSelect: (categoryId: string | null) => void;
  selectedId: string | null;
}

export default function CategoryTree({ onSelect, selectedId }: CategoryTreeProps) {
  const { token, tenantId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderCategories = (parentId: string | null = null, level = 0) => {
    const filtered = categories.filter(c => (c.parentId || null) === parentId);
    
    if (filtered.length === 0 && level > 0) return null;

    return (
      <ul className={`${level > 0 ? 'ml-6 mt-2' : ''} space-y-3`}>
        {filtered.map(category => {
          const isExpanded = expanded[category.id];
          const isSelected = selectedId === category.id;
          const hasChildren = categories.some(c => c.parentId === category.id);

          return (
            <li key={category.id}>
              <div 
                className={`
                  flex items-center justify-between group px-4 py-3 rounded-xl cursor-pointer transition-all border-2
                  ${isSelected 
                    ? 'bg-interaction text-white border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                    : 'bg-surface border-foreground/10 text-foreground/40 hover:border-foreground/40 hover:text-foreground'}
                `}
                onClick={() => onSelect(isSelected ? null : category.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {hasChildren ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleExpand(category.id); }}
                      className={`p-1 rounded-lg transition-colors ${isSelected ? 'bg-white/20' : 'hover:bg-foreground/5'}`}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 stroke-[3]" /> : <ChevronRight className="w-4 h-4 stroke-[3]" />}
                    </button>
                  ) : <div className="w-6" />}
                  <Folder className={`w-5 h-5 shrink-0 ${isSelected ? 'text-white' : 'text-foreground/20'}`} />
                  <span className="text-xs font-black uppercase italic tracking-tighter truncate">{category.name}</span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 hover:bg-foreground/5 rounded-lg text-foreground/20 hover:text-interaction">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {isExpanded && renderCategories(category.id, level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="ai-card h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-black text-foreground uppercase italic tracking-tighter flex items-center gap-3">
          <Layers className="w-5 h-5 text-interaction stroke-[3]" />
          Phân loại
        </h2>
        <button className="w-10 h-10 bg-primary text-white border-2 border-foreground rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar pr-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
            <Sparkles className="w-10 h-10 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Đang tải...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 opacity-20">
            <p className="text-[10px] font-black uppercase tracking-widest">Trống rỗng</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div 
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border-2
                ${selectedId === null 
                  ? 'bg-interaction text-white border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                  : 'bg-surface border-foreground/10 text-foreground/40 hover:border-foreground/40 hover:text-foreground'}
              `}
              onClick={() => onSelect(null)}
            >
              <Layers className={`w-5 h-5 ${selectedId === null ? 'text-white' : 'text-foreground/20'}`} />
              <span className="text-xs font-black uppercase italic tracking-tighter">Tất cả món</span>
            </div>
            {renderCategories()}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, Plus, Edit, Layers } from 'lucide-react';
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
    // eslint-disable-next-line react-hooks/set-state-in-effect, @typescript-eslint/no-floating-promises
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderCategories = (parentId: string | null = null, level = 0) => {
    const filtered = categories.filter(c => (c.parentId || null) === parentId);
    
    if (filtered.length === 0 && level > 0) return null;

    return (
      <ul className={`${level > 0 ? 'ml-4' : ''} space-y-1`}>
        {filtered.map(category => {
          const isExpanded = expanded[category.id];
          const isSelected = selectedId === category.id;
          const hasChildren = categories.some(c => c.parentId === category.id);

          return (
            <li key={category.id}>
              <div 
                className={`
                  flex items-center justify-between group px-3 py-2 rounded-lg cursor-pointer transition-all
                  ${isSelected ? 'bg-blue-electric/20 text-blue-soft border border-blue-electric/30' : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'}
                `}
                onClick={() => onSelect(isSelected ? null : category.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {hasChildren ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleExpand(category.id); }}
                      className="p-0.5 hover:bg-slate-700 rounded text-slate-500"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : <div className="w-4.5" />}
                  <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-soft' : 'text-slate-500'}`} />
                  <span className="text-sm font-medium truncate">{category.name}</span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-blue-soft">
                    <Edit className="w-3 h-3" />
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
    <div className="w-64 glass rounded-2xl p-4 flex flex-col h-full border border-slate-800/50">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-soft" />
          Danh mục
        </h2>
        <button className="p-1.5 hover:bg-blue-electric/20 text-blue-soft rounded-lg transition-all border border-transparent hover:border-blue-electric/30">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-50">
            <div className="w-4 h-4 border-2 border-blue-electric border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500">Đang tải...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-xs text-slate-500">Chưa có danh mục nào. Hãy thêm mới!</p>
          </div>
        ) : (
          <>
            <div 
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer mb-2 transition-all
                ${selectedId === null ? 'bg-blue-electric/20 text-blue-soft border border-blue-electric/30' : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'}
              `}
              onClick={() => onSelect(null)}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">Tất cả sản phẩm</span>
            </div>
            {renderCategories()}
          </>
        )}
      </div>
    </div>
  );
}

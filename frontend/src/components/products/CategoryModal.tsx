'use client';

import { useState } from 'react';
import { X, Save, Layers, RefreshCw } from 'lucide-react';
import { Category } from '@/gen/category_pb';
import { CategoryService } from '@/gen/category_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCategory?: Category;
  categories: Category[];
}

export default function CategoryModal({ isOpen, onClose, onSuccess, editingCategory, categories }: CategoryModalProps) {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');

  const [prevEditingCategory, setPrevEditingCategory] = useState(editingCategory);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (editingCategory !== prevEditingCategory || isOpen !== prevIsOpen) {
    setPrevEditingCategory(editingCategory);
    setPrevIsOpen(isOpen);
    if (editingCategory) {
      setName(editingCategory.name);
      setParentId(editingCategory.parentId || '');
    } else if (isOpen && !prevIsOpen) {
      setName('');
      setParentId('');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId || !name) return;

    setLoading(true);
    try {
      const client = getAuthenticatedClient(CategoryService, tenantId, token);
      const payload = {
        name,
        parentId: parentId || undefined,
      };

      if (editingCategory) {
        await client.updateCategory({ id: editingCategory.id, ...payload });
      } else {
        await client.createCategory(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save category:', err);
      alert('Có lỗi xảy ra khi lưu danh mục.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-3xl border border-slate-700/50 flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-soft" />
            <h2 className="text-lg font-bold text-white">{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Tên danh mục *</label>
            <input 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ví dụ: Đồ uống, Thức ăn..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Danh mục cha</label>
            <select 
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all appearance-none"
            >
              <option value="">Không có (Danh mục gốc)</option>
              {categories
                .filter(c => c.id !== editingCategory?.id)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
              }
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={loading || !name}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-electric hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Lưu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

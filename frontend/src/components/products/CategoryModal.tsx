'use client';

import { useState } from 'react';
import { X, Save, Layers, RefreshCw, ChevronDown } from 'lucide-react';
import { Category } from '@/gen/category_pb';
import { CategoryService } from '@/gen/category_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Portal from '@/components/ui/Portal';

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
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
        <div className="ai-card w-full max-w-md flex flex-col p-0 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-interaction stroke-[3]" />
              <h2 className="text-xl font-black text-foreground uppercase italic tracking-tighter">{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-xl text-foreground/20 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Tên danh mục *</label>
              <input 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="VÍ DỤ: ĐỒ UỐNG, THỨC ĂN..."
                className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic tracking-tighter shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Danh mục cha</label>
              <div className="relative">
                <select 
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all appearance-none font-bold text-sm uppercase italic tracking-tighter shadow-sm"
                >
                  <option value="">KHÔNG CÓ (DANH MỤC GỐC)</option>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)
                  }
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 pointer-events-none" />
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-background hover:bg-foreground/5 text-foreground/40 font-black uppercase italic tracking-tighter text-sm rounded-2xl transition-all border border-foreground/10"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit"
                disabled={loading || !name}
                className="btn-dynamic flex-1 py-4 text-sm"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{editingCategory ? 'Cập nhật' : 'Lưu lại'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

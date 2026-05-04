'use client';

import { useState, useEffect } from 'react';
import { X, Save, Package, DollarSign, Tag, Info, Image as ImageIcon, Check, RefreshCw } from 'lucide-react';
import { Product, Topping } from '@/gen/product_pb';
import { Category } from '@/gen/category_pb';
import { ProductService } from '@/gen/product_connect';
import { CategoryService } from '@/gen/category_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { protoInt64 } from "@bufbuild/protobuf";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProduct?: Product;
}

export default function ProductModal({ isOpen, onClose, onSuccess, editingProduct }: ProductModalProps) {
  const { token, tenantId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    price: '0',
    costPrice: '0',
    unit: '',
    description: '',
    imageUrl: '',
    isActive: true,
    allowTopping: true,
    trackInventory: true,
    toppingIds: [] as string[],
  });

  useEffect(() => {
    if (editingProduct) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: editingProduct.name,
        sku: editingProduct.sku,
        categoryId: editingProduct.categoryId || '',
        price: editingProduct.price?.units.toString() || '0',
        costPrice: editingProduct.costPrice?.units.toString() || '0',
        unit: editingProduct.unit || '',
        description: editingProduct.description || '',
        imageUrl: editingProduct.imageUrl || '',
        isActive: editingProduct.isActive,
        allowTopping: editingProduct.allowTopping,
        trackInventory: editingProduct.trackInventory,
        toppingIds: editingProduct.toppings.map(t => t.id),
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        categoryId: '',
        price: '0',
        costPrice: '0',
        unit: '',
        description: '',
        imageUrl: '',
        isActive: true,
        allowTopping: true,
        trackInventory: true,
        toppingIds: [],
      });
    }
  }, [editingProduct, isOpen]);

  useEffect(() => {
    if (isOpen && token && tenantId) {
      const fetchData = async () => {
        try {
          const catClient = getAuthenticatedClient(CategoryService, tenantId, token);
          const prodClient = getAuthenticatedClient(ProductService, tenantId, token);
          
          const [catRes, topRes] = await Promise.all([
            catClient.listCategories({}),
            prodClient.listToppings({})
          ]);
          
          setCategories(catRes.categories);
          setToppings(topRes.toppings);
        } catch (err) {
          console.error('Failed to fetch data for modal:', err);
        }
      };
      fetchData();
    }
  }, [isOpen, token, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId) return;

    setLoading(true);
    try {
      const client = getAuthenticatedClient(ProductService, tenantId, token);
      const payload = {
        ...formData,
        categoryId: formData.categoryId || undefined,
        price: { currencyCode: 'VND', units: protoInt64.parse(formData.price), nanos: 0 },
        costPrice: { currencyCode: 'VND', units: protoInt64.parse(formData.costPrice), nanos: 0 },
      };

      if (editingProduct) {
        await client.updateProduct({ id: editingProduct.id, ...payload });
      } else {
        await client.createProduct(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      alert('Có lỗi xảy ra khi lưu sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
      <div className="glass w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700/50 flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-electric/20 flex items-center justify-center text-blue-soft border border-blue-electric/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
              <p className="text-xs text-slate-400">Thông tin chi tiết về sản phẩm và giá bán</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Basic Info */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-soft" /> Tên sản phẩm *
                </label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Cà phê Muối"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Mã SKU</label>
                  <input 
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="S001"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Danh mục</label>
                  <select 
                    value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all appearance-none"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" /> Giá bán *
                  </label>
                  <div className="relative">
                    <input 
                      required
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all text-blue-soft font-bold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₫</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Giá vốn</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={formData.costPrice}
                      onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                      className="w-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all text-slate-400"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">₫</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-soft" /> Mô tả sản phẩm
                </label>
                <textarea 
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ghi chú về sản phẩm..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all resize-none"
                />
              </div>
            </div>

            {/* Right Column: Advanced Settings */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-soft" /> Link ảnh sản phẩm
                </label>
                <input 
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-electric transition-all"
                />
                <div className="mt-4 w-full aspect-video rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden border-dashed">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-600">Xem trước hình ảnh</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cài đặt nâng cao</h3>
                
                <label className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Đang kinh doanh</span>
                  <input 
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-700 text-blue-electric focus:ring-blue-electric/20 bg-slate-900 transition-all cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Cho phép Toppings</span>
                  <input 
                    type="checkbox"
                    checked={formData.allowTopping}
                    onChange={e => setFormData({...formData, allowTopping: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-700 text-blue-electric focus:ring-blue-electric/20 bg-slate-900 transition-all cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Theo dõi kho</span>
                  <input 
                    type="checkbox"
                    checked={formData.trackInventory}
                    onChange={e => setFormData({...formData, trackInventory: e.target.checked})}
                    className="w-5 h-5 rounded border-slate-700 text-blue-electric focus:ring-blue-electric/20 bg-slate-900 transition-all cursor-pointer"
                  />
                </label>
              </div>

              {formData.allowTopping && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Toppings áp dụng</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-auto p-4 bg-slate-900 rounded-2xl border border-slate-700 custom-scrollbar">
                    {toppings.length === 0 ? (
                      <p className="text-xs text-slate-600 italic w-full text-center py-4">Chưa có topping nào</p>
                    ) : (
                      toppings.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            const exists = formData.toppingIds.includes(t.id);
                            setFormData({
                              ...formData,
                              toppingIds: exists 
                                ? formData.toppingIds.filter(id => id !== t.id)
                                : [...formData.toppingIds, t.id]
                            });
                          }}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 border
                            ${formData.toppingIds.includes(t.id)
                              ? 'bg-blue-electric/20 text-blue-soft border-blue-electric/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                            }
                          `}
                        >
                          {formData.toppingIds.includes(t.id) && <Check className="w-3 h-3" />}
                          {t.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-800/10">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-slate-400 font-semibold hover:text-white transition-colors"
          >
            Hủy
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2.5 bg-blue-electric hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{editingProduct ? 'Cập nhật' : 'Lưu sản phẩm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

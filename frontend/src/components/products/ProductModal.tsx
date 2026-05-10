'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Save, Package, DollarSign, Tag, Info, Image as ImageIcon, Check, RefreshCw, ChevronDown } from 'lucide-react';
import { Product, Topping } from '@/gen/product_pb';
import { Category } from '@/gen/category_pb';
import { ProductService } from '@/gen/product_connect';
import { CategoryService } from '@/gen/category_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { protoInt64 } from "@bufbuild/protobuf";
import { cn } from "@/lib/utils";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingProduct?: Product;
}

interface FormData {
  name: string;
  sku: string;
  categoryId: string;
  price: string;
  costPrice: string;
  unit: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  allowTopping: boolean;
  trackInventory: boolean;
  toppingIds: string[];
}

export default function ProductModal({ isOpen, onClose, onSuccess, editingProduct }: ProductModalProps) {
  const { token, tenantId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sku: '',
    categoryId: '',
    price: '0',
    costPrice: '0',
    unit: '',
    description: '',
    imageUrl: '',
    isActive: true,
    allowTopping: false,
    trackInventory: true,
    toppingIds: [],
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
      <div className="ai-card w-full max-w-5xl max-h-[95vh] flex flex-col p-0 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-interaction/10 flex items-center justify-center text-interaction border border-interaction/20 shadow-sm">
              <Package className="w-7 h-7 stroke-[3]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground uppercase italic tracking-tighter leading-tight">{editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
              <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mt-1">Thông tin chi tiết và giá bán niêm yết</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-10 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Basic Info */}
            <div className="lg:col-span-7 space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-interaction" /> Tên sản phẩm *
                </label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VÍ DỤ: CÀ PHÊ MUỐI, TRÀ SỮA..."
                  className="w-full px-8 py-5 bg-surface border border-foreground/10 rounded-[2rem] outline-none focus:bg-white transition-all font-black text-xl uppercase italic tracking-tighter shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Mã SKU</label>
                  <input 
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="S001"
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic tracking-tighter shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Danh mục</label>
                  <div className="relative">
                    <select 
                      value={formData.categoryId}
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all appearance-none font-bold text-sm uppercase italic tracking-tighter shadow-sm"
                    >
                      <option value="">CHỌN DANH MỤC</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Giá bán *
                  </label>
                  <div className="relative">
                    <input 
                      required
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full pl-8 pr-16 py-5 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all text-3xl font-black italic tracking-tighter text-primary shadow-sm"
                    />
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-foreground/20 font-black italic text-xl">₫</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Giá vốn</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={formData.costPrice}
                      onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                      className="w-full pl-8 pr-16 py-5 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all text-2xl font-black italic tracking-tighter text-foreground/40 shadow-sm"
                    />
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-foreground/10 font-black italic text-lg">₫</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                  <Info className="w-4 h-4 text-interaction" /> Mô tả sản phẩm
                </label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="GHI CHÚ VỀ SẢN PHẨM..."
                  className="w-full px-8 py-5 bg-background border border-foreground/10 rounded-3xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic tracking-tighter resize-none shadow-sm"
                />
              </div>
            </div>

            {/* Right Column: Advanced Settings */}
            <div className="lg:col-span-5 space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-interaction" /> Link ảnh sản phẩm
                </label>
                <div className="relative">
                  <input 
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="HTTPS://EXAMPLE.COM/IMAGE.JPG"
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-xs shadow-sm"
                  />
                </div>
                <div className="mt-4 w-full aspect-square rounded-[2.5rem] bg-surface border border-foreground/10 flex items-center justify-center overflow-hidden relative shadow-inner">
                  {formData.imageUrl ? (
                    <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" />
                  ) : (
                    <div className="text-center opacity-10">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">XEM TRƯỚC ẢNH</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 bg-foreground/5 p-8 rounded-[2rem] border border-foreground/5 shadow-sm">
                <h3 className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-4">Cài đặt nâng cao</h3>
                
                <div className="space-y-4">
                  {[
                    { label: 'Đang kinh doanh', key: 'isActive' },
                    { label: 'Cho phép Toppings', key: 'allowTopping' },
                    { label: 'Theo dõi kho', key: 'trackInventory' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-center justify-between group cursor-pointer bg-background p-4 rounded-2xl border border-foreground/5 hover:border-interaction/20 transition-all shadow-sm">
                      <span className="text-xs font-black uppercase italic tracking-tighter text-foreground/60 group-hover:text-interaction transition-colors">{item.label}</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={formData[item.key as keyof FormData] as boolean}
                          onChange={e => setFormData({...formData, [item.key]: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-foreground/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-interaction"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {formData.allowTopping && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Toppings áp dụng</label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-auto p-6 bg-foreground/5 rounded-[2rem] border border-foreground/5 custom-scrollbar shadow-inner">
                    {toppings.length === 0 ? (
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-20 w-full text-center py-6 italic">Chưa có topping nào</p>
                    ) : (
                      toppings.map(t => {
                        const isSelected = formData.toppingIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                toppingIds: isSelected 
                                  ? formData.toppingIds.filter(id => id !== t.id)
                                  : [...formData.toppingIds, t.id]
                              });
                            }}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-tighter transition-all flex items-center gap-2 border shadow-sm",
                              isSelected
                                ? 'bg-interaction text-white border-interaction shadow-md scale-105'
                                : 'bg-background text-foreground/40 border-foreground/10 hover:border-foreground/40'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[4]" />}
                            {t.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-foreground/5 flex items-center justify-end gap-4 bg-foreground/5">
          <button 
            type="button"
            onClick={onClose}
            className="px-8 py-4 text-foreground/40 font-black uppercase italic tracking-tighter text-sm hover:text-foreground transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="btn-dynamic px-12 py-4 text-sm"
          >
            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            <span>{editingProduct ? 'Cập nhật' : 'Lưu sản phẩm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, PlusCircle, Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProcurement } from '@/hooks/useProcurement';
import { useSupplier } from '@/hooks/useSupplier';
import { useIngredient } from '@/hooks/useIngredient';
import { Supplier } from '@/gen/procurement_pb';
import { Ingredient } from '@/gen/ingredient_pb';
import { CreatePurchaseOrderRequest, PurchaseOrderItemInput } from '@/gen/procurement_pb';
import { Money, PaginationRequest } from '@/gen/common_pb';
import { protoInt64 } from '@bufbuild/protobuf';
import Portal from '@/components/ui/Portal';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatVND } from '@/lib/utils/format';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderItemRow {
  ingredientId: string;
  quantity: number;
  unitPrice: number;
}

export default function PurchaseOrderModal({ isOpen, onClose, onSuccess }: PurchaseOrderModalProps) {
  const { branchId } = useAuth();
  const { createPurchaseOrder, loading: submitLoading } = useProcurement();
  const { listSuppliers } = useSupplier();
  const { listIngredients } = useIngredient();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [error, setError] = useState('');

  // Load suppliers and ingredients when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const loadData = async () => {
        try {
          const [supRes, ingRes] = await Promise.all([
            listSuppliers({ pagination: new PaginationRequest({ page: 1, pageSize: 100 }) }),
            listIngredients({ pagination: new PaginationRequest({ page: 1, pageSize: 100 }) })
          ]);
          if (supRes && supRes.suppliers) {
            setSuppliers(supRes.suppliers);
            if (supRes.suppliers.length > 0) {
              setSelectedSupplierId(supRes.suppliers[0].id);
            }
          }
          if (ingRes && ingRes.ingredients) {
            setIngredients(ingRes.ingredients);
          }
        } catch (err) {
          console.error('Failed to load PO creation metadata:', err);
        }
      };

      loadData();
      setItems([{ ingredientId: '', quantity: 1, unitPrice: 0 }]);
      setError('');
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, listSuppliers, listIngredients]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { ingredientId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemRow, value: string | number) => {
    const updated = [...items];
    if (field === 'ingredientId') {
      updated[index].ingredientId = value as string;
      // Auto fill unit price from ingredient cost price
      const selectedIng = ingredients.find(ing => ing.id === value);
      if (selectedIng && selectedIng.costPrice) {
        updated[index].unitPrice = Number(selectedIng.costPrice.units || 0);
      }
    } else if (field === 'quantity') {
      updated[index].quantity = Number(value) || 0;
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Number(value) || 0;
    }
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedSupplierId) {
      setError('Vui lòng chọn nhà cung cấp');
      return;
    }

    if (items.length === 0 || items.some(item => !item.ingredientId)) {
      setError('Vui lòng chọn nguyên liệu cho tất cả các dòng');
      return;
    }

    if (items.some(item => item.quantity <= 0)) {
      setError('Số lượng nhập phải lớn hơn 0');
      return;
    }

    try {
      const inputs = items.map(item => {
        return new PurchaseOrderItemInput({
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unitPrice: new Money({
            currencyCode: 'VND',
            units: protoInt64.parse(Math.floor(item.unitPrice)),
            nanos: 0
          })
        });
      });

      const request = new CreatePurchaseOrderRequest({
        branchId: branchId || '',
        supplierId: selectedSupplierId,
        items: inputs
      });

      const res = await createPurchaseOrder(request);
      if (res) {
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo phiếu nhập hàng');
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="ai-card w-full max-w-4xl flex flex-col p-0 shadow-2xl bg-surface border border-foreground/10 rounded-[2.5rem] overflow-hidden my-8"
          >
            <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-interaction/10 flex items-center justify-center border border-interaction/20">
                  <ShoppingBag className="w-6 h-6 text-interaction stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground uppercase italic tracking-tighter leading-tight">
                    Tạo mới <span className="text-interaction">Phiếu Nhập Hàng</span>
                  </h2>
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mt-1 italic">Nhập kho tăng số lượng tồn kho nguyên liệu lập tức</p>
                </div>
              </div>
              <button onClick={onClose} className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group">
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Supplier selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Nhà cung cấp nguồn hàng</label>
                {suppliers.length === 0 ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 text-xs font-black uppercase italic tracking-tighter rounded-2xl">
                    Chưa có nhà cung cấp nào hoạt động. Vui lòng tạo nhà cung cấp trước!
                  </div>
                ) : (
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm uppercase italic tracking-tighter shadow-sm"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone || 'Không số ĐT'})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Chi tiết nguyên liệu nhập kho</label>
                  <button 
                    type="button" 
                    onClick={handleAddItem}
                    className="flex items-center gap-2 text-interaction font-black uppercase text-[10px] tracking-widest italic hover:underline"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Thêm dòng mới
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-4 items-end bg-foreground/5 p-6 rounded-2xl border border-foreground/5">
                      {/* Ingredient selector */}
                      <div className="flex-1 space-y-2 w-full">
                        <span className="text-[9px] font-black text-foreground/40 uppercase tracking-wider italic">Nguyên liệu</span>
                        <select
                          required
                          value={item.ingredientId}
                          onChange={(e) => handleItemChange(idx, 'ingredientId', e.target.value)}
                          className="w-full px-4 py-3.5 bg-background border border-foreground/10 rounded-xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-xs uppercase italic tracking-tighter"
                        >
                          <option value="">-- CHỌN NGUYÊN LIỆU --</option>
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity input */}
                      <div className="w-full md:w-32 space-y-2">
                        <span className="text-[9px] font-black text-foreground/40 uppercase tracking-wider italic">Số lượng</span>
                        <input
                          type="number"
                          step="any"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-4 py-3.5 bg-background border border-foreground/10 rounded-xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-xs italic tracking-tighter"
                          placeholder="1"
                        />
                      </div>

                      {/* Unit Price input */}
                      <div className="w-full md:w-44 space-y-2">
                        <span className="text-[9px] font-black text-foreground/40 uppercase tracking-wider italic">Đơn giá vốn (VND)</span>
                        <input
                          type="number"
                          required
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-4 py-3.5 bg-background border border-foreground/10 rounded-xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-xs italic tracking-tighter"
                          placeholder="0"
                        />
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-40"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total calculations */}
              <div className="flex items-center justify-between p-6 bg-interaction/5 border border-interaction/10 rounded-2xl">
                <span className="text-sm font-black uppercase italic tracking-tighter text-foreground/60">Tổng giá trị phiếu nhập:</span>
                <span className="text-3xl font-black italic tracking-tighter text-interaction">{formatVND(calculateTotal())}</span>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-600 text-[10px] font-black uppercase italic tracking-tighter bg-red-500/10 p-4 rounded-2xl border border-red-500/10">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t border-foreground/5">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-8 py-5 border border-foreground/10 rounded-2xl font-black uppercase italic tracking-widest text-xs hover:bg-foreground/5 transition-all text-foreground/60"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  disabled={submitLoading || suppliers.length === 0}
                  className="btn-dynamic flex-1 py-5 text-lg"
                >
                  {submitLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'XÁC NHẬN NHẬP KHO & TĂNG TỒN KHỎ'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}

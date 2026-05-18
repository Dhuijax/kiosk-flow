'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, AlertTriangle, AlertCircle, Package, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInventory } from '@/hooks/useInventory';
import { useIngredient } from '@/hooks/useIngredient';
import { useRecipe } from '@/hooks/useRecipe';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { ProductService } from '@/gen/product_connect';
import { Product } from '@/gen/product_pb';
import { Ingredient } from '@/gen/ingredient_pb';
import { LogWasteRequest } from '@/gen/inventory_pb';
import { PaginationRequest } from '@/gen/common_pb';
import Portal from '@/components/ui/Portal';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatVND } from '@/lib/utils/format';

interface LogWasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type EntityType = 'INGREDIENT' | 'PRODUCT';

interface RecipeIngredientCost {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  costPrice: number;
  totalCost: number;
}

export default function LogWasteModal({ isOpen, onClose, onSuccess }: LogWasteModalProps) {
  const { branchId, token, tenantId } = useAuth();
  const { logWaste, loading: submitLoading } = useInventory();
  const { listIngredients } = useIngredient();
  const { getRecipe } = useRecipe();

  const [entityType, setEntityType] = useState<EntityType>('INGREDIENT');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('SPOILED');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Recipe calculation state for Product
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [productRecipe, setProductRecipe] = useState<RecipeIngredientCost[]>([]);

  // Load ingredients and products
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const loadMetadata = async () => {
        if (!token || !tenantId) return;
        setLoadingData(true);
        try {
          const prodClient = getAuthenticatedClient(ProductService, tenantId, token);
          const [ingRes, prodRes] = await Promise.all([
            listIngredients({ pagination: new PaginationRequest({ page: 1, pageSize: 100 }) }),
            prodClient.listProducts({ pagination: { page: 1, pageSize: 100 } })
          ]);

          if (ingRes && ingRes.ingredients) {
            setIngredients(ingRes.ingredients);
          }
          if (prodRes && prodRes.products) {
            setProducts(prodRes.products);
          }
        } catch (err) {
          console.error('Failed to load waste metadata:', err);
        } finally {
          setLoadingData(false);
        }
      };

      loadMetadata();
      setSelectedIngredientId('');
      setSelectedProductId('');
      setQuantity(1);
      setReason('SPOILED');
      setNote('');
      setProductRecipe([]);
      setError('');
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, listIngredients, token, tenantId]);

  // Load recipe when selected product changes
  useEffect(() => {
    if (entityType !== 'PRODUCT' || !selectedProductId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductRecipe([]);
      return;
    }

    const fetchRecipeDetails = async () => {
      setLoadingRecipe(true);
      try {
        const recipeIngs = await getRecipe(selectedProductId);
        const detailedRecipeCosts = recipeIngs.map(r => {
          const matchedIng = ingredients.find(ing => ing.id === r.ingredientId);
          const costUnits = matchedIng?.costPrice ? Number(matchedIng.costPrice.units || 0) : 0;
          const costNanos = matchedIng?.costPrice ? Number(matchedIng.costPrice.nanos || 0) : 0;
          const ingredientCost = costUnits + (costNanos / 1e9);

          return {
            ingredientId: r.ingredientId,
            name: r.ingredientName || matchedIng?.name || 'Nguyên liệu ẩn',
            quantity: r.quantity,
            unit: r.unit || matchedIng?.unit || 'đv',
            costPrice: ingredientCost,
            totalCost: r.quantity * ingredientCost
          };
        });
        setProductRecipe(detailedRecipeCosts);
      } catch (err) {
        console.error('Failed to fetch product recipe cost:', err);
      } finally {
        setLoadingRecipe(false);
      }
    };

    fetchRecipeDetails();
  }, [selectedProductId, entityType, getRecipe, ingredients]);

  // Real-time financial loss cost estimation
  const estimatedCost = useMemo(() => {
    if (entityType === 'INGREDIENT') {
      if (!selectedIngredientId) return 0;
      const matched = ingredients.find(ing => ing.id === selectedIngredientId);
      if (!matched) return 0;
      const costUnits = matched.costPrice ? Number(matched.costPrice.units || 0) : 0;
      const costNanos = matched.costPrice ? Number(matched.costPrice.nanos || 0) : 0;
      const costPerUnit = costUnits + (costNanos / 1e9);
      return costPerUnit * quantity;
    } else {
      if (!selectedProductId) return 0;
      // Calculate BOM cost sum * quantity
      const bomCostSum = productRecipe.reduce((sum, item) => sum + item.totalCost, 0);
      return bomCostSum * quantity;
    }
  }, [entityType, selectedIngredientId, selectedProductId, ingredients, productRecipe, quantity]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (entityType === 'INGREDIENT' && !selectedIngredientId) {
      setError('Vui lòng chọn nguyên liệu báo hỏng');
      return;
    }

    if (entityType === 'PRODUCT' && !selectedProductId) {
      setError('Vui lòng chọn sản phẩm thành phẩm báo hỏng');
      return;
    }

    if (quantity <= 0) {
      setError('Số lượng báo hỏng phải lớn hơn 0');
      return;
    }

    try {
      const request = new LogWasteRequest({
        branchId: branchId || '',
        productId: entityType === 'PRODUCT' ? selectedProductId : undefined,
        ingredientId: entityType === 'INGREDIENT' ? selectedIngredientId : undefined,
        quantity,
        reason,
        note: note || undefined
      });

      const res = await logWaste(request);
      if (res && res.success) {
        onSuccess();
        onClose();
      } else {
        setError('Báo hỏng thất bại. Vui lòng kiểm tra lại số lượng tồn kho.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi báo hỏng');
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-background/85 backdrop-blur-xl overflow-y-auto">
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
            className="ai-card w-full max-w-3xl flex flex-col p-0 shadow-2xl bg-surface border border-foreground/10 rounded-[2.5rem] overflow-hidden my-8"
          >
            <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-500 stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground uppercase italic tracking-tighter leading-tight">
                    Báo cáo <span className="text-red-500">Hao Hụt & Báo Hỏng</span>
                  </h2>
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mt-1 italic">
                    Ghi nhận thất thoát và tự động khấu trừ kho ngay lập tức
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group"
              >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Type Switcher */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Đối tượng báo hỏng</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType('INGREDIENT');
                      setSelectedProductId('');
                    }}
                    className={`flex items-center justify-center gap-3 py-4 rounded-2xl border font-black uppercase italic tracking-tighter text-sm transition-all shadow-sm ${
                      entityType === 'INGREDIENT'
                        ? 'bg-interaction text-white border-interaction scale-[1.01]'
                        : 'bg-background text-foreground/40 border-foreground/10 hover:border-foreground/30'
                    }`}
                  >
                    <Box className="w-5 h-5" />
                    <span>Nguyên liệu thô</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntityType('PRODUCT');
                      setSelectedIngredientId('');
                    }}
                    className={`flex items-center justify-center gap-3 py-4 rounded-2xl border font-black uppercase italic tracking-tighter text-sm transition-all shadow-sm ${
                      entityType === 'PRODUCT'
                        ? 'bg-interaction text-white border-interaction scale-[1.01]'
                        : 'bg-background text-foreground/40 border-foreground/10 hover:border-foreground/30'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    <span>Thành phẩm / Đồ uống</span>
                  </button>
                </div>
              </div>

              {/* Selector depending on entityType */}
              {loadingData ? (
                <div className="py-6 flex items-center justify-center gap-3 text-foreground/40 font-bold italic text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin text-interaction" />
                  <span>ĐANG TẢI DANH SÁCH...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">
                    {entityType === 'INGREDIENT' ? 'Chọn nguyên liệu thô' : 'Chọn thành phẩm đồ uống'}
                  </label>
                  {entityType === 'INGREDIENT' ? (
                    <select
                      required
                      value={selectedIngredientId}
                      onChange={(e) => setSelectedIngredientId(e.target.value)}
                      className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm uppercase italic tracking-tighter shadow-sm"
                    >
                      <option value="">-- CHỌN NGUYÊN LIỆU PHÁT SINH HỎNG --</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit}) - Đơn giá vốn: {formatVND(Number(ing.costPrice?.units || 0))}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      required
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm uppercase italic tracking-tighter shadow-sm"
                    >
                      <option value="">-- CHỌN THÀNH PHẨM PHÁT SINH HỎNG --</option>
                      {products.map(prod => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} ({prod.sku || 'N/A'}) - Giá bán: {formatVND(Number(prod.price?.units || 0))}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Quantity & Reason Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Số lượng hao hụt</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm italic tracking-tighter shadow-sm"
                    placeholder="Nhập số lượng..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Lý do thất thoát</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm uppercase italic tracking-tighter shadow-sm"
                  >
                    <option value="SPOILED">Hết hạn sử dụng / Spoiled</option>
                    <option value="WRONG_RECIPE">Pha chế sai công thức / Wrong Recipe</option>
                    <option value="DAMAGED">Đổ vỡ / Hỏng hóc vật lý / Damaged</option>
                    <option value="EXPIRED">Nguyên liệu hỏng / Expired</option>
                    <option value="OTHER">Lý do khác / Other Reasons</option>
                  </select>
                </div>
              </div>

              {/* Description Note */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Ghi chú chi tiết (Tùy chọn)</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-xs uppercase italic tracking-tighter shadow-sm"
                  placeholder="MÔ TẢ CHI TIẾT NGUYÊN NHÂN HỎNG (V.D: BARTENDER LÀM ĐỔ, HẾT HẠN KHO LẠNH...)..."
                />
              </div>

              {/* Product BOM / Cost Breakdown list (if PRODUCT is selected) */}
              {entityType === 'PRODUCT' && selectedProductId && (
                <div className="p-6 bg-foreground/5 border border-foreground/5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase italic tracking-widest text-interaction">
                      Chi tiết định mức cấu thành sản phẩm (BOM Cost)
                    </h4>
                    {loadingRecipe && <RefreshCw className="w-4 h-4 animate-spin text-interaction" />}
                  </div>
                  
                  {productRecipe.length === 0 && !loadingRecipe ? (
                    <p className="text-[10px] font-bold text-yellow-600 uppercase italic tracking-tighter">
                      ⚠️ Sản phẩm này chưa được thiết lập công thức (BOM). Trừ kho trực tiếp sản phẩm!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto divide-y divide-foreground/5">
                      {productRecipe.map(item => (
                        <div key={item.ingredientId} className="flex justify-between py-2 text-xs font-black italic tracking-tighter">
                          <span className="text-foreground/60">{item.name} (x{item.quantity} {item.unit})</span>
                          <span className="text-foreground/80">Giá vốn: {formatVND(item.totalCost)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 text-xs font-black italic uppercase tracking-tighter text-interaction">
                        <span>Giá vốn thành phẩm tổng tính (BOM):</span>
                        <span>{formatVND(productRecipe.reduce((sum, item) => sum + item.totalCost, 0))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cost Estimator & Fallback info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-red-500/5 border border-red-500/10 rounded-2xl gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase italic tracking-tighter text-red-500/70 block">
                    Ước tính giá trị thiệt hại tài chính:
                  </span>
                  <span className="text-3xl font-black italic tracking-tighter text-red-500">
                    {formatVND(estimatedCost)}
                  </span>
                </div>
                
                <div className="text-right md:max-w-xs">
                  <span className="text-[9px] font-black text-foreground/30 uppercase tracking-wider block italic">
                    {entityType === 'PRODUCT' 
                      ? (productRecipe.length > 0 
                        ? 'Khấu trừ đệ quy nguyên liệu thô theo công thức BOM tỷ lệ' 
                        : 'Không có BOM: Trừ kho trực tiếp thành phẩm')
                      : 'Trừ trực tiếp số lượng tồn kho nguyên liệu thô'}
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-600 text-[10px] font-black uppercase italic tracking-tighter bg-red-500/10 p-4 rounded-2xl border border-red-500/10">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Buttons */}
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
                  disabled={submitLoading || (entityType === 'INGREDIENT' && !selectedIngredientId) || (entityType === 'PRODUCT' && !selectedProductId)}
                  className="btn-dynamic flex-1 py-5 text-lg bg-red-500 hover:bg-red-600 hover:border-red-600"
                >
                  {submitLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : 'XÁC NHẬN BÁO HỎNG & KHẤU TRỪ KHO'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}

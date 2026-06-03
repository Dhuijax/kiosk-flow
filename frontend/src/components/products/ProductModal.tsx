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
import Portal from '@/components/ui/Portal';
import { useRecipe } from '@/hooks/useRecipe';
import { useIngredient } from '@/hooks/useIngredient';
import { Ingredient } from '@/gen/ingredient_pb';
import { ProductIngredient, ProductIngredientInput } from '@/gen/recipe_pb';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';


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
  const t = useTranslations('Products');
  const { token, tenantId } = useAuth();
  const { getRecipe, setRecipe } = useRecipe();
  const { listIngredients } = useIngredient();
  const [activeTab, setActiveTab] = useState<'info' | 'recipe'>('info');
  const [categories, setCategories] = useState<Category[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  
  // Recipe state
  const [recipeIngredients, setRecipeIngredients] = useState<ProductIngredient[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Ingredient[]>([]);
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
    if (editingProduct && isOpen) {
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

      // Fetch recipe
      const fetchRecipeData = async () => {
        setRecipeLoading(true);
        const ingredients = await getRecipe(editingProduct.id);
        setRecipeIngredients(ingredients);
        setRecipeLoading(false);
      };
      fetchRecipeData();
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
      setRecipeIngredients([]);
    }
    setActiveTab('info');
  }, [editingProduct, isOpen, getRecipe]);

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

  // Ingredient & Product search logic
  useEffect(() => {
    const searchAll = async () => {
      if (ingredientSearch.length < 2) {
        setSearchResults([]);
        setProductSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const prodClient = getAuthenticatedClient(ProductService, tenantId!, token!);
        const [ingRes, prodRes] = await Promise.all([
          listIngredients({ search: ingredientSearch }),
          prodClient.listProducts({ searchQuery: ingredientSearch })
        ]);
        setSearchResults(ingRes.ingredients);
        setProductSearchResults(prodRes.products.filter(p => p.id !== editingProduct?.id));
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchAll, 300);
    return () => clearTimeout(timer);
  }, [ingredientSearch, listIngredients, token, tenantId, editingProduct?.id]);

  const addIngredientToRecipe = (ing: Ingredient | Product) => {
    if (recipeIngredients.some(item => item.ingredientId === ing.id)) return;
    
    const newIngredient = new ProductIngredient({
      ingredientId: ing.id,
      ingredientName: ing.name,
      unit: (ing as Ingredient).unit || (ing as Product).unit || 'Unit',
      quantity: 1,
      isCustomizable: false,
    });
    
    setRecipeIngredients([...recipeIngredients, newIngredient]);
    setIngredientSearch('');
    setSearchResults([]);
    setProductSearchResults([]);
  };

  const removeIngredientFromRecipe = (ingId: string) => {
    setRecipeIngredients(recipeIngredients.filter(item => item.ingredientId !== ingId));
  };

  const updateIngredientQuantity = (ingId: string, qty: number) => {
    setRecipeIngredients(recipeIngredients.map(item => 
      item.ingredientId === ingId ? new ProductIngredient({ ...item, quantity: qty }) : item
    ));
  };

  const toggleIngredientCustomizable = (ingId: string) => {
    setRecipeIngredients(recipeIngredients.map(item => 
      item.ingredientId === ingId ? new ProductIngredient({ ...item, isCustomizable: !item.isCustomizable }) : item
    ));
  };

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

      let productId = editingProduct?.id;
      if (editingProduct) {
        await client.updateProduct({ id: editingProduct.id, ...payload });
      } else {
        const res = await client.createProduct(payload);
        productId = res.id;
      }

      // Save Recipe if we have a productId
      if (productId) {
        await setRecipe(productId, recipeIngredients.map(ri => new ProductIngredientInput({
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
          isCustomizable: ri.isCustomizable
        })));
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      alert(t('productModal.errSave'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
        <div className="ai-card w-full max-w-5xl max-h-[95vh] flex flex-col p-0 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-interaction/10 flex items-center justify-center text-interaction border border-interaction/20 shadow-sm">
                <Package className="w-7 h-7 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground uppercase italic tracking-tighter leading-tight">{editingProduct ? t('productModal.editTitle') : t('productModal.createTitle')}</h2>
                <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mt-1">{t('productModal.subtitle')}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs Navigation */}
          <div className="px-8 border-b border-foreground/5 bg-foreground/5 flex gap-2">
            {[
              { id: 'info', label: t('productModal.tabBasicInfo'), icon: Info },
              { id: 'recipe', label: t('productModal.tabRecipe'), icon: RefreshCw },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'info' | 'recipe')}
                className={cn(
                  "px-6 py-4 text-[10px] font-black uppercase italic tracking-[0.2em] flex items-center gap-2 transition-all border-b-2",
                  activeTab === tab.id 
                    ? "border-interaction text-interaction bg-interaction/5" 
                    : "border-transparent text-foreground/40 hover:text-foreground hover:bg-foreground/5"
                )}
              >
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "animate-pulse" : "")} />
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-10 custom-scrollbar relative">
            <AnimatePresence mode="wait">
              {activeTab === 'info' ? (
                <motion.div 
                  key="info"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-12"
                >
              {/* Left Column: Basic Info */}
              <div className="lg:col-span-7 space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-interaction" /> {t('productModal.labelName')}
                  </label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('productModal.placeholderName')}
                    className="w-full px-8 py-5 bg-surface border border-foreground/10 rounded-[2rem] outline-none focus:bg-white transition-all font-black text-xl uppercase italic tracking-tighter shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('productModal.labelSku')}</label>
                    <input 
                      value={formData.sku}
                      onChange={e => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="S001"
                      className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic tracking-tighter shadow-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('productModal.labelCategory')}</label>
                    <div className="relative">
                      <select 
                        value={formData.categoryId}
                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all appearance-none font-bold text-sm uppercase italic tracking-tighter shadow-sm"
                      >
                        <option value="">{t('productModal.placeholderCategory')}</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" /> {t('productModal.labelPrice')}
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
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('productModal.labelCostPrice')}</label>
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
                    <Info className="w-4 h-4 text-interaction" /> {t('productModal.labelDescription')}
                  </label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('productModal.placeholderDescription')}
                    className="w-full px-8 py-5 bg-background border border-foreground/10 rounded-3xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic tracking-tighter resize-none shadow-sm"
                  />
                </div>
              </div>

              {/* Right Column: Advanced Settings */}
              <div className="lg:col-span-5 space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-interaction" /> {t('productModal.labelImageUrl')}
                  </label>
                  <div className="relative">
                    <input 
                      value={formData.imageUrl}
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder={t('productModal.placeholderImageUrl')}
                      className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-xs shadow-sm"
                    />
                  </div>
                  <div className="mt-4 w-full aspect-square rounded-[2.5rem] bg-surface border border-foreground/10 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {formData.imageUrl ? (
                      <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" />
                    ) : (
                      <div className="text-center opacity-10">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">{t('productModal.imagePreview')}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6 bg-foreground/5 p-8 rounded-[2rem] border border-foreground/5 shadow-sm">
                  <h3 className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-4">{t('productModal.labelAdvanced')}</h3>
                  
                  <div className="space-y-4">
                    {[
                      { label: t('productModal.optionActive'), key: 'isActive' },
                      { label: t('productModal.optionAllowTopping'), key: 'allowTopping' },
                      { label: t('productModal.optionTrackInventory'), key: 'trackInventory' }
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
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('productModal.labelTopping')}</label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-auto p-6 bg-foreground/5 rounded-[2rem] border border-foreground/5 custom-scrollbar shadow-inner">
                      {toppings.length === 0 ? (
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-20 w-full text-center py-6 italic">{t('productModal.noTopping')}</p>
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
            </motion.div>
          ) : (
            <motion.div 
              key="recipe"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter">{t('productModal.labelRecipeTitle')}</h3>
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mt-1">{t('productModal.recipeSubtitle')}</p>
                </div>
                {recipeLoading && <RefreshCw className="w-5 h-5 animate-spin text-interaction" />}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Search & Add */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('productModal.labelSearchIngredient')}</label>
                    <div className="relative">
                      <input 
                        value={ingredientSearch}
                        onChange={e => setIngredientSearch(e.target.value)}
                        placeholder={t('productModal.placeholderSearchIngredient')}
                        className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic tracking-tighter shadow-sm"
                      />
                      {isSearching && <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-foreground/20" />}
                    </div>
                  </div>

                  <div className="bg-foreground/5 rounded-[2rem] border border-foreground/5 p-4 min-h-[300px] max-h-[400px] overflow-auto custom-scrollbar">
                    {(searchResults.length > 0 || productSearchResults.length > 0) ? (
                      <div className="space-y-4">
                        {searchResults.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[8px] font-black text-foreground/20 uppercase tracking-widest ml-2">{t('productModal.headingIngredient')}</p>
                            {searchResults.map(ing => (
                              <button
                                key={ing.id}
                                type="button"
                                onClick={() => addIngredientToRecipe(ing)}
                                className="w-full flex items-center justify-between p-4 bg-background rounded-2xl border border-foreground/5 hover:border-interaction/40 hover:scale-[1.02] transition-all group shadow-sm"
                              >
                                <div className="text-left">
                                  <p className="text-xs font-black uppercase italic tracking-tighter">{ing.name}</p>
                                  <p className="text-[8px] font-bold text-foreground/40 uppercase">{ing.unit}</p>
                                </div>
                                <Package className="w-4 h-4 text-foreground/10 group-hover:text-interaction transition-colors" />
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {productSearchResults.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[8px] font-black text-interaction/40 uppercase tracking-widest ml-2">{t('productModal.headingProduct')}</p>
                            {productSearchResults.map(prod => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => addIngredientToRecipe(prod)}
                                className="w-full flex items-center justify-between p-4 bg-background rounded-2xl border border-interaction/5 hover:border-interaction/40 hover:scale-[1.02] transition-all group shadow-sm"
                              >
                                <div className="text-left">
                                  <p className="text-xs font-black uppercase italic tracking-tighter text-interaction">{prod.name}</p>
                                  <p className="text-[8px] font-bold text-foreground/40 uppercase">{prod.unit || t('productModal.unitFallback')}</p>
                                </div>
                                <RefreshCw className="w-4 h-4 text-interaction/20 group-hover:text-interaction transition-colors" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
                        <Package className="w-12 h-12 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest italic text-center px-6">
                          {ingredientSearch.length < 2 ? t('productModal.searchHint') : t('productModal.searchNoResults')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Ingredients */}
                <div className="lg:col-span-8">
                  <div className="bg-surface rounded-[2.5rem] border border-foreground/10 overflow-hidden shadow-inner min-h-[400px]">
                    <div className="bg-foreground/5 px-8 py-4 border-b border-foreground/5 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{t('productModal.selectedIngredientsHeader', { count: recipeIngredients.length })}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{t('productModal.bomHeader')}</span>
                    </div>

                    <div className="p-4 space-y-4">
                      {recipeIngredients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-10">
                          <RefreshCw className="w-16 h-16 mb-4" />
                          <p className="text-sm font-black uppercase italic tracking-widest">{t('productModal.noRecipe')}</p>
                        </div>
                      ) : (
                        recipeIngredients.map((item) => (
                          <div 
                            key={item.ingredientId}
                            className="flex items-center gap-6 p-4 bg-background rounded-[2rem] border border-foreground/5 shadow-sm group hover:border-interaction/20 transition-all"
                          >
                            <div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground/20 font-black italic">
                              {recipeIngredients.indexOf(item) + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black uppercase italic tracking-tighter">{item.ingredientName}</h4>
                                {productSearchResults.some(p => p.id === item.ingredientId) && (
                                  <span className="text-[8px] bg-interaction/10 text-interaction px-1.5 py-0.5 rounded-full font-black uppercase">{t('productModal.byproductBadge')}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-1">
                                <p className="text-[10px] font-bold text-foreground/40 uppercase">{t('productModal.unitLabel', { unit: item.unit })}</p>
                                <button 
                                  type="button"
                                  onClick={() => toggleIngredientCustomizable(item.ingredientId)}
                                  className={cn(
                                    "text-[8px] font-black uppercase italic tracking-widest px-2 py-0.5 rounded-md border transition-all",
                                    item.isCustomizable 
                                      ? "bg-primary text-white border-primary shadow-sm" 
                                      : "bg-foreground/5 text-foreground/20 border-foreground/10 hover:border-foreground/30"
                                  )}
                                >
                                  {item.isCustomizable ? t('productModal.recipeCustomizable') : t('productModal.recipeFixed')}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={e => updateIngredientQuantity(item.ingredientId, parseFloat(e.target.value))}
                                  className="w-24 px-4 py-3 bg-foreground/5 border border-foreground/10 rounded-xl outline-none focus:bg-white transition-all text-center font-black text-lg italic tracking-tighter text-interaction"
                                />
                                <span className="absolute -top-2 -right-2 bg-interaction text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase">
                                  {item.unit}
                                </span>
                              </div>
                              <button 
                                type="button"
                                onClick={() => removeIngredientFromRecipe(item.ingredientId)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground/20 hover:bg-red-500 hover:text-white transition-all"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-8 p-6 bg-interaction/5 border border-interaction/10 rounded-3xl">
                    <div className="flex items-start gap-4">
                      <Info className="w-5 h-5 text-interaction mt-1" />
                      <div>
                        <p className="text-xs font-black text-interaction uppercase italic tracking-tighter">{t('productModal.operationNotesTitle')}</p>
                        <p className="text-[10px] text-interaction/60 font-medium leading-relaxed mt-1 italic">
                          {t('productModal.operationNotesContent')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </form>

          <div className="p-8 border-t border-foreground/5 flex items-center justify-end gap-4 bg-foreground/5">
            <button 
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-foreground/40 font-black uppercase italic tracking-tighter text-sm hover:text-foreground transition-colors"
            >
              {t('productModal.btnCancel')}
            </button>
            <button 
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-dynamic px-12 py-4 text-sm"
            >
              {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              <span>{editingProduct ? t('productModal.btnUpdate') : t('productModal.btnCreate')}</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

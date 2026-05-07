'use client';

import { useState } from 'react';
import { PackagePlus, LayoutGrid, List } from 'lucide-react';
import CategoryTree from '@/components/products/CategoryTree';
import ProductList from '@/components/products/ProductList';
import ProductModal from '@/components/products/ProductModal';
import { Product } from '@/gen/product_pb';

export default function ProductsPage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(undefined);
    setIsProductModalOpen(true);
  };

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex flex-col h-full gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-interaction font-black uppercase text-xs tracking-widest">
            <LayoutGrid className="w-5 h-5" />
            <span>Thực đơn & Danh mục</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight text-foreground leading-tight">
            Quản lý <span className="text-primary">Sản phẩm</span>
          </h1>
          <p className="text-foreground/40 font-bold italic">Tổ chức thực đơn, thiết lập giá và quản lý toppings.</p>
        </div>
        
        <div className="flex items-center gap-6 bg-surface p-4 border border-foreground/10 rounded-3xl shadow-sm">
          <div className="flex bg-background p-2 rounded-2xl border border-foreground/10">
            <button className="w-12 h-12 bg-foreground text-background rounded-xl flex items-center justify-center shadow-sm transition-all">
              <List className="w-6 h-6 stroke-[3]" />
            </button>
            <button className="w-12 h-12 text-foreground/20 hover:text-foreground rounded-xl flex items-center justify-center transition-all">
              <LayoutGrid className="w-6 h-6 stroke-[3]" />
            </button>
          </div>
          
          <button 
            onClick={handleAddProduct}
            className="btn-dynamic px-8 py-4 text-sm"
          >
            <PackagePlus className="w-5 h-5" />
            <span>THÊM SẢN PHẨM</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-12 overflow-hidden min-h-[600px]">
        {/* Sidebar: Category Tree */}
        <div className="hidden lg:block w-80 flex-none">
          <CategoryTree 
            selectedId={selectedCategoryId} 
            onSelect={setSelectedCategoryId} 
          />
        </div>

        {/* Main: Product List */}
        <div className="flex-1 min-w-0">
          <ProductList 
            key={`${refreshTrigger}-${selectedCategoryId}`}
            selectedCategoryId={selectedCategoryId} 
            onEdit={handleEditProduct}
          />
        </div>
      </div>

      {/* Modals */}
      <ProductModal 
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSuccess={handleSuccess}
        editingProduct={editingProduct}
      />
    </div>
  );
}

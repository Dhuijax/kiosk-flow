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
    <div className="flex flex-col h-full gap-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-blue-soft" />
            Quản lý sản phẩm
          </h1>
          <p className="text-slate-400 text-sm">Tổ chức thực đơn, giá bán và theo dõi tồn kho</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
            <button className="p-2 bg-blue-electric text-white rounded-lg shadow-lg">
              <List className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
          
          <button 
            onClick={handleAddProduct}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-electric hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
          >
            <PackagePlus className="w-5 h-5" />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-[600px]">
        {/* Sidebar: Category Tree */}
        <div className="hidden lg:block">
          <CategoryTree 
            selectedId={selectedCategoryId} 
            onSelect={setSelectedCategoryId} 
          />
        </div>

        {/* Main: Product List */}
        <ProductList 
          key={`${refreshTrigger}-${selectedCategoryId}`}
          selectedCategoryId={selectedCategoryId} 
          onEdit={handleEditProduct}
        />
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

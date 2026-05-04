'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package } from 'lucide-react';
import { Product } from '@/gen/product_pb';
import { ProductService } from '@/gen/product_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useOrderCart } from '@/lib/order/OrderCartContext';
import ProductCard from './ProductCard';

interface MenuGridProps {
  selectedCategoryId: string | null;
  searchQuery: string;
}

export default function MenuGrid({ selectedCategoryId, searchQuery }: MenuGridProps) {
  const { token, tenantId } = useAuth();
  const { addItem } = useOrderCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!token || !tenantId) return;
    
    setLoading(true);
    try {
      const client = getAuthenticatedClient(ProductService, tenantId, token);
      const response = await client.listProducts({
        pagination: {
          page: 1,
          pageSize: 100, // Load many for POS experience
        },
        categoryId: selectedCategoryId || undefined,
      });
      setProducts(response.products);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId, selectedCategoryId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    addItem(product);
  };

  if (loading) {
    return (
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] bg-slate-800/40 animate-pulse rounded-2xl border border-slate-700/50" />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-4">
        <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700/50">
          <Package className="w-10 h-10 opacity-20" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-400">Không tìm thấy sản phẩm</p>
          <p className="text-sm">Thử thay đổi danh mục hoặc từ khóa tìm kiếm</p>
        </div>
      </div>
    );
  }

  return (
    <div aria-label="Danh sách thực đơn sản phẩm" className="flex-1 overflow-auto custom-scrollbar">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-6">
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onAddToCart={handleAddToCart} 
          />
        ))}
      </div>
    </div>
  );
}

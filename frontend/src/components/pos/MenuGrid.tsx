'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, Sparkles } from 'lucide-react';
import { Product, Topping } from '@/gen/product_pb';
import { ProductService } from '@/gen/product_connect';
import { InventoryService } from '@/gen/inventory_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useOrderCart } from '@/lib/order/OrderCartContext';
import ProductCard from './ProductCard';
import ToppingModal from './ToppingModal';

interface MenuGridProps {
  selectedCategoryId: string | null;
  searchQuery: string;
}

export default function MenuGrid({ selectedCategoryId, searchQuery }: MenuGridProps) {
  const { token, tenantId, branchId } = useAuth();
  const { addItem } = useOrderCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [prevCategoryId, setPrevCategoryId] = useState(selectedCategoryId);
  const [isToppingModalOpen, setIsToppingModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Adjust loading state when category changes
  if (selectedCategoryId !== prevCategoryId) {
    setPrevCategoryId(selectedCategoryId);
    setLoading(true);
  }

  const fetchStock = useCallback(async () => {
    if (!token || !tenantId || !branchId) return;
    try {
      const client = getAuthenticatedClient(InventoryService, tenantId, token);
      const response = await client.listStock({
        branchId,
        pagination: { page: 1, pageSize: 200 }
      });
      const mapping = response.items.reduce((acc, item) => {
        acc[item.productId] = item.quantity;
        return acc;
      }, {} as Record<string, number>);
      setStockMap(mapping);
    } catch (err) {
      console.error('Failed to fetch stock:', err);
    }
  }, [token, tenantId, branchId]);

  const fetchProducts = useCallback(async (showLoading = true) => {
    if (!token || !tenantId) return;
    
    if (showLoading) setLoading(true);
    try {
      const client = getAuthenticatedClient(ProductService, tenantId, token);
      const response = await client.listProducts({
        pagination: {
          page: 1,
          pageSize: 100, 
        },
        categoryId: selectedCategoryId || undefined,
      });
      setProducts(response.products);
      await fetchStock();
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId, selectedCategoryId, fetchStock]);

  useEffect(() => {
    queueMicrotask(() => fetchProducts(false));
    
    const stockInterval = setInterval(fetchStock, 30000);
    return () => clearInterval(stockInterval);
  }, [fetchProducts, fetchStock]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    if (product.allowTopping && product.toppings.length > 0) {
      setSelectedProduct(product);
      setIsToppingModalOpen(true);
    } else {
      addItem(product);
    }
  };

  const handleConfirmToppings = (toppings: Topping[], quantity: number) => {
    if (selectedProduct) {
      addItem(selectedProduct, toppings, quantity);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 p-12">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] bg-foreground/5 animate-pulse rounded-[2rem] border-4 border-foreground/5" />
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-foreground gap-8">
        <div className="w-32 h-32 bg-surface rounded-[2rem] border-4 border-foreground flex items-center justify-center relative shadow-[8px_8px_0px_0px_rgba(62,39,35,1)]">
          <Package className="w-16 h-16 opacity-10" />
          <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-accent animate-float" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-2xl font-black italic uppercase tracking-tighter">Không tìm thấy món ăn</p>
          <p className="text-sm font-bold opacity-40">Thử tìm kiếm với từ khóa khác...</p>
        </div>
      </div>
    );
  }

  return (
    <div aria-label="Danh sách thực đơn sản phẩm" className="flex-1 overflow-auto custom-scrollbar">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 p-12">
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onAddToCart={handleAddToCart} 
            stockQuantity={stockMap[product.id] || 0}
          />
        ))}
      </div>

      {selectedProduct && (
        <ToppingModal 
          product={selectedProduct}
          isOpen={isToppingModalOpen}
          onClose={() => setIsToppingModalOpen(false)}
          onConfirm={handleConfirmToppings}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  Package, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Product } from '@/gen/product_pb';
import { ProductService } from '@/gen/product_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface ProductListProps {
  selectedCategoryId: string | null;
  onEdit: (product: Product) => void;
}

export default function ProductList({ selectedCategoryId, onEdit }: ProductListProps) {
  const { token, tenantId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchProducts = useCallback(async () => {
    if (!token || !tenantId) return;
    
    setLoading(true);
    try {
      const client = getAuthenticatedClient(ProductService, tenantId, token);
      const response = await client.listProducts({
        pagination: {
          page,
          pageSize,
        },
        categoryId: selectedCategoryId || undefined,
      });
      setProducts(response.products);
      if (response.pagination) {
        setTotalItems(response.pagination.totalCount);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId, page, pageSize, selectedCategoryId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!token || !tenantId) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}"?`)) return;
    
    try {
      const client = getAuthenticatedClient(ProductService, tenantId, token);
      await client.deleteProduct({ id });
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Có lỗi xảy ra khi xóa sản phẩm');
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize);

  const formatCurrency = (amount: bigint | undefined) => {
    if (amount === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(Number(amount)) + ' ₫';
  };

  return (
    <div className="flex-1 flex flex-col gap-8">
      {/* Search & Actions Bar */}
      <div className="ai-card bg-surface flex items-center justify-between">
        <div className="relative flex-1 max-w-xl group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground/20 group-focus-within:text-interaction transition-colors" />
          <input 
            type="text" 
            placeholder="TÌM KIẾM MÓN ĂN, MÃ SKU..." 
            className="w-full pl-16 pr-6 py-4 bg-background border-4 border-foreground rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic tracking-tighter"
          />
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => fetchProducts()}
            className="w-14 h-14 bg-surface border-4 border-foreground rounded-2xl flex items-center justify-center hover:bg-interaction hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            title="Làm mới"
          >
            <RefreshCw className={`w-6 h-6 stroke-[3] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="ai-card p-0 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Món ăn</th>
                <th className="px-8 py-6">Mã SKU</th>
                <th className="px-8 py-6">Giá & Vốn</th>
                <th className="px-8 py-6 text-center">Trạng thái</th>
                <th className="px-8 py-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-foreground/5">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-16 h-16 border-8 border-interaction border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xl font-black uppercase italic tracking-tighter opacity-20">Đang truy xuất dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                      <Package className="w-20 h-20" />
                      <p className="text-xl font-black uppercase italic tracking-tighter">Chưa có món nào được niêm yết</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-foreground/5 transition-all group cursor-pointer">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-background overflow-hidden border-4 border-foreground/10 flex items-center justify-center group-hover:border-interaction transition-all relative">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                          ) : (
                            <Package className="w-10 h-10 text-foreground/10" />
                          )}
                        </div>
                        <div>
                          <p className="text-xl font-black text-foreground uppercase italic tracking-tighter group-hover:text-interaction transition-all leading-none">{product.name}</p>
                          <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest mt-2">DVT: {product.unit || 'PHẦN'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black italic tracking-tighter text-foreground/40 bg-foreground/5 px-4 py-2 rounded-xl border-2 border-foreground/10 group-hover:border-foreground/40 transition-all">
                        {product.sku || 'CHƯA CÓ'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-2xl font-black text-primary italic tracking-tighter">{formatCurrency(product.price?.units)}</p>
                      <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest italic">Giá vốn: {formatCurrency(product.costPrice?.units)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        {product.isActive ? (
                          <span className="px-4 py-1.5 rounded-xl text-[10px] font-black bg-interaction text-white border-2 border-foreground uppercase italic tracking-tighter shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            Đang bán
                          </span>
                        ) : (
                          <span className="px-4 py-1.5 rounded-xl text-[10px] font-black bg-foreground/10 text-foreground/40 border-2 border-foreground/10 uppercase italic tracking-tighter">
                            Tạm ẩn
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => onEdit(product)}
                          className="w-12 h-12 bg-surface border-2 border-foreground rounded-xl flex items-center justify-center hover:bg-interaction hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                          <Edit className="w-5 h-5 stroke-[3]" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id, product.name);
                          }}
                          className="w-12 h-12 bg-surface border-2 border-foreground rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                          <Trash2 className="w-5 h-5 stroke-[3]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="px-12 py-8 bg-foreground/5 border-t-4 border-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Hiển thị</span>
            <span className="px-4 py-2 bg-foreground text-background rounded-xl font-black text-xs italic tracking-tighter">{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)}</span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">trên tổng số {totalItems}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              className="w-12 h-12 bg-surface border-2 border-foreground rounded-xl flex items-center justify-center hover:bg-interaction hover:text-white disabled:opacity-30 disabled:hover:bg-surface disabled:hover:text-foreground transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <ChevronLeft className="w-6 h-6 stroke-[3]" />
            </button>
            <div className="flex items-center px-6 py-2 bg-surface border-4 border-foreground rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="font-black text-interaction italic text-xl tracking-tighter">{page}</span>
              <span className="mx-2 font-black opacity-20">/</span>
              <span className="font-black text-foreground italic text-xl tracking-tighter">{totalPages || 1}</span>
            </div>
            <button 
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="w-12 h-12 bg-surface border-2 border-foreground rounded-xl flex items-center justify-center hover:bg-interaction hover:text-white disabled:opacity-30 disabled:hover:bg-surface disabled:hover:text-foreground transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <ChevronRight className="w-6 h-6 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

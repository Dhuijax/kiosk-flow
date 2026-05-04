'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Package, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
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
    void Promise.resolve().then(fetchProducts);
  }, [fetchProducts]);

  const totalPages = Math.ceil(totalItems / pageSize);

  const formatCurrency = (amount: bigint | undefined) => {
    if (amount === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Search & Actions Bar */}
      <div className="glass p-4 rounded-2xl flex items-center justify-between border border-slate-800/50">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-soft transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm theo tên sản phẩm, SKU..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric/50 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchProducts()}
            className="p-2 text-slate-400 hover:text-blue-soft hover:bg-slate-800 rounded-xl transition-all"
            title="Làm mới"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="glass rounded-2xl overflow-hidden border border-slate-800/50 flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Sản phẩm</th>
                <th className="px-6 py-4 font-semibold">SKU</th>
                <th className="px-6 py-4 font-semibold">Giá bán</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-electric border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <Package className="w-12 h-12 text-slate-600" />
                      <p className="text-slate-500">Chưa có sản phẩm nào{selectedCategoryId ? ' trong danh mục này' : ''}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-700/50">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.unit || 'Đơn vị: --'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50">
                        {product.sku || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-blue-soft">{formatCurrency(product.price?.units)}</p>
                      <p className="text-[10px] text-slate-500 italic">Vốn: {formatCurrency(product.costPrice?.units)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {product.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <Eye className="w-3 h-3" />
                          Đang bán
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          <EyeOff className="w-3 h-3" />
                          Ngừng bán
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEdit(product)}
                          className="p-2 text-slate-400 hover:text-blue-soft hover:bg-slate-800 rounded-lg transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
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
        <div className="px-8 py-4 bg-slate-800/10 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Hiển thị </span>
            <span className="font-bold text-slate-400">{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalItems)}</span>
            <span> trên </span>
            <span className="font-bold text-slate-400">{totalItems}</span>
            <span> sản phẩm</span>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition-all border border-slate-700/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <span className="font-bold text-blue-soft">{page}</span>
              <span className="mx-1">/</span>
              <span>{totalPages || 1}</span>
            </div>
            <button 
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition-all border border-slate-700/50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

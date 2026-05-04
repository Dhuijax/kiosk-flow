'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Filter, 
  Settings2, 
  History, 
  ChevronRight,
  Download,
  AlertTriangle,
  Package
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useInventory } from '@/hooks/useInventory';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { ProductService } from '@/gen/product_connect';
import { Product } from '@/gen/product_pb';
import { StockItem } from '@/gen/inventory_pb';
import InventoryStats from '@/components/inventory/InventoryStats';
import StockAdjustmentModal from '@/components/inventory/StockAdjustmentModal';
import StockHistoryModal from '@/components/inventory/StockHistoryModal';

export default function InventoryPage() {
  const { token, tenantId, branchId } = useAuth();
  const { listStock, loading: loadingStock } = useInventory();
  
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  
  // Modals state
  const [adjustmentProduct, setAdjustmentProduct] = useState<{ id: string, name: string, currentQuantity: number, branchId: string } | null>(null);
  const [historyProduct, setHistoryProduct] = useState<{ id: string, name: string, branchId: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!token || !tenantId || !branchId) return;
    
    setLoading(true);
    try {
      const prodClient = getAuthenticatedClient(ProductService, tenantId, token);
      
      const [stockRes, prodRes] = await Promise.all([
        listStock({ branchId, lowStockOnly: false }),
        prodClient.listProducts({ pagination: { pageSize: 100, page: 1 } })
      ]);

      setStockItems(stockRes.items);
      
      const prodMap: Record<string, Product> = {};
      prodRes.products.forEach(p => {
        prodMap[p.id] = p;
      });
      setProducts(prodMap);
      
    } catch (err) {
      console.error('Failed to fetch inventory data:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId, listStock]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    return stockItems.filter(item => {
      const product = products[item.productId];
      if (!product) return false;
      
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isLow = item.quantity <= item.minQuantity;
      
      if (lowStockOnly) return matchesSearch && isLow;
      return matchesSearch;
    });
  }, [stockItems, products, searchQuery, lowStockOnly]);

  const stats = useMemo(() => {
    const low = stockItems.filter(i => i.quantity <= i.minQuantity && i.quantity > 0).length;
    const out = stockItems.filter(i => i.quantity <= 0).length;
    return {
      total: stockItems.length,
      low,
      out,
      recent: 12 // Mock or fetch from history
    };
  }, [stockItems]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Quản lý tồn kho</h1>
          <p className="text-slate-400 text-sm mt-1">Theo dõi biến động và điều chỉnh số lượng hàng hóa</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${loadingStock ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 transition-all font-semibold">
            <Download className="w-4 h-4" />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <InventoryStats 
        totalItems={stats.total}
        lowStockItems={stats.low}
        outOfStockItems={stats.out}
        recentActivityCount={stats.recent}
      />

      {/* Filter Bar */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-soft transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm theo tên sản phẩm hoặc định mã SKU..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric/50 transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium ${
              lowStockOnly 
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Chỉ xem hàng sắp hết</span>
          </button>
          <button className="p-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-slate-200">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass rounded-3xl border border-slate-800/50 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/20 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="px-8 py-5 font-bold">Sản phẩm</th>
                <th className="px-8 py-5 font-bold">Chi nhánh</th>
                <th className="px-8 py-5 font-bold text-center">Tồn thực tế</th>
                <th className="px-8 py-5 font-bold text-center">Định mức</th>
                <th className="px-8 py-5 font-bold">Trạng thái</th>
                <th className="px-8 py-5 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-6">
                      <div className="h-8 bg-slate-800/50 rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Package className="w-16 h-16 text-slate-600" />
                      <p className="text-slate-400 font-medium">Không tìm thấy sản phẩm nào trong kho</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const product = products[item.productId];
                  const isLow = item.quantity <= item.minQuantity;
                  const isOut = item.quantity <= 0;

                  return (
                    <tr key={item.id} className="group hover:bg-slate-800/20 transition-all">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-soft border border-slate-700/50">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-100 group-hover:text-blue-soft transition-colors">{product?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-500 font-mono tracking-tighter">SKU: {product?.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs text-slate-400 font-medium italic">Chi nhánh mặc định</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`text-sm font-bold font-mono ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1 italic">{product?.unit || 'đv'}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="text-xs text-slate-500 font-mono">{item.minQuantity}</span>
                      </td>
                      <td className="px-8 py-5">
                        {isOut ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">Hết hàng</span>
                        ) : isLow ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Sắp hết
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">An toàn</span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => setAdjustmentProduct({
                              id: item.productId,
                              name: product?.name || 'Unknown',
                              currentQuantity: item.quantity,
                              branchId: item.branchId
                            })}
                            className="p-2 text-slate-400 hover:text-blue-soft hover:bg-blue-500/10 rounded-lg transition-all"
                            title="Điều chỉnh"
                          >
                            <Settings2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setHistoryProduct({
                              id: item.productId,
                              name: product?.name || 'Unknown',
                              branchId: item.branchId
                            })}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                            title="Lịch sử"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StockAdjustmentModal 
        isOpen={!!adjustmentProduct}
        onClose={() => setAdjustmentProduct(null)}
        onSuccess={fetchData}
        product={adjustmentProduct}
      />

      <StockHistoryModal 
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        product={historyProduct}
      />
    </div>
  );
}

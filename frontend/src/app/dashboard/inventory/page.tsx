'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Filter, 
  Download,
  AlertTriangle,
  Settings2,
  History,
  Package,
  Sparkles
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
  }, [token, tenantId, branchId, listStock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);


  const filteredData = useMemo(() => {
    return stockItems.filter(item => {
      const product = products[item.productId];
      if (!product) return false;
      
      const matchesSearch = 
        (product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) || 
        (product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const isLow = item.quantity <= item.minQuantity;
      
      if (lowStockOnly) return matchesSearch && isLow;
      return matchesSearch;
    });
  }, [stockItems, products, searchQuery, lowStockOnly]);

  const statsData = useMemo(() => {
    const low = stockItems.filter(i => i.quantity <= i.minQuantity && i.quantity > 0).length;
    const out = stockItems.filter(i => i.quantity <= 0).length;
    return {
      total: stockItems.length,
      low,
      out,
      recent: 12 
    };
  }, [stockItems]);

  const handleExportCSV = useCallback(() => {
    if (filteredData.length === 0) return;

    const headers = ['Mặt hàng', 'SKU', 'Số lượng', 'Đơn vị', 'Định mức', 'Trạng thái'];
    const rows = filteredData.map(item => {
      const product = products[item.productId];
      const status = item.quantity <= 0 ? 'Hết hàng' : item.quantity <= item.minQuantity ? 'Sắp hết' : 'An toàn';
      return [
        `"${product?.name || 'Unknown'}"`,
        `"${product?.sku || 'N/A'}"`,
        item.quantity,
        `"${product?.unit || 'MÓN'}"`,
        item.minQuantity,
        `"${status}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `bao_cao_kho_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredData, products]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary font-black uppercase text-xs tracking-widest">
            <Package className="w-5 h-5" />
            <span>Kho hàng & Tài sản</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            Quản lý <span className="text-interaction">Tồn kho</span>
          </h1>
          <p className="text-foreground/40 font-bold italic">Theo dõi biến động và tối ưu hóa lượng hàng dự trữ.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={fetchData}
            className="w-14 h-14 bg-surface border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-interaction hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-6 h-6 stroke-[3] ${loadingStock ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleExportCSV}
            className="btn-dynamic px-8 py-3 text-sm"
          >
            <Download className="w-5 h-5" />
            <span>XUẤT BÁO CÁO</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <InventoryStats 
        totalItems={statsData.total}
        lowStockItems={statsData.low}
        outOfStockItems={statsData.out}
        recentActivityCount={statsData.recent}
      />

      {/* Filter & Search Bar */}
      <div className="ai-card bg-surface flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 flex items-center gap-4 bg-background px-6 h-14 rounded-2xl border border-foreground/10 group focus-within:bg-white focus-within:border-interaction focus-within:shadow-md transition-all relative overflow-hidden">
          <Search className="w-6 h-6 text-foreground/20 group-focus-within:text-interaction flex-none pointer-events-none translate-y-[1px]" />
          <input 
            type="text" 
            placeholder="TÌM THEO TÊN HOẶC MÃ SKU..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full h-full py-0 font-black text-sm uppercase italic tracking-tighter placeholder:text-foreground/20 leading-none"
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all font-black uppercase italic tracking-tighter text-sm shadow-sm ${
              lowStockOnly 
                ? 'bg-accent text-foreground border-accent' 
                : 'bg-background text-foreground/40 border-foreground/10 hover:border-foreground/40'
            }`}
          >
            <AlertTriangle className="w-5 h-5 stroke-[3]" />
            <span>SẮP HẾT</span>
          </button>
          <button 
            onClick={() => {
              // Quick filter logic: reset all filters
              setSearchQuery('');
              setLowStockOnly(false);
            }}
            className="w-14 h-14 bg-surface border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-interaction hover:text-white transition-all shadow-sm"
            title="Xóa bộ lọc"
          >
            <Filter className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="ai-card p-0 overflow-hidden">
        <div className="p-8 border-b border-foreground/10 flex items-center justify-between">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Package className="w-6 h-6 stroke-[3] text-interaction" />
            Danh sách vật tư
          </h3>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Dự báo tồn kho AI hoạt động</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-foreground/5 text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Mặt hàng</th>
                <th className="px-8 py-6 text-center">Tồn thực tế</th>
                <th className="px-8 py-6 text-center">Định mức</th>
                <th className="px-8 py-6">Tình trạng</th>
                <th className="px-8 py-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10">
                      <div className="h-10 bg-foreground/5 rounded-2xl w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                      <Package className="w-20 h-20" />
                      <p className="text-xl font-black uppercase italic tracking-tighter">Kho hàng trống rỗng</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const product = products[item.productId];
                  const isLow = item.quantity <= item.minQuantity;
                  const isOut = item.quantity <= 0;

                  return (
                    <tr key={item.id} className="group hover:bg-foreground/5 transition-all cursor-pointer">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-background border border-foreground/10 flex items-center justify-center text-primary group-hover:border-interaction group-hover:scale-105 transition-all shadow-sm">
                            <Package className="w-7 h-7 stroke-[2.5]" />
                          </div>
                          <div>
                            <p className="text-lg font-black text-foreground uppercase italic tracking-tighter group-hover:text-interaction transition-all leading-tight">{product?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest mt-1">SKU: {product?.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`text-2xl font-black italic tracking-tighter ${isOut ? 'text-red-500' : isLow ? 'text-accent' : 'text-interaction'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-[10px] text-foreground/40 font-black uppercase tracking-widest ml-2 italic">{product?.unit || 'MÓN'}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-sm font-black text-foreground/30 italic tracking-tighter">{item.minQuantity}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center">
                          {isOut ? (
                            <span className="px-4 py-1.5 rounded-xl text-[10px] font-black bg-red-500 text-white border border-foreground/10 uppercase italic tracking-tighter shadow-sm">Hết hàng</span>
                          ) : isLow ? (
                            <span className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black bg-accent text-foreground border border-foreground/10 uppercase italic tracking-tighter shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-foreground animate-pulse"></span>
                              Sắp hết
                            </span>
                          ) : (
                            <span className="px-4 py-1.5 rounded-xl text-[10px] font-black bg-interaction text-white border border-foreground/10 uppercase italic tracking-tighter shadow-sm">An toàn</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => setAdjustmentProduct({
                              id: item.productId,
                              name: product?.name || 'Unknown',
                              currentQuantity: item.quantity,
                              branchId: item.branchId
                            })}
                            className="w-12 h-12 bg-surface border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-interaction hover:text-white shadow-sm transition-all"
                            title="Điều chỉnh"
                          >
                            <Settings2 className="w-5 h-5 stroke-[3]" />
                          </button>
                          <button 
                            onClick={() => setHistoryProduct({
                              id: item.productId,
                              name: product?.name || 'Unknown',
                              branchId: item.branchId
                            })}
                            className="w-12 h-12 bg-surface border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-accent shadow-sm transition-all"
                            title="Lịch sử"
                          >
                            <History className="w-5 h-5 stroke-[3]" />
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

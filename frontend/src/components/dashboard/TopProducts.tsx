'use client';

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopProductsProps {
  products: TopProduct[];
  loading?: boolean;
}

export default function TopProducts({ products, loading }: TopProductsProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-slate-800/50 rounded-xl" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 text-sm">
        Chưa có dữ liệu sản phẩm
      </div>
    );
  }

  const maxQuantity = Math.max(...products.map(p => p.quantity));

  return (
    <div className="space-y-5">
      {products.map((product, index) => (
        <div key={index} className="group">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm font-bold text-slate-200 group-hover:text-blue-soft transition-colors line-clamp-1">
                {product.name}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                {product.quantity} sản phẩm đã bán
              </p>
            </div>
            <p className="text-sm font-bold text-slate-100">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.revenue)}
            </p>
          </div>
          <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-electric rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(product.quantity / maxQuantity) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

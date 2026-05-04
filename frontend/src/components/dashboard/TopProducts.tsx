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
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-foreground/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-foreground/20 font-black uppercase italic tracking-tighter">
        Chưa có dữ liệu sản phẩm
      </div>
    );
  }

  const maxQuantity = Math.max(...products.map(p => p.quantity));

  return (
    <div className="space-y-6">
      {products.map((product, index) => (
        <div key={index} className="group">
          <div className="flex justify-between items-end mb-3">
            <div className="flex-1 pr-4">
              <p className="text-sm font-black text-foreground uppercase italic tracking-tighter group-hover:text-interaction transition-colors line-clamp-1">
                {product.name}
              </p>
              <p className="text-[10px] text-foreground/40 uppercase tracking-widest font-black italic mt-1">
                {product.quantity} món đã bán
              </p>
            </div>
            <p className="text-sm font-black text-primary tracking-tighter">
              {new Intl.NumberFormat('vi-VN').format(product.revenue)} ₫
            </p>
          </div>
          <div className="h-3 w-full bg-foreground/5 border-2 border-foreground/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-interaction rounded-full transition-all duration-1000 ease-out border-r-2 border-foreground/20"
              style={{ width: `${(product.quantity / maxQuantity) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

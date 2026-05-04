'use client';

import { Package, Plus } from 'lucide-react';
import { Product } from '@/gen/product_pb';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const formatCurrency = (amount: bigint | undefined) => {
    if (amount === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount));
  };

  return (
    <button
      onClick={() => onAddToCart(product)}
      aria-label={product.name}
      className="group relative flex flex-col bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 hover:border-blue-electric/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 active:scale-95 text-left h-full"
    >
      {/* Image Container */}
      <div className="aspect-square relative flex items-center justify-center bg-slate-900/50 overflow-hidden">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <Package className="w-12 h-12 text-slate-700 group-hover:text-slate-600 transition-colors" />
        )}
        
        {/* Quick Add Overlay */}
        <div className="absolute inset-0 bg-blue-electric/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-blue-electric rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <Plus className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <h3 className="font-bold text-slate-100 text-sm md:text-base line-clamp-2 leading-snug group-hover:text-blue-soft transition-colors mb-2">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className="text-blue-soft font-mono font-bold text-lg leading-none">
            {formatCurrency(product.price?.units)}
          </span>
          {product.unit && (
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-2 py-0.5 bg-slate-900/50 rounded-full border border-slate-700/30">
              {product.unit}
            </span>
          )}
        </div>
      </div>
      
      {/* Glow Effect */}
      <div className="absolute -inset-px rounded-2xl border border-transparent group-hover:border-blue-electric/20 pointer-events-none transition-colors" />
    </button>
  );
}

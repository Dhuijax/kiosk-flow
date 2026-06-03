'use client';

import { Package, Plus, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Product } from '@/gen/product_pb';
import { formatVND } from '@/lib/utils/format';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  stockQuantity?: number;
}

export default function ProductCard({ product, onAddToCart, stockQuantity = 999 }: ProductCardProps) {
  const isSoldOut = product.trackInventory && stockQuantity <= 0;
  const t = useTranslations('POSOrder');

  return (
    <button
      onClick={() => !isSoldOut && onAddToCart(product)}
      disabled={isSoldOut}
      aria-label={product.name}
      className={cn(
        "group relative flex flex-col bg-surface border border-foreground/10 rounded-3xl overflow-hidden transition-all duration-300 text-left h-full",
        isSoldOut 
          ? "opacity-60 grayscale cursor-not-allowed shadow-none" 
          : "shadow-sm hover:shadow-xl hover:border-interaction/30 transition-all"
      )}
    >
      {/* Image Container */}
      <div className="aspect-square relative flex items-center justify-center bg-background overflow-hidden border-b border-foreground/5">
        {product.imageUrl ? (
          <Image 
            src={product.imageUrl} 
            alt={product.name} 
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <Package className="w-16 h-16 text-foreground/10" />
        )}
        
        {/* Sold Out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-red-500 border border-white/20 px-6 py-2 rounded-xl shadow-lg -rotate-12">
              <span className="text-white font-black uppercase italic tracking-tighter text-xl">{t('soldOut')}</span>
            </div>
          </div>
        )}

        {/* Intelligence Tag */}
        {!isSoldOut && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-interaction text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Sparkles className="w-3 h-3" />
            <span>{t('smart')}</span>
          </div>
        )}

        {/* Quick Add Badge */}
        {!isSoldOut && (
          <div className="absolute bottom-4 right-4 w-12 h-12 bg-accent border border-foreground/10 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-6 h-6 text-foreground" />
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="p-6 flex-1 flex flex-col justify-between gap-4">
        <h3 className="font-black text-foreground text-lg md:text-xl line-clamp-2 leading-[1.1] uppercase italic tracking-tighter">
          {product.name}
        </h3>
        
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-black opacity-40 mb-1">{t('price')}</span>
            <span className="text-primary font-black text-2xl tracking-tighter leading-tight">
              {formatVND(product.price)}
            </span>
          </div>
          {product.unit && !isSoldOut && (
            <span className="text-[10px] uppercase font-black px-3 py-1 bg-foreground text-background rounded-lg italic">
              {product.unit}
            </span>
          )}
          {product.trackInventory && !isSoldOut && (
            <span className={cn(
              "text-[8px] font-bold px-2 py-0.5 rounded border border-foreground/10",
              stockQuantity < 10 ? "text-red-500 bg-red-50" : "text-foreground/40 bg-foreground/5"
            )}>
              {t('stock', { quantity: stockQuantity })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

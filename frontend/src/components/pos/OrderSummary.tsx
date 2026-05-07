'use client';

import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Sparkles, Mic } from 'lucide-react';
import { useOrderCart } from '@/lib/order/OrderCartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatVND } from '@/lib/utils/format';

export default function OrderSummary({ onCheckout }: { onCheckout?: () => void }) {
  const { items, removeItem, updateQuantity, subtotal, total, tax } = useOrderCart();
  const [isListening, setIsListening] = React.useState(false);

  const formatCurrency = (value: number) => {
    return formatVND(value);
  };

  return (
    <div aria-label="Tóm tắt đơn hàng" className="w-[480px] bg-surface flex flex-col hidden lg:flex h-full border-l border-foreground/10 relative">
      {/* AI Assistance Header */}
      <div className="p-8 flex items-center justify-between border-b border-foreground/10 bg-accent/5">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-foreground flex items-center gap-3 italic uppercase tracking-tighter">
            <ShoppingCart className="w-8 h-8 text-primary stroke-[3]" />
            Đơn hàng
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Hệ thống AI đang hỗ trợ...</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                alert("Trình duyệt của bạn không hỗ trợ nhận dạng giọng nói.");
                return;
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
              const recognition = new SpeechRecognition();
              recognition.lang = 'vi-VN';
              recognition.interimResults = false;
              
              recognition.onstart = () => setIsListening(true);
              recognition.onend = () => setIsListening(false);
              recognition.onerror = () => {
                setIsListening(false);
                alert("Không thể nhận diện giọng nói, vui lòng thử lại.");
              };
              
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                alert(`AI nhận diện: "${transcript}"\n(Tính năng gọi món tự động bằng NLP đang được phát triển)`);
              };
              
              recognition.start();
            }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-sm",
              isListening ? "bg-red-500 animate-pulse" : "bg-interaction"
            )}
            title="Gọi món bằng giọng nói"
          >
            <Mic size={18} />
          </button>
          <span className="px-4 py-1.5 bg-foreground text-background rounded-xl text-sm font-black uppercase tracking-tighter">
            {items.reduce((acc, item) => acc + item.quantity, 0)} MÓN
          </span>
        </div>
      </div>
      
      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-6 gap-6"
            >
              <div className="w-32 h-32 bg-background border border-foreground/10 rounded-3xl flex items-center justify-center relative">
                <ShoppingCart className="w-16 h-16 text-foreground/20" />
                <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-accent animate-float" />
              </div>
              <div className="space-y-2">
                <p className="font-black text-foreground text-2xl uppercase tracking-tighter italic">Giỏ hàng đang trống</p>
                <p className="text-sm font-bold opacity-40">Nói &quot;Gợi ý cho tôi món trà ngon&quot; <br /> để bắt đầu trải nghiệm AI</p>

              </div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-background p-6 rounded-3xl border border-foreground/10 shadow-sm group relative"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-black text-foreground text-xl uppercase italic tracking-tighter leading-tight">{item.name}</h3>
                      {item.selectedToppings.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.selectedToppings.map((t) => (
                            <span key={t.id} className="text-[10px] font-black uppercase italic tracking-tighter bg-interaction/10 text-interaction px-2 py-0.5 rounded-lg border border-interaction/20">
                              + {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-primary text-lg font-black tracking-tighter mt-1">{formatCurrency(item.price)}</p>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/50"
                    >
                      <Trash2 size={20} className="stroke-[3]" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-white rounded-2xl border border-foreground/10 p-1 gap-6">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-3 text-foreground hover:bg-interaction hover:text-white rounded-xl transition-all"
                      >
                        <Minus size={20} className="stroke-[4]" />
                      </button>
                      <span className="w-12 text-center text-2xl font-black text-foreground">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-3 text-foreground hover:bg-interaction hover:text-white rounded-xl transition-all"
                      >
                        <Plus size={20} className="stroke-[4]" />
                      </button>
                    </div>
                    <p className="font-black text-foreground text-2xl tracking-tighter">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / Summary */}
      <div className="p-8 border-t border-foreground/10 bg-background">
        <div className="space-y-4 mb-8">
          <div className="flex justify-between text-foreground/60 font-black uppercase text-sm tracking-tighter">
            <span>Tạm tính</span>
            <span className="">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-foreground/60 font-black uppercase text-sm tracking-tighter">
            <span>Thuế (10%)</span>
            <span className="">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-foreground font-black text-4xl pt-6 mt-2 border-t border-foreground/10 uppercase italic tracking-tighter">
            <span>TỔNG</span>
            <span className="text-interaction">{formatCurrency(total)}</span>
          </div>
        </div>
        
        <button 
          onClick={onCheckout}
          disabled={items.length === 0}
          className={cn(
            "w-full py-8 flex items-center justify-center gap-4 rounded-3xl font-black text-2xl uppercase italic tracking-tighter transition-all border",
            items.length > 0 
              ? "bg-primary text-white border-primary shadow-lg hover:bg-primary/90 transition-all" 
              : "bg-muted text-foreground/20 border-foreground/10 cursor-not-allowed"
          )}
        >
          <CreditCard size={28} className="stroke-[3]" />
          XÁC NHẬN ĐƠN HÀNG
        </button>
      </div>
    </div>
  );
}

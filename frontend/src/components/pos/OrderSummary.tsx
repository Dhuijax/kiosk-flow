'use client';

import React from 'react';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Sparkles, Mic } from 'lucide-react';
import { useOrderCart } from '@/lib/order/OrderCartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatVND } from '@/lib/utils/format';
import CustomerSelector from './CustomerSelector';
import { Customer } from '@/gen/customer_pb';

interface OrderSummaryProps {
  onCheckout?: () => void;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
}

export default function OrderSummary({ onCheckout, selectedCustomer, onCustomerSelect }: OrderSummaryProps) {
  const { items, removeItem, updateQuantity, subtotal } = useOrderCart();
  const [isListening, setIsListening] = React.useState(false);

  const formatCurrency = (value: number) => {
    return formatVND(value);
  };

  // Loyalty & Combo Discount logic
  const hasPastry = items.some(i => i.name.toLowerCase().includes('bánh') || i.name.toLowerCase().includes('croissant') || i.name.toLowerCase().includes('muffin') || i.name.toLowerCase().includes('cookie') || i.name.toLowerCase().includes('bánh sừng bò'));
  const hasBeverage = items.some(i => i.name.toLowerCase().includes('trà') || i.name.toLowerCase().includes('coffee') || i.name.toLowerCase().includes('latte') || i.name.toLowerCase().includes('ly') || i.name.toLowerCase().includes('sữa') || i.name.toLowerCase().includes('matcha'));
  const hasCombo = hasPastry && hasBeverage;

  const comboDiscount = hasCombo ? subtotal * 0.15 : 0;
  const memberDiscount = selectedCustomer ? subtotal * 0.05 : 0;
  const totalDiscount = comboDiscount + memberDiscount;
  
  const finalTax = (subtotal - totalDiscount) * 0.1;
  const finalTotal = subtotal - totalDiscount + finalTax;

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

      {/* Customer Selection */}
      <div className="p-8 border-b border-foreground/10 bg-background">
        <CustomerSelector 
          selectedCustomer={selectedCustomer}
          onSelect={onCustomerSelect}
        />
        
        {/* Loyalty details */}
        {selectedCustomer && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between text-xs font-black uppercase tracking-tighter"
          >
            <div className="space-y-1 text-left">
              <p className="text-primary">Hạng: VÀNG (Gold Member)</p>
              <p className="opacity-65">Tích lũy: {selectedCustomer.points} Điểm</p>
            </div>
            <div className="text-right">
              <p className="text-green-600 font-black">+ {Math.round(finalTotal / 1000)} ĐIỂM</p>
              <p className="text-[10px] opacity-40">Tích lũy từ đơn này</p>
            </div>
          </motion.div>
        )}
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
              {/* Combo Alerts */}
              {hasCombo ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-green-50 border border-green-200/50 rounded-2xl flex items-center gap-3 text-left"
                >
                  <Sparkles className="w-5 h-5 text-green-600 animate-pulse flex-none" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-tighter text-green-700">Đã áp dụng Combo Giảm Giá 15%!</p>
                    <p className="text-[10px] font-bold text-green-600/70 leading-normal">
                      Sự kết hợp nước và bánh giúp tiết kiệm {formatCurrency(comboDiscount)}.
                    </p>
                  </div>
                </motion.div>
              ) : items.length > 0 && !hasPastry && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-accent/15 border border-accent/30 rounded-2xl flex items-center gap-3 text-left animate-in fade-in"
                >
                  <Sparkles className="w-5 h-5 text-primary flex-none animate-bounce" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-tighter text-foreground">Gợi ý Combo Ăn Sáng!</p>
                    <p className="text-[10px] font-bold opacity-60 leading-normal">
                      Thêm bánh ngọt bất kỳ để nhận ưu đãi giảm 15% tổng hóa đơn.
                    </p>
                  </div>
                </motion.div>
              )}

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

          {hasCombo && (
            <div className="flex justify-between text-green-600 font-black uppercase text-sm tracking-tighter">
              <span>Ưu đãi Combo (15%)</span>
              <span>- {formatCurrency(comboDiscount)}</span>
            </div>
          )}
          
          {selectedCustomer && (
            <div className="flex justify-between text-green-600 font-black uppercase text-sm tracking-tighter">
              <span>Chiết khấu Thành viên (5%)</span>
              <span>- {formatCurrency(memberDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between text-foreground/60 font-black uppercase text-sm tracking-tighter">
            <span>Thuế (10%)</span>
            <span className="">{formatCurrency(finalTax)}</span>
          </div>
          <div className="flex justify-between text-foreground font-black text-4xl pt-6 mt-2 border-t border-foreground/10 uppercase italic tracking-tighter">
            <span>TỔNG</span>
            <span className="text-interaction">{formatCurrency(finalTotal)}</span>
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

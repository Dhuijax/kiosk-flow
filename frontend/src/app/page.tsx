'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mic, ArrowRight, Sparkles, Coffee, Utensils, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const [isListening, setIsListening] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);

  const handleMicClick = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setIntent("Gợi ý cho tôi món gì đó nhẹ nhàng buổi chiều?");
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-accent selection:text-accent-foreground">
      {/* Navigation */}
      <nav className="nav-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary border border-foreground/20 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">KioskFlow <span className="text-interaction">AI</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-black uppercase text-sm tracking-widest italic">
          <Link href="#features" className="hover:text-interaction transition-colors">Tính năng</Link>
          <Link href="#operations" className="hover:text-interaction transition-colors">Vận hành</Link>
          <Link href="/auth/login" className="px-6 py-3 bg-foreground text-background rounded-xl hover:bg-interaction transition-all">Đăng nhập</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="features" className="relative pt-20 pb-32 px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-20">
          <div className="flex-1 space-y-12 z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-interaction/10 border border-interaction/30 rounded-full text-interaction font-black text-xs uppercase tracking-widest">
              <Zap className="w-4 h-4" />
              <span>Next-Gen Conversational Kiosk</span>
            </div>
            
            <h1 className="text-6xl md:text-9xl font-black leading-tight tracking-tighter uppercase italic">
              Bán hàng <br />
              <span className="text-primary">Bằng hơi thở</span>
            </h1>
            
            <p className="text-xl md:text-2xl font-bold max-w-xl leading-relaxed opacity-80">
              KioskFlow AI không chỉ là màn hình chạm. Nó lắng nghe, thấu hiểu và gợi ý món ăn dựa trên cảm xúc của khách hàng.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Link 
                href="/pos/order" 
                className="btn-dynamic text-xl px-12 py-6"
              >
                Trải nghiệm ngay <ArrowRight className="w-6 h-6" />
              </Link>
              
              <div className="flex items-center gap-4 p-2 bg-foreground/5 border border-foreground/10 rounded-2xl">
                <div className="w-12 h-12 bg-white border border-foreground/10 rounded-xl flex items-center justify-center font-black">
                  +50
                </div>
                <div className="text-xs font-black uppercase tracking-tighter opacity-60">
                  Thương hiệu đã <br /> chuyển đổi AI
                </div>
              </div>
            </div>
          </div>

          {/* AI Visualizer Container */}
          <div className="flex-1 relative flex items-center justify-center">
            <div className="absolute -inset-20 bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
            
            <div className="relative flex flex-col items-center gap-12">
              {/* Mic Button Component */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMicClick}
                className={`mic-button ${isListening ? 'listening' : ''}`}
              >
                <Mic className={`w-12 h-12 ${isListening ? 'text-white' : 'text-foreground'}`} />
              </motion.button>
              
              <div className="text-center space-y-2">
                <p className="font-black uppercase tracking-widest text-sm opacity-40">
                  {isListening ? 'Đang lắng nghe...' : 'Chạm để nói chuyện'}
                </p>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div 
                      key={i}
                      animate={isListening ? { height: [8, 32, 12, 24, 8] } : { height: 8 }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1.5 bg-interaction rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Dynamic Intent Card */}
              <AnimatePresence>
                {intent && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ai-card w-full max-w-md border-interaction"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-interaction rounded-full flex items-center justify-center flex-none">
                        <Sparkles className="text-white w-5 h-5" />
                      </div>
                      <div className="space-y-4">
                        <p className="font-bold text-lg leading-snug italic">{intent}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-background rounded-xl border border-foreground/10 flex flex-col gap-2">
                            <Coffee className="w-5 h-5 text-primary" />
                            <span className="font-black text-xs uppercase">Latte Hạnh Nhân</span>
                          </div>
                          <div className="p-3 bg-background rounded-xl border border-foreground/10 flex flex-col gap-2">
                            <Utensils className="w-5 h-5 text-primary" />
                            <span className="font-black text-xs uppercase">Bánh Sừng Bò</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Grid */}
      <section id="operations" className="bg-foreground text-background py-32 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter uppercase italic">
              AI Chữa Lành <br /> Quy trình vận hành
            </h2>
            <div className="w-24 h-4 bg-accent"></div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-2xl font-black text-accent uppercase italic">Thấu hiểu Intent</h4>
            <p className="font-medium opacity-70">Giao diện tự lắp ghép linh hoạt dựa trên yêu cầu của khách hàng qua giọng nói.</p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-2xl font-black text-accent uppercase italic">Dễ dàng & Chạm nhẹ</h4>
            <p className="font-medium opacity-70">Giảm thiểu tối đa các bước thao tác truyền thống, thay bằng trải nghiệm hội thoại.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-12 text-center font-black uppercase text-xs tracking-widest opacity-30">
        © 2026 KioskFlow Technologies • AI Intent-Driven System
      </footer>
    </main>
  );
}

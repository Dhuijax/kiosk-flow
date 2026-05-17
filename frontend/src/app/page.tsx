'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Mic, 
  ArrowRight, 
  Sparkles, 
  Coffee, 
  Utensils, 
  Zap, 
  Sun, 
  Brain, 
  Heart, 
  Cookie,
  CheckCircle,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOTIONS = [
  {
    id: 'tired',
    label: 'Mệt mỏi, cần năng lượng',
    icon: Brain,
    prompt: 'Tôi thấy mệt mỏi quá, gợi ý món gì hồi sức tỉnh táo nhanh đi?',
    recommendation: {
      title: 'Combo Đánh Thức Năng Lượng ⚡',
      desc: 'Sự kết hợp hoàn hảo giữa Caffeine đậm đà từ hạt Arabica hảo hạng và tinh bột cung cấp năng lượng tức thì.',
      items: [
        { name: 'Latte Hạnh Nhân', price: '45.000đ', icon: Coffee },
        { name: 'Bánh Sừng Bò Hạnh Nhân', price: '32.000đ', icon: Utensils }
      ],
      total: '77.000đ'
    }
  },
  {
    id: 'hot',
    label: 'Nóng bức, cần thanh nhiệt',
    icon: Sun,
    prompt: 'Thời tiết nắng nóng quá, có đồ uống gì mát lạnh thanh lọc cơ thể không?',
    recommendation: {
      title: 'Combo Thanh Nhiệt Sảng Khoái ❄️',
      desc: 'Giúp giải nhiệt lập tức với trà ủ lạnh kết hợp trái cây tươi mọng nước, đi kèm bánh mousse nhẹ nhàng thanh mát.',
      items: [
        { name: 'Trà Đào Cam Sả Đá', price: '39.000đ', icon: Coffee },
        { name: 'Bánh Mousse Chanh Leo', price: '29.000đ', icon: Cookie }
      ],
      total: '68.000đ'
    }
  },
  {
    id: 'sweet',
    label: 'Thèm ngọt, cần chiều chuộng',
    icon: Cookie,
    prompt: 'Chiều nay thấy thèm đồ ngọt quá, đề xuất bánh nước kết hợp đi?',
    recommendation: {
      title: 'Combo Chiều Chuộng Vị Giác 🧁',
      desc: 'Trà sữa matcha thơm béo sánh mịn cùng bánh muffin socola ngọt ngào, xoa dịu mọi căng thẳng cuối ngày.',
      items: [
        { name: 'Trà Sữa Matcha Trân Châu', price: '42.000đ', icon: Coffee },
        { name: 'Bánh Muffin Socola Đậm', price: '35.000đ', icon: Utensils }
      ],
      total: '77.000đ'
    }
  },
  {
    id: 'stress',
    label: 'Căng thẳng, cần bình yên',
    icon: Heart,
    prompt: 'Công việc căng thẳng quá, gợi ý đồ uống gì dịu nhẹ ấm áp được không?',
    recommendation: {
      title: 'Combo Bình Yên Thư Giãn 🍃',
      desc: 'Trà hoa cúc mật ong ấm nóng giúp an thần, giải tỏa stress kết hợp cùng bánh cookie yến mạch ít ngọt lành mạnh.',
      items: [
        { name: 'Trà Hoa Cúc Mật Ong', price: '35.000đ', icon: Coffee },
        { name: 'Cookie Yến Mạch Ngũ Cốc', price: '25.000đ', icon: Cookie }
      ],
      total: '60.000đ'
    }
  }
];

export default function LandingPage() {
  const [isListening, setIsListening] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<typeof EMOTIONS[0]['recommendation'] | null>(null);
  const [isOrdered, setIsOrdered] = useState(false);

  const handleEmotionClick = (emotion: typeof EMOTIONS[0]) => {
    if (isListening) return;
    setIsListening(true);
    setIntent(emotion.prompt);
    setSelectedEmotion(emotion.id);
    setRecommendation(null);
    setIsOrdered(false);

    setTimeout(() => {
      setIsListening(false);
      setRecommendation(emotion.recommendation);
    }, 1800);
  };

  const handleMicClick = () => {
    if (isListening) return;
    const randomIndex = Math.floor(Math.random() * EMOTIONS.length);
    handleEmotionClick(EMOTIONS[randomIndex]);
  };

  const handleOrderTest = () => {
    setIsOrdered(true);
  };

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-accent selection:text-accent-foreground relative">
      {/* Decorative Floating Mesh Backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[160px] -z-10 pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-interaction/5 rounded-full blur-[140px] -z-10 pointer-events-none" />

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
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center gap-20">
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
              KioskFlow AI không chỉ là màn hình chạm. Hệ thống thấu hiểu cảm xúc, tối ưu hóa nguyên liệu (BOM) và tự động khấu trừ kho trong tích tắc.
            </p>

            {/* Quick Emotion Pills Selector */}
            <div className="space-y-4">
              <p className="font-black uppercase tracking-widest text-xs opacity-50">Chọn nhanh trạng thái cảm xúc của bạn:</p>
              <div className="flex flex-wrap gap-3">
                {EMOTIONS.map((emotion) => {
                  const Icon = emotion.icon;
                  const isActive = selectedEmotion === emotion.id;
                  return (
                    <button
                      key={emotion.id}
                      onClick={() => handleEmotionClick(emotion)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-black transition-all ${
                        isActive 
                          ? 'bg-interaction border-interaction text-white shadow-md scale-105' 
                          : 'bg-surface hover:bg-muted border-foreground/10 text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{emotion.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
              <Link 
                href="/pos/order" 
                className="btn-dynamic text-xl px-12 py-6"
              >
                Trải nghiệm POS <ArrowRight className="w-6 h-6" />
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
          <div className="flex-1 relative flex items-center justify-center w-full min-h-[500px]">
            <div className="absolute -inset-10 bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
            
            <div className="relative flex flex-col items-center gap-12 w-full max-w-lg">
              {/* Mic Button Component with Wave Effects */}
              <div className="relative">
                {isListening && (
                  <>
                    <motion.div 
                      animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 bg-interaction/30 rounded-full"
                    />
                    <motion.div 
                      animate={{ scale: [1, 2.4, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                      className="absolute inset-0 bg-interaction/20 rounded-full"
                    />
                  </>
                )}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMicClick}
                  className={`mic-button z-10 relative ${isListening ? 'bg-interaction text-white' : ''}`}
                >
                  <Mic className={`w-12 h-12 ${isListening ? 'text-white' : 'text-foreground'}`} />
                </motion.button>
              </div>
              
              <div className="text-center space-y-2">
                <p className="font-black uppercase tracking-widest text-sm opacity-40">
                  {isListening ? 'Đang lắng nghe cảm xúc...' : 'Chạm Mic hoặc chọn trạng thái cảm xúc'}
                </p>
                <div className="flex justify-center gap-1.5 h-8 items-center">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <motion.div 
                      key={i}
                      animate={isListening ? { height: [8, 36, 10, 28, 8] } : { height: 8 }}
                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.08 }}
                      className="w-1.5 bg-interaction rounded-full"
                    />
                  ))}
                </div>
              </div>

              {/* Dynamic Intent Card & Recommendations */}
              <AnimatePresence mode="wait">
                {intent && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="w-full space-y-6"
                  >
                    {/* User Voice Bubble */}
                    <div className="bg-foreground/5 border border-foreground/10 rounded-2xl p-5 italic font-bold text-lg text-left relative max-w-[90%] self-start">
                      &quot;{intent}&quot;
                    </div>

                    {/* AI Recommendation Card */}
                    {recommendation && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="ai-card border-interaction bg-white/75 backdrop-blur-md shadow-lg border-2"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                            <h3 className="font-black text-xl text-interaction italic uppercase tracking-tighter flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-accent fill-accent" />
                              {recommendation.title}
                            </h3>
                            <span className="bg-primary/10 text-primary text-xs font-black uppercase px-3 py-1 rounded-lg">AI Match 98%</span>
                          </div>

                          <p className="text-sm font-bold opacity-80 leading-relaxed text-left">{recommendation.desc}</p>

                          <div className="space-y-3">
                            {recommendation.items.map((item, idx) => {
                              const ItemIcon = item.icon;
                              return (
                                <div key={idx} className="flex items-center justify-between p-3.5 bg-background/50 border border-foreground/5 rounded-xl hover:bg-background/80 transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white border border-foreground/10 rounded-lg flex items-center justify-center">
                                      <ItemIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="font-black text-sm uppercase">{item.name}</span>
                                  </div>
                                  <span className="font-black text-sm text-primary">{item.price}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Order Action Button */}
                          <div className="pt-2 border-t border-foreground/10 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-black uppercase opacity-40 text-left">Tổng combo</p>
                              <p className="text-2xl font-black text-foreground">{recommendation.total}</p>
                            </div>
                            
                            {!isOrdered ? (
                              <button 
                                onClick={handleOrderTest}
                                className="flex-1 py-4 bg-interaction hover:bg-interaction/90 text-white rounded-2xl font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-2"
                              >
                                <ShoppingBag className="w-5 h-5" />
                                Đặt thử ngay
                              </button>
                            ) : (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-5 h-5" />
                                Đã thêm vào giỏ!
                              </motion.div>
                            )}
                          </div>

                          {isOrdered && (
                            <motion.p 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-[11px] font-bold text-green-600 bg-green-50 border border-green-200/50 p-3 rounded-xl"
                            >
                              🎉 Nguyên liệu cho các món trong combo này đã được hệ thống **khấu trừ thông minh tự động (S33 BOM)** trong cơ sở dữ liệu kho POS!
                            </motion.p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Grid */}
      <section id="operations" className="bg-foreground text-background py-32 px-8 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter uppercase italic">
              Kiến trúc Vận hành <br />
              <span className="text-accent">Thời gian thực</span>
            </h2>
            <div className="w-24 h-4 bg-accent"></div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-2xl font-black text-accent uppercase italic">BOM Khấu Trừ Tự Động</h4>
            <p className="font-medium opacity-70">Nguyên liệu được khấu trừ tự động ngay khi trạng thái hóa đơn POS chuyển thành COMPLETED.</p>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-2xl font-black text-accent uppercase italic">Cảnh Báo Tự Động</h4>
            <p className="font-medium opacity-70">Hệ thống gửi cảnh báo hạn dùng và hết hàng thông minh ngay lên trang tổng quan Dashboard.</p>
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

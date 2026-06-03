'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
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
  ShoppingBag,
  TrendingUp,
  Layers,
  Grid,
  Info
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

const PLAYGROUND_INGREDIENTS = [
  {
    id: 'arabica',
    name: 'Hạt cà phê Arabica',
    stock: '15.4 kg',
    unit: 'g',
    status: 'Đủ dùng',
    products: [
      { name: 'Espresso', amount: '18g' },
      { name: 'Latte Hạnh Nhân', amount: '18g' }
    ]
  },
  {
    id: 'milk',
    name: 'Sữa tươi thanh trùng',
    stock: '2.1 lít',
    unit: 'ml',
    status: 'Cảnh báo thấp ⚠️',
    products: [
      { name: 'Latte Hạnh Nhân', amount: '150ml' }
    ]
  },
  {
    id: 'matcha',
    name: 'Bột Matcha Uji',
    stock: '0.8 kg',
    unit: 'g',
    status: 'Đủ dùng',
    products: [
      { name: 'Trà Sữa Matcha', amount: '8g' }
    ]
  },
  {
    id: 'peach',
    name: 'Đào ngâm lát',
    stock: '5 lon',
    unit: 'miếng',
    status: 'Đủ dùng',
    products: [
      { name: 'Trà Đào Cam Sả', amount: '3 miếng' }
    ]
  }
];

export default function LandingPage() {
  const [isListening, setIsListening] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<typeof EMOTIONS[0]['recommendation'] | null>(null);
  const [isOrdered, setIsOrdered] = useState(false);

  // ROI Calculator State
  const [revenue, setRevenue] = useState(150000000);
  const [wastePercent, setWastePercent] = useState(12);

  // Playground Sandbox State
  const [activePlaygroundTab, setActivePlaygroundTab] = useState<'sales' | 'tables' | 'ingredients'>('sales');
  const [playgroundTables, setPlaygroundTables] = useState([
    { id: 'T1', name: 'Bàn 1', status: 'serving', order: '2x Latte, 1x Croissant', total: '122.000đ', time: '15 phút' },
    { id: 'T2', name: 'Bàn 2', status: 'empty', order: '', total: '0đ', time: '' },
    { id: 'T3', name: 'Bàn 3', status: 'waiting', order: '1x Matcha, 1x Muffin', total: '77.000đ', time: '3 phút' },
    { id: 'T4', name: 'Bàn 4', status: 'serving', order: '1x Trà Đào, 1x Mousse', total: '68.000đ', time: '28 phút' },
    { id: 'T5', name: 'Bàn 5', status: 'empty', order: '', total: '0đ', time: '' },
    { id: 'T6', name: 'Bàn 6', status: 'waiting', order: '2x Espresso', total: '70.000đ', time: '8 phút' },
  ]);
  const [selectedTableId, setSelectedTableId] = useState('T1');
  const [activeIngredientId, setActiveIngredientId] = useState('arabica');
  const [playgroundMessage, setPlaygroundMessage] = useState<string | null>(null);

  const handleCheckoutPlaygroundTable = (tableId: string) => {
    setPlaygroundTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return { ...t, status: 'empty', order: '', total: '0đ', time: '' };
      }
      return t;
    }));
    
    const table = playgroundTables.find(t => t.id === tableId);
    setPlaygroundMessage(`🎉 Đã thanh toán đơn hàng ${table?.total} tại ${table?.name}! Hệ thống KioskFlow vừa tự động trừ kho nguyên liệu chuẩn (BOM S33) thành công!`);
    
    setTimeout(() => {
      setPlaygroundMessage(null);
    }, 4500);
  };

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
          <LanguageSwitcher />
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

      {/* Interactive ROI Calculator Section */}
      <section className="py-24 px-8 bg-surface/50 border-t border-b border-foreground/5 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-full mb-2">
              Tối ưu hóa Lợi nhuận
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-tight">
              Công cụ tính <span className="text-interaction">Hiệu quả đầu tư (ROI)</span>
            </h2>
            <p className="font-bold opacity-75">
              Khám phá số tiền tiết kiệm được từ việc hạn chế thất thoát nguyên liệu nhờ sự phối hợp chặt chẽ giữa **Công thức định lượng (BOM S33)** và **Cảnh báo kho tự động (S34)** của KioskFlow.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Input Sliders */}
            <div className="lg:col-span-7 space-y-8 bg-white/60 backdrop-blur-md border border-foreground/10 p-8 rounded-3xl shadow-sm">
              <h3 className="text-2xl font-black uppercase italic tracking-tight text-primary flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-interaction" />
                Thông số vận hành hiện tại
              </h3>

              {/* Monthly Revenue Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black uppercase tracking-wider opacity-70">Doanh thu hàng tháng</label>
                  <span className="font-black text-xl text-foreground bg-primary/10 px-4 py-1.5 rounded-xl">
                    {revenue.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <input 
                  type="range" 
                  min="50000000" 
                  max="500000000" 
                  step="10000000"
                  value={revenue} 
                  onChange={(e) => setRevenue(Number(e.target.value))}
                  className="w-full h-2 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-interaction"
                />
                <div className="flex justify-between text-xs font-bold opacity-40">
                  <span>50 Triệu</span>
                  <span>250 Triệu</span>
                  <span>500 Triệu</span>
                </div>
              </div>

              {/* Material Loss Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black uppercase tracking-wider opacity-70">Tỷ lệ thất thoát nguyên liệu cũ</label>
                  <span className="font-black text-xl text-red-600 bg-red-50 px-4 py-1.5 rounded-xl border border-red-100">
                    {wastePercent}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="25" 
                  step="1"
                  value={wastePercent} 
                  onChange={(e) => setWastePercent(Number(e.target.value))}
                  className="w-full h-2 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-xs font-bold opacity-40">
                  <span>5% (Khá tốt)</span>
                  <span>15% (Trung bình)</span>
                  <span>25% (Rất cao)</span>
                </div>
              </div>

              <div className="text-xs font-bold text-foreground/60 bg-foreground/5 p-4 rounded-xl flex gap-2 items-start">
                <Info className="w-4 h-4 text-interaction shrink-0 mt-0.5" />
                <p>
                  Tỷ lệ thất thoát nguyên liệu ở các quán vận hành truyền thống thường dao động ở mức **8% - 15%** do không chuẩn hóa định lượng món ăn và không kiểm soát được hạn sử dụng hàng nhập.
                </p>
              </div>
            </div>

            {/* Calculations Result */}
            <div className="lg:col-span-5 bg-foreground text-background p-8 rounded-3xl space-y-8 relative overflow-hidden shadow-xl">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-interaction/20 rounded-full blur-3xl pointer-events-none" />

              <h3 className="text-2xl font-black uppercase italic tracking-tight text-accent">
                Dự phóng Tiết kiệm
              </h3>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Thất thoát hiện tại (Ước tính)</p>
                  <p className="text-2xl font-black text-red-400 line-through">
                    {(revenue * (wastePercent / 100)).toLocaleString('vi-VN')}đ <span className="text-xs">/tháng</span>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Thất thoát với KioskFlow (1.5%)</p>
                  <p className="text-2xl font-black text-green-400">
                    {(revenue * 0.015).toLocaleString('vi-VN')}đ <span className="text-xs">/tháng</span>
                  </p>
                </div>

                <div className="pt-6 border-t border-background/10 space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-widest text-accent">Lợi nhuận giữ lại mỗi tháng</p>
                  <p className="text-4xl font-black text-white tracking-tighter">
                    {Math.round(revenue * (wastePercent / 100 - 0.015)).toLocaleString('vi-VN')}đ
                  </p>
                </div>

                <div className="p-4 bg-background/5 border border-background/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">Lũy kế tiết kiệm hàng năm</p>
                    <p className="text-xl font-black text-accent">
                      {Math.round(revenue * (wastePercent / 100 - 0.015) * 12).toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-accent text-foreground rounded-xl flex items-center justify-center font-black text-lg">
                    🏆
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Sandbox Dashboard Playground Section */}
      <section className="py-24 px-8 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-block px-4 py-1.5 bg-interaction/10 border border-interaction/20 text-interaction text-xs font-black uppercase tracking-widest rounded-full mb-2">
              Trải nghiệm thực tế
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-tight">
              Bảng điều khiển <span className="text-primary">Sandbox Playground</span>
            </h2>
            <p className="font-bold opacity-75">
              Trải nghiệm trực quan một phiên bản rút gọn của hệ quản trị KioskFlow ngay tại đây mà không cần đăng ký tài khoản.
            </p>
          </div>

          <div className="bg-white border border-foreground/10 rounded-3xl shadow-sm overflow-hidden min-h-[500px] flex flex-col text-foreground">
            {/* Top Toolbar Tabs */}
            <div className="bg-foreground/5 border-b border-foreground/10 p-4 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                {[
                  { id: 'sales', label: 'Báo cáo Doanh thu', icon: TrendingUp },
                  { id: 'tables', label: 'Sơ đồ Bàn POS', icon: Grid },
                  { id: 'ingredients', label: 'Công thức & Kho BOM', icon: Layers }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activePlaygroundTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActivePlaygroundTab(tab.id as 'sales' | 'tables' | 'ingredients')}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-foreground text-background shadow-md' 
                          : 'hover:bg-foreground/10 text-foreground/75'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-xs font-black uppercase text-interaction tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-interaction animate-ping"></span>
                <span>Sandbox Mode Active</span>
              </div>
            </div>

            {/* Playground Content Area */}
            <div className="p-8 flex-1 flex flex-col justify-between">
              <AnimatePresence mode="wait">
                {activePlaygroundTab === 'sales' && (
                  <motion.div 
                    key="sales" 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-black uppercase tracking-tight text-primary">Phân tích doanh số tuần qua</h4>
                        <p className="text-xs font-bold opacity-60">Dữ liệu thời gian thực được tổng hợp từ Kiosk POS</p>
                      </div>
                      <span className="bg-green-100 text-green-700 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1">
                        +18.4% Tuần trước
                      </span>
                    </div>

                    {/* Simple Visual Mini Graph */}
                    <div className="h-64 border border-foreground/10 rounded-2xl p-6 flex items-end justify-between bg-surface/30 relative">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
                        {[1, 2, 3, 4].map(i => <div key={i} className="border-b border-foreground/5 w-full h-0" />)}
                      </div>

                      {[
                        { day: 'Thứ 2', val: 65, amount: '12.4M' },
                        { day: 'Thứ 3', val: 40, amount: '8.2M' },
                        { day: 'Thứ 4', val: 85, amount: '18.5M', peak: true },
                        { day: 'Thứ 5', val: 55, amount: '11.0M' },
                        { day: 'Thứ 6', val: 95, amount: '22.1M', peak: true },
                        { day: 'Thứ 7', val: 120, amount: '35.4M', peak: true },
                        { day: 'Chủ Nhật', val: 110, amount: '31.2M', peak: true }
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-3 z-10 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-12 scale-0 group-hover:scale-100 transition-all bg-foreground text-background px-3 py-1.5 rounded-lg text-[10px] font-black pointer-events-none shadow-md">
                            {item.amount}
                          </div>
                          
                          <div className="w-8 sm:w-12 bg-foreground/10 hover:bg-interaction/20 rounded-t-lg h-44 flex items-end transition-all cursor-pointer">
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${item.val}%` }}
                              transition={{ delay: idx * 0.05, duration: 0.8 }}
                              className={`w-full rounded-t-lg ${item.peak ? 'bg-interaction' : 'bg-primary'}`}
                            />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activePlaygroundTab === 'tables' && (
                  <motion.div 
                    key="tables" 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -15 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    {/* Tables Grid Map */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase tracking-wider opacity-60">Sơ đồ bàn thời gian thực (6 bàn)</h4>
                        <span className="text-xs font-black text-interaction bg-interaction/5 px-2.5 py-1 rounded-lg">Bấm chọn bàn để xem bill</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        {playgroundTables.map(table => {
                          const isSelected = selectedTableId === table.id;
                          return (
                            <button
                              key={table.id}
                              onClick={() => setSelectedTableId(table.id)}
                              className={`h-24 rounded-2xl border-2 flex flex-col justify-between p-4 transition-all relative cursor-pointer ${
                                isSelected 
                                  ? 'border-interaction bg-interaction/5 shadow-md scale-105' 
                                  : table.status === 'serving' 
                                  ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                                  : table.status === 'waiting'
                                  ? 'border-accent/40 bg-accent/5 hover:bg-accent/10'
                                  : 'border-foreground/10 hover:bg-foreground/5'
                              }`}
                            >
                              <span className="font-black text-xs uppercase">{table.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                  table.status === 'serving' 
                                    ? 'bg-primary' 
                                    : table.status === 'waiting'
                                    ? 'bg-accent'
                                    : 'bg-foreground/20'
                                }`} />
                                <span className="text-[10px] font-black uppercase opacity-60">
                                  {table.status === 'serving' ? 'Đang ăn' : table.status === 'waiting' ? 'Đang đợi' : 'Trống'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Table Bill Detail */}
                    <div className="lg:col-span-5 bg-surface p-6 rounded-2xl border border-foreground/10 flex flex-col justify-between min-h-[250px]">
                      {(() => {
                        const table = playgroundTables.find(t => t.id === selectedTableId);
                        if (!table) return null;
                        return (
                          <>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
                                <span className="font-black uppercase text-sm">{table.name}</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                  table.status === 'serving' 
                                    ? 'bg-primary/10 text-primary' 
                                    : table.status === 'waiting' 
                                    ? 'bg-accent/25 text-foreground' 
                                    : 'bg-foreground/10 text-foreground/50'
                                }`}>
                                  {table.status === 'serving' ? 'Đang phục vụ' : table.status === 'waiting' ? 'Đợi món' : 'Trống'}
                                </span>
                              </div>

                              {table.status !== 'empty' ? (
                                <div className="space-y-2 text-left">
                                  <div className="flex justify-between text-xs font-bold opacity-60">
                                    <span>Món đã gọi:</span>
                                    <span>Thời gian chờ: {table.time}</span>
                                  </div>
                                  <p className="font-black text-sm uppercase text-primary">{table.order}</p>
                                  <div className="flex justify-between items-center pt-2 border-t border-foreground/5">
                                    <span className="text-xs font-bold opacity-60">Tổng thanh toán:</span>
                                    <span className="font-black text-lg text-foreground">{table.total}</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs font-bold opacity-45 py-8 text-center">Bàn đang trống. Sẵn sàng nhận khách mới.</p>
                              )}
                            </div>

                            {table.status !== 'empty' && (
                              <button
                                onClick={() => handleCheckoutPlaygroundTable(table.id)}
                                className="w-full mt-4 py-3 bg-interaction hover:bg-interaction/90 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Thanh toán thử (Trừ kho BOM)
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {activePlaygroundTab === 'ingredients' && (
                  <motion.div 
                    key="ingredients" 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -15 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    {/* Left: Ingredients Selector */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black uppercase tracking-wider opacity-60">Danh mục Nguyên liệu chính</h4>
                        <span className="text-xs font-black text-interaction bg-interaction/5 px-2.5 py-1 rounded-lg">Chọn để xem công thức</span>
                      </div>

                      <div className="space-y-2">
                        {PLAYGROUND_INGREDIENTS.map(ing => {
                          const isActive = activeIngredientId === ing.id;
                          return (
                            <button
                              key={ing.id}
                              onClick={() => setActiveIngredientId(ing.id)}
                              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                isActive 
                                  ? 'border-interaction bg-interaction/5 scale-[1.02] shadow-sm' 
                                  : 'border-foreground/10 hover:bg-foreground/5'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-interaction"></div>
                                <span className="font-black text-xs uppercase text-left">{ing.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs font-black">
                                <span className="opacity-60">{ing.stock}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] ${
                                  ing.status.includes('⚠️') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                                }`}>
                                  {ing.status}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Recipe Linkages */}
                    <div className="lg:col-span-6 bg-surface p-6 rounded-2xl border border-foreground/10 flex flex-col justify-between min-h-[250px]">
                      {(() => {
                        const ing = PLAYGROUND_INGREDIENTS.find(i => i.id === activeIngredientId);
                        if (!ing) return null;
                        return (
                          <div className="space-y-6">
                            <div className="border-b border-foreground/10 pb-3 text-left">
                              <h4 className="font-black text-sm uppercase text-primary">Công thức liên đới sản phẩm</h4>
                              <p className="text-[10px] font-bold opacity-60">Mỗi cốc bán ra sẽ tự động khấu trừ lượng tương ứng:</p>
                            </div>

                            <div className="space-y-3">
                              {ing.products.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3.5 bg-white border border-foreground/5 rounded-xl shadow-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-xs text-primary">
                                      ☕
                                    </div>
                                    <span className="font-black text-xs uppercase">{p.name}</span>
                                  </div>
                                  <span className="font-black text-xs text-interaction bg-interaction/10 px-3 py-1.5 rounded-lg border border-interaction/10">
                                    -{p.amount}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="text-[11px] font-bold text-primary/70 bg-primary/5 border border-primary/20 p-3 rounded-xl flex gap-1.5 items-start text-left">
                              <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                              <p>
                                Khi khách thanh toán thành công tại POS hoặc qua mã tự gọi món, lượng nguyên liệu hao hụt định lượng ở trên sẽ được trừ trực tiếp và chính xác vào thẻ kho trong cơ sở dữ liệu.
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Toast inside Playground */}
              <AnimatePresence>
                {playgroundMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold text-center"
                  >
                    {playgroundMessage}
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

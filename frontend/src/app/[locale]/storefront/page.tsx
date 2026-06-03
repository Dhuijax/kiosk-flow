'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import {
  MessageSquare,
  Send,
  X,
  MapPin,
  Phone,
  Sparkles,
  Award,
  CheckCircle,
  Copy,
  ArrowRight,
  Volume2
} from 'lucide-react';
import { getClient, getAuthenticatedClient } from '@/lib/grpc/client';
import { StorefrontService } from '@/gen/storefront_connect';
import { ProductService } from '@/gen/product_connect';
import { CategoryService } from '@/gen/category_connect';
import { BranchService } from '@/gen/branch_connect';
import { Product } from '@/gen/product_pb';
import { Category } from '@/gen/category_pb';
import { Branch } from '@/gen/branch_pb';
import { Promotion, News, Partner, Announcement, ChatMessage } from '@/gen/storefront_pb';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Timestamp } from '@bufbuild/protobuf';

export default function StorefrontPage() {
  const t = useTranslations('Storefront');
  const tCommon = useTranslations('Common');
  const locale = useLocale();

  // Tenant ID for the demo storefront
  const tenantId = '00000000-0000-0000-0000-000000000001';

  // CMS & Store Data States
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Interactive States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(false);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    guests: 2,
    date: '',
    time: '',
    branchId: '',
    note: ''
  });

  // Chat States
  const [conversationId, setConversationId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Conversation ID & Fetch Data
  useEffect(() => {
    let convId = localStorage.getItem('kioskflow:storefront:conv_id');
    if (!convId) {
      convId = crypto.randomUUID();
      localStorage.setItem('kioskflow:storefront:conv_id', convId);
    }
    const finalConvId = convId;
    Promise.resolve().then(() => {
      setConversationId(finalConvId);
    });

    // Fetch CMS and Storefront Data
    const fetchData = async () => {
      try {
        setLoading(true);
        const storefrontClient = getAuthenticatedClient(StorefrontService, tenantId);
        const productClient = getAuthenticatedClient(ProductService, tenantId);
        const categoryClient = getAuthenticatedClient(CategoryService, tenantId);
        const branchClient = getAuthenticatedClient(BranchService, tenantId);

        // Fetch CMS data
        const cmsRes = await storefrontClient.getStorefrontCMS({ tenantId });
        setPromotions(cmsRes.promotions || []);
        setNews(cmsRes.news || []);
        setPartners(cmsRes.partners || []);
        setAnnouncements(cmsRes.announcements || []);

        // Fetch categories
        const catRes = await categoryClient.listCategories({ page: 1, pageSize: 50 });
        setCategories(catRes.categories || []);

        // Fetch products
        const prodRes = await productClient.listProducts({
          pagination: { page: 1, pageSize: 100 }
        });
        setProducts(prodRes.products || []);

        // Fetch branches
        const branchRes = await branchClient.listBranches({
          pagination: { page: 1, pageSize: 50 }
        });
        const branchList = branchRes.branches || [];
        setBranches(branchList);
        
        // Pre-select first branch
        if (branchList.length > 0) {
          setBookingForm(prev => ({ ...prev, branchId: branchList[0].id }));
        }

      } catch (err) {
        console.error('Error fetching storefront data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch Chat History
  const fetchChatHistory = async (convId: string) => {
    if (!convId) return;
    try {
      const storefrontClient = getAuthenticatedClient(StorefrontService, tenantId);
      const res = await storefrontClient.getChatHistory({ conversationId: convId });
      setChatMessages(res.messages || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  // Poll Chat History when chat is open (for bulletproof synchronization)
  useEffect(() => {
    if (!isChatOpen || !conversationId) return;

    const currentConvId = conversationId;
    Promise.resolve().then(() => {
      fetchChatHistory(currentConvId);
    });
    const interval = setInterval(() => {
      fetchChatHistory(currentConvId);
    }, 4000);

    return () => clearInterval(interval);
  }, [isChatOpen, conversationId]);

  // Connect to real-time chat stream
  useEffect(() => {
    if (!conversationId) return;

    const storefrontClient = getAuthenticatedClient(StorefrontService, tenantId);
    const abortController = new AbortController();

    const connectStream = async () => {
      try {
        // Send a dummy placeholder request or use standard streaming
        // Connect-ES BiDiStream syntax
        const stream = storefrontClient.streamStorefrontChat(
          // Inbound stream iterable
          (async function* () {
            // We can yield messages when user sends them
          })(),
          { signal: abortController.signal }
        );

        for await (const message of stream) {
          // Verify message belongs to our conversation
          if (message.conversationId === conversationId) {
            setChatMessages(prev => {
              if (prev.some(m => m.id === message.id)) return prev;
              return [...prev, message];
            });

            // Mark unread if chat window is closed
            if (!isChatOpen) {
              setChatUnread(true);
            }
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.log('Stream error, falling back to polling:', err);
        }
      }
    };

    connectStream();

    return () => {
      abortController.abort();
    };
  }, [conversationId, isChatOpen]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Send Message
  const handleSendMessage = async (customContent?: string) => {
    const textToSend = customContent || chatInput;
    if (!textToSend.trim() || !conversationId) return;

    const messagePayload = new ChatMessage({
      id: crypto.randomUUID(),
      tenantId,
      conversationId,
      senderType: 'customer',
      content: textToSend.trim(),
      createdAt: Timestamp.fromDate(new Date())
    });

    // Optimistic UI update
    setChatMessages(prev => [...prev, messagePayload]);
    if (!customContent) {
      setChatInput('');
    }

    try {
      // In connect-es we can send via bidirectional stream, or we can save directly via stream trigger
      // To ensure reliability on gRPC-web, we send message using a one-off stream wrapper or REST webhook
      // Wait, the backend stream_storefront_chat handles inbound stream messages.
      // We can invoke it by writing to a streaming client.
      const storefrontClient = getAuthenticatedClient(StorefrontService, tenantId);
      
      // Send the single message by creating a quick transient stream request
      async function* singleMessageGenerator() {
        yield messagePayload;
      }
      
      const stream = storefrontClient.streamStorefrontChat(singleMessageGenerator());
      // We consume the stream response to ensure request completes
      for await (const _ of stream) {
        // Echo response or acknowledgements
      }
      
      // Refresh history immediately
      fetchChatHistory(conversationId);
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  // Submit Reservation
  const handleBookTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.name || !bookingForm.phone || !bookingForm.date || !bookingForm.time || !bookingForm.branchId) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setBookingLoading(true);
    try {
      const storefrontClient = getAuthenticatedClient(StorefrontService, tenantId);
      
      // Combine Date & Time into a Date object
      const dateTimeStr = `${bookingForm.date}T${bookingForm.time}:00`;
      const dateObj = new Date(dateTimeStr);
      
      const res = await storefrontClient.createReservation({
        branchId: bookingForm.branchId,
        customerName: bookingForm.name,
        customerPhone: bookingForm.phone,
        guestCount: bookingForm.guests,
        reservationTime: Timestamp.fromDate(dateObj),
        note: bookingForm.note
      });

      if (res.reservation) {
        setBookingSuccess(true);
        
        // Find branch name
        const selectedBranchName = branches.find(b => b.id === bookingForm.branchId)?.name || 'Chi nhánh';

        // Prepare automatic chat notification text
        const bookingTimeStr = `${bookingForm.time} ngày ${bookingForm.date.split('-').reverse().join('/')}`;
        const autoMsg = `🔔 YÊU CẦU ĐẶT BÀN MỚI:\n- Họ và tên: ${bookingForm.name}\n- SĐT: ${bookingForm.phone}\n- Số khách: ${bookingForm.guests} người\n- Thời gian: ${bookingTimeStr}\n- Địa điểm: ${selectedBranchName}\n- Ghi chú: ${bookingForm.note || 'Không có'}`;

        // Send auto message to chat
        setTimeout(() => {
          handleSendMessage(autoMsg);
          // Open Chat Box automatically
          setIsChatOpen(true);
          setChatUnread(false);
        }, 1500);
      }
    } catch (err) {
      console.error('Error booking table:', err);
      alert('Đặt bàn thất bại. Vui lòng liên hệ trực tiếp hotline chi nhánh.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Helper to Copy Promotion Code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Đã sao chép mã khuyến mãi: ${code}`);
  };

  // Format Currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.categoryId === activeCategory);

  return (
    <div className="min-h-screen bg-[#070707] text-[#EAEAEA] font-sans selection:bg-[#D4AF37]/30 selection:text-[#D4AF37] relative">
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.025)_0%,_transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0" />
      
      {/* Announcements Bar (Top Ticker) */}
      {announcements.length > 0 && (
        <div className="bg-[#D4AF37] text-[#070707] py-2 px-4 text-center font-bold text-xs uppercase tracking-widest relative z-[101] flex items-center justify-center gap-2">
          <Volume2 size={16} className="animate-bounce" />
          <div className="overflow-hidden whitespace-nowrap w-full max-w-7xl relative h-5">
            <div className="inline-block animate-marquee">
              {announcements.map((a, i) => (
                <span key={a.id} className="mx-12">
                  ✨ {a.title}: {a.content}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Premium Sticky Header */}
      <header className="sticky top-0 bg-[#070707]/90 backdrop-blur-xl border-b border-[#D4AF37]/10 h-20 flex items-center justify-between px-6 md:px-12 z-[100] shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#D4AF37] to-[#AA7C11] rounded-xl flex items-center justify-center shadow-lg shadow-[#D4AF37]/20 border border-[#D4AF37]/30">
            <Sparkles className="text-[#070707] w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-xl font-extrabold tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#AA7C11]">
            {"L'Élite Bistro"}
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          <a href="#about" className="text-xs uppercase tracking-widest font-semibold hover:text-[#D4AF37] transition-all duration-300">
            {t('nav.about')}
          </a>
          <a href="#menu" className="text-xs uppercase tracking-widest font-semibold hover:text-[#D4AF37] transition-all duration-300">
            {t('nav.menu')}
          </a>
          <a href="#promotions" className="text-xs uppercase tracking-widest font-semibold hover:text-[#D4AF37] transition-all duration-300">
            {t('nav.promotions')}
          </a>
          <a href="#branches" className="text-xs uppercase tracking-widest font-semibold hover:text-[#D4AF37] transition-all duration-300">
            {t('nav.branches')}
          </a>
          <a href="#membership" className="text-xs uppercase tracking-widest font-semibold hover:text-[#D4AF37] transition-all duration-300">
            {t('nav.membership')}
          </a>
          <a href="#news" className="text-xs uppercase tracking-widest font-semibold hover:text-[#D4AF37] transition-all duration-300">
            {t('nav.news')}
          </a>
        </nav>

        <div className="flex items-center gap-6">
          <LanguageSwitcher />
          <button
            onClick={() => {
              setBookingSuccess(false);
              setIsBookingOpen(true);
            }}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:from-[#AA7C11] hover:to-[#D4AF37] text-[#070707] font-bold text-xs uppercase tracking-widest shadow-xl shadow-[#D4AF37]/10 transition-all duration-500 hover:scale-[1.05]"
          >
            {t('bookTable')}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden border-b border-[#D4AF37]/10">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35 scale-105 filter blur-[2px]" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069&auto=format&fit=crop')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-[#070707]/60 to-transparent" />
        
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.3em] block mb-4">
              {t('hero.welcome')}
            </span>
            <h1 className="text-4xl md:text-7xl font-extrabold uppercase italic tracking-tighter mb-6 leading-tight">
              TINH HOA <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F8F4E3] to-[#AA7C11]">
                ẨM THỰC VIỆT
              </span>
            </h1>
            <p className="text-[#A0A0A0] text-sm md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              {t('hero.desc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setIsBookingOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:from-[#AA7C11] hover:to-[#D4AF37] text-[#070707] font-black text-xs uppercase tracking-widest shadow-xl transition-all duration-300 scale-105"
              >
                {t('hero.bookNow')}
              </button>
              <a
                href="#menu"
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[#D4AF37] font-black text-xs uppercase tracking-widest transition-all duration-300 text-center"
              >
                {t('hero.viewMenu')}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Introduction/About Section */}
      <section id="about" className="py-24 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest block mb-2">{"L'Élite Bistro"}</span>
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-6">{t('about.title')}</h2>
          <p className="text-[#A0A0A0] text-base leading-relaxed mb-6 font-light">
            {t('about.p1')}
          </p>
          <p className="text-[#A0A0A0] text-base leading-relaxed mb-8 font-light">
            {t('about.p2')}
          </p>
          <div className="grid grid-cols-3 gap-6 border-t border-[#D4AF37]/10 pt-8">
            <div>
              <p className="text-2xl font-black text-[#D4AF37]">12+</p>
              <p className="text-xs uppercase tracking-widest text-[#666] mt-1">{t('about.years')}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#D4AF37]">5★</p>
              <p className="text-xs uppercase tracking-widest text-[#666] mt-1">{t('about.rating')}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#D4AF37]">50k+</p>
              <p className="text-xs uppercase tracking-widest text-[#666] mt-1">{t('about.guests')}</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-[#D4AF37]/10 rounded-3xl translate-x-4 translate-y-4 -z-10" />
          <img
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop"
            alt="Restaurant space"
            className="rounded-3xl object-cover shadow-2xl border border-[#D4AF37]/20 w-full h-[450px]"
          />
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-24 bg-[#0A0A0A] border-y border-[#D4AF37]/10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest block mb-2">{t('menu.tag')}</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">{t('menu.title')}</h2>
            <p className="text-[#A0A0A0] max-w-xl mx-auto font-light">{t('menu.desc')}</p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-black transition-all border ${
                activeCategory === 'all'
                  ? 'bg-[#D4AF37] text-[#070707] border-[#D4AF37]'
                  : 'bg-transparent text-[#A0A0A0] border-[#D4AF37]/20 hover:border-[#D4AF37]'
              }`}
            >
              Tất cả
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-black transition-all border ${
                  activeCategory === c.id
                    ? 'bg-[#D4AF37] text-[#070707] border-[#D4AF37]'
                    : 'bg-transparent text-[#A0A0A0] border-[#D4AF37]/20 hover:border-[#D4AF37]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-[#0D0D0D] border border-[#D4AF37]/10 rounded-2xl p-6 hover:border-[#D4AF37]/30 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] uppercase font-bold tracking-widest">
                      {categories.find(c => c.id === p.categoryId)?.name || 'Món ngon'}
                    </span>
                    <span className="text-[#D4AF37] font-black text-sm uppercase tracking-tighter">
                      {p.sku}
                    </span>
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter mb-2 group-hover:text-[#D4AF37] transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-[#777] text-xs font-light line-clamp-3 mb-6">
                    {p.description || 'Hương vị tuyệt hảo làm từ những nguyên liệu chất lượng cao dưới bàn tay của các đầu bếp giàu kinh nghiệm.'}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-[#D4AF37]/5 pt-4 mt-auto">
                  <span className="text-xl font-extrabold text-[#D4AF37]">
                    {formatCurrency(Number(p.price))}
                  </span>
                  <span className="text-xs text-[#555] uppercase tracking-wider">
                    {p.unit || 'Phần'}
                  </span>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-[#555] font-bold italic">
                Chưa có sản phẩm nào trong danh mục này.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Promotions Section */}
      <section id="promotions" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest block mb-2">{t('promo.tag')}</span>
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">{t('promo.title')}</h2>
          <p className="text-[#A0A0A0] max-w-xl mx-auto font-light">{t('promo.desc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {promotions.map((p) => (
            <div
              key={p.id}
              className="bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] border border-[#D4AF37]/15 rounded-3xl p-8 flex flex-col justify-between hover:border-[#D4AF37]/35 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/5 rounded-bl-full flex items-center justify-center" />
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-[#D4AF37] mb-2">
                  {p.title}
                </h3>
                <p className="text-[#A0A0A0] text-sm font-light mb-6">
                  {p.description}
                </p>
                {p.discountPercent > 0 && (
                  <div className="text-3xl font-black tracking-tight text-[#EAEAEA] mb-6">
                    GIẢM {p.discountPercent}%
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between border-t border-[#D4AF37]/10 pt-6 mt-6">
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-widest mb-1">Mã ưu đãi</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[#D4AF37] font-black tracking-widest text-sm uppercase px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg">
                      {p.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(p.code)}
                      className="p-2 hover:bg-[#D4AF37]/10 rounded-lg transition-colors text-[#888] hover:text-[#D4AF37]"
                      title="Sao chép mã"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div className="text-left sm:text-right mt-4 sm:mt-0">
                  <p className="text-[10px] text-[#555] uppercase tracking-widest mb-1">Thời hạn</p>
                  <p className="text-xs text-[#A0A0A0]">
                    Đến hết ngày {p.endDate ? new Date(Number(p.endDate.seconds) * 1000).toLocaleDateString('vi-VN') : 'vô thời hạn'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {promotions.length === 0 && (
            <div className="col-span-full py-12 text-center text-[#555] font-bold italic border border-[#D4AF37]/10 rounded-3xl bg-[#090909]">
              Hiện chưa có chương trình khuyến mãi nào được áp dụng.
            </div>
          )}
        </div>
      </section>

      {/* Branches Locations Section */}
      <section id="branches" className="py-24 bg-[#0A0A0A] border-t border-[#D4AF37]/10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest block mb-2">{t('branches.tag')}</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">{t('branches.title')}</h2>
            <p className="text-[#A0A0A0] max-w-xl mx-auto font-light">{t('branches.desc')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {branches.map((b) => (
              <div
                key={b.id}
                className="bg-[#0D0D0D] border border-[#D4AF37]/10 rounded-3xl p-8 hover:border-[#D4AF37]/30 transition-all duration-300 relative group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] mb-6">
                  <MapPin size={24} />
                </div>
                <h3 className="text-lg font-black uppercase italic tracking-tighter mb-4 group-hover:text-[#D4AF37] transition-colors">
                  {b.name}
                </h3>
                <div className="space-y-3 mb-8">
                  <div className="flex gap-3 text-xs text-[#A0A0A0]">
                    <MapPin size={16} className="text-[#D4AF37] flex-shrink-0" />
                    <span>{b.address || 'Chưa cập nhật địa chỉ'}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-[#A0A0A0]">
                    <Phone size={16} className="text-[#D4AF37] flex-shrink-0" />
                    <span>{b.phone || 'Chưa cập nhật SĐT'}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setBookingForm(prev => ({ ...prev, branchId: b.id }));
                    setBookingSuccess(false);
                    setIsBookingOpen(true);
                  }}
                  className="w-full py-3 rounded-xl border border-[#D4AF37]/20 text-xs font-bold uppercase tracking-widest text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-[#070707] transition-all duration-300"
                >
                  Đặt bàn tại đây
                </button>
              </div>
            ))}
            {branches.length === 0 && (
              <div className="col-span-full py-16 text-center text-[#555] font-bold italic">
                Chưa có thông tin chi nhánh nào được cấu hình.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Membership Tiers Section */}
      <section id="membership" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest block mb-2">{t('membership.tag')}</span>
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">{t('membership.title')}</h2>
          <p className="text-[#A0A0A0] max-w-xl mx-auto font-light">{t('membership.desc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Silver */}
          <div className="bg-gradient-to-br from-[#1C1C1C] to-[#0F0F0F] border border-[#A0A0A0]/10 rounded-3xl p-8 relative overflow-hidden group hover:border-[#A0A0A0]/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#A0A0A0]/5 rounded-bl-full flex items-center justify-center" />
            <Award className="text-[#A0A0A0] w-12 h-12 mb-6" />
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#A0A0A0] mb-2">Thẻ Bạc (Silver)</h3>
            <p className="text-[#777] text-xs mb-6">Áp dụng cho khách hàng mới đăng ký tài khoản thành viên.</p>
            <ul className="space-y-3 text-xs text-[#A0A0A0] mb-8">
              <li className="flex items-center gap-2">✔ Giảm 5% cho mọi hóa đơn</li>
              <li className="flex items-center gap-2">✔ Tích lũy 1% điểm đổi quà</li>
              <li className="flex items-center gap-2">✔ Ưu đãi sinh nhật tặng 1 bánh ngọt</li>
            </ul>
          </div>

          {/* Gold */}
          <div className="bg-gradient-to-br from-[#241E15] to-[#120F0A] border border-[#D4AF37]/20 rounded-3xl p-8 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all duration-300 scale-105">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#D4AF37]/5 rounded-bl-full flex items-center justify-center" />
            <Award className="text-[#D4AF37] w-12 h-12 mb-6 animate-pulse" />
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#D4AF37] mb-2">Thẻ Vàng (Gold)</h3>
            <p className="text-[#997C22] text-xs mb-6">Tích lũy từ 5,000 điểm hoặc chi tiêu từ 5 triệu đồng.</p>
            <ul className="space-y-3 text-xs text-[#D4AF37]/90 mb-8">
              <li className="flex items-center gap-2">✔ Giảm 10% cho mọi hóa đơn</li>
              <li className="flex items-center gap-2">✔ Tích lũy 2% điểm đổi quà</li>
              <li className="flex items-center gap-2">✔ Tặng ly nước size L vào dịp sinh nhật</li>
              <li className="flex items-center gap-2">✔ Ưu tiên đặt bàn VIP ngày lễ tết</li>
            </ul>
          </div>

          {/* Platinum */}
          <div className="bg-gradient-to-br from-[#1C1F24] to-[#0F1014] border border-[#3E7DCC]/10 rounded-3xl p-8 relative overflow-hidden group hover:border-[#3E7DCC]/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#3E7DCC]/5 rounded-bl-full flex items-center justify-center" />
            <Award className="text-[#3E7DCC] w-12 h-12 mb-6" />
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#3E7DCC] mb-2">Thẻ Kim Cương (Platinum)</h3>
            <p className="text-[#777] text-xs mb-6">Tích lũy từ 15,000 điểm hoặc chi tiêu từ 15 triệu đồng.</p>
            <ul className="space-y-3 text-xs text-[#A0A0A0] mb-8">
              <li className="flex items-center gap-2">✔ Giảm 15% cho mọi hóa đơn</li>
              <li className="flex items-center gap-2">✔ Tích lũy 3% điểm đổi quà</li>
              <li className="flex items-center gap-2">✔ Miễn phí 1 món nước vào dịp đặc biệt</li>
              <li className="flex items-center gap-2">✔ Phòng tiếp khách VIP chuyên biệt</li>
            </ul>
          </div>
        </div>
      </section>

      {/* News & Updates Section */}
      <section id="news" className="py-24 bg-[#0A0A0A] border-t border-[#D4AF37]/10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest block mb-2">{t('news.tag')}</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">{t('news.title')}</h2>
            <p className="text-[#A0A0A0] max-w-xl mx-auto font-light">{t('news.desc')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {news.map((n) => (
              <div
                key={n.id}
                className="bg-[#0D0D0D] border border-[#D4AF37]/10 rounded-3xl overflow-hidden hover:border-[#D4AF37]/30 transition-all duration-300 flex flex-col h-full group"
              >
                <div className="h-56 overflow-hidden relative border-b border-[#D4AF37]/10 bg-[#050505]">
                  <img
                    src={n.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop'}
                    alt={n.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-8 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold block mb-3">
                      {n.createdAt ? new Date(Number(n.createdAt.seconds) * 1000).toLocaleDateString('vi-VN') : 'Mới cập nhật'}
                    </span>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter mb-3 leading-snug group-hover:text-[#D4AF37] transition-colors">
                      {n.title}
                    </h3>
                    <p className="text-[#777] text-xs font-light line-clamp-3 mb-6">
                      {n.summary}
                    </p>
                  </div>
                  <button className="text-xs uppercase tracking-widest font-black text-[#D4AF37] flex items-center gap-2 mt-auto group/btn">
                    Đọc tiếp <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
            {news.length === 0 && (
              <div className="col-span-full py-16 text-center text-[#555] font-bold italic">
                Không có bài viết tin tức mới nào.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Partners Logos Slider */}
      <section className="py-16 border-t border-[#D4AF37]/10 bg-[#070707] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-[#555] font-bold">Đối tác đồng hành</p>
        </div>
        <div className="relative w-full overflow-hidden h-12 flex items-center">
          <div className="inline-block whitespace-nowrap animate-marquee-slower">
            {partners.map((p) => (
              <a
                key={p.id}
                href={p.websiteUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-16 inline-flex items-center gap-2 opacity-30 hover:opacity-80 transition-opacity"
              >
                {p.logoUrl && <img src={p.logoUrl} alt={p.name} className="h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                <span className="text-lg font-black tracking-tight text-white uppercase italic">{p.name}</span>
              </a>
            ))}
            {partners.length === 0 && (
              <div className="w-full text-center text-xs text-[#444] font-bold uppercase italic">
                Vinamilk • MoMo • VNPAY • GrabFood • ShopeeFood
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] border-t border-[#D4AF37]/10 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-tr from-[#D4AF37] to-[#AA7C11] rounded-lg flex items-center justify-center border border-[#D4AF37]/20">
                <Sparkles className="text-[#070707] w-5 h-5" />
              </div>
              <span className="text-lg font-extrabold tracking-tighter uppercase italic text-white">{"L'Élite Bistro"}</span>
            </div>
            <p className="text-[#555] text-xs leading-relaxed font-light mb-6">
              {"L'Élite Bistro cam kết mang lại trải nghiệm ẩm thực chất lượng hàng đầu kết hợp cùng các công nghệ đặt bàn, gọi món và chăm sóc khách hàng tự động thông minh."}
            </p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#D4AF37] font-black mb-6">Liên kết nhanh</h4>
            <ul className="space-y-3 text-xs text-[#A0A0A0]">
              <li><a href="#about" className="hover:text-[#D4AF37] transition-colors">Về chúng tôi</a></li>
              <li><a href="#menu" className="hover:text-[#D4AF37] transition-colors">Thực đơn</a></li>
              <li><a href="#promotions" className="hover:text-[#D4AF37] transition-colors">Khuyến mãi</a></li>
              <li><a href="#branches" className="hover:text-[#D4AF37] transition-colors">Chi nhánh</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#D4AF37] font-black mb-6">Platform liên kết</h4>
            <ul className="space-y-3 text-xs text-[#A0A0A0]">
              <li><a href="https://grab.com" className="hover:text-[#D4AF37] transition-colors">GrabFood</a></li>
              <li><a href="https://shopeefood.vn" className="hover:text-[#D4AF37] transition-colors">ShopeeFood</a></li>
              <li><a href="https://zalo.me" className="hover:text-[#D4AF37] transition-colors">Zalo Page</a></li>
              <li><a href="https://facebook.com" className="hover:text-[#D4AF37] transition-colors">Facebook Fanpage</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest text-[#D4AF37] font-black mb-6">Hệ thống</h4>
            <p className="text-xs text-[#555] leading-relaxed mb-4">Mở hệ thống Kiosk và POS để quản lý:</p>
            <a
              href={`/${locale}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#070707] border border-[#D4AF37]/20 text-xs font-black uppercase tracking-widest transition-all"
            >
              Vào Sandbox POS <ArrowRight size={14} />
            </a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-[#D4AF37]/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#555]">
          <p>© 2026 {"L'Élite Bistro"}. Cung cấp bởi KioskFlow POS Platform.</p>
          <p className="flex gap-4">
            <a href="#" className="hover:text-[#D4AF37]">Điều khoản</a>
            <span>•</span>
            <a href="#" className="hover:text-[#D4AF37]">Bảo mật</a>
          </p>
        </div>
      </footer>

      {/* Floating Chat Box Button */}
      <button
        onClick={() => {
          setIsChatOpen(true);
          setChatUnread(false);
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-tr from-[#D4AF37] to-[#AA7C11] hover:from-[#AA7C11] hover:to-[#D4AF37] text-[#070707] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 z-[200] relative border border-[#D4AF37]/30"
      >
        <MessageSquare size={24} />
        {chatUnread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-[#070707] rounded-full animate-ping" />
        )}
      </button>

      {/* Live Chat Modal (Float-in Drawer) */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-24 right-8 w-[90vw] sm:w-[400px] h-[500px] bg-[#0A0A0A] border border-[#D4AF37]/20 rounded-3xl shadow-2xl z-[200] overflow-hidden flex flex-col"
          >
            {/* Chat Header */}
            <div className="bg-[#0E0E0E] border-b border-[#D4AF37]/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Hỗ trợ đặt bàn</h4>
                  <p className="text-[10px] text-[#A0A0A0] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Nhân viên phục vụ trực tuyến
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-[#666] hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#070707]">
              {chatMessages.length === 0 && (
                <div className="text-center py-16 text-[#555] font-medium text-xs space-y-2">
                  <MessageSquare size={32} className="mx-auto opacity-30 text-[#D4AF37]" />
                  <p>Chào bạn! Gửi tin nhắn cho chúng tôi để được tư vấn và hỗ trợ xác nhận đặt bàn nhanh chóng.</p>
                </div>
              )}
              {chatMessages.map((msg) => {
                const isCustomer = msg.senderType === 'customer';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-[#D4AF37]/10 text-[#EAEAEA] rounded-tr-none border border-[#D4AF37]/30'
                          : 'bg-[#121212] text-[#A0A0A0] rounded-tl-none border border-white/5'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-[#D4AF37]/10 bg-[#0E0E0E] flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Nhập nội dung tin nhắn..."
                className="flex-1 bg-[#121212] border border-[#D4AF37]/10 focus:border-[#D4AF37] rounded-xl px-4 text-xs text-white outline-none placeholder:text-[#555]"
              />
              <button
                onClick={() => handleSendMessage()}
                className="p-3 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-[#070707] rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-md"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Form Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0A0A0A] border border-[#D4AF37]/20 rounded-3xl w-full max-w-xl shadow-2xl relative z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-[#0E0E0E] border-b border-[#D4AF37]/10 px-8 py-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-[#D4AF37]">
                    Đặt Bàn Nhà Hàng
                  </h3>
                  <p className="text-[10px] text-[#A0A0A0] uppercase tracking-widest mt-1">
                    Điền thông tin đặt trước để được phục vụ tốt nhất
                  </p>
                </div>
                <button
                  onClick={() => setIsBookingOpen(false)}
                  className="text-[#666] hover:text-white p-2"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8">
                {!bookingSuccess ? (
                  <form onSubmit={handleBookTable} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Name */}
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                          Họ và tên *
                        </label>
                        <input
                          type="text"
                          required
                          value={bookingForm.name}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className="w-full bg-[#121212] border border-[#D4AF37]/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white outline-none placeholder:text-[#555]"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                          Số điện thoại *
                        </label>
                        <input
                          type="tel"
                          required
                          value={bookingForm.phone}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Ví dụ: 0912345678"
                          className="w-full bg-[#121212] border border-[#D4AF37]/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white outline-none placeholder:text-[#555]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Branch */}
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                          Chi nhánh chọn đặt *
                        </label>
                        <select
                          required
                          value={bookingForm.branchId}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, branchId: e.target.value }))}
                          className="w-full bg-[#121212] border border-[#D4AF37]/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white outline-none"
                        >
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} - {b.address || 'Không địa chỉ'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Guest Count */}
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                          Số lượng khách
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={bookingForm.guests}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, guests: parseInt(e.target.value) || 2 }))}
                          className="w-full bg-[#121212] border border-[#D4AF37]/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Date */}
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                          Ngày đặt bàn *
                        </label>
                        <input
                          type="date"
                          required
                          value={bookingForm.date}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full bg-[#121212] border border-[#D4AF37]/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white outline-none"
                        />
                      </div>

                      {/* Time */}
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                          Giờ đặt bàn *
                        </label>
                        <input
                          type="time"
                          required
                          value={bookingForm.time}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, time: e.target.value }))}
                          className="w-full bg-[#121212] border border-[#D4AF37]/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                        Ghi chú đặc biệt
                      </label>
                      <textarea
                        value={bookingForm.note}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, note: e.target.value }))}
                        placeholder="Ví dụ: Đặt bàn sinh nhật, phòng máy lạnh, bàn gần cửa sổ..."
                        rows={3}
                        className="w-full bg-[#121212] border border-[#D4AF37]/10 focus:border-[#D4AF37] rounded-xl px-4 py-3 text-xs text-white outline-none placeholder:text-[#555]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:from-[#AA7C11] hover:to-[#D4AF37] text-[#070707] font-black text-xs uppercase tracking-widest shadow-xl transition-all duration-300 disabled:opacity-50"
                    >
                      {bookingLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐẶT BÀN'}
                    </button>
                  </form>
                ) : (
                  <div className="py-12 text-center space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500 animate-bounce">
                      <CheckCircle size={40} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-black uppercase text-emerald-500">ĐÃ GỬI YÊU CẦU ĐẶT BÀN!</h4>
                      <p className="text-xs text-[#A0A0A0] leading-relaxed max-w-sm mx-auto">
                        {"Cảm ơn bạn đã lựa chọn L'Élite Bistro. Thông tin đã được chuyển đến nhân viên phục vụ chi nhánh."}
                      </p>
                    </div>
                    <p className="text-[10px] text-[#555] uppercase tracking-widest">
                      Một tin nhắn xác nhận tự động đã được gửi trong hộp thoại Hỗ trợ.
                    </p>
                    <button
                      onClick={() => setIsBookingOpen(false)}
                      className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      ĐÓNG CỬA SỔ
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

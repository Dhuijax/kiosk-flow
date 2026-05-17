'use client';

import React, { useState } from 'react';
import { useBilling } from '@/hooks/useBilling';
import { 
  Sparkles, 
  Check, 
  CreditCard, 
  QrCode, 
  Calendar,
  AlertCircle,
  Building,
  Layers,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentDetails {
  paymentUrl: string;
  qrCodeUrl: string;
  qrCode: string;
  transactionId: string;
  amount: number;
  planType: string;
}

export default function BillingSettings() {
  const { subscription, loading, createPayment, refresh } = useBilling();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<'momo' | 'zalopay' | 'vnpay' | 'card'>('momo');
  const [paymentResponse, setPaymentResponse] = useState<PaymentDetails | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // Mock active counts for limit checks
  const currentCounts = {
    tables: 7,
    products: 34,
    branches: 1
  };

  const plans = [
    {
      id: 'starter' as const,
      name: 'Starter',
      price: '0đ',
      priceRaw: 0,
      description: 'Phù hợp cho quán cà phê nhỏ, xe đẩy hoặc quán ăn gia đình.',
      features: [
        'Tối đa 10 Bàn ăn',
        'Tối đa 50 Món ăn',
        'Hỗ trợ 1 Chi nhánh',
        'Báo cáo cơ bản cuối ngày',
        'Order QR tại bàn cơ bản',
      ],
      limits: { tables: 10, products: 50, branches: 1 }
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '249.000đ',
      priceRaw: 249000,
      description: 'Dành cho các nhà hàng chuyên nghiệp, quán cà phê quy mô vừa.',
      features: [
        'Tối đa 50 Bàn ăn',
        'Tối đa 200 Món ăn',
        'Hỗ trợ lên tới 3 Chi nhánh',
        'Phân tích nâng cao chuyên sâu',
        'Xuất Z-Report & Excel/PDF',
        'Tự động trừ kho nguyên liệu',
      ],
      limits: { tables: 50, products: 200, branches: 3 },
      recommended: true
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      price: '999.000đ',
      priceRaw: 999000,
      description: 'Thương hiệu lớn, chuỗi nhà hàng nhiều chi nhánh.',
      features: [
        'Không giới hạn Bàn ăn',
        'Không giới hạn Món ăn',
        'Không giới hạn Chi nhánh',
        'Hệ thống AI phân tích dự phòng',
        'Xuất báo cáo tài chính cấp cao',
        'Hỗ trợ kỹ thuật 24/7 riêng biệt',
      ],
      limits: { tables: 999, products: 9999, branches: 999 }
    }
  ];

  const handleSelectPlan = async (plan: 'starter' | 'pro' | 'enterprise') => {
    try {
      const res = await createPayment(plan);
      if (res) {
        setPaymentResponse({
          paymentUrl: res.paymentUrl || '',
          qrCodeUrl: res.qrCodeUrl || '',
          qrCode: res.qrCodeUrl || res.paymentUrl || '',
          transactionId: res.transactionId || '',
          amount: plan === 'pro' ? 249000 : plan === 'enterprise' ? 999000 : 0,
          planType: plan.toUpperCase()
        });
        setPaymentModalOpen(true);
        setSimMessage(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khởi tạo cổng thanh toán');
    }
  };

  const simulateWebhook = async () => {
    if (!paymentResponse) return;
    setSimulating(true);
    setSimMessage(null);

    try {
      // Direct REST post request to the Axum Webhook Server (port 50052)
      const res = await fetch('http://localhost:50052/api/v1/billing/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: paymentResponse.transactionId,
          amount: paymentResponse.amount,
          status: 'SUCCESS',
          signature: 'simulated_client_signature_s40'
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSimMessage('Thanh toán thành công! Hệ thống đã kích hoạt nâng cấp gói dịch vụ.');
        setTimeout(async () => {
          setPaymentModalOpen(false);
          await refresh();
        }, 2000);
      } else {
        setSimMessage(`Lỗi webhook: ${data.message || 'Không thể xử lý giao dịch'}`);
      }
    } catch (err) {
      console.error('Webhook simulation error:', err);
      setSimMessage('Không thể kết nối tới máy chủ Webhook. Vui lòng xác nhận backend đang chạy.');
    } finally {
      setSimulating(false);
    }
  };

  const getActivePlanLimits = () => {
    const p = subscription?.planType?.toLowerCase();
    if (p === 'enterprise') return plans[2].limits;
    if (p === 'pro') return plans[1].limits;
    return plans[0].limits;
  };

  const activeLimits = getActivePlanLimits();

  if (loading && !subscription) {
    return (
      <div className="ai-card p-12 flex flex-col items-center justify-center gap-4 text-center bg-surface/50 min-h-[400px]">
        <div className="w-12 h-12 border-4 border-interaction border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-black uppercase italic tracking-tighter text-foreground/40">Đang tải dữ liệu thuê bao...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Current Subscription Status */}
      <div className="ai-card bg-surface/80 p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-foreground/5 pb-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-interaction">Gói dịch vụ hiện tại</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                Gói <span className="text-primary">{subscription?.planType || 'STARTER'}</span>
              </h2>
              <span className="px-3 py-1 bg-success/15 border border-success/30 text-success rounded-full text-[10px] font-black uppercase tracking-wider italic">
                {subscription?.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-foreground/60 bg-foreground/5 px-6 py-4 rounded-2xl">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="text-[10px] font-black uppercase text-foreground/40">Ngày hết hạn</p>
              <p className="font-mono text-foreground font-black">
                {subscription?.expiresAt 
                  ? new Date(subscription.expiresAt).toLocaleDateString('vi-VN') 
                  : 'Vĩnh viễn'}
              </p>
            </div>
          </div>
        </div>

        {/* Resources Limits Meter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tables Limit */}
          <div className="bg-foreground/5 border border-foreground/5 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground/60 font-black uppercase tracking-tighter text-xs italic">
                <Monitor className="w-5 h-5 text-interaction" />
                <span>Số lượng Bàn ăn</span>
              </div>
              <span className="font-mono text-xs font-black">
                {currentCounts.tables}/{activeLimits.tables} Bàn
              </span>
            </div>
            <div className="w-full h-3 bg-foreground/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-interaction transition-all duration-500 rounded-full"
                style={{ width: `${Math.min((currentCounts.tables / activeLimits.tables) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Products Limit */}
          <div className="bg-foreground/5 border border-foreground/5 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground/60 font-black uppercase tracking-tighter text-xs italic">
                <Layers className="w-5 h-5 text-primary" />
                <span>Số lượng Món ăn</span>
              </div>
              <span className="font-mono text-xs font-black">
                {currentCounts.products}/{activeLimits.products} Món
              </span>
            </div>
            <div className="w-full h-3 bg-foreground/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${Math.min((currentCounts.products / activeLimits.products) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Branches Limit */}
          <div className="bg-foreground/5 border border-foreground/5 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-foreground/60 font-black uppercase tracking-tighter text-xs italic">
                <Building className="w-5 h-5 text-accent" />
                <span>Chi nhánh kích hoạt</span>
              </div>
              <span className="font-mono text-xs font-black">
                {currentCounts.branches}/{activeLimits.branches === 999 ? '∞' : activeLimits.branches}
              </span>
            </div>
            <div className="w-full h-3 bg-foreground/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-500 rounded-full"
                style={{ width: `${Math.min((currentCounts.branches / activeLimits.branches) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Subscription Pricing Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-interaction/10 border border-interaction/30 text-interaction rounded-full text-[10px] font-black uppercase tracking-widest italic">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Nâng cấp các tính năng quản lý nâng cao</span>
          </div>
          <h3 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">
            Bảng <span className="text-primary">Gói Dịch Vụ</span>
          </h3>
          <p className="text-foreground/40 text-sm font-bold italic">
            Chọn gói cước tối ưu hóa hoạt động doanh nghiệp của bạn
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrent = subscription?.planType?.toLowerCase() === plan.id;
            return (
              <div 
                key={plan.id}
                className={`
                  ai-card p-8 flex flex-col justify-between transition-all duration-300 relative
                  ${plan.recommended 
                    ? 'border-interaction/40 shadow-lg scale-[1.03] bg-surface z-10' 
                    : 'bg-surface/50 border-foreground/5 shadow-sm'
                  }
                  ${isCurrent ? 'border-primary/50' : ''}
                `}
              >
                {plan.recommended && (
                  <span className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1.5 bg-interaction text-white rounded-full text-[9px] font-black uppercase tracking-widest italic shadow-sm">
                    Khuyên Dùng
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h4 className="text-2xl font-black uppercase tracking-tight text-foreground">{plan.name}</h4>
                    <p className="text-xs text-foreground/40 mt-1 font-bold italic h-10">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground italic tracking-tight">{plan.price}</span>
                    {plan.priceRaw > 0 && <span className="text-xs text-foreground/40 font-bold uppercase tracking-wider">/tháng</span>}
                  </div>

                  <ul className="space-y-3 pt-6 border-t border-foreground/5">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs font-bold text-foreground/60">
                        <Check className="w-4 h-4 text-interaction shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  {isCurrent ? (
                    <div className="w-full py-4 bg-foreground/5 border border-foreground/10 text-foreground/40 rounded-2xl font-black uppercase italic tracking-tighter text-center text-sm">
                      Gói của bạn
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      className={`
                        w-full py-4 rounded-2xl font-black uppercase italic tracking-tighter text-center text-sm cursor-pointer transition-all duration-200 active:scale-95 shadow-md
                        ${plan.recommended
                          ? 'bg-interaction text-white hover:bg-interaction/90 hover:shadow-lg'
                          : 'bg-primary text-white hover:bg-primary/95 hover:shadow-lg'
                        }
                      `}
                    >
                      Nâng cấp ngay
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sandbox Payment QR overlay Modal */}
      <AnimatePresence>
        {paymentModalOpen && paymentResponse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/60 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-foreground/10 p-8 rounded-3xl w-full max-w-lg space-y-6 relative shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
                <div className="flex items-center gap-3">
                  <QrCode className="w-6 h-6 text-interaction" />
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">
                    Cổng Thanh Toán <span className="text-primary">Sandbox</span>
                  </h3>
                </div>
                <button 
                  onClick={() => setPaymentModalOpen(false)}
                  className="text-foreground/40 hover:text-foreground font-black text-lg p-2 transition"
                >
                  ✕
                </button>
              </div>

              {/* Payment Methods Tabs */}
              <div className="grid grid-cols-4 gap-2 bg-foreground/5 p-1 rounded-2xl">
                {(['momo', 'zalopay', 'vnpay', 'card'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setActivePaymentMethod(method)}
                    className={`
                      py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition
                      ${activePaymentMethod === method 
                        ? 'bg-surface text-foreground shadow-sm' 
                        : 'text-foreground/40 hover:text-foreground/60'
                      }
                    `}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* QR display screen */}
              <div className="bg-foreground/5 border border-foreground/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                <div className="bg-white p-4 border border-foreground/10 rounded-2xl shadow-sm relative overflow-hidden">
                  {/* Dynamic mock QR visual rendering */}
                  <div className="w-48 h-48 flex items-center justify-center relative bg-background border-2 border-dashed border-foreground/20 rounded-xl">
                    <QrCode className="w-24 h-24 text-foreground/20 stroke-[1]" />
                    {/* Simulated color border for visual premium touch */}
                    <div className="absolute inset-2 border border-interaction/30 rounded-lg animate-pulse" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 p-3 rounded-xl gap-2 shadow-inner">
                      <span className="px-3 py-1 bg-interaction/10 text-interaction rounded-full text-[9px] font-black tracking-widest uppercase">
                        {activePaymentMethod.toUpperCase()} PAY
                      </span>
                      <p className="text-[10px] font-black text-foreground/40 uppercase italic tracking-tight mt-1">Quét mã để test</p>
                      <div className="w-24 h-24 p-1 bg-foreground/5 border border-foreground/10 rounded-lg">
                        {/* Dynamic SVG representation placeholder or image */}
                        <div className="w-full h-full bg-foreground/80 flex items-center justify-center text-white text-[8px] font-mono leading-tight p-1 break-all">
                          {paymentResponse.qrCode.substring(0, 40)}...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-foreground/40 tracking-wider">Số tiền cần thanh toán</p>
                  <p className="text-2xl font-black text-interaction italic">
                    {paymentResponse.amount.toLocaleString('vi-VN')} VND
                  </p>
                  <p className="text-[10px] text-foreground/40 font-mono font-bold mt-1">
                    Mã giao dịch: {paymentResponse.transactionId}
                  </p>
                </div>
              </div>

              {/* Webhook simulator actions */}
              <div className="space-y-4 pt-4 border-t border-foreground/5">
                <div className="flex items-start gap-3 bg-accent/15 border border-accent/30 p-4 rounded-2xl text-xs font-bold text-foreground">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p>
                    Đây là môi trường **Sandbox Thử Nghiệm**. Vui lòng bấm nút phía dưới để mô phỏng một phản hồi IPN Webhook thành công từ cổng thanh toán gửi về máy chủ Rust của bạn.
                  </p>
                </div>

                {simMessage && (
                  <div className={`p-4 rounded-2xl text-xs font-bold text-center border ${
                    simMessage.includes('thành công') 
                      ? 'bg-success/15 border-success/30 text-success' 
                      : 'bg-danger/15 border-danger/30 text-danger'
                  }`}>
                    {simMessage}
                  </div>
                )}

                <button
                  onClick={simulateWebhook}
                  disabled={simulating}
                  className={`
                    w-full py-4 rounded-2xl font-black uppercase italic tracking-tighter text-center text-sm flex items-center justify-center gap-3 transition cursor-pointer shadow-md active:scale-95
                    ${simulating
                      ? 'bg-foreground/10 text-foreground/40 border border-foreground/10'
                      : 'bg-interaction text-white hover:bg-interaction/90 hover:shadow-lg'
                    }
                  `}
                >
                  {simulating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-foreground/45 border-t-transparent rounded-full animate-spin" />
                      <span>Đang mô phỏng giao dịch...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Xác nhận thanh toán (Mô phỏng Webhook)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

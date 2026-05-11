'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Phone, 
  Calendar, 
  Receipt, 
  Clock,
  User,
  Star,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

import Portal from '@/components/ui/Portal';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { CustomerService } from '@/gen/customer_connect';
import { Customer, Transaction } from '@/gen/customer_pb';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function CustomerDetailModal({ isOpen, onClose, customer }: CustomerDetailModalProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { tenantId, token } = useAuth();

  useEffect(() => {
    if (isOpen && customer && tenantId) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const client = getAuthenticatedClient(CustomerService, tenantId, token || undefined);
          const response = await client.getTransactionHistory({
            customerId: customer.id,
          });
          setHistory(response.transactions);
        } catch (err) {
          console.error('Failed to fetch transaction history:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, customer, tenantId, token]);

  if (!isOpen || !customer) return null;

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex justify-end bg-background/80 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl bg-surface border-l border-foreground/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-8 md:p-12 border-b border-foreground/10 bg-background flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-primary border border-foreground/10 rounded-2xl flex items-center justify-center shadow-sm text-white text-3xl font-black italic">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground leading-none">{customer.name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-2 text-foreground/40 font-bold text-xs italic">
                      <Phone size={14} className="text-primary" /> {customer.phone}
                    </span>
                    <span className="flex items-center gap-2 text-foreground/40 font-bold text-xs italic">
                      <Star size={14} className="text-accent" /> {Number(customer.points).toLocaleString()} ĐIỂM
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-4 hover:bg-foreground/5 rounded-2xl transition-colors">
                <X size={28} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 space-y-12">
              {/* Profile Card */}
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-background border border-foreground/5 rounded-3xl p-8 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Ngày tham gia</p>
                  <div className="flex items-center gap-3 text-foreground">
                    <Calendar size={18} className="text-primary" />
                    <span className="text-xl font-black italic tracking-tighter">
                      {customer.createdAt ? format(new Date(Number(customer.createdAt.seconds) * 1000), 'dd/MM/yyyy') : '-'}
                    </span>
                  </div>
                </div>
                <div className="bg-background border border-foreground/5 rounded-3xl p-8 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Lần cuối cập nhật</p>
                  <div className="flex items-center gap-3 text-foreground">
                    <Clock size={18} className="text-interaction" />
                    <span className="text-xl font-black italic tracking-tighter">
                      {customer.updatedAt ? format(new Date(Number(customer.updatedAt.seconds) * 1000), 'dd/MM/yyyy') : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="text-primary" size={24} />
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Lịch sử giao dịch</h3>
                  </div>
                  <span className="px-4 py-1.5 bg-background border border-foreground/10 rounded-xl text-[10px] font-black uppercase italic tracking-widest">
                    {history.length} GIAO DỊCH
                  </span>
                </div>

                {loading ? (
                  <div className="py-20 flex justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-interaction" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="bg-background/50 border-2 border-dashed border-foreground/5 rounded-[2rem] p-16 text-center space-y-4">
                    <Receipt size={48} className="mx-auto text-foreground/10" />
                    <p className="text-xl font-black uppercase italic tracking-tighter text-foreground/40">Chưa có giao dịch nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((tx) => (
                      <div 
                        key={tx.id}
                        className="group bg-background border border-foreground/5 rounded-2xl p-6 flex items-center justify-between hover:border-interaction/30 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center text-primary border border-foreground/5">
                            <Receipt size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-black uppercase italic tracking-tighter text-foreground group-hover:text-interaction transition-colors">
                              {tx.orderNumber}
                            </p>
                            <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mt-1">
                              {tx.createdAt ? format(new Date(Number(tx.createdAt.seconds) * 1000), 'HH:mm - dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black italic tracking-tighter text-foreground">
                            {Number(tx.total?.units).toLocaleString()} VNĐ
                          </p>
                          <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                            {tx.cashierName || 'SYSTEM'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 md:p-12 bg-background border-t border-foreground/10">
              <button 
                onClick={onClose}
                className="w-full py-6 bg-foreground text-background rounded-3xl font-black text-xl uppercase italic tracking-tighter shadow-sm hover:bg-interaction hover:text-white transition-all active:scale-95 flex items-center justify-center gap-4"
              >
                <span>Đóng cửa sổ</span>
                <ChevronRight size={24} />
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}

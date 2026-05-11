'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Search, X, Loader2, UserPlus, Phone, Star } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { CustomerService } from '@/gen/customer_connect';
import { Customer } from '@/gen/customer_pb';
import { motion, AnimatePresence } from 'framer-motion';
import AddCustomerModal from '@/components/customers/AddCustomerModal';

interface CustomerSelectorProps {
  onSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

export default function CustomerSelector({ onSelect, selectedCustomer }: CustomerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { tenantId, token } = useAuth();

  const fetchCustomers = useCallback(async (query: string) => {
    if (!tenantId || !query) {
        setCustomers([]);
        return;
    }
    try {
      setLoading(true);
      const client = getAuthenticatedClient(CustomerService, tenantId, token || undefined);
      const response = await client.listCustomers({ searchQuery: query });
      setCustomers(response.customers);
    } catch (err) {
      console.error('Failed to search customers:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) fetchCustomers(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchCustomers]);

  return (
    <div className="relative">
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-4 bg-interaction/10 border border-interaction/20 rounded-2xl group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-interaction rounded-full flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <div>
              <p className="font-black text-interaction uppercase italic tracking-tighter leading-tight">{selectedCustomer.name}</p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-interaction/60 uppercase">
                <Phone size={10} />
                <span>{selectedCustomer.phone}</span>
                <span className="mx-1">•</span>
                <Star size={10} className="fill-current" />
                <span>{selectedCustomer.points} ĐIỂM</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => onSelect(null)}
            className="p-2 hover:bg-interaction/20 rounded-xl transition-colors text-interaction"
          >
            <X size={18} />
          </button>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-4 bg-background border border-foreground/10 rounded-2xl hover:border-interaction transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-foreground/5 rounded-full flex items-center justify-center text-foreground/20 group-hover:bg-interaction/10 group-hover:text-interaction transition-colors">
              <User size={20} />
            </div>
            <div className="text-left">
              <p className="font-black text-foreground/40 uppercase italic tracking-tighter leading-tight group-hover:text-interaction transition-colors">CHƯA CHỌN KHÁCH HÀNG</p>
              <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">BẤM ĐỂ TÌM KIẾM HOẶC ĐĂNG KÝ</p>
            </div>
          </div>
          <Search size={20} className="text-foreground/20 group-hover:text-interaction transition-colors" />
        </button>
      )}

      {/* Search Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-md z-[200]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-surface border border-foreground/10 rounded-[2.5rem] shadow-2xl z-[201] overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-foreground/10 flex items-center justify-between bg-background">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter">Tìm khách hàng</h3>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-foreground/5 rounded-xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground/20 group-focus-within:text-interaction transition-colors" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="NHẬP SỐ ĐIỆN THOẠI HOẶC TÊN..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-lg uppercase italic tracking-tighter shadow-sm"
                  />
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="flex flex-col items-center py-10 gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-interaction" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Đang tra cứu dữ liệu...</p>
                    </div>
                  ) : customers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {customers.map((c) => (
                        <button 
                          key={c.id}
                          onClick={() => {
                            onSelect(c);
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center justify-between p-6 bg-background border border-foreground/5 rounded-2xl hover:border-interaction hover:bg-interaction/5 transition-all text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-black italic">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-foreground uppercase italic tracking-tighter text-xl">{c.name}</p>
                              <p className="text-xs font-bold text-foreground/40">{c.phone}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <p className="text-interaction font-black text-lg italic tracking-tighter">{c.points} ĐIỂM</p>
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-30">Tích lũy</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.length >= 2 ? (
                    <div className="flex flex-col items-center py-10 gap-6 text-center">
                      <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center text-foreground/20">
                        <X size={40} />
                      </div>
                      <div>
                        <p className="text-xl font-black uppercase italic tracking-tighter text-foreground/40">Không tìm thấy kết quả</p>
                        <p className="text-xs font-bold opacity-30 uppercase tracking-widest mt-1">Vui lòng kiểm tra lại số điện thoại</p>
                      </div>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-interaction text-white rounded-2xl font-black uppercase italic tracking-tighter hover:scale-105 transition-transform shadow-lg"
                      >
                        <UserPlus size={20} />
                        ĐĂNG KÝ MỚI
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AddCustomerModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          if (searchQuery) fetchCustomers(searchQuery);
        }}
      />
    </div>
  );
}

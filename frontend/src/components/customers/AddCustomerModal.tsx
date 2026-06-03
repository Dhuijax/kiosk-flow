'use client';

import { useState } from 'react';
import { X, UserPlus, Mail, Phone, User, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Portal from '@/components/ui/Portal';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { CustomerService } from '@/gen/customer_connect';
import { Customer } from '@/gen/customer_pb';
import { useTranslations } from 'next-intl';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCustomer?: Customer | null;
}

export default function AddCustomerModal({ isOpen, onClose, onSuccess, editingCustomer }: AddCustomerModalProps) {
  const t = useTranslations('Customers');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: editingCustomer?.name || '',
    phone: editingCustomer?.phone || '',
    email: '',
    notes: '',
  });

  const { tenantId, token } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setLoading(true);
    setError(null);

    try {
      const client = getAuthenticatedClient(CustomerService, tenantId, token || undefined);
      
      if (editingCustomer) {
        await client.updateCustomer({
          id: editingCustomer.id,
          name: formData.fullName,
          phone: formData.phone,
        });
      } else {
        await client.registerCustomer({
          name: formData.fullName,
          phone: formData.phone,
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setShowSuccess(false);
        setFormData({ fullName: '', email: '', phone: '', notes: '' });
      }, 1500);
    } catch (err) {
      console.error('Failed to register customer:', err);
      const message = err instanceof Error ? err.message : t('errRegister');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-12 bg-background/80 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-surface border border-foreground/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {showSuccess ? (
              <div className="p-20 flex flex-col items-center justify-center text-center gap-6">
                <div className="w-24 h-24 bg-interaction rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                  <CheckCircle size={48} />
                </div>
                <h2 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">{t('addSuccess')}</h2>
                <p className="text-foreground/40 font-bold uppercase text-xs tracking-widest">{t('addSuccessDesc')}</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-8 border-b border-foreground/10 bg-background flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary border border-foreground/10 rounded-2xl flex items-center justify-center shadow-sm text-white">
                      <UserPlus size={24} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                        {editingCustomer ? t('updateMember') : t('addMemberTitle')}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        {editingCustomer ? t('updateDesc') : t('createDesc')}
                      </p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-3 hover:bg-foreground/5 rounded-2xl transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold uppercase italic tracking-widest">
                      {error}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-8">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">{t('fullName')}</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-interaction transition-colors" />
                        <input 
                          type="text" 
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          className="w-full pl-14 pr-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm shadow-sm"
                          placeholder={t('placeholderName')}
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">{t('phoneNumber')}</label>
                      <div className="relative group">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-interaction transition-colors" />
                        <input 
                          type="tel" 
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full pl-14 pr-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm shadow-sm"
                          placeholder="0901 234 567"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">{t('emailOpt')}</label>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-interaction transition-colors" />
                        <input 
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full pl-14 pr-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm shadow-sm"
                          placeholder="khachhang@email.com"
                        />
                      </div>
                    </div>
                  </div>
                </form>

                {/* Footer Actions */}
                <div className="p-8 md:p-12 bg-background border-t border-foreground/10 flex items-center justify-end gap-6">
                  <button 
                    type="button"
                    onClick={onClose}
                    className="px-8 py-4 font-black uppercase italic tracking-tighter text-foreground/40 hover:text-foreground transition-colors"
                  >
                    {t('btnCancel')}
                  </button>
                    <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-dynamic px-12 py-5 text-xl group min-w-[240px]"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <span>{editingCustomer ? t('btnUpdate') : t('btnRegister')}</span>
                        <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}

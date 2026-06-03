'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, Save, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupplier } from '@/hooks/useSupplier';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest, DeleteSupplierRequest } from '@/gen/procurement_pb';
import Portal from '@/components/ui/Portal';
import { useTranslations } from 'next-intl';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier: Supplier | null; // null for Create
}

export default function SupplierModal({ isOpen, onClose, onSuccess, supplier }: SupplierModalProps) {
  const t = useTranslations('Inventory');
  const { createSupplier, updateSupplier, deleteSupplier, loading } = useSupplier();
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (supplier) {
        setName(supplier.name);
        setPhone(supplier.phone || '');
        setEmail(supplier.email || '');
        setAddress(supplier.address || '');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
      }
      setError('');
    }, 0);
    return () => clearTimeout(timer);
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('supplierModal.errRequiredName'));
      return;
    }

    try {
      if (supplier) {
        // Update
        const res = await updateSupplier(new UpdateSupplierRequest({
          id: supplier.id,
          name: name !== supplier.name ? name : undefined,
          phone: phone !== supplier.phone ? phone : undefined,
          email: email !== supplier.email ? email : undefined,
          address: address !== supplier.address ? address : undefined,
        }));
        if (res) {
          onSuccess();
          onClose();
        }
      } else {
        // Create
        const res = await createSupplier(new CreateSupplierRequest({
          name,
          phone,
          email,
          address,
        }));
        if (res) {
          onSuccess();
          onClose();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('supplierModal.errCommon'));
    }
  };

  const handleDelete = async () => {
    if (!supplier) return;
    if (!confirm(t('supplierModal.deleteConfirm', { name: supplier.name }))) return;

    try {
      const res = await deleteSupplier(new DeleteSupplierRequest({ id: supplier.id }));
      if (res?.success) {
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('supplierModal.errDelete'));
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-background/80 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="ai-card w-full max-w-lg flex flex-col p-0 shadow-2xl bg-surface border border-foreground/10 rounded-[2.5rem] overflow-hidden"
          >
            <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-interaction/10 flex items-center justify-center border border-interaction/20">
                  <Save className="w-6 h-6 text-interaction stroke-[3]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-foreground uppercase italic tracking-tighter leading-tight">
                    {supplier ? t('supplierModal.titleUpdate') : t('supplierModal.titleCreate')} <span className="text-interaction">{t('supplierModal.titleSupplier')}</span>
                  </h2>
                  <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mt-1 italic">{t('supplierModal.subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group">
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 col-span-full">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">{t('supplierModal.labelName')}</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('supplierModal.placeholderName')}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction focus:shadow-md transition-all font-black text-lg italic tracking-tighter shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-interaction" />
                    {t('supplierModal.labelPhone')}
                  </label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('supplierModal.placeholderPhone')}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm italic tracking-tighter shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-interaction" />
                    {t('supplierModal.labelEmail')}
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('supplierModal.placeholderEmail')}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm italic tracking-tighter shadow-sm"
                  />
                </div>

                <div className="space-y-3 col-span-full">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-interaction" />
                    {t('supplierModal.labelAddress')}
                  </label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('supplierModal.placeholderAddress')}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white focus:border-interaction transition-all font-black text-sm italic tracking-tighter shadow-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-600 text-[10px] font-black uppercase italic tracking-tighter bg-red-500/10 p-4 rounded-2xl border border-red-500/10">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                {supplier && (
                  <button 
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm group"
                    title={t('supplierModal.deleteTitle')}
                  >
                    <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={loading}
                  className="btn-dynamic flex-1 py-5 text-lg"
                >
                  {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : supplier ? t('supplierModal.btnUpdate') : t('supplierModal.btnCreate')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}

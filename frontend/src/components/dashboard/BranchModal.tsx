'use client';

import { useState, useEffect } from 'react';
import { X, Save, MapPin, Phone, RefreshCw, Info } from 'lucide-react';
import { Branch } from '@/gen/branch_pb';
import { BranchService } from '@/gen/branch_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import Portal from '@/components/ui/Portal';
import { useTranslations } from 'next-intl';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingBranch?: Branch;
}

interface FormData {
  name: string;
  address: string;
  phone: string;
  isMain: boolean;
  isActive: boolean;
}

export default function BranchModal({ isOpen, onClose, onSuccess, editingBranch }: BranchModalProps) {
  const t = useTranslations('Branches');
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    phone: '',
    isMain: false,
    isActive: true,
  });

  useEffect(() => {
    let mounted = true;
    if (!mounted) return;

    Promise.resolve().then(() => {
      if (editingBranch) {
        setFormData({
          name: editingBranch.name,
          address: editingBranch.address || '',
          phone: editingBranch.phone || '',
          isMain: editingBranch.isMain,
          isActive: editingBranch.isActive,
        });
      } else {
        setFormData({
          name: '',
          address: '',
          phone: '',
          isMain: false,
          isActive: true,
        });
      }
    });

    return () => { mounted = false; };
  }, [editingBranch, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId) return;

    setLoading(true);
    try {
      const client = getAuthenticatedClient(BranchService, tenantId, token);
      
      if (editingBranch) {
        await client.updateBranch({
          id: editingBranch.id,
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          isMain: formData.isMain,
          isActive: formData.isActive,
        });
      } else {
        await client.createBranch({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          isMain: formData.isMain,
          isActive: formData.isActive,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save branch:', err);
      alert(t('saveError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
        <div className="ai-card w-full max-w-2xl flex flex-col p-0 shadow-2xl animate-in fade-in zoom-in duration-300">
          {/* Header */}
          <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-interaction/10 flex items-center justify-center text-interaction border border-interaction/20 shadow-sm">
                <MapPin className="w-7 h-7 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground uppercase italic tracking-tighter leading-tight">
                  {editingBranch ? t('editBranch') : t('createBranch')}
                </h2>
                <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em] mt-1">
                  {t('editDesc')}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-12 h-12 bg-background border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                <Info className="w-4 h-4 text-interaction" /> {t('name')}
              </label>
              <input 
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('placeholderName')}
                className="w-full px-8 py-5 bg-surface border border-foreground/10 rounded-[2rem] outline-none focus:bg-white transition-all font-black text-xl uppercase italic tracking-tighter shadow-sm"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-interaction" /> {t('address')}
              </label>
              <input 
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('placeholderAddress')}
                className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic tracking-tighter shadow-sm"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1 flex items-center gap-2">
                <Phone className="w-4 h-4 text-interaction" /> {t('phone')}
              </label>
              <input 
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="09xx xxx xxx"
                className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic tracking-tighter shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <label className="flex items-center justify-between group cursor-pointer bg-foreground/5 p-6 rounded-3xl border border-foreground/5 hover:border-interaction/20 transition-all shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase italic tracking-tighter text-foreground/60 group-hover:text-interaction transition-colors">{t('headquarters')}</span>
                  <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest mt-1">{t('mainBranchReport')}</span>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.isMain}
                    onChange={e => setFormData({...formData, isMain: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-foreground/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </div>
              </label>

              <label className="flex items-center justify-between group cursor-pointer bg-foreground/5 p-6 rounded-3xl border border-foreground/5 hover:border-interaction/20 transition-all shadow-sm">
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase italic tracking-tighter text-foreground/60 group-hover:text-interaction transition-colors">{t('status')}</span>
                  <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest mt-1">{t('activeStatus')}</span>
                </div>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-foreground/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-interaction"></div>
                </div>
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="p-8 border-t border-foreground/5 flex items-center justify-end gap-4 bg-foreground/5">
            <button 
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-foreground/40 font-black uppercase italic tracking-tighter text-sm hover:text-foreground transition-colors"
            >
              {t('delete')}
            </button>
            <button 
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="btn-dynamic px-12 py-4 text-sm"
            >
              {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              <span>{editingBranch ? t('edit') : t('createBranch')}</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

'use client';

import React, { useState } from 'react';
import { Store as StoreIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { StoreSettingsProps } from '@/hooks/useSettings';

export default function StoreSettings({ storeInfo, updateStore }: StoreSettingsProps) {
  const [formData, setFormData] = useState({
    name: storeInfo?.name || '',
    phone: storeInfo?.phone || '',
    address: storeInfo?.address || '',
    currency: storeInfo?.currency || 'VND'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateStore(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="ai-card p-12 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between border-b border-foreground/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-sm">
            <StoreIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
              Thông tin cửa hàng
            </h3>
            <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Thiết lập thông tin cơ bản của đơn vị</p>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="btn-dynamic py-3 px-8 text-sm flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>ĐÃ LƯU</span>
            </>
          ) : (
            <span>LƯU THÔNG TIN</span>
          )}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Tên cửa hàng</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nhập tên cửa hàng..."
            className="w-full px-6 py-4 bg-surface border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic tracking-tighter shadow-sm"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Số điện thoại</label>
          <input 
            type="text" 
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Số điện thoại..."
            className="w-full px-6 py-4 bg-surface border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic tracking-tighter shadow-sm"
          />
        </div>
        <div className="md:col-span-2 space-y-3">
          <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Địa chỉ</label>
          <input 
            type="text" 
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Địa chỉ cửa hàng..."
            className="w-full px-6 py-4 bg-surface border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic tracking-tighter shadow-sm"
          />
        </div>
      </div>
    </div>
  );
}

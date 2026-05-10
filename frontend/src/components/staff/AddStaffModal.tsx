'use client';

import { useState } from 'react';
import { X, UserPlus, Mail, Shield, Briefcase, Loader2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { AuthService } from '@/gen/auth_connect';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/gen/auth_pb';

import Portal from '@/components/ui/Portal';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: User;
}

export default function AddStaffModal({ isOpen, onClose, onSuccess, initialData }: AddStaffModalProps) {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'Staff',
    branchId: '',
  });

  const isEdit = !!initialData;

  const [prevInitialData, setPrevInitialData] = useState<User | undefined>(initialData);

  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    if (initialData) {
      setFormData({
        email: initialData.email,
        password: '',
        fullName: initialData.fullName,
        role: initialData.roles[0] || 'Staff',
        branchId: initialData.branchId || '',
      });
    } else {
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'Staff',
        branchId: '',
      });
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId) return;

    setLoading(true);
    setError('');

    try {
      const client = getAuthenticatedClient(AuthService, tenantId, token);
      
      if (isEdit && initialData) {
        await client.updateStaff({
          id: initialData.id,
          fullName: formData.fullName,
          role: formData.role,
          //isActive: true, // Optional
        });
      } else {
        await client.createStaff({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          branchId: formData.branchId || undefined,
        });
      }
      
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save staff:', err);
      setError(isEdit ? 'Lỗi khi cập nhật nhân viên.' : 'Lỗi khi thêm nhân viên. Email có thể đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-12 bg-background/80 backdrop-blur-xl">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-surface border border-foreground/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-foreground/10 bg-background flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-interaction border border-foreground/10 rounded-2xl flex items-center justify-center shadow-sm text-white">
                  {isEdit ? <Shield size={24} /> : <UserPlus size={24} />}
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                    {isEdit ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    {isEdit ? `Chỉnh sửa thông tin ${formData.fullName}` : 'Mở rộng đội ngũ vận hành'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-foreground/5 rounded-2xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Full Name */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Họ và tên</label>
                  <input 
                    type="text" 
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm uppercase italic shadow-sm"
                    placeholder="NGUYỄN VĂN A"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Email quản trị</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-interaction transition-colors" />
                    <input 
                      type="email" 
                      required
                      disabled={isEdit}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-14 pr-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                      placeholder="admin@kioskflow.vn"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">
                    {isEdit ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu tạm thời'}
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20 group-focus-within:text-interaction transition-colors" />
                    <input 
                      type="password" 
                      required={!isEdit}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-14 pr-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-bold text-sm shadow-sm"
                      placeholder={isEdit ? "••••••••" : "Nhập mật khẩu"}
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Vai trò hệ thống</label>
                  <div className="relative">
                    <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20" />
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full pl-14 pr-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic appearance-none shadow-sm"
                    >
                      <option value="Staff">Nhân viên</option>
                      <option value="Manager">Quản lý</option>
                      <option value="Cook">Đầu bếp</option>
                      <option value="Cashier">Thu ngân</option>
                    </select>
                  </div>
                </div>

                {/* Branch */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Phân bổ chi nhánh</label>
                  <div className="relative">
                    <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/20" />
                    <select 
                      value={formData.branchId}
                      onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                      className="w-full pl-14 pr-6 py-4 bg-background border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all font-black text-sm uppercase italic appearance-none shadow-sm"
                    >
                      <option value="">Tất cả chi nhánh</option>
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-xs flex items-center gap-3 font-black uppercase italic tracking-tighter"
                >
                  <AlertCircle size={20} />
                  {error}
                </motion.div>
              )}
            </form>

            {/* Footer Actions */}
            <div className="p-8 md:p-12 bg-background border-t border-foreground/10 flex items-center justify-end gap-6">
              <button 
                type="button"
                onClick={onClose}
                className="px-8 py-4 font-black uppercase italic tracking-tighter text-foreground/40 hover:text-foreground transition-colors"
              >
                Hủy bỏ
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
                    <span>{isEdit ? 'LƯU THAY ĐỔI' : 'XÁC NHẬN THÊM'}</span>
                    <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </Portal>
  );
}



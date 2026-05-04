'use client';

import { useState } from 'react';
import { X, UserPlus, Mail, Shield, Briefcase, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { AuthService } from '@/gen/auth_connect';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddStaffModal({ isOpen, onClose, onSuccess }: AddStaffModalProps) {
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tenantId) return;

    setLoading(true);
    setError('');

    try {
      const client = getAuthenticatedClient(AuthService, tenantId, token);
      await client.createStaff({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        branchId: formData.branchId || undefined,
      });
      
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'Staff',
        branchId: '',
      });
    } catch (err: unknown) {
      console.error('Failed to create staff:', err);
      setError('Lỗi khi thêm nhân viên. Có thể email đã tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative glass w-full max-w-lg rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/30">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-soft" />
            <h2 className="text-xl font-bold text-white">Thêm nhân viên mới</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">Họ và tên</label>
              <div className="relative group">
                <input 
                  type="text" 
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full pl-4 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric focus:ring-1 focus:ring-blue-electric/20 transition-all"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric focus:ring-1 focus:ring-blue-electric/20 transition-all text-sm"
                  placeholder="email@vidu.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Mật khẩu</label>
              <input 
                type="password" 
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric focus:ring-1 focus:ring-blue-electric/20 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Vai trò</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric transition-all text-sm appearance-none"
                >
                  <option value="Staff">Nhân viên</option>
                  <option value="Manager">Quản lý</option>
                  <option value="Cook">Đầu bếp</option>
                  <option value="Cashier">Thu ngân</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase">Chi nhánh</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <select 
                  value={formData.branchId}
                  onChange={(e) => setFormData({...formData, branchId: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl outline-none focus:border-blue-electric transition-all text-sm appearance-none"
                >
                  <option value="">Tất cả chi nhánh</option>
                  {/* Branch options would be fetched here */}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-all"
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] py-2.5 px-4 bg-blue-electric hover:bg-blue-600 disabled:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Xác nhận thêm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

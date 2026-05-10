'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  UserPlus, 
  Users,
  Mail, 
  Shield, 
  RefreshCw,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { AuthService } from '@/gen/auth_connect';
import { User } from '@/gen/auth_pb';
import AddStaffModal from '@/components/staff/AddStaffModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function StaffPage() {
  const { token, tenantId } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStaff = useCallback(async (showLoading = true) => {
    if (!token || !tenantId) return;
    
    if (showLoading) setLoading(true);
    try {
      const client = getAuthenticatedClient(AuthService, tenantId, token);
      const response = await client.listStaff({});
      setStaff(response.staff);
    } catch (err: unknown) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  const handleEditStaff = (member: User) => {
    setEditingStaff(member);
    setIsModalOpen(true);
  };

  const handleAddStaff = () => {
    setEditingStaff(undefined);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (token) queueMicrotask(() => fetchStaff(false));
  }, [token, fetchStaff]);

  const handleDeleteStaff = async (id: string) => {
    if (!token || !tenantId || !confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;

    try {
      const client = getAuthenticatedClient(AuthService, tenantId, token);
      await client.deleteStaff({ id });
      setStatus({ message: 'Xóa nhân viên thành công!', type: 'success' });
      fetchStaff();
      setTimeout(() => setStatus(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to delete staff:', err);
      setStatus({ message: 'Lỗi khi xóa nhân viên!', type: 'error' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const filteredStaff = staff.filter(member => 
    member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20 relative">
      {/* Toast Status */}
      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div className={`px-8 py-4 rounded-full shadow-2xl border flex items-center gap-4 ${
              status.type === 'success' ? 'bg-interaction border-foreground/10 text-white' : 'bg-red-400 border-foreground/10 text-white'
            }`}>
              {status.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              <span className="font-black uppercase tracking-tighter italic">{status.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary border border-foreground/10 rounded-2xl flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-5xl font-black text-foreground uppercase italic tracking-tighter">Nhân sự</h1>
          </div>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-widest ml-16">Quản lý đội ngũ vận hành hệ thống</p>
        </div>
        
        <button 
          onClick={handleAddStaff}
          className="btn-dynamic px-8 py-4 group"
        >
          <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span>THÊM NHÂN VIÊN</span>
        </button>
      </div>

      {/* Filter & Stats Bar */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-foreground/20 group-focus-within:text-interaction transition-colors" />
          <input 
            type="text" 
            placeholder="TÌM KIẾM NHÂN VIÊN..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-surface border border-foreground/10 rounded-2xl outline-none focus:bg-white transition-all shadow-sm font-black text-lg uppercase italic tracking-tighter"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="bg-background border border-foreground/10 rounded-2xl px-8 py-4 flex flex-col justify-center shadow-sm min-w-[160px]">
            <span className="text-[10px] font-black uppercase opacity-40">Tổng số</span>
            <span className="text-3xl font-black italic tracking-tighter">{staff.length}</span>
          </div>
          <button 
            onClick={() => fetchStaff()}
            className="w-20 bg-accent border border-foreground/10 rounded-2xl flex items-center justify-center shadow-sm hover:scale-105 transition-all"
          >
            <RefreshCw className={`w-8 h-8 text-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading && staff.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-foreground/5 animate-pulse rounded-3xl border border-foreground/5" />
          ))
        ) : filteredStaff.length === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center gap-6 bg-surface border border-foreground/10 border-dashed rounded-3xl opacity-40">
            <Users size={80} />
            <p className="text-2xl font-black uppercase italic tracking-tighter">Không tìm thấy nhân viên nào</p>
          </div>
        ) : (
          filteredStaff.map((member) => (
            <motion.div
              layout
              key={member.id}
              className="bg-surface border border-foreground/10 rounded-3xl p-8 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-20 h-20 bg-background border border-foreground/10 rounded-3xl flex items-center justify-center shadow-sm group-hover:bg-interaction transition-colors overflow-hidden relative">
                  <span className="text-3xl font-black uppercase italic tracking-tighter group-hover:text-white">
                    {member.fullName.charAt(0)}
                  </span>
                  <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditStaff(member)}
                    className="w-10 h-10 bg-background border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-interaction hover:text-white transition-all shadow-sm"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteStaff(member.id)}
                    className="w-10 h-10 bg-background border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
                    {member.fullName}
                  </h3>
                  <div className="flex items-center gap-2 text-foreground/40 mt-1">
                    <Mail size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{member.email}</span>
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-foreground/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield size={16} className="text-interaction" />
                    <span className="text-xs font-black uppercase italic tracking-tighter bg-interaction/10 text-interaction px-3 py-1 rounded-lg">
                      {member.roles[0] || 'Staff'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Active</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AddStaffModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingStaff(undefined);
        }} 
        onSuccess={fetchStaff}
        initialData={editingStaff}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  UserPlus, 
  Users,
  Mail, 
  Shield, 
  RefreshCw,
  Trash2,
  Edit
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { AuthService } from '@/gen/auth_connect';
import { User } from '@/gen/auth_pb';
import AddStaffModal from '@/components/staff/AddStaffModal';

export default function StaffPage() {
  const { token, tenantId } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!token || !tenantId) return;
    
    setLoading(true);
    try {
      const client = getAuthenticatedClient(AuthService, tenantId, token);
      const response = await client.listStaff({});
      setStaff(response.staff);
      setError('');
    } catch (err: unknown) {
      console.error('Failed to fetch staff:', err);
      setError('Không thể tải danh sách nhân viên. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) fetchStaff();
  }, [token, fetchStaff]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý nhân viên</h1>
          <p className="text-slate-400 text-sm">Quản lý quyền truy cập và thông tin nhân sự của cửa hàng</p>
        </div>
        <button 
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-electric hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
          onClick={() => setIsModalOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm nhân viên</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-soft transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc email..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg outline-none focus:border-blue-electric/50 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchStaff}
            className="p-2 text-slate-400 hover:text-blue-soft hover:bg-slate-800 rounded-lg transition-all"
            title="Làm mới"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="glass rounded-2xl overflow-hidden border border-slate-800/50 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Nhân viên</th>
                <th className="px-6 py-4 font-semibold">Vai trò</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-blue-electric border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-50">
                      <Users className="w-12 h-12 text-slate-600" />
                      <p className="text-slate-500">Chưa có nhân viên nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-electric font-bold">
                          {member.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{member.fullName}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-800/50 px-2.5 py-1 rounded-full w-fit border border-slate-700/50">
                        <Shield className="w-3 h-3 text-blue-soft" />
                        {member.roles.join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-400 hover:text-blue-soft hover:bg-slate-800 rounded-lg transition-all">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="px-6 py-4 bg-slate-800/10 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
          <span>Hiển thị {staff.length} nhân viên</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors" disabled>Trước</button>
            <button className="px-3 py-1 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors" disabled>Sau</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
          <Trash2 className="w-4 h-4" />
          {error}
        </div>
      )}

      <AddStaffModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchStaff}
      />
    </div>
  );
}

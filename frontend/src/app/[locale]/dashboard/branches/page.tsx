'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { BranchService } from '@/gen/branch_connect';
import { Branch } from '@/gen/branch_pb';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Store,
  Phone,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import BranchModal from '@/components/dashboard/BranchModal';

export default function BranchesPage() {
  const { tenantId, token, branchId, setBranchId } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | undefined>();

  const loadBranches = useCallback(async () => {
    if (!tenantId || !token) return;
    try {
      setLoading(true);
      const client = getAuthenticatedClient(BranchService, tenantId, token);
      const res = await client.listBranches({});
      setBranches(res.branches);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      Promise.resolve().then(() => loadBranches());
    }
    return () => { mounted = false; };
  }, [loadBranches]);

  const handleSwitchBranch = (id: string) => {
    setBranchId(id);
  };

  const handleAdd = () => {
    setEditingBranch(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!tenantId || !token) return;
    if (!confirm('Bạn có chắc chắn muốn xóa chi nhánh này? Thao tác này không thể hoàn tác.')) return;

    try {
      const client = getAuthenticatedClient(BranchService, tenantId, token);
      await client.deleteBranch({ id });
      await loadBranches();
      if (branchId === id) {
        // If deleted current branch, reset or switch to main
        const main = branches.find(b => b.isMain);
        if (main && main.id !== id) {
          setBranchId(main.id);
        }
      }
    } catch (err) {
      console.error('Failed to delete branch:', err);
      alert('Có lỗi xảy ra khi xóa chi nhánh.');
    }
  };

  const filteredBranches = branches.filter(b => 
    (b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    (b.address?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-interaction animate-in fade-in slide-in-from-left duration-700">
            <div className="w-10 h-10 rounded-xl bg-interaction/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 stroke-[3]" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.2em] italic">Quản lý hạ tầng</span>
          </div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">
            Chi nhánh <span className="text-interaction">Cửa hàng</span>
          </h1>
          <p className="text-foreground/40 font-medium max-w-xl text-lg">
            Quản lý mạng lưới chi nhánh, thiết lập địa điểm và tối ưu hóa vận hành đa điểm trên một nền tảng duy nhất.
          </p>
        </div>

        <button 
          onClick={handleAdd}
          className="h-20 px-10 bg-primary text-white rounded-3xl font-black uppercase italic tracking-tighter flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 group"
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform stroke-[3]" />
          <span>Thêm chi nhánh mới</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex items-center gap-4 bg-surface px-8 h-20 rounded-3xl border border-foreground/10 group focus-within:bg-white focus-within:border-interaction focus-within:shadow-md transition-all relative overflow-hidden">
          <Search className="w-7 h-7 text-foreground/20 group-focus-within:text-interaction flex-none pointer-events-none" />
          <input
            type="text"
            placeholder="TÌM THEO TÊN HOẶC ĐỊA CHỈ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 h-full py-0 font-black uppercase italic tracking-tighter placeholder:text-foreground/10 leading-none"
          />
        </div>
        <button 
          onClick={loadBranches}
          className="h-20 w-20 bg-surface border border-foreground/10 rounded-3xl flex items-center justify-center hover:bg-foreground/5 transition-all"
          title="Tải lại"
        >
          <RefreshCw className={`w-6 h-6 text-foreground/40 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid Layout */}
      {loading && branches.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[400px] bg-surface/50 border border-foreground/10 rounded-[40px] animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBranches.map((branch) => {
            const isCurrent = branchId === branch.id;
            
            return (
              <div 
                key={branch.id}
                className={`
                  group relative bg-surface border rounded-[40px] p-8 flex flex-col gap-8 transition-all duration-500
                  ${isCurrent 
                    ? 'border-interaction shadow-2xl shadow-interaction/10 scale-[1.02]' 
                    : 'border-foreground/10 hover:border-foreground/20 hover:shadow-xl hover:-translate-y-2'
                  }
                  ${!branch.isActive ? 'opacity-60 grayscale-[0.5]' : ''}
                `}
              >
                {/* Active Indicator */}
                {isCurrent && (
                  <div className="absolute -top-4 -right-4 bg-interaction text-white p-4 rounded-2xl shadow-xl animate-in zoom-in duration-500">
                    <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                  </div>
                )}

                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className={`
                    w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500
                    ${isCurrent ? 'bg-interaction text-white' : 'bg-foreground/5 text-foreground/40 group-hover:bg-interaction/10 group-hover:text-interaction'}
                  `}>
                    <Store className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  {!branch.isActive && (
                    <div className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Ngừng hoạt động
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-2">
                    {branch.isMain && (
                      <div className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Trụ sở chính
                      </div>
                    )}
                    {branch.isActive && (
                      <div className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        Đang mở cửa
                      </div>
                    )}
                  </div>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-tight group-hover:text-interaction transition-colors">
                    {branch.name}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-foreground/40">
                      <MapPin className="w-5 h-5 shrink-0 mt-1" />
                      <p className="text-sm font-bold leading-relaxed">{branch.address || 'Chưa cập nhật địa chỉ'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-foreground/40">
                      <Phone className="w-5 h-5 shrink-0" />
                      <p className="text-sm font-bold tracking-wider">{branch.phone || 'Chưa cập nhật SĐT'}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-8 border-t border-foreground/5 flex items-center justify-between">
                  {isCurrent ? (
                    <div className="flex items-center gap-2 text-interaction font-black uppercase italic tracking-tighter text-sm">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <span>Đang vận hành</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSwitchBranch(branch.id)}
                      disabled={!branch.isActive}
                      className="px-6 py-3 bg-foreground/5 hover:bg-interaction hover:text-white disabled:opacity-50 disabled:hover:bg-foreground/5 disabled:hover:text-foreground rounded-2xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center gap-2"
                    >
                      <span>Sử dụng</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(branch)}
                      className="w-12 h-12 rounded-2xl border border-foreground/10 flex items-center justify-center hover:bg-interaction/10 hover:text-interaction transition-colors" title="Sửa"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    {!branch.isMain && (
                      <button 
                        onClick={() => handleDelete(branch.id)}
                        className="w-12 h-12 rounded-2xl border border-foreground/10 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Xóa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredBranches.length === 0 && (
        <div className="bg-surface border border-dashed border-foreground/20 rounded-[40px] py-32 flex flex-col items-center justify-center gap-8 text-center px-8">
          <div className="w-32 h-32 bg-foreground/5 rounded-[40px] flex items-center justify-center text-foreground/10">
            <MapPin className="w-16 h-16" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter">Không tìm thấy chi nhánh</h3>
            <p className="text-foreground/40 font-medium">Hãy thử thay đổi từ khóa tìm kiếm hoặc thêm chi nhánh mới.</p>
          </div>
          <button 
            onClick={() => setSearchQuery('')}
            className="h-16 px-8 bg-foreground text-background rounded-2xl font-black uppercase italic tracking-tighter hover:scale-105 transition-all"
          >
            Xóa tìm kiếm
          </button>
        </div>
      )}

      <BranchModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadBranches}
        editingBranch={editingBranch}
      />
    </div>
  );
}

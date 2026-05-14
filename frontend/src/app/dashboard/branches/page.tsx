'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { BranchService } from '@/gen/branch_connect';
import { Branch } from '@/gen/branch_pb';
import { 
  MapPin, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Store,
  Phone,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function BranchesPage() {
  const { tenantId, token, branchId, setBranchId } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    async function loadBranches() {
      if (!tenantId || !token) return;
      try {
        const client = getAuthenticatedClient(BranchService, tenantId, token);
        const res = await client.listBranches({});
        if (isMounted) setBranches(res.branches);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBranches();
    
    return () => {
      isMounted = false;
    };
  }, [tenantId, token]);

  const handleSwitchBranch = (id: string) => {
    setBranchId(id);
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address?.toLowerCase().includes(searchQuery.toLowerCase())
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

        <button className="h-20 px-10 bg-primary text-white rounded-3xl font-black uppercase italic tracking-tighter flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 group">
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform stroke-[3]" />
          <span>Thêm chi nhánh mới</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="w-6 h-6 text-foreground/20 group-focus-within:text-interaction transition-colors" />
          </div>
          <input
            type="text"
            placeholder="TÌM THEO TÊN HOẶC ĐỊA CHỈ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-20 pl-16 pr-8 bg-surface border border-foreground/10 rounded-3xl focus:border-interaction focus:ring-4 focus:ring-interaction/10 outline-none transition-all font-black uppercase italic tracking-tighter placeholder:text-foreground/10"
          />
        </div>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[400px] bg-surface/50 border border-foreground/10 rounded-[40px] animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBranches.map((branch) => {
            const isActive = branchId === branch.id;
            return (
              <div 
                key={branch.id}
                className={`
                  group relative bg-surface border rounded-[40px] p-8 flex flex-col gap-8 transition-all duration-500
                  ${isActive 
                    ? 'border-interaction shadow-2xl shadow-interaction/10 scale-[1.02]' 
                    : 'border-foreground/10 hover:border-foreground/20 hover:shadow-xl hover:-translate-y-2'
                  }
                `}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute -top-4 -right-4 bg-interaction text-white p-4 rounded-2xl shadow-xl animate-in zoom-in duration-500">
                    <CheckCircle2 className="w-6 h-6 stroke-[3]" />
                  </div>
                )}

                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className={`
                    w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500
                    ${isActive ? 'bg-interaction text-white' : 'bg-foreground/5 text-foreground/40 group-hover:bg-interaction/10 group-hover:text-interaction'}
                  `}>
                    <Store className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <button className="w-12 h-12 rounded-2xl border border-foreground/10 flex items-center justify-center hover:bg-foreground/5 transition-colors">
                    <MoreVertical className="w-6 h-6 text-foreground/20" />
                  </button>
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
                  {isActive ? (
                    <div className="flex items-center gap-2 text-interaction font-black uppercase italic tracking-tighter text-sm">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <span>Đang vận hành</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSwitchBranch(branch.id)}
                      className="px-6 py-3 bg-foreground/5 hover:bg-interaction hover:text-white rounded-2xl transition-all font-black uppercase italic tracking-tighter text-sm flex items-center gap-2"
                    >
                      <span>Sử dụng</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button className="w-12 h-12 rounded-2xl border border-foreground/10 flex items-center justify-center hover:bg-interaction/10 hover:text-interaction transition-colors" title="Sửa">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    {!branch.isMain && (
                      <button className="w-12 h-12 rounded-2xl border border-foreground/10 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Xóa">
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
          <button className="h-16 px-8 bg-foreground text-background rounded-2xl font-black uppercase italic tracking-tighter hover:scale-105 transition-all">
            Xóa tìm kiếm
          </button>
        </div>
      )}
    </div>
  );
}

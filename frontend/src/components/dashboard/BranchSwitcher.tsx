'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { BranchService } from '@/gen/branch_connect';
import { Branch } from '@/gen/branch_pb';
import { Store, ChevronDown, Check, MapPin, RefreshCw } from 'lucide-react';

export default function BranchSwitcher() {
  const { tenantId, token, branchId, setBranchId } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchBranches = useCallback(async () => {
    if (!tenantId || !token) return;
    setLoading(true);
    try {
      const client = getAuthenticatedClient(BranchService, tenantId, token);
      const res = await client.listBranches({});
      setBranches(res.branches);
    } catch (err) {
      console.error('Failed to fetch branches for switcher:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  useEffect(() => {
    if (isOpen && branches.length === 0) {
      fetchBranches();
    }
  }, [isOpen, branches.length, fetchBranches]);

  const activeBranch = branches.find(b => b.id === branchId) || branches.find(b => b.isMain);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-4 px-6 py-3 bg-surface border border-foreground/10 rounded-2xl hover:border-interaction hover:shadow-md transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-interaction/10 flex items-center justify-center text-interaction group-hover:bg-interaction group-hover:text-white transition-all">
          <Store className="w-5 h-5 stroke-[3]" />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest leading-none mb-1">Chi nhánh hiện tại</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase italic tracking-tighter">
              {activeBranch?.name || 'Đang tải...'}
            </span>
            <ChevronDown className={`w-4 h-4 text-foreground/20 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[60]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-4 left-0 w-80 bg-surface border border-foreground/10 rounded-[32px] shadow-2xl z-[70] py-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-foreground/5 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-foreground/40 italic">Danh sách chi nhánh</span>
              <button 
                onClick={fetchBranches}
                className="p-2 hover:bg-foreground/5 rounded-lg transition-colors text-foreground/20 hover:text-interaction"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="max-h-80 overflow-auto py-2 custom-scrollbar">
              {branches.length === 0 && !loading && (
                <div className="px-6 py-8 text-center text-foreground/20 italic text-sm">
                  Chưa có dữ liệu
                </div>
              )}
              
              {branches.map((branch) => {
                const isActive = branchId === branch.id;
                return (
                  <button
                    key={branch.id}
                    onClick={() => {
                      setBranchId(branch.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full px-6 py-4 flex items-center gap-4 transition-all hover:bg-foreground/5
                      ${isActive ? 'text-interaction' : 'text-foreground/60'}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center
                      ${isActive ? 'bg-interaction/10' : 'bg-foreground/5'}
                    `}>
                      <MapPin className={`w-5 h-5 ${isActive ? 'stroke-[3]' : 'stroke-[2]'}`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-black uppercase italic tracking-tighter truncate">{branch.name}</p>
                      <p className="text-[10px] font-medium text-foreground/30 truncate">{branch.address || 'Không có địa chỉ'}</p>
                    </div>
                    {isActive && <Check className="w-5 h-5 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 px-4">
              <a 
                href="/dashboard/branches" 
                className="block w-full py-4 text-center text-xs font-black uppercase italic tracking-tighter text-interaction hover:bg-interaction/5 rounded-2xl transition-colors border border-transparent hover:border-interaction/10"
                onClick={() => setIsOpen(false)}
              >
                Quản lý chi nhánh
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

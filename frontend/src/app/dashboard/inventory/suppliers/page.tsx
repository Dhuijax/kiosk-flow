'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  PlusCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useSupplier } from '@/hooks/useSupplier';
import { Supplier } from '@/gen/procurement_pb';
import SupplierModal from '@/components/procurement/SupplierModal';

export default function SuppliersPage() {
  const { listSuppliers, loading } = useSupplier();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await listSuppliers({ search: searchQuery });
      if (res && res.suppliers) {
        setSuppliers(res.suppliers);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    }
  }, [listSuppliers, searchQuery]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-12 pb-20 relative">
      {/* Title Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-interaction font-black uppercase text-xs tracking-widest">
            <Sparkles className="w-5 h-5" />
            <span>Nguồn cung ứng nguyên liệu</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            Danh sách <span className="text-primary">Nhà cung cấp</span>
          </h1>
          <p className="text-foreground/40 font-bold flex items-center gap-2 italic">
            Quản lý đối tác và thông tin liên hệ cung cấp vật tư nhập khẩu & nội địa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 bg-surface p-4 border border-foreground/10 rounded-3xl shadow-sm">
          <div className="flex items-center gap-4 bg-background px-6 h-14 rounded-2xl border border-foreground/10 w-[300px] max-w-full group focus-within:border-interaction focus-within:shadow-md transition-all">
            <Search className="w-5 h-5 text-foreground/20 group-focus-within:text-interaction flex-none" />
            <input 
              type="text" 
              placeholder="TÌM KIẾM ĐỐI TÁC..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-black uppercase italic tracking-tighter flex-1 placeholder:text-foreground/20"
            />
          </div>
          <button 
            onClick={handleAddClick}
            className="btn-dynamic py-4 px-8 text-sm h-14"
          >
            <PlusCircle className="w-5 h-5" />
            <span>THÊM ĐỐI TÁC MỚI</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar for Inventory */}
      <div className="flex items-center gap-4 border-b border-foreground/10 pb-6">
        <Link 
          href="/dashboard/inventory" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          Tồn kho tổng quan
        </Link>
        <Link 
          href="/dashboard/inventory/ingredients" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          Danh sách nguyên liệu
        </Link>
        <Link 
          href="/dashboard/inventory/suppliers" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest bg-interaction/10 text-interaction border border-interaction/20 transition-all"
        >
          Nhà cung cấp
        </Link>
        <Link 
          href="/dashboard/inventory/procurement" 
          className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-widest text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
        >
          Phiếu nhập hàng
        </Link>
      </div>

      {/* Suppliers Grid */}
      {loading && suppliers.length === 0 ? (
        <div className="py-24 flex items-center justify-center">
          <RefreshCw className="w-12 h-12 text-interaction animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="py-24 bg-surface/50 border border-foreground/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 bg-interaction/5 rounded-3xl flex items-center justify-center border border-interaction/10 mb-6">
            <Users className="w-10 h-10 text-interaction" />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground mb-2">Chưa có nhà cung cấp nào</h3>
          <p className="text-foreground/40 max-w-md font-bold text-sm italic mb-8">Hệ thống chưa ghi nhận đối tác phân phối nguyên liệu nào. Hãy bắt đầu thêm mới.</p>
          <button onClick={handleAddClick} className="btn-dynamic py-4 px-8 text-sm">
            <PlusCircle className="w-5 h-5" />
            <span>TẠO NHÀ CUNG CẤP ĐẦU TIÊN</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {suppliers.map((supplier) => (
            <div 
              key={supplier.id}
              onClick={() => handleEditClick(supplier)}
              className="ai-card bg-surface/50 hover:bg-surface border border-foreground/10 hover:border-interaction/30 hover:shadow-lg transition-all rounded-[2rem] p-8 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 bg-interaction/10 rounded-2xl flex items-center justify-center border border-interaction/20 text-interaction group-hover:scale-105 transition-transform">
                    <Users className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-foreground/5 text-foreground/40 border border-foreground/5 text-[9px] font-black uppercase tracking-widest italic">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground group-hover:text-interaction transition-colors line-clamp-2">
                    {supplier.name}
                  </h3>
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-wider italic">ID: #{supplier.id.substring(0, 8)}</p>
                </div>

                <div className="h-px bg-foreground/5"></div>

                <div className="space-y-3 font-black uppercase tracking-tighter text-xs">
                  {supplier.phone && (
                    <div className="flex items-center gap-3 text-foreground/60 group-hover:text-foreground transition-colors">
                      <Phone className="w-4 h-4 text-interaction flex-shrink-0" />
                      <span className="italic">{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-3 text-foreground/60 group-hover:text-foreground transition-colors break-all">
                      <Mail className="w-4 h-4 text-interaction flex-shrink-0" />
                      <span className="italic lowercase">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start gap-3 text-foreground/60 group-hover:text-foreground transition-colors">
                      <MapPin className="w-4 h-4 text-interaction flex-shrink-0 mt-0.5" />
                      <span className="italic normal-case font-bold line-clamp-2">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Modal Dialog */}
      <SupplierModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSuppliers}
        supplier={selectedSupplier}
      />
    </div>
  );
}

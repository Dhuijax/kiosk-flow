'use client';

import { useState } from 'react';
import { 
  Search, 
  Plus, 
  Heart, 
  Star, 
  TrendingUp, 
  Crown, 
  ChevronRight, 
  Filter,
  MoreVertical,
  Phone,
  Calendar,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { CustomerService } from '@/gen/customer_connect';
import { Customer } from '@/gen/customer_pb';
import { useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Dropdown from '@/components/ui/Dropdown';
import CustomerDetailModal from '@/components/customers/CustomerDetailModal';
import { Trash2, Edit2, Info } from 'lucide-react';

const getTier = (points: number) => {
  if (points >= 5000) return 'PLATINUM';
  if (points >= 2000) return 'GOLD';
  if (points >= 500) return 'SILVER';
  return 'BRONZE';
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'PLATINUM': return 'bg-foreground text-background border-foreground';
    case 'GOLD': return 'bg-accent text-foreground border-foreground';
    case 'SILVER': return 'bg-interaction/20 text-interaction border-interaction/30';
    default: return 'bg-background text-foreground/40 border-foreground/10';
  }
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const { tenantId, token } = useAuth();

  const fetchCustomers = useCallback(async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const client = getAuthenticatedClient(CustomerService, tenantId, token || undefined);
      const response = await client.listCustomers({
        searchQuery: searchQuery,
      });
      setCustomers(response.customers);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, token, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!tenantId || !window.confirm('BẠN CÓ CHẮC CHẮN MUỐN XÓA KHÁCH HÀNG NÀY?')) return;
    try {
      const client = getAuthenticatedClient(CustomerService, tenantId, token || undefined);
      await client.deleteCustomer({ id });
      fetchCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert('Không thể xóa khách hàng. Vui lòng thử lại sau.');
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleViewDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-interaction font-black uppercase text-xs tracking-widest">
            <Heart className="w-5 h-5 fill-current" />
            <span>Quan hệ khách hàng</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-foreground leading-tight">
            Khách <span className="text-primary">Thân Thiết</span>
          </h1>
          <p className="text-foreground/40 font-bold italic text-lg">Quản lý lòng trung thành và thấu hiểu hành vi khách hàng.</p>
        </div>
        <button 
          onClick={() => {
            setSelectedCustomer(null);
            setIsModalOpen(true);
          }}
          className="btn-dynamic px-10 py-5 text-xl"
        >
          <Plus className="w-6 h-6 stroke-[4]" />
          <span>THÊM THÀNH VIÊN</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="ai-card flex items-center gap-8">
          <div className="w-20 h-20 bg-primary border border-foreground/10 rounded-2xl flex items-center justify-center text-white shadow-sm">
            <Crown size={40} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Thành viên tích cực</p>
            <p className="text-4xl font-black italic tracking-tighter text-foreground">1,248</p>
          </div>
        </div>
        <div className="ai-card flex items-center gap-8">
          <div className="w-20 h-20 bg-accent border border-foreground/10 rounded-2xl flex items-center justify-center text-foreground shadow-sm">
            <Star size={40} className="stroke-[2.5] fill-current" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Điểm đã cấp</p>
            <p className="text-4xl font-black italic tracking-tighter text-foreground">452K</p>
          </div>
        </div>
        <div className="ai-card flex items-center gap-8">
          <div className="w-20 h-20 bg-interaction border border-foreground/10 rounded-2xl flex items-center justify-center text-white shadow-sm">
            <TrendingUp size={40} className="stroke-[2.5]" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Tỷ lệ quay lại</p>
            <p className="text-4xl font-black italic tracking-tighter text-foreground">64%</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ai-card bg-surface flex flex-col md:flex-row gap-8 items-center p-8">
        <div className="flex-1 flex items-center gap-4 bg-background px-8 h-20 rounded-3xl border border-foreground/10 group focus-within:bg-white focus-within:border-interaction focus-within:shadow-md transition-all relative overflow-hidden">
          <Search className="w-7 h-7 text-foreground/20 group-focus-within:text-interaction flex-none pointer-events-none translate-y-[1px]" />
          <input 
            type="text" 
            placeholder="TÌM THEO TÊN, SỐ ĐIỆN THOẠI HOẶC EMAIL..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full h-full py-0 font-black text-lg uppercase italic tracking-tighter placeholder:text-foreground/20 leading-none"
          />
        </div>
        <button 
          onClick={() => setIsFilterActive(!isFilterActive)}
          className={`w-16 h-16 bg-surface border border-foreground/10 rounded-2xl flex items-center justify-center hover:bg-foreground hover:text-background transition-all shadow-sm active:scale-95 ${isFilterActive ? 'bg-primary text-white border-primary' : ''}`}
        >
          <Filter className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <div className="w-12 h-12 border-4 border-interaction border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <p className="text-2xl font-black uppercase italic tracking-tighter text-foreground/40">Không tìm thấy khách hàng</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-interaction font-bold uppercase text-xs tracking-widest hover:underline"
            >
              Đăng ký thành viên mới ngay
            </button>
          </div>
        ) : (
          customers.map((customer, idx) => {
            const tier = getTier(Number(customer.points));
            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-surface border border-foreground/10 rounded-3xl p-10 flex flex-col md:flex-row gap-10 transition-all shadow-sm hover:shadow-md hover:scale-[1.01] relative"
              >
                {/* Background Accent & Clipping */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-interaction/10 transition-colors" />
                </div>

                {/* Profile Info */}
                <div className="flex flex-col items-center gap-6 md:w-48 shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-foreground/5 border border-foreground/10 overflow-hidden shadow-sm relative group-hover:rotate-3 transition-transform">
                    <div className="w-full h-full bg-primary flex items-center justify-center">
                      <span className="text-4xl font-black text-background italic">{customer.name.charAt(0)}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase italic tracking-widest shadow-sm ${getTierColor(tier)}`}>
                    {tier}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-3xl font-black uppercase italic tracking-tighter text-foreground group-hover:text-interaction transition-colors leading-none mb-2">
                        {customer.name}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-foreground/40 font-bold text-sm italic">
                        <span className="flex items-center gap-2"><Phone size={14} className="text-primary" /> {customer.phone}</span>
                      </div>
                    </div>
                    <Dropdown 
                      trigger={
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-foreground/5 transition-colors">
                          <MoreVertical size={20} className="text-foreground/40" />
                        </button>
                      }
                      items={[
                        { label: 'Chi tiết', icon: <Info size={14} />, onClick: () => handleViewDetail(customer) },
                        { label: 'Sửa', icon: <Edit2 size={14} />, onClick: () => handleEdit(customer) },
                        { label: 'Xóa', icon: <Trash2 size={14} />, variant: 'danger', onClick: () => handleDelete(customer.id) },
                      ]}
                    />
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6 bg-background rounded-2xl border border-foreground/5">
                    <div>
                      <p className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-1">Điểm tích lũy</p>
                      <p className="text-xl font-black italic tracking-tighter text-foreground">{Number(customer.points).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-1">Tổng chi tiêu</p>
                      <p className="text-xl font-black italic tracking-tighter text-foreground">0M</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-[8px] font-black uppercase opacity-40 tracking-widest mb-1">Số đơn hàng</p>
                      <p className="text-xl font-black italic tracking-tighter text-foreground">0</p>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-foreground/5">
                    <div className="flex items-center gap-2 text-foreground/30 font-black uppercase text-[10px] tracking-widest italic">
                      <Calendar size={14} />
                      <span>Tham gia: {customer.createdAt ? format(new Date(Number(customer.createdAt.seconds) * 1000), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                    <button 
                      onClick={() => handleViewDetail(customer)}
                      className="flex items-center gap-2 text-interaction font-black uppercase text-xs italic tracking-tighter group-hover:translate-x-2 transition-transform"
                    >
                      Chi tiết 
                      <ChevronRight size={14} className="stroke-[3]" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* AI Recommendation Footer */}
      <div className="ai-card bg-foreground text-background flex flex-col md:flex-row items-center gap-8 overflow-hidden relative group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_1px)] bg-[size:20px_20px] opacity-[0.05]" />
        <div className="w-20 h-20 bg-primary border border-background/20 rounded-2xl flex items-center justify-center text-white z-10 shrink-0">
          <Sparkles size={40} className="animate-pulse" />
        </div>
        <div className="flex-1 space-y-2 z-10">
          <h4 className="text-2xl font-black uppercase italic tracking-tighter">AI Insight: Nhóm khách hàng tiềm năng</h4>
          <p className="font-bold opacity-60">Dựa trên dữ liệu 30 ngày qua, có 42 khách hàng hạng Silver sắp đạt hạng Gold. Hãy gửi voucher ưu đãi để thúc đẩy chuyển đổi.</p>
        </div>
        <button className="bg-background text-foreground px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter text-sm hover:bg-accent transition-all z-10 whitespace-nowrap">
          GỬI CHIẾN DỊCH NGAY
        </button>
      </div>

      <AddCustomerModal 
        key={isModalOpen ? `edit-${selectedCustomer?.id || 'new'}` : 'closed'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSuccess={() => {
          fetchCustomers();
        }}
        editingCustomer={selectedCustomer}
      />

      <CustomerDetailModal 
        key={isDetailOpen ? `detail-${selectedCustomer?.id || 'detail'}` : 'closed'}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
      />
    </div>
  );
}

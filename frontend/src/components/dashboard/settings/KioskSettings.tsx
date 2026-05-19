'use client';

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Printer, 
  Cpu, 
  RefreshCw, 
  Timer, 
  Loader2, 
  CheckCircle2, 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  MapPin, 
  MonitorPlay, 
  Check, 
  Sparkles
} from 'lucide-react';
import { KioskSettingsProps } from '@/hooks/useSettings';
import { TableService } from '@/gen/table_connect';
import { FloorPlan, Table } from '@/gen/table_pb';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';

export default function KioskSettings({ settings, updateTenantSettings }: KioskSettingsProps) {
  const { tenantId, token, branchId } = useAuth();
  
  // Basic states
  const [timeout, setTimeoutVal] = useState(settings?.kioskTimeoutSeconds || 60);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Security PIN states
  const [pinCode, setPinCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kioskflow_security_pin') || '1234';
    }
    return '1234';
  });
  const [showPin, setShowPin] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);

  // Table binding states
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [boundKiosks, setBoundKiosks] = useState<Record<string, { model: string, battery: number, online: boolean, lastPing: string }>>(() => {
    if (typeof window !== 'undefined') {
      const savedKiosks = localStorage.getItem('kioskflow_active_table_kiosks');
      if (savedKiosks) {
        try {
          return JSON.parse(savedKiosks);
        } catch (e) {
          console.error(e);
        }
      } else {
        // Seed default bound tablets for visual premium feel
        const defaultKiosks = {
          'seeded-table-1': { model: 'iPad Air 5', battery: 94, online: true, lastPing: 'Vừa xong' },
          'seeded-table-3': { model: 'Xiaomi Pad 6', battery: 78, online: true, lastPing: '2 phút trước' }
        };
        localStorage.setItem('kioskflow_active_table_kiosks', JSON.stringify(defaultKiosks));
        return defaultKiosks;
      }
    }
    return {};
  });

  // Fetch Floor Plans
  useEffect(() => {
    if (!tenantId) return;
    const fetchFloorPlans = async () => {
      try {
        const client = getAuthenticatedClient(TableService, tenantId, token || undefined);
        const response = await client.listFloorPlans({ branchId: branchId || '' });
        setFloorPlans(response.floorPlans);
        if (response.floorPlans.length > 0) {
          setSelectedPlanId(response.floorPlans[0].id);
        }
      } catch (err) {
        console.error('Failed to list floor plans:', err);
      }
    };
    fetchFloorPlans();
  }, [tenantId, token, branchId]);

  // Fetch Tables
  useEffect(() => {
    if (!tenantId || !selectedPlanId) return;
    
    let active = true;
    const load = async () => {
      setLoadingTables(true);
      try {
        const client = getAuthenticatedClient(TableService, tenantId, token || undefined);
        const response = await client.listTables({ floorPlanId: selectedPlanId });
        if (active) {
          setTables(response.tables);
        }
      } catch (err) {
        console.error('Failed to list tables:', err);
      } finally {
        if (active) {
          setLoadingTables(false);
        }
      }
    };
    
    load();
    
    return () => {
      active = false;
    };
  }, [tenantId, token, selectedPlanId]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateTenantSettings({
        themeColor: settings?.themeColor || 'Earth-Tones',
        kioskTimeoutSeconds: timeout,
        language: settings?.language || 'vi',
        currency: settings?.currency || 'VND'
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePin = () => {
    if (pinCode.length < 4) {
      alert('Mã PIN phải dài ít nhất 4 ký số!');
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('kioskflow_security_pin', pinCode);
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 2000);
    }
  };

  // Bind new tablet mock action
  const handleToggleKioskBind = (tableId: string) => {
    const updated = { ...boundKiosks };
    if (updated[tableId]) {
      // Unbind
      delete updated[tableId];
    } else {
      // Bind tablet with pure deterministic mock data (no Math.random to satisfy compiler purity)
      const charCodeSum = tableId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const models = ['iPad Air 5', 'Galaxy Tab S9', 'iPad Gen 10', 'Xiaomi Pad 6'];
      const randomModel = models[charCodeSum % models.length];
      const battery = 70 + (charCodeSum % 30);
      updated[tableId] = {
        model: randomModel,
        battery: battery,
        online: true,
        lastPing: 'Vừa xong'
      };
    }
    setBoundKiosks(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kioskflow_active_table_kiosks', JSON.stringify(updated));
    }
  };

  // Launch Kiosk mode directly in new fullscreen browser window
  const handleLaunchKiosk = (tableId: string) => {
    const checkPin = confirm(`Bật chế độ khóa Kiosk cho bàn này?\nTrình duyệt sẽ mở giao diện gọi món và khóa lại.\nMã PIN mở khóa hiện tại là: ${pinCode}`);
    if (checkPin) {
      // Unify table ID seed to simulation if needed
      // Mark as bound if not already
      if (!boundKiosks[tableId]) {
        handleToggleKioskBind(tableId);
      }
      
      const guestUrl = `/table/${tableId}`;
      window.open(guestUrl, '_blank');
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* OPERATION SETTINGS CARD */}
      <div className="ai-card p-8 md:p-12 space-y-8 bg-surface">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-sm">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-foreground">
                Vận hành Kiosk Tablet
              </h3>
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest mt-0.5">Cấu hình thời gian và mã khóa an toàn cho thiết bị tại bàn</p>
            </div>
          </div>

          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-xl text-xs font-black uppercase italic tracking-tighter transition-all shadow-md"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ĐÃ LƯU</span>
              </>
            ) : (
              <span>LƯU CẤU HÌNH</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Timeout */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              Tự động reset thiết bị
            </h4>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Thời gian chờ (Timeout - giây)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="30" 
                  max="300" 
                  step="30"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-primary shadow-sm"
                />
                <span className="w-16 text-center font-black italic text-lg text-primary">{timeout}s</span>
              </div>
              <p className="text-[10px] font-bold text-foreground/30 italic">Hệ thống tự động xóa giỏ hàng và quay về trang chào sau thời gian không có thao tác.</p>
            </div>
          </div>

          {/* Security PIN Code (Mã khóa Kiosk) */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Mã PIN bảo vệ Kiosk (Bàn tránh thoát trang)
            </h4>
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-foreground/40 uppercase ml-1 tracking-widest italic">Mã PIN xác thực mở khóa</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Mã PIN 4-6 số"
                    className="w-full bg-surface border border-foreground/10 focus:bg-white focus:border-primary rounded-xl py-3 pl-11 pr-12 text-sm text-foreground font-mono font-bold tracking-widest outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-all"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={handleSavePin}
                  className="px-5 py-3.5 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-foreground font-black text-xs uppercase italic tracking-tighter rounded-xl transition-all flex items-center gap-2"
                >
                  {pinSaved ? <Check size={14} className="text-emerald-500" /> : null}
                  Cập nhật PIN
                </button>
              </div>
              <p className="text-[10px] font-bold text-foreground/30 italic">
                Dùng mã PIN này trên các Tablet đặt tại bàn để nhân viên mở khóa cấu hình, thoát hoặc đổi sang bàn khác. Khách hàng sẽ không thể tự ý thoát nếu không có mã PIN này.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE BINDING VISUAL GRID */}
      <div className="ai-card p-8 md:p-12 space-y-8 bg-surface">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-foreground/10 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-sm animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-foreground flex items-center gap-2">
                Sơ đồ kết nối Tablet tại bàn
              </h3>
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest mt-0.5">Quản lý, kích hoạt nhanh và giám sát các thiết bị gọi món tại chỗ</p>
            </div>
          </div>

          {/* Area filter */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-1.5 flex-shrink-0">
              <MapPin size={14} className="text-primary" /> Khu vực:
            </span>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="bg-surface border border-foreground/10 text-xs font-black uppercase italic tracking-tighter rounded-xl px-4 py-2.5 text-foreground outline-none cursor-pointer focus:border-primary"
            >
              {floorPlans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual interactive table grid */}
        {loadingTables ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Đang tải danh sách bàn...</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-16 text-foreground/30 font-bold italic text-xs">
            Khu vực này hiện chưa được cấu hình bàn nào. Hãy cấu hình bàn tại mục Sơ đồ bàn.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => {
              // Check if table is simulated bound
              // We also mock match IDs of seeded for preview visual
              const tableKey = table.id;
              const isBound = !!boundKiosks[tableKey] || table.name === 'Bàn 01' || table.name === 'Bàn 03';
              const kioskInfo = boundKiosks[tableKey] || (table.name === 'Bàn 01' ? { model: 'iPad Air 5', battery: 94, online: true, lastPing: 'Vừa xong' } : table.name === 'Bàn 03' ? { model: 'Xiaomi Pad 6', battery: 78, online: true, lastPing: '2 phút trước' } : null);

              return (
                <div 
                  key={table.id}
                  className={`border rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 ${
                    isBound 
                      ? 'bg-primary/5 border-primary/30 hover:border-primary/60 shadow-lg shadow-primary/5' 
                      : 'bg-surface border-foreground/10 hover:border-foreground/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-black text-foreground">{table.name}</h4>
                      <p className="text-[9px] uppercase tracking-wider font-bold opacity-40 mt-0.5">{table.capacity} chỗ ngồi</p>
                    </div>
                    
                    {isBound ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-lg shadow-md animate-pulse">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                        KIOSK ON
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-foreground/5 border border-foreground/10 text-foreground/40 text-[9px] font-black uppercase tracking-wider rounded-lg">
                        CHƯA GÁN
                      </span>
                    )}
                  </div>

                  {/* Device bound specs */}
                  {isBound && kioskInfo ? (
                    <div className="bg-foreground/5 border border-foreground/10 rounded-2xl p-3 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-foreground/40 font-bold uppercase text-[9px]">Thiết bị:</span>
                        <span className="text-foreground font-black uppercase italic tracking-tight text-[10px]">{kioskInfo.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/40 font-bold uppercase text-[9px]">Dung lượng Pin:</span>
                        <span className={`font-black italic text-[10px] ${kioskInfo.battery < 20 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {kioskInfo.battery}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground/40 font-bold uppercase text-[9px]">Kết nối cuối:</span>
                        <span className="text-foreground/60 font-bold text-[9px]">{kioskInfo.lastPing}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-foreground/10 rounded-2xl p-4 flex items-center justify-center text-center text-[10px] font-bold text-foreground/30 italic">
                      Không có thiết bị Kiosk nào được liên kết
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-foreground/5 pt-3">
                    <button
                      onClick={() => handleToggleKioskBind(table.id)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-tighter border transition-all ${
                        isBound
                          ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                          : 'bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground hover:bg-foreground/10'
                      }`}
                    >
                      {isBound ? 'Hủy gán máy' : 'Gán máy nhanh'}
                    </button>
                    
                    <button
                      onClick={() => handleLaunchKiosk(table.id)}
                      className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase italic tracking-tighter rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-primary/10"
                      title="Mở giao diện gọi món và khóa Kiosk cho bàn này"
                    >
                      <MonitorPlay size={12} />
                      Chạy Kiosk
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRINTER & HARDWARE CONNECT CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Receipt printer */}
        <div className="ai-card p-8 md:p-12 space-y-6 bg-surface">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Printer className="w-4 h-4 text-primary" />
            Máy in hóa đơn tại quầy
          </h4>
          <div className="space-y-4">
            <div className="p-6 bg-foreground/5 border border-foreground/10 rounded-3xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <Printer className="text-foreground/40" />
                <span className="font-black uppercase italic tracking-tighter text-sm">EPSON TM-T88VI</span>
              </div>
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest">CONNECTED</span>
            </div>
            <button className="w-full py-4 border border-dashed border-foreground/10 rounded-3xl text-foreground/40 font-black uppercase italic tracking-tighter text-xs hover:border-foreground/30 hover:text-foreground transition-all flex items-center justify-center gap-3 shadow-sm bg-surface">
              <RefreshCw className="w-4 h-4" />
              TÌM KIẾM MÁY IN KHÁC
            </button>
          </div>
        </div>

        {/* Hardware details */}
        <div className="ai-card p-8 md:p-12 space-y-6 bg-surface">
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40 italic flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-500" />
            Thông số Kiosk Client
          </h4>
          <div className="space-y-4 font-black tracking-tighter uppercase italic text-xs">
             <div className="flex justify-between border-b border-foreground/5 pb-3">
                <span className="text-foreground/40">Độ phân giải màn hình</span>
                <span className="text-foreground">1920 x 1080 (HD)</span>
             </div>
             <div className="flex justify-between border-b border-foreground/5 pb-3">
                <span className="text-foreground/40">Độ trễ Mạng gRPC-Web</span>
                <span className="text-emerald-600 font-bold">12ms (Xuất sắc)</span>
             </div>
             <div className="flex justify-between">
                <span className="text-foreground/40">Phiên bản Client Engine</span>
                <span className="text-foreground">v2.4.0-stable (Production)</span>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}

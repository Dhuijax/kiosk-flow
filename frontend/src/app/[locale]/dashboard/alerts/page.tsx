'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCheck, 
  X, 
  Calendar,
  Layers,
  BellRing
} from 'lucide-react';
import { useAlert } from '@/hooks/useAlert';
import { StockAlert } from '@/gen/procurement_pb';
import { formatDateTime } from '@/lib/utils/format';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AlertsPage() {
  const { branchId } = useAuth();
  const { listStockAlerts, markAlertAsRead, dismissAlert, loading } = useAlert();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [includeRead, setIncludeRead] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await listStockAlerts({ 
        branchId,
        includeRead: includeRead 
      });
      if (res && res.alerts) {
        setAlerts(res.alerts);
      }
    } catch (err) {
      console.error('Failed to load stock alerts:', err);
    }
  }, [listStockAlerts, branchId, includeRead]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAlerts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAlerts]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await markAlertAsRead(id);
      if (res?.success) {
        fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const res = await dismissAlert(id);
      if (res?.success) {
        fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="space-y-12 pb-20 relative">
      {/* Title Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-red-500 font-black uppercase text-xs tracking-widest animate-pulse">
            <BellRing className="w-5 h-5" />
            <span>Hệ thống giám sát tồn kho thông minh</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-foreground">
            Trung tâm <span className="text-red-500">Cảnh báo</span>
          </h1>
          <p className="text-foreground/40 font-bold flex items-center gap-2 italic">
            Cảnh báo tự động khi lượng nguyên liệu xuống dưới mức an toàn (BOM).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 bg-surface p-4 border border-foreground/10 rounded-3xl shadow-sm">
          <div className="flex items-center gap-4 bg-background px-6 h-14 rounded-2xl border border-foreground/10">
            <span className="text-xs font-black uppercase italic tracking-widest text-foreground/40">Bộ lọc:</span>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="include_read"
                checked={includeRead}
                onChange={(e) => setIncludeRead(e.target.checked)}
                className="w-5 h-5 rounded-lg border-foreground/10 text-interaction focus:ring-interaction cursor-pointer"
              />
              <label htmlFor="include_read" className="text-xs font-black uppercase italic tracking-widest cursor-pointer select-none">
                Hiển thị cảnh báo đã xem
              </label>
            </div>
          </div>
          <button 
            onClick={fetchAlerts}
            className="btn-dynamic py-4 px-8 text-sm h-14"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>LÀM MỚI</span>
          </button>
        </div>
      </div>

      {/* Alert Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="ai-card bg-red-500/5 border border-red-500/10 rounded-[2rem] p-8 flex items-center justify-between group">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 opacity-60">Cảnh báo chưa xử lý</p>
            <p className="text-5xl font-black text-red-500 italic tracking-tighter">{unreadCount}</p>
          </div>
          <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center border border-red-500/20 text-red-500 animate-bounce">
            <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>

        <div className="ai-card bg-interaction/5 border border-interaction/10 rounded-[2rem] p-8 flex items-center justify-between group">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-interaction opacity-60">Tổng số cảnh báo</p>
            <p className="text-5xl font-black text-interaction italic tracking-tighter">{alerts.length}</p>
          </div>
          <div className="w-16 h-16 bg-interaction/15 rounded-2xl flex items-center justify-center border border-interaction/20 text-interaction">
            <Layers className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {loading && alerts.length === 0 ? (
        <div className="py-24 flex items-center justify-center">
          <RefreshCw className="w-12 h-12 text-red-500 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-24 bg-surface/50 border border-foreground/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 bg-green-500/5 rounded-3xl flex items-center justify-center border border-green-500/10 mb-6">
            <CheckCheck className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-foreground mb-2">Không có cảnh báo tồn kho</h3>
          <p className="text-foreground/40 max-w-md font-bold text-sm italic mb-4">Mọi nguyên liệu và sản phẩm của bạn đều ở trên mức định lượng an toàn.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {alerts.map((alert) => (
            <div 
              key={alert.id}
              className={`ai-card rounded-[2rem] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border transition-all ${
                alert.isRead 
                  ? 'bg-surface/20 border-foreground/5 opacity-60' 
                  : 'bg-red-500/5 border-red-500/20 shadow-md hover:border-red-500/40'
              }`}
            >
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase italic tracking-wider border ${
                    alert.isRead 
                      ? 'bg-foreground/5 text-foreground/40 border-foreground/5' 
                      : 'bg-red-500/10 text-red-500 border-red-500/15'
                  }`}>
                    {alert.isRead ? 'Đã xem' : 'Mới'}
                  </span>
                  <div className="flex items-center gap-1.5 text-foreground/30 text-[9px] font-black uppercase tracking-widest italic">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{alert.createdAt ? formatDateTime(new Date(alert.createdAt)) : '...'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-lg font-black uppercase italic tracking-tighter text-foreground leading-tight">
                    {alert.ingredientName || 'Nguyên liệu'}
                  </p>
                  <p className="text-sm font-bold text-foreground/60 italic">
                    {alert.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
                {!alert.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(alert.id)}
                    className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-interaction text-white font-black text-[10px] uppercase italic tracking-widest hover:scale-[1.02] transition-transform shadow-sm"
                    title="Đánh dấu đã đọc"
                  >
                    <CheckCheck className="w-4 h-4 stroke-[3]" />
                    <span>Đã Xem</span>
                  </button>
                )}
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="flex items-center justify-center w-12 h-12 rounded-xl bg-foreground/5 hover:bg-red-500 hover:text-white border border-foreground/10 hover:border-red-500/20 text-foreground/40 transition-all shadow-sm"
                  title="Xóa cảnh báo"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

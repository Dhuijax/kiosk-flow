'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TableService } from '@/gen/table_connect';
import { FloorPlan, Table } from '@/gen/table_pb';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { TableMapCanvas } from './TableMapCanvas';
import { Map as MapIcon, Edit3, Save, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function FloorPlanManager() {
  const router = useRouter();
  const { tenantId, token, branchId } = useAuth();
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const fetchFloorPlans = useCallback(async () => {
    if (!tenantId) return;
    const run = async () => {
      try {
        const client = getAuthenticatedClient(TableService, tenantId, token || undefined);
        const bId = branchId || ""; 
        
        const response = await client.listFloorPlans({ branchId: bId });
        setFloorPlans(response.floorPlans);
        if (response.floorPlans.length > 0 && !selectedPlanId) {
          setSelectedPlanId(response.floorPlans[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch floor plans:", error);
      }
    };
    run();
  }, [tenantId, token, branchId, selectedPlanId]);

  const fetchTables = useCallback(async () => {
    if (!tenantId || !selectedPlanId) return;
    const run = async () => {
      setLoading(true);
      try {
        const client = getAuthenticatedClient(TableService, tenantId, token || undefined);
        const response = await client.listTables({ floorPlanId: selectedPlanId });
        setTables(response.tables);
      } catch (error) {
        console.error("Failed to fetch tables:", error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [tenantId, token, selectedPlanId]);

  useEffect(() => {
    if (tenantId) {
      fetchFloorPlans();
    }
  }, [tenantId, fetchFloorPlans]);

  useEffect(() => {
    if (tenantId && selectedPlanId) {
      fetchTables();
    }
  }, [tenantId, selectedPlanId, fetchTables]);

  const handleTablePositionChange = (id: string, x: number, y: number) => {
    setTables(prev => prev.map(t => t.id === id ? new Table({ ...t, positionX: Math.round(x), positionY: Math.round(y) }) : t));
  };

  const saveLayout = async () => {
    if (!tenantId) return;
    try {
      const client = getAuthenticatedClient(TableService, tenantId, token || undefined);
      // Update each table's position in the backend
      // In a real optimized app, we might have a batch update endpoint
      await Promise.all(tables.map(table => 
        client.updateTable({
          id: table.id,
          positionX: table.positionX,
          positionY: table.positionY
        })
      ));
      setIsEditMode(false);
      // Refresh to ensure sync
      fetchTables();
    } catch (error) {
      console.error("Failed to save layout:", error);
    }
  };

  const handleTableClick = (table: Table) => {
    router.push(`/pos/order?tableId=${table.id}`);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header with Area Selector and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-surface border border-foreground/10 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary">
            <MapIcon size={20} />
          </div>
          <div className="whitespace-nowrap mr-2">
            <h2 className="text-lg font-black text-foreground uppercase italic tracking-tighter">Khu vực</h2>
            <p className="text-[10px] text-foreground/40 uppercase font-black tracking-widest leading-tight">Sơ đồ bàn</p>
          </div>
          
          <div className="h-10 w-px bg-foreground/10 mx-2" />
          
          {floorPlans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-black uppercase italic tracking-tighter transition-all duration-300 border shadow-sm",
                selectedPlanId === plan.id
                  ? "bg-interaction text-white border-interaction shadow-md scale-105"
                  : "bg-background text-foreground/40 border-transparent hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {plan.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {isEditMode ? (
            <>
              <button
                onClick={() => setIsEditMode(false)}
                className="flex items-center gap-2 px-4 py-2 bg-background hover:bg-foreground/5 text-foreground/40 rounded-xl text-xs font-black uppercase italic tracking-tighter transition-all border border-transparent shadow-sm"
              >
                <X size={16} /> Hủy
              </button>
              <button
                onClick={saveLayout}
                className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-interaction text-white rounded-xl text-xs font-black uppercase italic tracking-tighter transition-all shadow-md border border-primary/20"
              >
                <Save size={16} /> Lưu sơ đồ
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={fetchTables}
                className="w-12 h-12 bg-background hover:bg-foreground/5 text-foreground/40 rounded-xl transition-all border border-foreground/10 flex items-center justify-center shadow-sm"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2 px-5 py-2 bg-foreground text-background rounded-xl text-xs font-black uppercase italic tracking-tighter transition-all border border-foreground/10 shadow-md hover:bg-interaction hover:text-white"
              >
                <Edit3 size={16} /> Chỉnh sửa
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative min-h-[500px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm rounded-3xl z-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Đang tải sơ đồ...</p>
            </div>
          </div>
        ) : null}
        
        <TableMapCanvas
          tables={tables}
          isEditMode={isEditMode}
          onTablePositionChange={handleTablePositionChange}
          onTableClick={handleTableClick}
        />
      </div>
    </div>
  );
}

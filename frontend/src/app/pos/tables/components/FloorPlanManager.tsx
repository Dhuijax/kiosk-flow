'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TableService } from '@/gen/table_connect';
import { FloorPlan, Table } from '@/gen/table_pb';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { TableMapCanvas } from './TableMapCanvas';
import { Map as MapIcon, Edit3, Save, X, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
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
  }, [tenantId, token, selectedPlanId]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/40 border border-white/5 rounded-3xl backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <MapIcon size={20} />
          </div>
          <div className="whitespace-nowrap mr-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Khu vực</h2>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none">Sơ đồ bàn</p>
          </div>
          
          <div className="h-10 w-px bg-white/5 mx-2" />
          
          {floorPlans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                "px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 border",
                selectedPlanId === plan.id
                  ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]"
                  : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200"
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
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all border border-white/5"
              >
                <X size={16} /> Hủy
              </button>
              <button
                onClick={saveLayout}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 border border-emerald-400/30"
              >
                <Save size={16} /> Lưu sơ đồ
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={fetchTables}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all border border-white/5"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl text-sm font-bold transition-all border border-blue-500/20 shadow-xl"
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

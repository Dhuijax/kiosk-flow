'use client';

import React from 'react';
import { Table } from '@/gen/table_pb';
import { TableElement } from './TableElement';

interface TableMapCanvasProps {
  tables: Table[];
  isEditMode: boolean;
  onTablePositionChange: (id: string, x: number, y: number) => void;
  onTableClick: (table: Table) => void;
}

export const TableMapCanvas: React.FC<TableMapCanvasProps> = ({
  tables,
  isEditMode,
  onTablePositionChange,
  onTableClick,
}) => {
  return (
    <div className="relative w-full h-[calc(100vh-200px)] bg-foreground/5 rounded-[3rem] overflow-hidden border-4 border-foreground shadow-inner group">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle, var(--color-foreground) 1px, transparent 1px)`,
          backgroundSize: '40px 40px' 
        }} 
      />
      
      {/* Visual Indicator for Edit Mode */}
      {isEditMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-full text-blue-400 text-xs font-bold animate-pulse z-10 backdrop-blur-md">
          CHẾ ĐỘ CHỈNH SỬA SƠ ĐỒ
        </div>
      )}

      <div className="relative w-full h-full p-8 overflow-auto scrollbar-hide">
        {tables.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-4">
              🪑
            </div>
            <p className="text-sm font-medium">Chưa có bàn nào trong khu vực này</p>
          </div>
        ) : (
          tables.map((table) => (
            <TableElement
              key={table.id}
              table={table}
              isDraggingEnabled={isEditMode}
              onPositionChange={onTablePositionChange}
              onClick={onTableClick}
            />
          ))
        )}
      </div>
      
      {/* Area Legend */}
      <div className="absolute bottom-6 right-6 flex gap-4 p-4 bg-surface border-4 border-foreground rounded-2xl shadow-[4px_4px_0px_0px_var(--color-foreground)] text-[10px] font-black uppercase italic tracking-tighter text-foreground/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          Trống
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
          Đang sử dụng
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          Đặt trước
        </div>
      </div>
    </div>
  );
};

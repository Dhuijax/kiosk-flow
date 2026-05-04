'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Table, TableStatus } from '@/gen/table_pb';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableElementProps {
  table: Table;
  isDraggingEnabled: boolean;
  onPositionChange: (id: string, x: number, y: number) => void;
  onClick: (table: Table) => void;
}

export const TableElement: React.FC<TableElementProps> = ({
  table,
  isDraggingEnabled,
  onPositionChange,
  onClick,
}) => {
  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE:
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20';
      case TableStatus.OCCUPIED:
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/20';
      case TableStatus.RESERVED:
        return 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-amber-500/20';
      case TableStatus.CLEANING:
        return 'bg-teal-500/20 border-teal-500/50 text-teal-400 shadow-teal-500/20';
      default:
        return 'bg-slate-500/20 border-slate-500/50 text-slate-400';
    }
  };

  const statusLabel = (status: TableStatus) => {
    switch (status) {
      case TableStatus.AVAILABLE: return 'Trống';
      case TableStatus.OCCUPIED: return 'Đang dùng';
      case TableStatus.RESERVED: return 'Đặt trước';
      case TableStatus.CLEANING: return 'Đang dọn';
      default: return 'Không xác định';
    }
  };

  return (
    <motion.div
      drag={isDraggingEnabled}
      dragMomentum={false}
      initial={{ x: table.positionX, y: table.positionY }}
      onDragEnd={(_, info) => {
        if (isDraggingEnabled) {
          // Calculate final position relative to parent
          // For simplicity, we just use the offset or coordinates
          // In a real implementation, you'd want to snap to grid or use relative container coords
          onPositionChange(table.id, table.positionX + info.offset.x, table.positionY + info.offset.y);
        }
      }}
      onClick={() => !isDraggingEnabled && onClick(table)}
      className={cn(
        'absolute w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-shadow hover:shadow-lg backdrop-blur-md',
        getStatusColor(table.status),
        isDraggingEnabled && 'cursor-move ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 border-white/50'
      )}
      style={{
        left: 0,
        top: 0,
      }}
    >
      <div className="font-bold text-lg mb-1">{table.name}</div>
      <div className="flex items-center text-[10px] opacity-80 uppercase tracking-wider font-semibold">
        <Users size={12} className="mr-1" />
        {table.capacity} chỗ
      </div>
      
      <div className="mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 border border-white/10 lowercase">
        {statusLabel(table.status)}
      </div>

      {isDraggingEnabled && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px]">
          ⇅
        </div>
      )}
    </motion.div>
  );
};

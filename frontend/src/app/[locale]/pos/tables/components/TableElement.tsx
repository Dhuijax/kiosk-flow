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
        return 'bg-interaction text-white border-foreground/10 shadow-md';
      case TableStatus.OCCUPIED:
        return 'bg-primary text-white border-foreground/10 shadow-md';
      case TableStatus.RESERVED:
        return 'bg-accent text-foreground border-foreground/10 shadow-md';
      case TableStatus.CLEANING:
        return 'bg-muted text-foreground/60 border-foreground/10 shadow-md';
      default:
        return 'bg-background text-foreground/40 border-foreground/20';
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
        'absolute w-24 h-24 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95',
        getStatusColor(table.status),
        isDraggingEnabled && 'cursor-move ring-2 ring-interaction ring-offset-4 ring-offset-background border-foreground'
      )}
      style={{
        left: 0,
        top: 0,
      }}
    >
      <div className="font-black text-xl italic tracking-tighter uppercase">{table.name}</div>
      <div className="flex items-center text-[10px] opacity-60 uppercase font-black tracking-widest italic">
        <Users size={12} className="mr-1" />
        {table.capacity} chỗ
      </div>
      
      <div className="mt-2 px-2 py-0.5 rounded-full text-[8px] font-black bg-foreground/10 uppercase tracking-tighter">
        {statusLabel(table.status)}
      </div>

      {isDraggingEnabled && (
        <div className="absolute -top-3 -right-3 w-8 h-8 bg-interaction border border-foreground/10 rounded-full flex items-center justify-center text-white text-xs shadow-sm">
          ⇅
        </div>
      )}
    </motion.div>
  );
};

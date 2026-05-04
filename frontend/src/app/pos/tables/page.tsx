'use client';

import React from 'react';
import FloorPlanManager from './components/FloorPlanManager';
import { motion } from 'framer-motion';

export default function TablesPage() {
  return (
    <div className="flex-1 p-6 md:p-8 bg-[#020617] relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="h-full max-w-[1600px] mx-auto flex flex-col"
      >
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="w-2 h-8 bg-blue-500 rounded-full" />
            Sơ đồ bàn
          </h1>
          <p className="text-slate-400 mt-1 ml-5 font-medium">Quản lý và theo dõi tình trạng bàn trực quan</p>
        </div>

        <div className="flex-1">
          <FloorPlanManager />
        </div>
      </motion.div>
    </div>
  );
}

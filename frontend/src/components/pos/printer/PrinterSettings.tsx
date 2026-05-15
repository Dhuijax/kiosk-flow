'use client';

import React, { useState, useEffect } from 'react';
import { Bluetooth, Save, X, Printer, CheckCircle2, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { printerService, PrinterSettings as IPrinterSettings, PrinterConnectionType } from '@/lib/printer/PrinterService';
import Portal from '@/components/ui/Portal';

interface PrinterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrinterSettings({ isOpen, onClose }: PrinterSettingsProps) {
  const [type, setType] = useState<PrinterConnectionType>('bluetooth');
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({
    message: '',
    type: null
  });

  useEffect(() => {
    const initialize = () => {
      const saved = printerService.getSettings();
      if (saved) {
        setType(saved.type);
        setDeviceId(saved.deviceId || '');
        setDeviceName(saved.deviceName || '');
        setBaudRate(saved.baudRate || 9600);
      }
    };
    void Promise.resolve().then(initialize);
  }, [isOpen]);

  const handleScan = async () => {
    setIsScanning(true);
    setStatus({ message: 'Đang quét thiết bị...', type: 'info' });
    
    try {
      if (type === 'bluetooth') {
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        setDeviceId(device.id);
        setDeviceName(device.name || 'Thiết bị Bluetooth');
        setStatus({ message: `Đã kết nối: ${device.name}`, type: 'success' });
      } else if (type === 'serial') {
        const port = await navigator.serial.requestPort();
        await port.getInfo();
        setDeviceId('serial-port');
        setDeviceName('Cổng Serial');
        setStatus({ message: 'Đã chọn cổng Serial', type: 'success' });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      setStatus({ message: 'Không thể tìm thấy thiết bị: ' + msg, type: 'error' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = () => {
    const settings: IPrinterSettings = {
      type,
      deviceId,
      deviceName,
      baudRate
    };
    printerService.saveSettings(settings);
    setStatus({ message: 'Đã lưu cấu hình!', type: 'success' });
    setTimeout(onClose, 1000);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="ai-card w-full max-w-lg p-0 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
            >
              {/* Header */}
              <div className="p-8 border-b border-foreground/5 flex items-center justify-between bg-foreground/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-interaction/10 flex items-center justify-center text-interaction border border-interaction/20 shadow-sm">
                    <Printer className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground uppercase italic tracking-tighter leading-tight">
                      Cấu hình máy in
                    </h2>
                    <p className="text-[8px] font-black text-foreground/40 uppercase tracking-[0.2em] mt-1">
                      Thiết lập kết nối máy in nhiệt ESC/POS
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 bg-background border border-foreground/10 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Phương thức kết nối</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setType('bluetooth')}
                      className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all ${
                        type === 'bluetooth' 
                        ? 'border-interaction bg-interaction/10 text-interaction shadow-sm' 
                        : 'border-foreground/5 bg-foreground/5 text-foreground/40 hover:border-foreground/10'
                      }`}
                    >
                      <Bluetooth className="w-8 h-8" />
                      <span className="text-xs font-black uppercase italic tracking-tighter">Bluetooth</span>
                    </button>
                    <button
                      onClick={() => setType('serial')}
                      className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all ${
                        type === 'serial' 
                        ? 'border-interaction bg-interaction/10 text-interaction shadow-sm' 
                        : 'border-foreground/5 bg-foreground/5 text-foreground/40 hover:border-foreground/10'
                      }`}
                    >
                      <Smartphone className="w-8 h-8" />
                      <span className="text-xs font-black uppercase italic tracking-tighter">USB / Serial</span>
                    </button>
                  </div>
                </div>

                {type === 'serial' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest italic ml-1">Baud Rate (Tốc độ truyền)</label>
                    <div className="relative">
                      <select 
                        value={baudRate}
                        onChange={(e) => setBaudRate(Number(e.target.value))}
                        className="w-full bg-background border border-foreground/10 rounded-2xl px-6 py-4 text-foreground font-bold outline-none focus:border-interaction transition-all appearance-none italic tracking-tighter text-sm uppercase"
                      >
                        <option value={9600}>9600 bps</option>
                        <option value={19200}>19200 bps</option>
                        <option value={38400}>38400 bps</option>
                        <option value={115200}>115200 bps</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <button
                    onClick={handleScan}
                    disabled={isScanning}
                    className="w-full h-16 rounded-2xl bg-foreground text-background hover:bg-interaction transition-all font-black uppercase italic tracking-tighter flex items-center justify-center gap-4 disabled:opacity-50 shadow-md group"
                  >
                    <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
                    <span>{isScanning ? 'Đang tìm kiếm...' : 'Quét thiết bị'}</span>
                  </button>

                  {deviceName && (
                    <div className="p-6 rounded-3xl bg-interaction/5 border border-interaction/10 flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-interaction animate-pulse" />
                        <div className="flex flex-col">
                          <span className="text-sm font-black uppercase italic tracking-tighter text-interaction">{deviceName}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-foreground/20 italic">{deviceId.slice(0, 16)}...</span>
                        </div>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-interaction" />
                    </div>
                  )}
                </div>

                {status.message && (
                  <div className={`p-6 rounded-3xl flex items-center gap-4 text-[10px] font-black uppercase tracking-widest italic transition-all ${
                    status.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' :
                    status.type === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                    'bg-interaction/10 text-interaction border border-interaction/20'
                  }`}>
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <span>{status.message}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-8 border-t border-foreground/5 flex items-center justify-end gap-4 bg-foreground/5">
                <button 
                  onClick={onClose}
                  className="px-8 py-4 text-foreground/40 font-black uppercase italic tracking-tighter text-xs hover:text-foreground transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSave}
                  disabled={!deviceId}
                  className="btn-dynamic px-12 py-4 text-xs"
                >
                  <Save className="w-5 h-5" />
                  <span>Lưu cấu hình</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

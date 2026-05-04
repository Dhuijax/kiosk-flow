'use client';

import React, { useState, useEffect } from 'react';
import { Bluetooth, Radio, Hash, Save, X, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { printerService, PrinterSettings as IPrinterSettings, PrinterConnectionType } from '@/lib/printer/PrinterService';

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-navy-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-navy-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Printer className="w-5 h-5 text-blue-soft" />
                </div>
                <h2 className="text-xl font-bold text-slate-100">Cấu hình máy in</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Phương thức kết nối</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setType('bluetooth')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                      type === 'bluetooth' 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-soft' 
                      : 'border-slate-800 bg-slate-800/20 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Bluetooth className="w-6 h-6" />
                    <span className="font-medium">Bluetooth</span>
                  </button>
                  <button
                    onClick={() => setType('serial')}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                      type === 'serial' 
                      ? 'border-blue-500 bg-blue-500/10 text-blue-soft' 
                      : 'border-slate-800 bg-slate-800/20 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Radio className="w-6 h-6" />
                    <span className="font-medium">USB / Serial</span>
                  </button>
                </div>
              </div>

              {type === 'serial' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Baud Rate</label>
                  <select 
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-blue-500/50"
                  >
                    <option value={9600}>9600</option>
                    <option value={19200}>19200</option>
                    <option value={38400}>38400</option>
                    <option value={115200}>115200</option>
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                >
                  <Bluetooth className={`w-5 h-5 ${isScanning ? 'animate-pulse' : ''}`} />
                  {isScanning ? 'Đang tìm kiếm...' : 'Tìm thiết bị mới'}
                </button>

                {deviceName && (
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-blue-100 font-medium">{deviceName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-blue-500/60">{deviceId.slice(0, 8)}...</span>
                  </div>
                )}
              </div>

              {status.message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                  status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  status.type === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {status.message}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!deviceId}
                className="w-full py-5 rounded-2xl bg-blue-electric hover:bg-blue-600 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:grayscale"
              >
                <Save className="w-5 h-5" />
                Lưu cấu hình
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

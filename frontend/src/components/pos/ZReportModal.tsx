'use client';

import React, { useState, useEffect } from 'react';
import { useReport } from '@/hooks/useReport';
import { useTranslations } from 'next-intl';
import { 
  Printer, 
  AlertTriangle, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZReportResponse } from '@/gen/report_pb';

interface ZReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCloseShift: () => void;
}

export default function ZReportModal({ isOpen, onClose, onConfirmCloseShift }: ZReportModalProps) {
  const { fetchZReport, loading, error } = useReport();
  const [report, setReport] = useState<ZReportResponse | null>(null);
  const [printing, setPrinting] = useState(false);
  const [success, setSuccess] = useState(false);
  const t = useTranslations('ZReport');

  useEffect(() => {
    if (isOpen) {
      // Fetch live shift report (empty string fetches current active shift)
      fetchZReport('').then((res) => {
        if (res) {
          setReport(res);
        }
      });
    }
  }, [isOpen, fetchZReport]);

  const handlePrintReceipt = () => {
    setPrinting(true);
    setTimeout(() => {
      setPrinting(false);
      alert(t('printSuccess'));
    }, 1500);
  };

  const handleExportExcel = () => {
    if (!report) return;
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += `${t('csvTitle')}\n`;
    csvContent += `${t('csvTime')},${report.reportTime || new Date().toLocaleString()}\n`;
    csvContent += `${t('csvTotalOrders')},${report.totalOrders}\n`;
    csvContent += `${t('csvVoidedOrders')},${report.voidedOrders || 0}\n`;
    csvContent += `${t('csvNetRevenue')},${Number(report.netRevenue?.units || 0)}\n\n`;
    
    csvContent += `${t('csvPaymentBreakdown')}\n`;
    csvContent += `${t('csvCash')},${Number(report.cashRevenue?.units || 0)}\n`;
    csvContent += `${t('csvCard')},${Number(report.cardRevenue?.units || 0)}\n`;
    csvContent += `${t('csvQr')},${Number(report.qrRevenue?.units || 0)}\n\n`;

    csvContent += `${t('csvComboSection')}\n${t('csvComboHeader')}\n`;
    if (report.topCombos && report.topCombos.length > 0) {
      report.topCombos.forEach((item: { comboName: string; quantitySold: number; revenue?: { units: bigint | number | string } }) => {
        csvContent += `${item.comboName},${item.quantitySold},${Number(item.revenue?.units || 0)}\n`;
      });
    } else {
      csvContent += `${t('csvNoCombo')}\n`;
    }

    csvContent += `\n${t('csvWasteSection')}\n${t('csvWasteHeader')}\n`;
    if (report.shiftWastes && report.shiftWastes.length > 0) {
      report.shiftWastes.forEach((item: { ingredientName: string; wastedQuantity: number; unit: string; wasteCost?: { units: bigint | number | string } }) => {
        csvContent += `${item.ingredientName},${item.wastedQuantity},${item.unit},${Number(item.wasteCost?.units || 0)}\n`;
      });
    } else {
      csvContent += `${t('csvNoWaste')}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Z-Report_Shift_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmClose = () => {
    setSuccess(true);
    setTimeout(() => {
      onConfirmCloseShift();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/60 backdrop-blur-md animate-in fade-in duration-300">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface border border-foreground/10 p-8 rounded-3xl w-full max-w-2xl flex flex-col justify-between max-h-[90vh] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-foreground/5 pb-4">
            <div className="flex items-center gap-3">
              <Printer className="w-6 h-6 text-interaction" />
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">
                {t('title')} <span className="text-primary">{t('titleAccent')}</span>
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="text-foreground/40 hover:text-foreground font-black text-lg p-2 transition"
            >
              ✕
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-danger/10 border border-danger/30 text-danger p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Receipt-style preview area */}
          <div className="flex-1 overflow-y-auto my-6 pr-2 custom-scrollbar">
            {loading && !report ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <div className="w-10 h-10 border-4 border-interaction border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-tighter text-foreground/40 italic">{t('loading')}</p>
              </div>
            ) : report ? (
              <div className="bg-[#fcfbf9] border border-[#e0dcd0] p-8 rounded-2xl font-mono text-xs text-foreground/80 shadow-inner max-w-md mx-auto space-y-4">
                {/* Simulated Thermal Paper Header */}
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-black uppercase tracking-widest text-foreground font-sans">KIOSKFLOW Z-REPORT</h4>
                  <p className="text-[10px] font-bold">{t('storeName')}</p>
                  <p className="text-[9px] opacity-60">{t('storePhone')}</p>
                  <p className="text-[9px] opacity-60">---------------------------------</p>
                  <p className="text-[9px] font-black uppercase">{t('reportTitle')}</p>
                  <p className="text-[9px] opacity-60">{t('printTime')} {report.reportTime || new Date().toLocaleString()}</p>
                </div>

                <p className="text-[9px] text-center opacity-60">---------------------------------</p>

                {/* Sales stats table */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>{t('totalOrders')}</span>
                    <span>{report.totalOrders}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>{t('voidedOrders')}</span>
                    <span>{report.voidedOrders || 0}</span>
                  </div>
                  <p className="text-[9px] opacity-40">---------------------------------</p>
                  <div className="flex justify-between font-black text-sm text-foreground">
                    <span>{t('netRevenue')}</span>
                    <span>{Number(report.netRevenue?.units || 0).toLocaleString()}đ</span>
                  </div>
                </div>

                <p className="text-[9px] text-center opacity-60">---------------------------------</p>

                {/* Payments Methods Breakdown */}
                <div className="space-y-1">
                  <p className="font-bold underline">{t('revenueByChannel')}</p>
                  <div className="flex justify-between">
                    <span>{t('cash')}</span>
                    <span>{Number(report.cashRevenue?.units || 0).toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('cardPos')}</span>
                    <span>{Number(report.cardRevenue?.units || 0).toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('qrPayment')}</span>
                    <span>{Number(report.qrRevenue?.units || 0).toLocaleString()}đ</span>
                  </div>
                </div>

                <p className="text-[9px] text-center opacity-60">---------------------------------</p>

                {/* Top Combos Sold */}
                <div className="space-y-1">
                  <p className="font-bold underline">{t('comboSales')}</p>
                  {report.topCombos && report.topCombos.length > 0 ? (
                    report.topCombos.map((c: { comboName: string; quantitySold: number; revenue?: { units: bigint | number | string } }, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{i + 1}. {c.comboName} (x{c.quantitySold}):</span>
                        <span>{Number(c.revenue?.units || 0).toLocaleString()}đ</span>
                      </div>
                    ))
                  ) : (
                    <p className="italic opacity-60">{t('noComboData')}</p>
                  )}
                </div>

                <p className="text-[9px] text-center opacity-60">---------------------------------</p>

                {/* Ingredient Wastage Adjustments */}
                <div className="space-y-1">
                  <p className="font-bold text-red-600 underline">{t('wasteAdjustments')}</p>
                  {report.shiftWastes && report.shiftWastes.length > 0 ? (
                    report.shiftWastes.map((w: { ingredientName: string; wastedQuantity: number; unit: string; wasteCost?: { units: bigint | number | string } }, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{w.ingredientName}:</span>
                        <span className="text-red-600 font-bold">-{w.wastedQuantity}{w.unit} ({Number(w.wasteCost?.units || 0).toLocaleString()}đ)</span>
                      </div>
                    ))
                  ) : (
                    <p className="italic opacity-60">{t('noWaste')}</p>
                  )}
                </div>

                {/* Footer Signature */}
                <div className="text-center pt-6 space-y-8 font-sans">
                  <div className="grid grid-cols-2 text-[10px] font-bold">
                    <div>
                      <p>{t('accountantSignature')}</p>
                      <p className="opacity-45 mt-10">{t('signatureHint')}</p>
                    </div>
                    <div>
                      <p>{t('cashierSignature')}</p>
                      <p className="opacity-45 mt-10">{t('signatureHint')}</p>
                    </div>
                  </div>
                  <p className="text-[8px] opacity-40 font-mono tracking-widest mt-6">{t('thankYou')}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 opacity-40 text-xs font-bold italic">{t('noReport')}</div>
            )}
          </div>

          {/* Modal Action Panel */}
          <div className="space-y-6 pt-4 border-t border-foreground/5">
            {success ? (
              <div className="bg-success/15 border border-success/30 p-5 rounded-2xl flex items-center justify-center gap-3 text-sm font-black text-success uppercase italic tracking-tighter">
                <CheckCircle className="w-6 h-6 animate-bounce" />
                <span>{t('successMessage')}</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePrintReceipt}
                  disabled={printing || !report}
                  className="flex-1 py-4 bg-foreground text-background rounded-2xl font-black uppercase italic tracking-tighter text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 hover:bg-foreground/90 transition"
                >
                  <Printer size={18} />
                  <span>{printing ? t('printing') : t('printThermal')}</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={!report}
                  className="flex-1 py-4 bg-accent text-foreground rounded-2xl font-black uppercase italic tracking-tighter text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 hover:bg-accent/90 transition border border-foreground/10"
                >
                  <FileSpreadsheet size={18} />
                  <span>{t('exportExcel')}</span>
                </button>

                <button
                  onClick={handleConfirmClose}
                  disabled={!report}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase italic tracking-tighter text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 hover:bg-red-600 transition"
                >
                  <span>{t('closeAndLogout')}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

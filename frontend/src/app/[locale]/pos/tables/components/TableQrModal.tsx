'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Table } from '@/gen/table_pb';
import { TableService } from '@/gen/table_connect';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { X, QrCode, Printer, Download, Copy, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TableQrModalProps {
  floorPlanName: string;
  tables: Table[];
  tenantId: string;
  token?: string;
  onClose: () => void;
}

export const TableQrModal: React.FC<TableQrModalProps> = ({
  floorPlanName,
  tables,
  tenantId,
  token,
  onClose,
}) => {
  const t = useTranslations('POSTables');
  const [selectedTable, setSelectedTable] = useState<Table | null>(tables[0] || null);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [batchPrinting, setBatchPrinting] = useState(false);

  const fetchTableQr = useCallback(async (tableId: string) => {
    setLoading(true);
    setError(null);
    try {
      const client = getAuthenticatedClient(TableService, tenantId, token);
      const response = await client.getTableQr({ id: tableId });
      setQrSvg(response.qrCodeSvg);
      setQrUrl(response.url);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Failed to load table QR:', err);
      setError(t('qrError'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, token, t]);

  useEffect(() => {
    if (selectedTable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTableQr(selectedTable.id);
    }
  }, [selectedTable, fetchTableQr]);

  const handleCopyLink = () => {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!qrSvg || !selectedTable) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kioskflow_qr_${selectedTable.name.toLowerCase().replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Premium individual print trigger
  const handlePrintQr = () => {
    if (!qrSvg || !selectedTable) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(t('popupPermission'));
      return;
    }

    printWindow.document.write(`
      <html>
        <${'head'}>
          <title>${t('printTitle', { name: selectedTable.name })}</title>
          <style>
            @media print {
              @page {
                size: 80mm 80mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Outfit', 'Inter', system-ui, sans-serif;
              display: flex;
              flex-col: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              text-align: center;
              background: white;
              color: black;
              padding: 10px;
              box-sizing: border-box;
            }
            .container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 1px dashed #ccc;
              padding: 20px;
              border-radius: 12px;
              width: 90%;
              max-width: 260px;
              box-sizing: border-box;
            }
            .header {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #666;
              margin-bottom: 2px;
            }
            .title {
              font-size: 28px;
              font-weight: 900;
              margin: 0 0 10px 0;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .qr-wrapper {
              width: 180px;
              height: 180px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 5px 0 12px 0;
            }
            .qr-wrapper svg {
              width: 100%;
              height: 100%;
            }
            .footer {
              font-size: 10px;
              font-weight: 700;
              color: #444;
              margin-top: 2px;
            }
            .sub-footer {
              font-size: 8px;
              color: #999;
              margin-top: 4px;
            }
          </style>
        </${'head'}>
        <body>
          <div class="container">
            <div class="header">${t('selfServiceHeader')}</div>
            <div class="title">${selectedTable.name}</div>
            <div class="qr-wrapper">${qrSvg}</div>
            <div class="footer">${t('scanToOrder')}</div>
            <div class="sub-footer">${t('poweredBy')}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Premium batch print all QR codes
  const handlePrintAll = async () => {
    setBatchPrinting(true);
    try {
      const client = getAuthenticatedClient(TableService, tenantId, token);
      
      // Fetch all QRs sequentially or in parallel
      const qrs = await Promise.all(
        tables.map(async (t) => {
          const resp = await client.getTableQr({ id: t.id });
          return {
            tableName: t.name,
            svg: resp.qrCodeSvg
          };
        })
      );

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert(t('popupPrintAll'));
        return;
      }

      const qrsHtml = qrs.map(qr => `
        <div class="page-break">
          <div class="container">
            <div class="header">${t('selfServiceHeader')}</div>
            <div class="title">${qr.tableName}</div>
            <div class="qr-wrapper">${qr.svg}</div>
            <div class="footer">${t('scanToOrder')}</div>
            <div class="sub-footer">${t('poweredBy')}</div>
          </div>
        </div>
      `).join('');

      printWindow.document.write(`
        <html>
          <${'head'}>
            <title>${t('printAllTitle', { name: floorPlanName })}</title>
            <style>
              @media print {
                @page {
                  size: 80mm 80mm;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                .page-break {
                  page-break-after: always;
                  height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
              }
              body {
                font-family: 'Outfit', 'Inter', system-ui, sans-serif;
                margin: 0;
                padding: 0;
                background: white;
                color: black;
              }
              .page-break {
                padding: 20px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
              }
              .container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 1px dashed #ccc;
                padding: 20px;
                border-radius: 12px;
                width: 90%;
                max-width: 260px;
                box-sizing: border-box;
              }
              .header {
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #666;
                margin-bottom: 2px;
              }
              .title {
                font-size: 28px;
                font-weight: 900;
                margin: 0 0 10px 0;
                text-transform: uppercase;
                letter-spacing: -0.5px;
              }
              .qr-wrapper {
                width: 180px;
                height: 180px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 5px 0 12px 0;
              }
              .qr-wrapper svg {
                width: 100%;
                height: 100%;
              }
              .footer {
                font-size: 10px;
                font-weight: 700;
                color: #444;
                margin-top: 2px;
              }
              .sub-footer {
                font-size: 8px;
                color: #999;
                margin-top: 4px;
              }
            </style>
          </${'head'}>
          <body>
            ${qrsHtml}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

    } catch (err) {
      console.error('Failed to batch print QR codes:', err);
      alert(t('printAllError'));
    } finally {
      setBatchPrinting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-surface border border-foreground/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-foreground/10 bg-slate-900/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                <QrCode size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight italic flex items-center gap-2">
                  {t('qrManage')}
                  <Sparkles size={16} className="text-indigo-400 animate-pulse" />
                </h3>
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mt-0.5">
                  {t('zoneLabel')}<span className="text-foreground/60">{floorPlanName}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintAll}
                disabled={batchPrinting || tables.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-black uppercase italic tracking-tighter transition-all shadow-md"
              >
                {batchPrinting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Printer size={14} />
                )}
                {t('batchPrint', { count: tables.length })}
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-2xl transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Split Grid */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-[400px]">
            {/* Left side: Tables Grid scrollable selection */}
            <div className="w-full md:w-2/5 border-r border-foreground/10 overflow-y-auto p-6 flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 italic mb-1">{t('tablesList')}</h4>
              {tables.map(table => {
                const isSelected = selectedTable?.id === table.id;
                return (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-sm'
                        : 'bg-background hover:bg-foreground/5 border-foreground/10 text-foreground/60 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-sm ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-foreground/5'
                      }`}>
                        {table.name.replace(/\D/g, '') || table.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">{table.name}</p>
                        <p className="text-[9px] uppercase tracking-wider font-bold opacity-60 mt-0.5">{t('seatsCapacity', { capacity: table.capacity })}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right side: QR Vector Preview & controls */}
            <div className="flex-1 bg-foreground/5 p-6 flex flex-col items-center justify-center overflow-y-auto">
              {selectedTable ? (
                loading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-20">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-foreground/40 text-xs font-black tracking-widest uppercase">{t('loadingQr')}</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center max-w-sm">
                    <AlertCircle size={36} className="text-red-500" />
                    <p className="text-red-400 font-bold text-sm">{error}</p>
                    <button
                      onClick={() => fetchTableQr(selectedTable.id)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase italic tracking-tighter"
                    >
                      {t('reload')}
                    </button>
                  </div>
                ) : (
                  <div className="w-full max-w-sm flex flex-col items-center">
                    {/* Glowing display frame */}
                    <div className="relative w-64 h-64 bg-white rounded-3xl p-5 shadow-2xl flex items-center justify-center border border-slate-200">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] uppercase font-black tracking-widest text-slate-400">
                        {selectedTable.name}
                      </div>
                      <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    </div>

                    <div className="text-center mt-5 mb-6">
                      <h4 className="text-base font-black text-foreground">{selectedTable.name}</h4>
                      <p className="text-xs text-foreground/40 uppercase tracking-widest font-bold mt-1">{t('selfService')}</p>
                    </div>

                    {/* Copy URL section */}
                    <div className="w-full bg-background border border-foreground/10 rounded-2xl p-3.5 mb-6 flex items-center justify-between gap-3">
                      <div className="flex-1 overflow-hidden pr-2">
                        <p className="text-[9px] text-foreground/40 uppercase font-black tracking-wider">{t('urlLabel')}</p>
                        <p className="text-xs font-mono font-bold text-foreground truncate mt-0.5">{qrUrl}</p>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className="h-10 px-3 bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                      >
                        {copied ? (
                          <Check size={16} className="text-emerald-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 w-full">
                      <button
                        onClick={handleDownloadSvg}
                        className="flex-1 py-3.5 bg-foreground hover:bg-interaction text-background hover:text-white rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-2 border border-foreground/10 shadow-sm"
                      >
                        <Download size={15} /> {t('downloadSvg')}
                      </button>
                      <button
                        onClick={handlePrintQr}
                        className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
                      >
                        <Printer size={15} /> {t('printQrCode')}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center text-foreground/30 py-20 text-center">
                  <QrCode size={48} className="stroke-[1] mb-3 animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-widest">{t('selectToView')}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

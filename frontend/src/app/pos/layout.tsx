import { Metadata } from 'next';
import POSHeader from '@/components/pos/POSHeader';

export const metadata: Metadata = {
  title: 'POS Bán hàng - KioskFlow',
  description: 'Giao diện bán hàng chuyên nghiệp tối ưu cảm ứng cho KioskFlow.',
  openGraph: {
    title: 'POS Bán hàng - KioskFlow',
    description: 'Giao diện bán hàng chuyên nghiệp tối ưu cảm ứng cho KioskFlow.',
    type: 'website',
  }
};

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-navy-900 text-slate-100 font-sans">
      <POSHeader />

      {/* Main POS Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

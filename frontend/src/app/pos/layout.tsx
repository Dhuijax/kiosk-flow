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

import { OrderCartProvider } from '@/lib/order/OrderCartContext';

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrderCartProvider>
      <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
        <POSHeader />

        {/* Main POS Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </OrderCartProvider>
  );
}


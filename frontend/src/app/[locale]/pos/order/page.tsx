import { Suspense } from 'react';
import { Metadata } from 'next';
import OrderClient from './OrderClient';

export const metadata: Metadata = {
  title: 'POS Sales - KioskFlow',
  description: 'Main POS sales screen for KioskFlow. Supports quick actions, search and product categorization.',
};

export default function OrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderClient />
    </Suspense>
  );
}

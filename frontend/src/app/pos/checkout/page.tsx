import { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-full bg-navy-950" />}>
      <CheckoutClient />
    </Suspense>
  );
}

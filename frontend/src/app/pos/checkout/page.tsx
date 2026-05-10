import { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-full bg-background" />}>
      <CheckoutClient />
    </Suspense>
  );
}

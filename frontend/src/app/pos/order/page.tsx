import { Suspense } from 'react';
import { Metadata } from 'next';
import OrderClient from './OrderClient';

export const metadata: Metadata = {
  title: 'Bán hàng - KioskFlow',
  description: 'Màn hình bán hàng chính của KioskFlow. Hỗ trợ thao tác nhanh, tìm kiếm và phân loại sản phẩm.',
};

export default function OrderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderClient />
    </Suspense>
  );
}

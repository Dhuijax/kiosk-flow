'use client';

import { useEffect, useCallback } from 'react';
import { db, QueuedOrder } from './db';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { OrderService } from '@/gen/order_connect';
import { PaymentService } from '@/gen/payment_connect';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';

export function useOfflineSync() {
  const { token, tenantId } = useAuth();
  
  const pendingOrders = useLiveQuery(() => 
    db.queuedOrders.where('status').equals('pending').toArray()
  );

  const syncOrder = useCallback(async (order: QueuedOrder) => {
    if (!token || !tenantId) return;

    try {
      await db.queuedOrders.update(order.id!, { status: 'syncing' });

      const orderClient = getAuthenticatedClient(OrderService, tenantId, token);
      const paymentClient = getAuthenticatedClient(PaymentService, tenantId, token);

      // 1. Create Order
      const response = await orderClient.createOrder({
        branchId: order.branchId,
        tableId: order.tableId,
        customerName: order.customerName,
        customerId: order.customerId,
        note: order.note,
        items: order.items
      });

      if (!response.order) throw new Error("Sync failed: No order returned");

      // 2. Process Payment
      await paymentClient.processPayment({
        orderId: response.order.id,
        method: order.payment.method,
        receivedAmount: { units: BigInt(order.payment.receivedAmount), nanos: 0, currencyCode: "VND" },
        transactionRef: `OFFLINE_SYNC_${order.createdAt}`
      });

      await db.queuedOrders.delete(order.id!);
      console.log(`Synced order ${order.id} successfully`);
    } catch (err) {
      console.error(`Failed to sync order ${order.id}:`, err);
      await db.queuedOrders.update(order.id!, { 
        status: 'pending', // Retry later
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  }, [token, tenantId]);

  useEffect(() => {
    const handleOnline = () => {
      if (pendingOrders && pendingOrders.length > 0) {
        pendingOrders.forEach(syncOrder);
      }
    };

    window.addEventListener('online', handleOnline);
    
    // Also try syncing periodically if online
    const interval = setInterval(() => {
      if (navigator.onLine && pendingOrders && pendingOrders.length > 0) {
        pendingOrders.forEach(syncOrder);
      }
    }, 30000); // Every 30s

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [pendingOrders, syncOrder]);

  return {
    pendingCount: pendingOrders?.length || 0,
    isSyncing: pendingOrders?.some(o => o.status === 'syncing')
  };
}

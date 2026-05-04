import { useEffect, useState, useCallback } from "react";
import { OrderService } from "@/gen/order_connect";
import { Order, OrderStatus } from "@/gen/order_pb";
import { getAuthenticatedClient } from "@/lib/grpc/client";

interface KitchenState {
  activeOrders: Order[];
  completedOrders: Order[];
  isConnected: boolean;
}

export function useKitchenStream(tenantId: string, branchId: string, token?: string) {
  const [state, setState] = useState<KitchenState>({
    activeOrders: [],
    completedOrders: [],
    isConnected: false,
  });

  const fetchInitialOrders = useCallback(async () => {
    if (!tenantId || !branchId || !token) return;

    try {
      const client = getAuthenticatedClient(OrderService, tenantId, token);
      
      // Fetch Pending/Confirmed/Preparing orders
      const response = await client.listOrders({
        branchId,
        status: OrderStatus.DRAFT, // This needs to be checked if DRAFT or CONFIRMED is the start
        pagination: { page: 1, pageSize: 50 },
      });

      // Filter only relevant for kitchen (Confirmed / Preparing)
      const kitchenOrders = response.orders.filter(o => 
        o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.PREPARING
      );

      setState(s => ({ ...s, activeOrders: kitchenOrders }));
    } catch (err) {
      console.error("Failed to fetch kitchen orders:", err);
    }
  }, [tenantId, branchId, token]);

  useEffect(() => {
    if (!tenantId || !branchId || !token) return;

    // Use a microtask to avoid synchronous setState warning in effect
    void Promise.resolve().then(fetchInitialOrders);

    const client = getAuthenticatedClient(OrderService, tenantId, token);
    const abortController = new AbortController();

    async function startStream() {
      setState(s => ({ ...s, isConnected: true }));
      try {
        const stream = client.streamOrders(
          { branchId },
          { signal: abortController.signal }
        );

        for await (const response of stream) {
          const updatedOrder = response.order;
          if (!updatedOrder) continue;

          setState(prev => {
            const isRelevant = 
              updatedOrder.status === OrderStatus.CONFIRMED || 
              updatedOrder.status === OrderStatus.PREPARING;
            
            const isCompleted = 
              updatedOrder.status === OrderStatus.SERVED || 
              updatedOrder.status === OrderStatus.COMPLETED;

            const newActive = [...prev.activeOrders];
            const index = newActive.findIndex(o => o.id === updatedOrder.id);

            if (isRelevant) {
              if (index !== -1) {
                newActive[index] = updatedOrder;
              } else {
                newActive.push(updatedOrder);
                // Play notification sound
                new Audio("/sounds/new-order.mp3").play().catch(() => {});
              }
            } else {
              // Remove if no longer relevant (cancelled or moved to pay)
              if (index !== -1) {
                newActive.splice(index, 1);
              }
            }

            const newCompleted = [...prev.completedOrders];
            if (isCompleted) {
              // Add to history if not exists
              if (!newCompleted.some(o => o.id === updatedOrder.id)) {
                newCompleted.unshift(updatedOrder);
                // Keep only last 10
                if (newCompleted.length > 10) newCompleted.pop();
              }
            }

            return {
              ...prev,
              activeOrders: newActive,
              completedOrders: newCompleted,
            };
          });
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Kitchen stream error:", err);
          setState(s => ({ ...s, isConnected: false }));
          // Retry after delay
          setTimeout(startStream, 5000);
        }
      }
    }

    startStream();

    return () => {
      abortController.abort();
    };
  }, [tenantId, branchId, token, fetchInitialOrders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    if (!token) return;
    try {
      const client = getAuthenticatedClient(OrderService, tenantId, token);
      await client.updateOrderStatus({ id: orderId, status });
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  };

  return { ...state, updateStatus };
}

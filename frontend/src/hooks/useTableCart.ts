import { useEffect, useState, useCallback } from "react";
import { TableCartService } from "@/gen/table_cart_connect";
import { CartItem, Guest } from "@/gen/table_cart_pb";
import { getAuthenticatedClient } from "@/lib/grpc/client";

export function useTableCart(
  tenantId: string,
  branchId: string,
  tableId: string,
  guestId?: string,
  guestName?: string
) {
  const [activeGuests, setActiveGuests] = useState<Guest[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [currentGuestId, setCurrentGuestId] = useState<string>(guestId || "");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Join table session
  const joinSession = useCallback(
    async (name: string) => {
      if (!tenantId || !branchId || !tableId) return;
      setLoading(true);
      try {
        const client = getAuthenticatedClient(TableCartService, tenantId);
        const response = await client.joinTableSession({
          tenantId,
          branchId,
          tableId,
          guestName: name,
        });

        setSessionId(response.sessionId);
        setCurrentGuestId(response.guestId);
        setActiveGuests(response.activeGuests);
        setCartItems(response.items);

        // Store guest details in localStorage for session recovery
        localStorage.setItem(`kioskflow:guest_id:${tableId}`, response.guestId);
        localStorage.setItem(`kioskflow:guest_name:${tableId}`, name);
        return response.guestId;
      } catch (err) {
        console.error("Failed to join table session:", err);
      } finally {
        setLoading(false);
      }
    },
    [tenantId, branchId, tableId]
  );

  // Update item quantity (adds, increments, decrements, or removes)
  const updateCartItem = useCallback(
    async (productId: string, quantityChange: number, note: string = "", toppingIds: string[] = []) => {
      const activeGid = currentGuestId || localStorage.getItem(`kioskflow:guest_id:${tableId}`) || "";
      if (!tenantId || !branchId || !tableId || !activeGid) return;
      try {
        const client = getAuthenticatedClient(TableCartService, tenantId);
        await client.updateCartItem({
          tenantId,
          branchId,
          tableId,
          guestId: activeGid,
          productId,
          quantityChange,
          note,
          toppingIds,
        });
      } catch (err) {
        console.error("Failed to update cart item:", err);
      }
    },
    [tenantId, branchId, tableId, currentGuestId]
  );

  // Submit order for the entire table cart session
  const submitOrder = useCallback(
    async (note: string = "") => {
      const activeGid = currentGuestId || localStorage.getItem(`kioskflow:guest_id:${tableId}`) || "";
      if (!tenantId || !branchId || !tableId || !activeGid) return;
      setLoading(true);
      try {
        const client = getAuthenticatedClient(TableCartService, tenantId);
        const response = await client.submitTableOrder({
          tenantId,
          branchId,
          tableId,
          guestId: activeGid,
          note,
        });

        // Clear local storage guest/session info on checkout
        localStorage.removeItem(`kioskflow:guest_id:${tableId}`);
        localStorage.removeItem(`kioskflow:guest_name:${tableId}`);
        setSessionId("");
        setCurrentGuestId("");
        setActiveGuests([]);
        setCartItems([]);

        return response;
      } catch (err) {
        console.error("Failed to submit order:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tenantId, branchId, tableId, currentGuestId]
  );

  // Real-time stream updates listener
  useEffect(() => {
    const activeGid = currentGuestId || localStorage.getItem(`kioskflow:guest_id:${tableId}`) || "";
    if (!tenantId || !branchId || !tableId || !activeGid) return;

    const client = getAuthenticatedClient(TableCartService, tenantId);
    const abortController = new AbortController();

    async function listenToUpdates() {
      setIsConnected(true);
      try {
        const stream = client.streamCartUpdates(
          {
            tenantId,
            branchId,
            tableId,
            guestId: activeGid,
          },
          { signal: abortController.signal }
        );

        for await (const response of stream) {
          setActiveGuests(response.activeGuests);
          setCartItems(response.items);
          
          if (response.eventType === 0 && response.triggerByGuestName !== guestName) {
            console.log(`${response.triggerByGuestName} joined the table!`);
          } else if (response.eventType === 2 && response.triggerByGuestName !== guestName) {
            console.log(`Cart updated by ${response.triggerByGuestName}`);
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Cart stream error:", err);
          setIsConnected(false);
          // Auto reconnect after 5s
          setTimeout(listenToUpdates, 5000);
        }
      }
    }

    listenToUpdates();

    return () => {
      abortController.abort();
    };
  }, [tenantId, branchId, tableId, currentGuestId, guestName]);

  return {
    sessionId,
    currentGuestId,
    activeGuests,
    cartItems,
    isConnected,
    loading,
    joinSession,
    updateCartItem,
    submitOrder,
  };
}

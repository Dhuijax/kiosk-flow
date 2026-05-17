import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { ProcurementService } from '@/gen/procurement_connect';
import {
  ListPurchaseOrdersRequest,
  CreatePurchaseOrderRequest,
} from '@/gen/procurement_pb';

export function useProcurement() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!token || !tenantId) return null;
    return getAuthenticatedClient(ProcurementService, tenantId, token);
  }, [token, tenantId]);

  const listPurchaseOrders = useCallback(async (request: Partial<ListPurchaseOrdersRequest> = {}) => {
    const client = getClient();
    if (!client) return { purchaseOrders: [], pagination: undefined };

    setLoading(true);
    try {
      const response = await client.listPurchaseOrders(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list purchase orders';
      setError(message);
      return { purchaseOrders: [], pagination: undefined };
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const getPurchaseOrder = useCallback(async (id: string) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.getPurchaseOrder({ id });
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get purchase order';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const createPurchaseOrder = useCallback(async (request: CreatePurchaseOrderRequest) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.createPurchaseOrder(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create purchase order';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  return {
    loading,
    error,
    listPurchaseOrders,
    getPurchaseOrder,
    createPurchaseOrder,
  };
}

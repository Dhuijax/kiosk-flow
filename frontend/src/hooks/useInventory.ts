import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { InventoryService } from '@/gen/inventory_connect';
import {
  ListStockRequest,
  UpdateStockRequest,
  GetStockHistoryRequest,
  LogWasteRequest,
  ListWasteLogsRequest
} from '@/gen/inventory_pb';

export function useInventory() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!token || !tenantId) return null;
    return getAuthenticatedClient(InventoryService, tenantId, token);
  }, [token, tenantId]);

  const listStock = useCallback(async (request: Partial<ListStockRequest>) => {
    const client = getClient();
    if (!client) return { items: [], pagination: undefined };

    setLoading(true);
    try {
      const response = await client.listStock(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to list stock');
      return { items: [], pagination: undefined };
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const updateStock = useCallback(async (request: UpdateStockRequest) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.updateStock(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const getStockHistory = useCallback(async (request: GetStockHistoryRequest) => {
    const client = getClient();
    if (!client) return { entries: [], pagination: undefined };

    setLoading(true);
    try {
      const response = await client.getStockHistory(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock history');
      return { entries: [], pagination: undefined };
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const logWaste = useCallback(async (request: Partial<LogWasteRequest>) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.logWaste(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to log waste');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const listWasteLogs = useCallback(async (request: Partial<ListWasteLogsRequest>) => {
    const client = getClient();
    if (!client) return { items: [], pagination: undefined };

    setLoading(true);
    try {
      const response = await client.listWasteLogs(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to list waste logs');
      return { items: [], pagination: undefined };
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  return {
    loading,
    error,
    listStock,
    updateStock,
    getStockHistory,
    logWaste,
    listWasteLogs
  };
}

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { AlertService } from '@/gen/procurement_connect';
import {
  ListStockAlertsRequest,
} from '@/gen/procurement_pb';

export function useAlert() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!token || !tenantId) return null;
    return getAuthenticatedClient(AlertService, tenantId, token);
  }, [token, tenantId]);

  const listStockAlerts = useCallback(async (request: Partial<ListStockAlertsRequest> = {}) => {
    const client = getClient();
    if (!client) return { alerts: [], pagination: undefined };

    setLoading(true);
    try {
      const response = await client.listStockAlerts(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list stock alerts';
      setError(message);
      return { alerts: [], pagination: undefined };
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const markAlertAsRead = useCallback(async (id: string) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.markAlertAsRead({ id });
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark alert as read';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const dismissAlert = useCallback(async (id: string) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.dismissAlert({ id });
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss alert';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  return {
    loading,
    error,
    listStockAlerts,
    markAlertAsRead,
    dismissAlert,
  };
}

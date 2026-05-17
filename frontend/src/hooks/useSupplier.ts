import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { SupplierService } from '@/gen/procurement_connect';
import {
  ListSuppliersRequest,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  DeleteSupplierRequest,
} from '@/gen/procurement_pb';

export function useSupplier() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!token || !tenantId) return null;
    return getAuthenticatedClient(SupplierService, tenantId, token);
  }, [token, tenantId]);

  const listSuppliers = useCallback(async (request: Partial<ListSuppliersRequest> = {}) => {
    const client = getClient();
    if (!client) return { suppliers: [], pagination: undefined };

    setLoading(true);
    try {
      const response = await client.listSuppliers(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list suppliers';
      setError(message);
      return { suppliers: [], pagination: undefined };
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const getSupplier = useCallback(async (id: string) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.getSupplier({ id });
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get supplier';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const createSupplier = useCallback(async (request: CreateSupplierRequest) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.createSupplier(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create supplier';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const updateSupplier = useCallback(async (request: UpdateSupplierRequest) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.updateSupplier(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update supplier';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const deleteSupplier = useCallback(async (request: DeleteSupplierRequest) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.deleteSupplier(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete supplier';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  return {
    loading,
    error,
    listSuppliers,
    getSupplier,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { IngredientService } from '@/gen/ingredient_connect';
import {
  ListIngredientsRequest,
  CreateIngredientRequest,
  UpdateIngredientRequest,
  DeleteIngredientRequest,
} from '@/gen/ingredient_pb';

export function useIngredient() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!token || !tenantId) return null;
    return getAuthenticatedClient(IngredientService, tenantId, token);
  }, [token, tenantId]);

  const listIngredients = useCallback(async (request: Partial<ListIngredientsRequest> = {}) => {
    const client = getClient();
    if (!client) return { ingredients: [], pagination: undefined };

    setLoading(true);
    try {
      const response = await client.listIngredients(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list ingredients';
      setError(message);
      return { ingredients: [], pagination: undefined };
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const createIngredient = useCallback(async (request: CreateIngredientRequest) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.createIngredient(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create ingredient';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const updateIngredient = useCallback(async (request: UpdateIngredientRequest) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.updateIngredient(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update ingredient';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  const deleteIngredient = useCallback(async (request: DeleteIngredientRequest) => {
    const client = getClient();
    if (!client) return null;

    setLoading(true);
    try {
      const response = await client.deleteIngredient(request);
      setError(null);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete ingredient';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getClient]);

  return {
    loading,
    error,
    listIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,
  };
}

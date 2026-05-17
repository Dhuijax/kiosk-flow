import { useState, useCallback } from 'react';
import { RecipeService } from '@/gen/recipe_connect';
import { ProductIngredientInput } from '@/gen/recipe_pb';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { useAuth } from '@/lib/auth/AuthContext';

export function useRecipe() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecipe = useCallback(async (productId: string) => {
    if (!token || !tenantId || !productId) return [];
    
    setLoading(true);
    setError(null);
    try {
      const client = getAuthenticatedClient(RecipeService, tenantId, token);
      const response = await client.getRecipe({ productId });
      return response.ingredients;
    } catch (err) {
      console.error('Failed to get recipe:', err);
      setError('Không thể tải công thức sản phẩm');
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  const setRecipe = useCallback(async (productId: string, ingredients: ProductIngredientInput[]) => {
    if (!token || !tenantId || !productId) return false;
    
    setLoading(true);
    setError(null);
    try {
      const client = getAuthenticatedClient(RecipeService, tenantId, token);
      await client.setRecipe({ productId, ingredients });
      return true;
    } catch (err) {
      console.error('Failed to set recipe:', err);
      setError('Không thể lưu công thức sản phẩm');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  return {
    getRecipe,
    setRecipe,
    loading,
    error
  };
}

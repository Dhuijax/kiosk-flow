'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { BillingService } from '@/gen/billing_connect';
import { GetSubscriptionResponse } from '@/gen/billing_pb';
import { useAuth } from '@/lib/auth/AuthContext';

export function useBilling() {
  const { token, tenantId } = useAuth();
  const [subscription, setSubscription] = useState<GetSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!tenantId || !token) return;
    setLoading(true);
    try {
      const client = getAuthenticatedClient(BillingService, tenantId, token);
      const res = await client.getSubscriptionStatus({});
      setSubscription(res);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription status');
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  const createPayment = async (plan: 'starter' | 'pro' | 'enterprise', gateway: string = 'MOMO') => {
    if (!tenantId || !token) return null;
    try {
      const client = getAuthenticatedClient(BillingService, tenantId, token);
      const res = await client.createSubscriptionPayment({
        planType: plan.toUpperCase(),
        paymentGateway: gateway.toUpperCase()
      });
      return res;
    } catch (err) {
      console.error('Failed to create subscription payment:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to create subscription payment');
    }
  };

  useEffect(() => {
    let mounted = true;
    if (tenantId && token && mounted) {
      Promise.resolve().then(() => {
        if (mounted) fetchSubscription();
      });
    }
    return () => {
      mounted = false;
    };
  }, [tenantId, token, fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    createPayment,
    refresh: fetchSubscription,
  };
}

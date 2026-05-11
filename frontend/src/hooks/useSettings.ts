'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { StoreService, TenantSettingsService } from '@/gen/store_connect';
import { Store, TenantSettings } from '@/gen/store_pb';
import { useAuth } from '@/lib/auth/AuthContext';

export interface StoreSettingsProps {
  storeInfo: Store | null;
  updateStore: (data: { 
    name: string, 
    address: string, 
    phone: string, 
    currency: string 
  }) => Promise<Store | undefined>;
}

export interface AppearanceSettingsProps {
  settings: TenantSettings | null;
  updateTenantSettings: (data: { 
    themeColor: string, 
    kioskTimeoutSeconds: number, 
    language: string, 
    currency: string 
  }) => Promise<TenantSettings | undefined>;
}

export interface KioskSettingsProps {
  settings: TenantSettings | null;
  updateTenantSettings: (data: { 
    themeColor: string, 
    kioskTimeoutSeconds: number, 
    language: string, 
    currency: string 
  }) => Promise<TenantSettings | undefined>;
}

export function useSettings() {
  const { token, tenantId } = useAuth();
  const [storeInfo, setStoreInfo] = useState<Store | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!tenantId || !token) return;

    try {
      const storeClient = getAuthenticatedClient(StoreService, tenantId, token);
      const settingsClient = getAuthenticatedClient(TenantSettingsService, tenantId, token);

      const [storeRes, settingsRes] = await Promise.all([
        storeClient.getStoreInfo({}),
        settingsClient.getSettings({}),
      ]);

      setStoreInfo(storeRes);
      setSettings(settingsRes);
      setError(null);
    } catch (err) {
      console.error('Settings fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  useEffect(() => {
    let mounted = true;
    if (tenantId && token && mounted) {
      // Use Promise.resolve to defer state updates and avoid cascading render warning
      Promise.resolve().then(() => {
        if (mounted) fetchSettings();
      });
    }
    return () => {
      mounted = false;
    };
  }, [tenantId, token, fetchSettings]);

  const updateStore = async (data: { name: string, address: string, phone: string, currency: string }) => {
    if (!tenantId || !token) return;
    try {
      const client = getAuthenticatedClient(StoreService, tenantId, token);
      const res = await client.updateStore(data);
      setStoreInfo(res);
      return res;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update store info');
    }
  };

  const updateTenantSettings = async (data: { themeColor: string, kioskTimeoutSeconds: number, language: string, currency: string }) => {
    if (!tenantId || !token) return;
    try {
      const client = getAuthenticatedClient(TenantSettingsService, tenantId, token);
      const res = await client.updateSettings(data);
      setSettings(res);
      return res;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update system settings');
    }
  };

  return {
    storeInfo,
    settings,
    loading,
    error,
    updateStore,
    updateTenantSettings,
    refresh: fetchSettings,
  };
}

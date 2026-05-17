'use client';

import { useState, useCallback } from 'react';
import { getAuthenticatedClient } from '@/lib/grpc/client';
import { ReportService } from '@/gen/report_connect';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  AdvancedAnalyticsResponse,
  ZReportResponse 
} from '@/gen/report_pb';

export function useReport() {
  const { token, tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvancedAnalytics = useCallback(async (
    branchId: string, 
    startDate: string, 
    endDate: string
  ): Promise<AdvancedAnalyticsResponse | null> => {
    if (!tenantId || !token) return null;
    setLoading(true);
    setError(null);
    try {
      const client = getAuthenticatedClient(ReportService, tenantId, token);
      const res = await client.getAdvancedAnalytics({
        branchId,
        startDate,
        endDate
      });
      return res;
    } catch (err) {
      console.error('Failed to fetch advanced analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch advanced analytics');
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  const fetchZReport = useCallback(async (
    branchId: string
  ): Promise<ZReportResponse | null> => {
    if (!tenantId || !token) return null;
    setLoading(true);
    setError(null);
    try {
      const client = getAuthenticatedClient(ReportService, tenantId, token);
      const res = await client.getZReport({
        branchId
      });
      return res;
    } catch (err) {
      console.error('Failed to fetch Z-Report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Z-Report');
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  return {
    loading,
    error,
    fetchAdvancedAnalytics,
    fetchZReport
  };
}

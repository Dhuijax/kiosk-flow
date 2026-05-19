import { useState, useEffect } from 'react';
import { createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { StatusService } from '@/gen/status_connect';

const isProduction = process.env.NODE_ENV === "production" || (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1");
const defaultUrl = isProduction ? "https://kioskflow-backend.fly.dev" : "http://localhost:50051";

const transport = createConnectTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || defaultUrl,
});

const client = createPromiseClient(StatusService, transport);

export function useHealthCheck() {
  const [status, setStatus] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await client.checkHealth({});
        setStatus(res.status);
        setVersion(res.version);
      } catch (err) {
        console.error('Health check failed:', err);
        setStatus(false);
      } finally {
        setLoading(false);
      }
    };

    check();
    const interval = setInterval(check, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  return { isConnected: status, version, loading };
}

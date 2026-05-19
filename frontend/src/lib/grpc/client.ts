import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import { ServiceType } from "@bufbuild/protobuf";

const isProduction = process.env.NODE_ENV === "production" || (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1");
const defaultUrl = isProduction ? "https://kioskflow-backend.fly.dev" : "http://localhost:50051";

// The gRPC server URL (via Envoy proxy)
const transport = createGrpcWebTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || defaultUrl,
});

export const getClient = <T extends ServiceType>(service: T) => {
  return createPromiseClient(service, transport);
};

// Interceptor to inject x-tenant-id and auth token
// This is a simplified version; real app might use a more complex interceptor
export const getAuthenticatedClient = <T extends ServiceType>(service: T, tenantId: string, token?: string) => {
  const authTransport = createGrpcWebTransport({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || defaultUrl,
    interceptors: [
      (next) => async (req) => {
        req.header.set("x-tenant-id", tenantId);
        if (token) {
          req.header.set("authorization", `Bearer ${token}`);
        }
        return next(req);
      },
    ],
  });
  return createPromiseClient(service, authTransport);
};

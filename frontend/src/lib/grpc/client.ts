import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import { ServiceType } from "@bufbuild/protobuf";

// The gRPC server URL (via Envoy proxy)
const transport = createGrpcWebTransport({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:50051",
});

export const getClient = <T extends ServiceType>(service: T) => {
  return createPromiseClient(service, transport);
};

// Interceptor to inject x-tenant-id and auth token
// This is a simplified version; real app might use a more complex interceptor
export const getAuthenticatedClient = <T extends ServiceType>(service: T, tenantId: string, token?: string) => {
  const authTransport = createGrpcWebTransport({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:50051",
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

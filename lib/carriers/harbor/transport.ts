import type { CarrierTransport } from "@/lib/integration/resilience";

/** Mocked transport  for local testing , 
 * for sandbox , dev or prod environments we need requireSecret("HARBOR_API_KEY"), honour ctx.signal, send req.idempotencyKey and ctx.traceId as headers. */
export const harborMockTransport: CarrierTransport = {
    async send(_req, ctx) { return { quoteRef: `HBR-${ctx.traceId.slice(0, 8).toUpperCase()}`, status: "received" }; },
};

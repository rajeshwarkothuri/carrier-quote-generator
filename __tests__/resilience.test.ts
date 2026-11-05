import { beforeEach, describe, expect, it } from "vitest";
import { callCarrier, CarrierError, resetRateLimits, type CarrierRequest, type CarrierTransport } from "@/lib/integration/resilience";
import { resetMetrics, snapshot } from "@/lib/ops/metrics";

const req: CarrierRequest = { carrier: "t", product: "p", schemaVersion: "1", mappingVersion: "1", idempotencyKey: "k", fields: {} };
const ok = { quoteRef: "Q1", status: "received" };
const noSleep = { sleep: async () => {} };
beforeEach(() => { resetRateLimits(); resetMetrics(); });

describe("callCarrier", () => {
  it("retries retryable failures with the same idempotency key, then succeeds", async () => {
    const keys: string[] = []; let n = 0;
    const t: CarrierTransport = { async send(r) { keys.push(r.idempotencyKey); if (++n < 3) throw new CarrierError("upstream", "boom", true); return ok; } };
    const r = await callCarrier(t, req, noSleep);
    expect(r.attempts).toBe(3);
    expect(new Set(keys).size).toBe(1);
    expect(snapshot()["t/p@1/1:retry"]).toBe(2);
  });
  it("does not retry non-retryable rejections and reports a trace id", async () => {
    let n = 0;
    const t: CarrierTransport = { async send() { n++; throw new CarrierError("rejected", "no", false); } };
    await expect(callCarrier(t, req, noSleep)).rejects.toMatchObject({ code: "rejected", traceId: expect.any(String) });
    expect(n).toBe(1);
  });
  it("gives up after maxAttempts", async () => {
    let n = 0;
    const t: CarrierTransport = { async send() { n++; throw new Error("network"); } };
    await expect(callCarrier(t, req, { ...noSleep, maxAttempts: 2 })).rejects.toMatchObject({ code: "upstream" });
    expect(n).toBe(2);
  });
  it("times out a hung carrier", async () => {
    const t: CarrierTransport = { send: () => new Promise(() => {}) };
    await expect(callCarrier(t, req, { timeoutMs: 10, maxAttempts: 1 })).rejects.toMatchObject({ code: "timeout" });
  });
  it("rate limits locally without calling the carrier", async () => {
    let n = 0;
    const t: CarrierTransport = { async send() { n++; return ok; } };
    const o = { ...noSleep, rateLimit: { capacity: 1, refillPerSec: 0 }, now: () => 0 };
    await callCarrier(t, req, o);
    await expect(callCarrier(t, req, o)).rejects.toMatchObject({ code: "rate_limited" });
    expect(n).toBe(1);
  });
});

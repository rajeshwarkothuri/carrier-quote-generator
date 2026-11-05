import { randomUUID } from "node:crypto";
import { count } from "../ops/metrics";
import type { Payload } from "../core/types";

export interface CarrierRequest { carrier: string; product: string; schemaVersion: string; mappingVersion: string; idempotencyKey: string; fields: Payload }
export interface CarrierReceipt { quoteRef: string; status: string }
export interface TransportContext { signal: AbortSignal; traceId: string }
export interface CarrierTransport { send(req: CarrierRequest, ctx: TransportContext): Promise<CarrierReceipt> }

export type CarrierErrorCode = "timeout" | "rate_limited" | "upstream" | "rejected" | "unavailable";
export class CarrierError extends Error {
    constructor(public code: CarrierErrorCode, message: string, public retryable: boolean, public traceId?: string) { super(message); }
}
/** Secrets are read server-side, lazy loaded, its never logged or sent to the client. */
export function requireSecret(name: string): string {
    const v = process.env[name];
    if (!v) throw new CarrierError("unavailable", "Carrier credentials are not configured.", false);
    return v;
}

export interface CallOptions {
    timeoutMs?: number; maxAttempts?: number; baseDelayMs?: number;
    sleep?: (ms: number) => Promise<void>; rateLimit?: { capacity: number; refillPerSec: number }; now?: () => number;
}
const buckets = new Map<string, { tokens: number; last: number }>();
export const resetRateLimits = () => buckets.clear();
function take(carrier: string, rl: { capacity: number; refillPerSec: number }, now: number): boolean {
    const b = buckets.get(carrier) ?? { tokens: rl.capacity, last: now };
    b.tokens = Math.min(rl.capacity, b.tokens + ((now - b.last) / 1000) * rl.refillPerSec);
    b.last = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    buckets.set(carrier, b);
    return ok;
}

/**
 * Timeout per attempt, local rate limit, 
 * retries ONLY for retryable errors. Retrying is safe because every request carries a stable idempotencyKey (the carrier must honour it). Failures carry a traceId; logs/metrics contain no customer data.
 */
export async function callCarrier(t: CarrierTransport, req: CarrierRequest, o: CallOptions = {}): Promise<{ receipt: CarrierReceipt; traceId: string; attempts: number }> {
    const { timeoutMs = 5000, maxAttempts = 3, baseDelayMs = 200, sleep = (ms) => new Promise<void>((r) => setTimeout(r, ms)), now = Date.now } = o;
    const ev = (e: string) => count(`${req.carrier}/${req.product}@${req.schemaVersion}/${req.mappingVersion}:${e}`);
    const traceId = randomUUID();
    if (!take(req.carrier, o.rateLimit ?? { capacity: 10, refillPerSec: 5 }, now())) {
        ev("rate_limited");
        throw new CarrierError("rate_limited", "Too many requests to the carrier. Please try again shortly.", false, traceId);
    }
    for (let attempt = 1;;attempt++) {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), timeoutMs);
        try {
            const receipt = await Promise.race([
                t.send(req, { signal: ac.signal, traceId }),
                new Promise<never>((_, rej) => ac.signal.addEventListener("abort", () => rej(new CarrierError("timeout", "The carrier took too long to respond.", true, traceId)))),
            ]);
            ev("success");
            return { receipt, traceId, attempts: attempt };
        } catch (e) {
            const err = e instanceof CarrierError ? e : new CarrierError("upstream", "The carrier request failed.", true, traceId);
            err.traceId ??= traceId;
            if (!err.retryable || attempt >= maxAttempts) { ev(`failure_${err.code}`); throw err; }
            ev("retry");
            await sleep(baseDelayMs * 2 ** (attempt - 1) * (0.5 + Math.random() / 2));
        } finally { clearTimeout(timer); }
    }
}

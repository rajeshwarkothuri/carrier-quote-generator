import { randomBytes } from "node:crypto";
import type { CanonicalProfile } from "../canonical";

export interface SessionData { profile: CanonicalProfile; sample?: string }
/** Swap for an encrypted, persistent store (Redis/DB) keyed to the authenticated user in production. */
export interface SessionStore {
  create(d: SessionData, now?: number): Promise<string>;
  get(id: string, now?: number): Promise<SessionData | null>;
  destroy(id: string): Promise<void>;
}
export const TTL_MS = 30 * 60 * 1000;
const g = globalThis as unknown as { __sessions?: Map<string, SessionData & { exp: number }> };
const map = (g.__sessions ??= new Map());

export const sessionStore: SessionStore = {
  async create(d, now = Date.now()) {
    for (const [k, v] of map) if (v.exp <= now) map.delete(k);
    const id = randomBytes(32).toString("base64url"); // 256-bit unguessable capability
    map.set(id, { ...d, exp: now + TTL_MS });
    return id;
  },
  async get(id, now = Date.now()) {
    const e = map.get(id);
    if (!e) return null;
    if (e.exp <= now) { map.delete(id); return null; }
    return { profile: e.profile, sample: e.sample };
  },
  async destroy(id) { map.delete(id); },
};

import { createHash } from "node:crypto";
import type { CarrierSchema } from "./types";
const stable = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(stable).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`
  : JSON.stringify(v);

export const schemaFingerprint = (s: CarrierSchema) => createHash("sha256").update(stable(s)).digest("hex").slice(0, 16);

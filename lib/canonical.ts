/** Versioned canonical customer model. */
export const PROFILE_VERSION = 1 as const;
export type Scalar = string | number | boolean;

export interface CanonicalProfile {
  version: typeof PROFILE_VERSION;
  first_name?: string; last_name?: string; date_of_birth?: string; email?: string;
  state?: string; zip?: string; personal_property_value?: number;
  has_dog?: boolean; dog_breed?: string; claims_last_3_years?: number;
  extensions: Record<string, Scalar>;
}
export const FIELD_KEYS = ["first_name", "last_name", "date_of_birth", "email", "state", "zip", "personal_property_value", "has_dog", "dog_breed", "claims_last_3_years"] as const;
export type ParseResult = { ok: true; profile: CanonicalProfile; unknown: string[] } | { ok: false; errors: string[] };

const realDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};
const str = (max: number) => (v: unknown) => (typeof v === "string" && v.trim() !== "" && v.length <= max ? null : `must be a non-empty string up to ${max} characters`);
const num = (int: boolean) => (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && (!int || Number.isInteger(v)) ? null : `must be a non-negative ${int ? "integer" : "number"}`);
const rx = (re: RegExp, msg: string) => (v: unknown) => (typeof v === "string" && re.test(v) ? null : msg);

/** Error messages name fields only; they never echo values (PII-safe to log and display). */
export function parseProfile(input: unknown, now: Date = new Date()): ParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return { ok: false, errors: ["Profile must be a JSON object."] };
  const o = input as Record<string, unknown>;
  const errors: string[] = [];
  const today = now.toISOString().slice(0, 10);
  const checks: Record<(typeof FIELD_KEYS)[number], (v: unknown) => string | null> = {
    first_name: str(100), last_name: str(100),
    email: (v) => str(254)(v) ?? rx(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "must be a valid email")(v),
    date_of_birth: (v) => (typeof v === "string" && realDate(v) && v <= today ? null : "must be a real past date (YYYY-MM-DD)"),
    state: rx(/^[A-Z]{2}$/, "must be a two-letter uppercase code"), zip: rx(/^\d{5}$/, "must be 5 digits"),
    personal_property_value: num(false), claims_last_3_years: num(true),
    has_dog: (v) => (typeof v === "boolean" ? null : "must be true or false"), dog_breed: str(60),
  };
  if (o.version !== undefined && o.version !== PROFILE_VERSION) errors.push(`version: only version ${PROFILE_VERSION} is supported`);
  const allowed = new Set<string>(["version", "extensions", ...FIELD_KEYS]);
  for (const k of Object.keys(o)) if (!allowed.has(k)) errors.push(`${k.slice(0, 40)}: unknown field (put product-specific data under "extensions")`);

  const out: Record<string, unknown> = {};
  for (const k of FIELD_KEYS) {
    const v = o[k];
    if (v === undefined || v === null) continue;
    const e = checks[k](v);
    e ? errors.push(`${k} ${e}`) : (out[k] = typeof v === "string" ? v.trim() : v);
  }
  if (out.has_dog === false && out.dog_breed !== undefined) errors.push("dog_breed: given although has_dog is false");

  const extensions: Record<string, Scalar> = {};
  if (o.extensions !== undefined && o.extensions !== null) {
    const ext = o.extensions;
    if (typeof ext !== "object" || Array.isArray(ext) || Object.keys(ext as object).length > 50) errors.push("extensions: must be an object with at most 50 keys");
    else for (const [k, v] of Object.entries(ext as Record<string, unknown>)) {
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(k)) errors.push("extensions: keys must be snake_case, up to 64 characters");
      else if (!(typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.length <= 200))) errors.push(`extensions.${k}: must be a boolean, number or short string`);
      else extensions[k] = v;
    }
  }
  if (errors.length) return { ok: false, errors };
  const profile = { version: PROFILE_VERSION, ...out, extensions } as CanonicalProfile;
  return { ok: true, profile, unknown: FIELD_KEYS.filter((k) => profile[k] === undefined) };
}

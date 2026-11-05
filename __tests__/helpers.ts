import { parseProfile, type CanonicalProfile } from "@/lib/canonical";
import profiles from "@/data/profiles.json";
export const canon = (x: unknown): CanonicalProfile => {
  const r = parseProfile(x, new Date("2026-06-01T12:00:00Z"));
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.profile;
};
export const MAYA = canon(profiles.a);
export const SAM = canon(profiles.b);

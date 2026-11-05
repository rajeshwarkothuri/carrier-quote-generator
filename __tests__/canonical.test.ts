import { describe, expect, it } from "vitest";
import { parseProfile } from "@/lib/canonical";
import profiles from "@/data/profiles.json";
const now = new Date("2026-06-01T12:00:00Z");
const bad = (o: object) => parseProfile({ ...profiles.a, ...o }, now);

describe("canonical profile v1", () => {
  it("accepts a full profile and defaults version/extensions", () => {
    const r = parseProfile(profiles.a, now);
    expect(r.ok && r.profile).toMatchObject({ version: 1, first_name: "Maya", extensions: {} });
  });
  it("treats null/absent as unknown and lists it", () => {
    const r = parseProfile({ first_name: "Pat", dog_breed: null }, now);
    expect(r.ok && r.unknown).toContain("dog_breed");
    expect(r.ok && r.profile.dog_breed).toBeUndefined();
  });
  it("rejects bad shapes, future dates, unsupported versions, unknown keys", () => {
    expect(parseProfile([], now).ok).toBe(false);
    expect(bad({ date_of_birth: "2031-01-01" }).ok).toBe(false);
    expect(bad({ date_of_birth: "2024-02-30" }).ok).toBe(false);
    expect(bad({ zip: "9720" }).ok).toBe(false);
    expect(bad({ claims_last_3_years: 1.5 }).ok).toBe(false);
    expect(bad({ version: 2 }).ok).toBe(false);
    expect(bad({ ssn: "x" }).ok).toBe(false);
  });
  it("rejects inconsistent dog data", () => expect(bad({ has_dog: false, dog_breed: "Lab" }).ok).toBe(false));
  it("validates extensions", () => {
    expect(bad({ extensions: { building_has_sprinklers: true } }).ok).toBe(true);
    expect(bad({ extensions: { "Bad Key": 1 } }).ok).toBe(false);
    expect(bad({ extensions: { k: { nested: 1 } } }).ok).toBe(false);
  });
  it("errors name fields but never echo values", () => {
    const r = bad({ email: "SECRET-VALUE", zip: "SECRET-ZIP" });
    expect(!r.ok && JSON.stringify(r.errors)).not.toMatch(/SECRET/);
  });
});

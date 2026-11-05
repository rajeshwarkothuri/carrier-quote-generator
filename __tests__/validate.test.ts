import { describe, expect, it } from "vitest";
import { harborDefinition } from "@/lib/carriers/harbor/definition";
import { coerce, validatePayload } from "@/lib/core/validate";
const schema = harborDefinition.schema;
const codes = (p: object, mode: "partial" | "complete" = "partial") => validatePayload(schema, p as never, { mode, now: new Date("2026-06-01T12:00:00Z") }).map((i) => `${i.key}:${i.code}`);

describe("shared validator", () => {
  it("partial mode tolerates missing required fields; complete does not", () => {
    expect(codes({})).toEqual([]);
    expect(codes({}, "complete")).toContain("phone:required");
  });
  it("rejects wrong types and unsupported options", () => {
    expect(codes({ contents_coverage: "50000" })).toContain("contents_coverage:option");
    expect(codes({ contents_coverage: 30000 })).toContain("contents_coverage:option");
    expect(codes({ residence_state: "Nevada" })).toContain("residence_state:option");
    expect(codes({ claims_last_5_years: "2" })).toContain("claims_last_5_years:type");
    expect(codes({ pets: ["None", "Dog"] })).toContain("pets:option");
  });
  it("enforces conditional fields", () => {
    expect(codes({ pets: ["None"], dog_breed: "Labrador" })).toContain("dog_breed:unexpected");
    expect(codes({ pets: ["Dog"] }, "complete")).toContain("dog_breed:required");
    expect(codes({ pets: ["Dog"], dog_breed: "Poodle" })).toContain("dog_breed:option");
  });
  it("flags stray keys and bad formats, and applies minAge", () => {
    expect(codes({ nope: 1 })).toContain("nope:unexpected");
    expect(codes({ postal_code: "9720" })).toContain("postal_code:format");
    expect(codes({ date_of_birth: "02/30/1990" })).toContain("date_of_birth:format");
    expect(codes({ date_of_birth: "06/02/2005" })).toContain("date_of_birth:minAge");
    expect(codes({ date_of_birth: "06/01/2005" })).toEqual([]);
  });
  it("coerces numeric strings only for number fields", () => {
    const f = (k: string) => schema.fields.find((x) => x.key === k)!;
    expect(coerce(f("claims_last_5_years"), "3")).toBe(3);
    expect(coerce(f("phone"), "3")).toBe("3");
  });
});

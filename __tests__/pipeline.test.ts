import { describe, expect, it } from "vitest";
import { harborDefinition } from "@/lib/carriers/harbor/definition";
import { assess, MappingContractError } from "@/lib/core/pipeline";
import type { CarrierAdapter, MappingResult } from "@/lib/core/types";
import { MAYA } from "./helpers";

const broken = (r: MappingResult): CarrierAdapter => ({ definition: harborDefinition, map: () => r });

describe("assess() rejects adapters that break their schema", () => {
  it("invalid option value", () => {
    const a = broken({ payload: { contents_coverage: 30000 }, mappings: [{ key: "contents_coverage", status: "converted" }] });
    expect(() => assess(a, MAYA)).toThrow(MappingContractError);
  });
  it("key outside the schema", () => {
    expect(() => assess(broken({ payload: { bogus: 1 }, mappings: [{ key: "bogus", status: "mapped" }] }), MAYA)).toThrow(/bogus/);
  });
  it("payload value for a field marked unmapped", () => {
    const a = broken({ payload: { phone: "5035550100" }, mappings: [{ key: "phone", status: "unmapped" }] });
    expect(() => assess(a, MAYA)).toThrow(MappingContractError);
  });
  it("conditional field without its condition", () => {
    const a = broken({ payload: { dog_breed: "Labrador" }, mappings: [{ key: "dog_breed", status: "mapped" }] });
    expect(() => assess(a, MAYA)).toThrow(MappingContractError);
  });
  it("diagnostics never include customer values", () => {
    try { assess(broken({ payload: { postal_code: "SECRET" }, mappings: [{ key: "postal_code", status: "mapped" }] }), MAYA); }
    catch (e) { expect((e as Error).message).not.toContain("SECRET"); expect((e as MappingContractError).issues[0].key).toBe("postal_code"); }
  });
});

import { describe, expect, it } from "vitest";
import type { CanonicalProfile } from "../canonical";
import { assess } from "./pipeline";
import type { CarrierAdapter, FieldValue } from "./types";
import { schemaFingerprint } from "./version";
import { isVisible } from "./validate";

export interface Fixture {
  name: string; profile: CanonicalProfile; now?: Date; eligible: boolean;
  reasons?: RegExp[]; pending?: string[]; mapped?: Record<string, FieldValue>; unmapped?: string[];
}
const NOW = new Date("2026-06-01T12:00:00Z");

/** Every carrier must pass this. */
export function describeAdapterContract(adapter: CarrierAdapter, fixtures: Fixture[], expectedFingerprint: string) {
  const { definition: def } = adapter;
  describe(`adapter contract: ${def.version.carrier}/${def.version.product}`, () => {
    it("pins the carrier schema fingerprint (update mapping + mappingVersion when this changes)", () =>
      expect(schemaFingerprint(def.schema)).toBe(expectedFingerprint));
    it("eligibility gates are real schema fields", () => {
      const keys = def.schema.fields.map((f) => f.key);
      def.gates.forEach((g) => expect(keys).toContain(g));
    });
    for (const fx of fixtures) describe(fx.name, () => {
      const run = () => assess(adapter, fx.profile, fx.now ?? NOW);
      it("output satisfies the carrier schema", () => expect(run).not.toThrow());
      it("accounts for every visible field exactly once", () => {
        const { mapping } = run();
        for (const f of def.schema.fields) {
          const n = mapping.mappings.filter((m) => m.key === f.key).length;
          expect(n).toBeLessThanOrEqual(1);
          if (isVisible(f, mapping.payload)) expect(n, f.key).toBe(1);
        }
      });
      it("is deterministic", () => expect(run()).toEqual(run()));
      it("reports eligibility and reasons", () => {
        const { eligibility: e } = run();
        expect(e.eligible).toBe(fx.eligible);
        expect(e.reasons.length === 0).toBe(fx.eligible);
        fx.reasons?.forEach((r) => expect(e.reasons.join(" ")).toMatch(r));
        if (fx.pending) expect(e.pending).toEqual(fx.pending);
      });
      it("matches expected mapped/unmapped fields", () => {
        const { mapping } = run();
        if (fx.mapped) expect(mapping.payload).toMatchObject(fx.mapped);
        fx.unmapped?.forEach((k) => {
          expect(mapping.mappings.find((m) => m.key === k)?.status, k).toBe("unmapped");
          expect(mapping.payload).not.toHaveProperty(k);
        });
      });
    });
  });
}

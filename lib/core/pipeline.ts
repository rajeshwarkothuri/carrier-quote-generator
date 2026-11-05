import type { CanonicalProfile } from "../canonical";
import { evaluateEligibility } from "./eligibility";
import type { CarrierAdapter, EligibilityResult, Issue, MappingResult } from "./types";
import { STRUCTURAL, validatePayload } from "./validate";

export class MappingContractError extends Error {
    constructor(public issues: Issue[]) {
        super(`Carrier mapping violated its schema: ${issues.map((i) => `${i.key} (${i.code}): ${i.message}`).join("; ")}`);
    }
}

/** verifies the mapper honoured the carrier schema is valid. */
export function assess(adapter: CarrierAdapter, profile: CanonicalProfile, now: Date = new Date()): { mapping: MappingResult; eligibility: EligibilityResult } {
    const { definition } = adapter;
    const mapping = adapter.map(profile);
    const issues = validatePayload(definition.schema, mapping.payload, { mode: "partial", now }).filter((i) => STRUCTURAL.has(i.code));
    const byKey = new Map(mapping.mappings.map((m) => [m.key, m]));
    for (const k of Object.keys(mapping.payload)) {
        const m = byKey.get(k);
        if (!m || m.status === "unmapped") issues.push({ key: k, code: "unexpected", message: "Payload has a value that the mapping marks unmapped or doesn't describe." });
    }
    for (const m of mapping.mappings)
        if (m.status !== "unmapped" && !(m.key in mapping.payload)) issues.push({ key: m.key, code: "unexpected", message: "Mapping says resolved but the payload has no value." });
    if (issues.length) throw new MappingContractError(issues);
    return { mapping, eligibility: evaluateEligibility(definition, mapping, now) };
}

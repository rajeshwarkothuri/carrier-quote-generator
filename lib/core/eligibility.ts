import type { CarrierDefinition, EligibilityResult, MappingResult } from "./types";
import { validateField } from "./validate";

/** Eligibility = the schema's own validation applied to the gate fields of the mapped payload. */
export function evaluateEligibility(def: CarrierDefinition, mapping: MappingResult, now: Date = new Date()): EligibilityResult {
  const reasons: string[] = [], pending: string[] = [];
  for (const key of def.gates) {
    const field = def.schema.fields.find((f) => f.key === key);
    if (!field) throw new Error(`Gate "${key}" is not a field of the ${def.version.carrier} schema.`);
    const m = mapping.mappings.find((x) => x.key === key);
    if (m?.status === "unmapped") { m.reason === "unsupported" ? reasons.push(m.note ?? `${field.label} isn't supported.`) : pending.push(key); continue; }
    if (mapping.payload[key] === undefined) { pending.push(key); continue; }
    const issue = validateField(field, mapping.payload[key], { now });
    if (issue) reasons.push(issue.message);
  }
  return reasons.length === 0
    ? { eligible: true, reasons, pending, message: null }
    : { eligible: false, reasons, pending, message: `${def.name} can't offer you a quote right now. ${reasons.join(" ")}` };
}

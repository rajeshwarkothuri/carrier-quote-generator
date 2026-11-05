import type { FieldMapping, FieldValue, MappingResult, Payload } from "./types";

/** Records every decision for every field  once. */
export class MappingBuilder {
  private payload: Payload = {};
  private mappings: FieldMapping[] = [];
  private add(m: FieldMapping, v?: FieldValue) {
    if (this.mappings.some((x) => x.key === m.key)) throw new Error(`Duplicate mapping decision for "${m.key}".`);
    this.mappings.push(m);
    if (v !== undefined) this.payload[m.key] = v;
  }
  mapped(key: string, value: FieldValue, source: string[]) { this.add({ key, status: "mapped", source }, value); }
  converted(key: string, value: FieldValue, source: string[], note: string, confirm = false) { this.add({ key, status: "converted", source, note, confirm }, value); }
  missing(key: string, note: string) { this.add({ key, status: "unmapped", reason: "missing", note }); }
  unsupported(key: string, note: string) { this.add({ key, status: "unmapped", reason: "unsupported", note }); }
  result(): MappingResult { return { payload: this.payload, mappings: this.mappings }; }
}

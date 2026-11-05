import type { CanonicalProfile } from "../canonical";

export type FieldValue = string | number | boolean | string[];
export type Payload = Record<string, FieldValue>;

export interface SchemaField {
  key: string; label: string;
  type: "text" | "date" | "email" | "tel" | "select" | "multiselect" | "number" | "boolean";
  required: boolean; format?: string; options?: (string | number)[]; pattern?: string; min?: number;
  validation?: { minAge: number }; showIf?: { field: string; includes: string };
}
export interface CarrierSchema { carrier: string; product: string; fields: SchemaField[] }

export type MappingStatus = "mapped" | "converted" | "unmapped";
export interface FieldMapping {
  key: string; status: MappingStatus; source?: string[]; note?: string;
  /** conversion is derived from partial customer information, will be  shown and let customer to confirm */
  confirm?: boolean;

  reason?: "missing" | "unsupported";
}
export interface MappingResult { payload: Payload; mappings: FieldMapping[] }

export type IssueCode = "required" | "type" | "option" | "format" | "range" | "minAge" | "unexpected";
export interface Issue { key: string; code: IssueCode; message: string }

export interface EligibilityResult {
  eligible: boolean; reasons: string[];
  pending: string[]; message: string | null;
}

export interface CarrierVersion { carrier: string; product: string; schemaVersion: string; mappingVersion: string }
export interface CarrierDefinition {
  name: string; version: CarrierVersion; schema: CarrierSchema;
  gates: string[];
}
export interface CarrierAdapter { definition: CarrierDefinition; map(profile: CanonicalProfile): MappingResult }
export type Adapter = CarrierAdapter;

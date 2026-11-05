import schema from "@/data/harbor.schema.json";
import type { CarrierDefinition, CarrierSchema } from "@/lib/core/types";


export const harborDefinition: CarrierDefinition = {
  name: "Harbor Assurance",
  version: { carrier: "harbor", product: "renters", schemaVersion: "2026-01", mappingVersion: "1.0.0" },
  schema: schema as CarrierSchema,
  gates: ["date_of_birth", "residence_state", "contents_coverage"],
};
export const optionsOf = (key: string) => harborDefinition.schema.fields.find((f) => f.key === key)?.options ?? [];

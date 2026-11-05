import type { CarrierAdapter } from "@/lib/core/types";
import { harborDefinition } from "./definition";
import { mapHarbor } from "./mapping";
export const harborAdapter: CarrierAdapter = { definition: harborDefinition, map: mapHarbor };
export { harborAdapter as HarborAdapter };

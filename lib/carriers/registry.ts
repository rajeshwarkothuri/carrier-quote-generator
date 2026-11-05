import type { CarrierAdapter } from "@/lib/core/types";
import type { CarrierTransport } from "@/lib/integration/resilience";
import { harborAdapter } from "./harbor";
import { harborMockTransport } from "./harbor/transport";

export interface CarrierEntry { adapter: CarrierAdapter; transport: CarrierTransport }
/** Registes carrier with carrier specific definition, mapping  and transport. */
const registry: Record<string, CarrierEntry> = { harbor: { adapter: harborAdapter, transport: harborMockTransport } };
export const getCarrier = (id: string) => registry[id];
export const listCarriers = () => Object.values(registry);

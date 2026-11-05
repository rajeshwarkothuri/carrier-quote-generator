import { listCarriers } from "@/lib/carriers/registry";
import { schemaFingerprint } from "@/lib/core/version";
import { snapshot } from "@/lib/ops/metrics";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    carriers: listCarriers().map((c) => ({ ...c.adapter.definition.version, schemaFingerprint: schemaFingerprint(c.adapter.definition.schema) })),
    counters: snapshot(),
  });
}

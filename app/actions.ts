"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import profiles from "@/data/profiles.json";
import { parseProfile } from "@/lib/canonical";
import { getCarrier } from "@/lib/carriers/registry";
import { assess } from "@/lib/core/pipeline";
import type { FieldValue, Payload } from "@/lib/core/types";
import { coerce, isEmpty, validatePayload } from "@/lib/core/validate";
import { callCarrier, CarrierError, type CarrierReceipt, type CarrierRequest } from "@/lib/integration/resilience";
import { endSession, getSession, startSession } from "@/lib/session/current";

export async function selectSample(formData: FormData) {
    const parsed = parseProfile((profiles as Record<string, unknown>)[String(formData.get("sample"))]);
    if (parsed.ok) await startSession({ profile: parsed.profile, sample: String(formData.get("sample")) });
    redirect("/");
}
export async function submitProfileJson(_prev: { errors?: string[] }, formData: FormData): Promise<{ errors?: string[] }> {
    const text = String(formData.get("profile") ?? "");
    if (text.length > 20_000) return { errors: ["Profile is too large."] };
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { return { errors: ["That isn't valid JSON."] }; }
    const parsed = parseProfile(raw);
    if (!parsed.ok) return { errors: parsed.errors };
    await startSession({ profile: parsed.profile });
    redirect("/");
}
export async function clearProfile() { await endSession(); redirect("/"); }

export type SubmitResult =
    | { ok: true; request: CarrierRequest; receipt: CarrierReceipt; traceId: string }
    | { ok: false; kind: "session" | "ineligible" | "invalid" | "carrier"; messages: string[]; traceId?: string };

/** Server reloads the Customer profile from the session, re-checks customer eligibility, re-validates profile with the shared validator. */
export async function submitQuote(carrierId: string, values: Record<string, unknown>): Promise<SubmitResult> {
    const session = await getSession();
    if (!session) return { ok: false, kind: "session", messages: ["Your session expired. Please choose or paste a profile again."] };
    const carrier = getCarrier(carrierId);
    if (!carrier) return { ok: false, kind: "invalid", messages: ["Unknown carrier."] };
    const { definition } = carrier.adapter;

    const { eligibility } = assess(carrier.adapter, session.profile);
    if (!eligibility.eligible) return { ok: false, kind: "ineligible", messages: eligibility.reasons };

    const fields: Payload = {};
    for (const f of definition.schema.fields) { const v = coerce(f, values[f.key]); if (!isEmpty(v)) fields[f.key] = v as FieldValue; }
    const issues = validatePayload(definition.schema, fields, { mode: "complete" });
    if (issues.length) return { ok: false, kind: "invalid", messages: issues.map((i) => i.message) };

    const request: CarrierRequest = { ...definition.version, idempotencyKey: randomUUID(), fields };
    try {
        const { receipt, traceId } = await callCarrier(carrier.transport, request);
        return { ok: true, request, receipt, traceId };
    } catch (e) {
        const err = e as CarrierError;
        return { ok: false, kind: "carrier", messages: [err.message ?? "The carrier request failed."], traceId: err.traceId };
    }
}

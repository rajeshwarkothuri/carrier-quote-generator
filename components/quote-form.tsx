"use client";
import { useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubmitResult } from "@/app/actions";
import type { CarrierSchema, FieldMapping, FieldValue, MappingResult, Payload, SchemaField } from "@/lib/core/types";
import { coerce, isEmpty, isVisible, validateField, validatePayload, type Values } from "@/lib/core/validate";

function statusBadge(m: FieldMapping | undefined, edited: boolean, required: boolean) {
  if (edited) return <Badge>Edited</Badge>;
  if (!m || m.status === "unmapped") return required ? <Badge variant="needed">Needs your input</Badge> : <Badge>Optional</Badge>;
  if (m.confirm) return <Badge variant="warn">Please confirm</Badge>;
  return <Badge variant="success">Pre-filled</Badge>;
}

export function QuoteForm({ schema, mapping, onSubmit }: { schema: CarrierSchema; mapping: MappingResult; onSubmit: (fields: Payload) => Promise<SubmitResult> }) {
  const byKey = useMemo(() => Object.fromEntries(mapping.mappings.map((m) => [m.key, m])), [mapping]);
  const [values, setValues] = useState<Values>({ ...mapping.payload });
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, setPending] = useState(false);

  const set = (f: SchemaField, v: FieldValue | undefined) => {
    const next = { ...values, [f.key]: v };
    setValues(next);
    setEdited(new Set(edited).add(f.key));
    setResult(null);
    if (errors[f.key]) setErrors((e) => { const { [f.key]: _, ...rest } = e; return rest; });
  };
  const blur = (f: SchemaField) => {
    const i = validateField(f, coerce(f, values[f.key]));
    setErrors((prev) => (i ? { ...prev, [f.key]: i.message } : (({ [f.key]: _, ...r }) => r)(prev)));
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const fields: Payload = {};
    for (const f of schema.fields) {
      if (!isVisible(f, values)) continue;
      const v = coerce(f, values[f.key]);
      if (!isEmpty(v)) fields[f.key] = v as FieldValue;
    }
    const issues = validatePayload(schema, fields, { mode: "complete" }); // same validator the server re-runs
    setErrors(Object.fromEntries(issues.map((i) => [i.key, i.message])));
    if (issues.length) { setResult(null); return; }
    setPending(true);
    try { setResult(await onSubmit(fields)); }
    catch { setResult({ ok: false, kind: "carrier", messages: ["Something went wrong sending your request. Please try again."] }); }
    finally { setPending(false); }
  };

  const errorCount = Object.keys(errors).length;
  const fieldsToShow = schema.fields.filter((f) => isVisible(f, values));
  const missing = fieldsToShow.filter((f) => f.required && byKey[f.key]?.status !== "mapped" && !edited.has(f.key) && byKey[f.key]?.status !== "converted").length;

  const control = (f: SchemaField) => {
    const id = f.key;
    const common = { id, "aria-invalid": !!errors[f.key], "aria-describedby": errors[f.key] ? `${id}-err` : undefined, onBlur: () => blur(f) };
    const v = values[f.key];
    switch (f.type) {
      case "select":
      case "boolean": {
        const opts = f.type === "boolean" ? [{ l: "Yes", v: true }, { l: "No", v: false }] : (f.options ?? []).map((o) => ({ l: typeof o === "number" ? `$${o.toLocaleString("en-US")}` : o, v: o }));
        return (
          <Select {...common} value={v === undefined ? "" : String(v)}
            onChange={(e) => set(f, e.target.value === "" ? undefined : opts.find((o) => String(o.v) === e.target.value)!.v as FieldValue)}>
            <option value="">Select…</option>
            {opts.map((o) => <option key={String(o.v)} value={String(o.v)}>{o.l}</option>)}
          </Select>
        );
      }
      case "multiselect": {
        const sel = Array.isArray(v) ? v : [];
        const toggle = (o: string) => {
          let next = sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o];
          if (o === "None" && !sel.includes("None")) next = ["None"];
          else if (o !== "None") next = next.filter((x) => x !== "None");
          set(f, next);
        };
        return (
          <div className="flex flex-wrap gap-4" role="group" aria-label={f.label}>
            {(f.options as string[]).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm font-normal">
                <input type="checkbox" checked={sel.includes(o)} onChange={() => toggle(o)} onBlur={() => blur(f)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                {o}
              </label>
            ))}
          </div>
        );
      }
      default:
        return (
          <Input {...common} type={f.type === "date" ? "text" : f.type} inputMode={f.type === "number" ? "numeric" : undefined}
            placeholder={f.format} min={f.min} value={v === undefined ? "" : String(v)} onChange={(e) => set(f, e.target.value)} />
        );
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {missing > 0 && <Alert><AlertDescription>{missing} {missing === 1 ? "question needs" : "questions need"} your answer.</AlertDescription></Alert>}
      {fieldsToShow.map((f) => {
        const m = byKey[f.key];
        const multi = f.type === "multiselect";
        const needs = (!m || m.status === "unmapped") && !edited.has(f.key);
        return (
          <div key={f.key} data-testid={`field-${f.key}`} data-needs-input={needs}
            className={`space-y-1.5 rounded-md p-3 ${needs ? "bg-amber-50 ring-1 ring-amber-400" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              {multi ? <span className="text-sm font-medium">{f.label}{f.required && <span aria-hidden> *</span>}</span>
                     : <Label htmlFor={f.key}>{f.label}{f.required && <span aria-hidden> *</span>}</Label>}
              {statusBadge(m, edited.has(f.key), f.required)}
            </div>
            {control(f)}
            {m?.note && !edited.has(f.key) && <p className="text-xs text-muted-foreground">{m.note}</p>}
            {errors[f.key] && <p id={`${f.key}-err`} className="text-xs text-destructive">{errors[f.key]}</p>}
          </div>
        );
      })}
      {errorCount > 0 && <Alert variant="destructive"><AlertTitle>Fix {errorCount} {errorCount === 1 ? "answer" : "answers"} to continue</AlertTitle></Alert>}
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Submit Quote Payload"}</Button>
      {result?.ok && (() => {
        const { idempotencyKey: _k, ...shown } = result.request;
        return (
          <Alert>
            <AlertTitle>Quote request sent to {schema.carrier} · ref {result.receipt.quoteRef}</AlertTitle>
            <pre data-testid="final-payload" className="mt-2 overflow-x-auto text-xs">{JSON.stringify(shown, null, 2)}</pre>
            <p className="mt-2 text-xs text-muted-foreground">Trace {result.traceId}</p>
          </Alert>
        );
      })()}
      {result && !result.ok && (
        <Alert variant="destructive" data-testid="submit-error">
          <AlertTitle>{result.kind === "carrier" ? "We couldn't reach the carrier" : "We couldn't send your request"}</AlertTitle>
          <AlertDescription><ul className="list-disc pl-5">{result.messages.map((m) => <li key={m}>{m}</li>)}</ul>{result.traceId && <p className="mt-1 text-xs">Reference {result.traceId}</p>}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}

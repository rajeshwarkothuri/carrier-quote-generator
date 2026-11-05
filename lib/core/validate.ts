import type { CarrierSchema, FieldValue, Issue, IssueCode, Payload, SchemaField } from "./types";

/** The ONE validator. Used by the form, by adapter-output checks, by eligibility gates and by the server on submit. */
export type Values = Record<string, FieldValue | undefined>;
export interface Ctx { now?: Date }
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Codes that mean "the mapping/schema is broken" (as opposed to business outcomes like minAge or missing answers). */
export const STRUCTURAL: ReadonlySet<IssueCode> = new Set<IssueCode>(["type", "option", "format", "range", "unexpected"]);

export function ageOn(dob: string, now: Date = new Date()): number {
  const [y, m, d] = dob.split("-").map(Number);
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age--;
  return age;
}
export const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
export function isVisible(f: SchemaField, values: Values): boolean {
  if (!f.showIf) return true;
  const v = values[f.showIf.field];
  return Array.isArray(v) && v.includes(f.showIf.includes);
}
/** Form inputs hand us strings; numbers become numbers before strict validation. */
export function coerce(f: SchemaField, v: unknown): unknown {
  return f.type === "number" && typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : v;
}

export function validateField(f: SchemaField, value: unknown, ctx: Ctx = {}): Issue | null {
  const issue = (code: IssueCode, message: string): Issue => ({ key: f.key, code, message });
  if (isEmpty(value)) return f.required ? issue("required", `${f.label} is required.`) : null;
  const typeOk =
    f.type === "number" ? typeof value === "number" && Number.isFinite(value)
    : f.type === "boolean" ? typeof value === "boolean"
    : f.type === "multiselect" ? Array.isArray(value) && value.every((x) => typeof x === "string")
    : f.type === "select" ? typeof value === "string" || typeof value === "number"
    : typeof value === "string";
  if (!typeOk) return issue("type", `${f.label} has the wrong type of value.`);
  if (f.type === "select" && !f.options?.includes(value as string | number)) return issue("option", `${f.label} has an unsupported choice.`);
  if (f.type === "multiselect") {
    const arr = value as string[];
    if (arr.some((x) => !f.options?.includes(x))) return issue("option", `${f.label} has an unsupported choice.`);
    if (arr.includes("None") && arr.length > 1) return issue("option", "Choose either None or the pets you have, not both.");
  }
  const s = typeof value === "string" ? value : "";
  if (f.pattern && !new RegExp(f.pattern).test(s)) return issue("format", `${f.label} is not in a valid format.`);
  if (f.type === "email" && !EMAIL.test(s)) return issue("format", "Enter a valid email address.");
  if (f.type === "tel" && s.replace(/\D/g, "").length < 10) return issue("format", "Enter a 10-digit phone number.");
  if (f.type === "number") {
    const n = value as number;
    if (f.min !== undefined && n < f.min) return issue("range", `${f.label} must be at least ${f.min}.`);
    if (!Number.isInteger(n)) return issue("format", `${f.label} must be a whole number.`);
  }
  if (f.type === "date") {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (!m) return issue("format", "Use the format MM/DD/YYYY.");
    const [mm, dd, yyyy] = [+m[1], +m[2], +m[3]];
    const d = new Date(Date.UTC(yyyy, mm - 1, dd));
    if (d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return issue("format", "Enter a real calendar date.");
    if (f.validation?.minAge !== undefined && ageOn(`${m[3]}-${m[1]}-${m[2]}`, ctx.now) < f.validation.minAge)
      return issue("minAge", `Applicants must be at least ${f.validation.minAge} years old.`);
  }
  return null;
}


export function validatePayload(schema: CarrierSchema, payload: Payload, o: Ctx & { mode: "partial" | "complete" }): Issue[] {
  const issues: Issue[] = [];
  const keys = new Set(schema.fields.map((f) => f.key));
  for (const k of Object.keys(payload)) if (!keys.has(k)) issues.push({ key: k, code: "unexpected", message: `"${k}" is not a field of this carrier's schema.` });
  for (const f of schema.fields) {
    const v = payload[f.key];
    if (!isVisible(f, payload)) {
      if (v !== undefined) issues.push({ key: f.key, code: "unexpected", message: `${f.label} was provided but its condition isn't met.` });
      continue;
    }
    const i = validateField(f, v, o);
    if (i && !(o.mode === "partial" && i.code === "required")) issues.push(i);
  }
  return issues;
}

// Shared types + helpers for the dynamic Parivar Form (config lives in Supabase form_* tables).

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "phone"
  | "dropdown"
  | "multi_select"
  | "yes_no"
  | "yes_no_number";

export type Scope = "family" | "member";
export type VisibilityLevel = "admin" | "core" | "all";
export type LabelMap = Record<string, string>;
export type Answers = Record<string, any>;

export interface Condition {
  field_key: string;
  path?: string;
  op: "eq" | "neq" | "in" | "not_in" | "filled";
  value?: any;
}

export interface FormOption {
  id: string;
  field_id: string;
  value: string;
  label: LabelMap;
  sort_order: number;
  is_visible: boolean;
  is_archived: boolean;
}

export interface FormField {
  id: string;
  section_id: string;
  field_key: string;
  scope: Scope;
  label: LabelMap;
  help_text: LabelMap;
  placeholder: LabelMap;
  field_type: FieldType;
  is_required: boolean;
  is_visible: boolean;
  is_archived: boolean;
  is_system: boolean;
  is_locked: boolean;
  system_column: string | null;
  visibility_level: VisibilityLevel;
  sort_order: number;
  conditional: Condition | null;
  config: Record<string, any>;
  options: FormOption[];
}

export interface FormSection {
  id: string;
  slug: string;
  scope: Scope;
  title: LabelMap;
  description: LabelMap;
  sort_order: number;
  is_visible: boolean;
  is_archived: boolean;
  fields: FormField[];
}

const LABEL_FALLBACK: Record<string, string[]> = {
  en: ["en", "hi"],
  hi: ["hi", "en"],
  mr: ["mr", "hi", "en"],
  cg: ["cg", "hi", "en"],
  hng: ["hng", "en", "hi"],
};

export function pickLabel(label: LabelMap | null | undefined, lang: string): string {
  if (!label) return "";
  for (const k of LABEL_FALLBACK[lang] || ["en", "hi"]) {
    if (label[k]) return label[k];
  }
  return Object.values(label).find((v) => !!v) || "";
}

export function activeFields(section: FormSection): FormField[] {
  return (section.fields || [])
    .filter((f) => f.is_visible && !f.is_archived)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function activeOptions(field: FormField): FormOption[] {
  return (field.options || [])
    .filter((o) => o.is_visible && !o.is_archived)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function isEmptyValue(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return !v.status;
  return false;
}

export function isConditionMet(c: Condition | null | undefined, answers: Answers): boolean {
  if (!c || !c.field_key) return true;
  let v = answers[c.field_key];
  if (v && typeof v === "object" && !Array.isArray(v)) {
    v = c.path ? v[c.path] : v.status;
  }
  const arr: string[] = Array.isArray(v)
    ? v.map(String)
    : v === null || v === undefined || v === ""
      ? []
      : [String(v)];
  const list = (Array.isArray(c.value) ? c.value : [c.value]).map((x) => String(x));
  switch (c.op) {
    case "eq":
      return arr.includes(String(c.value));
    case "neq":
      return !arr.includes(String(c.value));
    case "in":
      return arr.some((x) => list.includes(x));
    case "not_in":
      return !arr.some((x) => list.includes(x));
    case "filled":
      return arr.length > 0;
    default:
      return true;
  }
}

/** Required fields (with conditions satisfied) that are still empty. */
export function missingRequired(fields: FormField[], answers: Answers): FormField[] {
  return fields.filter(
    (f) => f.is_required && isConditionMet(f.conditional, answers) && isEmptyValue(answers[f.field_key])
  );
}

export function calcAge(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  yes: { en: "Yes", hi: "हाँ", hng: "Haan" },
  no: { en: "No", hi: "नहीं", hng: "Nahi" },
  unknown: { en: "Don't know", hi: "पता नहीं", hng: "Pata nahi" },
};
const DOC_STATUS_LABELS: Record<string, Record<string, string>> = {
  yes: { en: "Have", hi: "है", hng: "Hai" },
  no: { en: "Don't have", hi: "नहीं है", hng: "Nahi hai" },
  unknown: { en: "Not sure", hi: "पता नहीं", hng: "Pata nahi" },
};

export function statusLabel(kind: "yn" | "doc", status: string, lang: string): string {
  const map = (kind === "doc" ? DOC_STATUS_LABELS : STATUS_LABELS)[status] || {};
  const order = lang === "mr" || lang === "cg" ? ["hi", "en"] : lang === "hng" ? ["hng", "en"] : [lang, "en"];
  for (const k of order) if (map[k]) return map[k];
  return status;
}

/** Human readable value for review screens. */
export function displayValue(field: FormField, value: any, lang: string): string {
  if (isEmptyValue(value)) return "";
  switch (field.field_type) {
    case "dropdown": {
      const o = (field.options || []).find((x) => x.value === String(value));
      return o ? pickLabel(o.label, lang) : String(value);
    }
    case "multi_select":
      return (Array.isArray(value) ? value : [])
        .map((v: string) => {
          const o = (field.options || []).find((x) => x.value === v);
          return o ? pickLabel(o.label, lang) : v;
        })
        .join(", ");
    case "yes_no":
      return statusLabel("yn", String(value), lang);
    case "yes_no_number": {
      const base = statusLabel("doc", String(value.status), lang);
      if (!value.number) return base;
      const shown = field.config?.store === "last4" ? `•••• ${value.number}` : value.number;
      return `${base} (${shown})`;
    }
    default:
      return String(value);
  }
}

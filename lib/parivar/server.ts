import { createAdminClient } from "@/lib/supabase/admin";
import {
  Answers,
  FormField,
  FormSection,
  activeFields,
  calcAge,
  isConditionMet,
  isEmptyValue,
  pickLabel,
} from "@/lib/parivar/form";

export type AdminClient = ReturnType<typeof createAdminClient>;

export const STAFF_ROLES = ["volunteer", "core_committee", "super_admin"];
export const MAX_MEMBERS = 30;
export const BOOL_COLUMNS = new Set(["is_unemployed", "needs_care"]);
export const ARRAY_COLUMNS = new Set(["needs", "skills", "support_needed"]);

// Sirf yehi real columns config se likhe ja sakte hain; baaki sab custom_fields me jaata hai.
export const FAMILY_COLUMNS = new Set([
  "native_village", "address", "education_summary", "employment_status", "needs",
  "house_ownership", "ration_card_type", "family_income_range",
]);
export const MEMBER_COLUMNS = new Set([
  "name", "relation", "age", "education_level", "occupation", "is_unemployed", "needs_care",
  "gender", "marital_status", "blood_group", "dob", "contact_number", "skills", "income_range",
  "disability_status", "support_needed",
]);

export interface Processed {
  columns: Record<string, any>;
  custom: Record<string, any>;
  errors: string[];
}

export async function loadConfig(supabase: AdminClient): Promise<{ family: FormField[]; member: FormField[] } | null> {
  const { data, error } = await supabase.rpc("get_parivar_form_config", { p_include_hidden: false });
  if (error || !Array.isArray(data)) return null;
  const sections = data as FormSection[];
  return {
    family: sections.filter((s) => s.scope === "family").flatMap(activeFields),
    member: sections.filter((s) => s.scope === "member").flatMap(activeFields),
  };
}

export function processScope(fields: FormField[], answers: Answers, who: string, allowed: Set<string>): Processed {
  const columns: Record<string, any> = {};
  const custom: Record<string, any> = {};
  const errors: string[] = [];

  for (const f of fields) {
    if (!isConditionMet(f.conditional, answers)) continue;
    const label = pickLabel(f.label, "en") || f.field_key;
    const raw = answers[f.field_key];
    const optionValues = new Set(
      (f.options || []).filter((o) => o.is_visible && !o.is_archived).map((o) => o.value)
    );
    let val: any = undefined;

    if (isEmptyValue(raw)) {
      if (f.is_required) errors.push(`${who}${label} is required`);
      continue;
    }

    switch (f.field_type) {
      case "text":
      case "textarea": {
        const s = String(raw).trim().slice(0, f.field_type === "text" ? 200 : 1000);
        if (!s) { if (f.is_required) errors.push(`${who}${label} is required`); continue; }
        val = s;
        break;
      }
      case "dropdown": {
        const s = String(raw);
        if (!optionValues.has(s)) { errors.push(`${who}${label}: invalid option`); continue; }
        val = s;
        break;
      }
      case "multi_select": {
        if (!Array.isArray(raw)) { errors.push(`${who}${label}: invalid`); continue; }
        const arr = Array.from(new Set(raw.map(String)));
        if (arr.some((x) => !optionValues.has(x))) { errors.push(`${who}${label}: invalid option`); continue; }
        if (arr.length === 0) { if (f.is_required) errors.push(`${who}${label} is required`); continue; }
        val = arr;
        break;
      }
      case "yes_no": {
        const s = String(raw);
        if (s !== "yes" && s !== "no") { errors.push(`${who}${label}: invalid`); continue; }
        val = s;
        break;
      }
      case "yes_no_number": {
        const status = raw && typeof raw === "object" ? String(raw.status) : "";
        if (!["yes", "no", "unknown"].includes(status)) { errors.push(`${who}${label}: invalid`); continue; }
        if (status !== "yes") { val = { status }; break; }
        let number: string | undefined;
        const rawNumber = String(raw.number ?? "");
        if (f.config?.store === "last4") {
          // Aadhaar jaise sensitive IDs: poora number kabhi store nahi hota.
          const d = rawNumber.replace(/\D/g, "");
          number = d ? d.slice(-4) : undefined;
        } else {
          const s = rawNumber.trim().slice(0, 40);
          number = s || undefined;
        }
        val = number ? { status, number } : { status };
        break;
      }
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n)) { errors.push(`${who}${label}: invalid number`); continue; }
        const min = typeof f.config?.min === "number" ? f.config.min : undefined;
        const max = typeof f.config?.max === "number" ? f.config.max : undefined;
        if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
          errors.push(`${who}${label}: out of range`);
          continue;
        }
        val = f.system_column === "age" ? Math.round(n) : n;
        break;
      }
      case "date": {
        const s = String(raw);
        const d = new Date(s);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(d.getTime())) { errors.push(`${who}${label}: invalid date`); continue; }
        if (f.system_column === "dob" && (d.getTime() > Date.now() || calcAge(s) === null)) {
          errors.push(`${who}${label}: invalid date of birth`);
          continue;
        }
        val = s;
        break;
      }
      case "phone": {
        const d = String(raw).replace(/\D/g, "").slice(-10);
        if (d.length !== 10) { errors.push(`${who}${label}: enter a valid 10-digit number`); continue; }
        val = d;
        break;
      }
      default:
        continue;
    }

    if (f.system_column && allowed.has(f.system_column)) {
      columns[f.system_column] = BOOL_COLUMNS.has(f.system_column) ? val === "yes" : val;
    } else {
      custom[f.field_key] = val;
    }
  }
  return { columns, custom, errors };
}

/** Edit ke time: jo active system columns khaali chhode gaye, unhe saaf karo (stale data na rahe). */
export function emptyColumnsFor(fields: FormField[], allowed: Set<string>, provided: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const col = f.system_column;
    if (!col || !allowed.has(col) || col in provided || col in out) continue;
    out[col] = BOOL_COLUMNS.has(col) ? false : ARRAY_COLUMNS.has(col) ? [] : null;
  }
  return out;
}

/** custom_fields merge: active fields ke purane keys hatao, naye lagao; baaki (photo_url, hidden fields) safe rahe. */
export function mergeCustom(existing: any, fields: FormField[], next: Record<string, any>): Record<string, any> {
  const merged: Record<string, any> = { ...(existing && typeof existing === "object" ? existing : {}) };
  for (const f of fields) delete merged[f.field_key];
  return Object.assign(merged, next);
}

/** DB row -> form answers (edit screen ke liye) */
export function answersFromRow(fields: FormField[], row: Record<string, any>, allowed: Set<string>): Answers {
  const out: Answers = {};
  const custom = row.custom_fields && typeof row.custom_fields === "object" ? row.custom_fields : {};
  for (const f of fields) {
    let v: any;
    if (f.system_column && allowed.has(f.system_column)) {
      v = row[f.system_column];
      if (BOOL_COLUMNS.has(f.system_column)) v = v === true ? "yes" : v === false ? "no" : undefined;
    } else {
      v = custom[f.field_key];
    }
    if (v === null || v === undefined) continue;
    if (f.field_type === "number") v = String(v);
    out[f.field_key] = v;
  }
  return out;
}

export async function uploadPhoto(supabase: AdminClient, dataUrl: unknown, folder: string): Promise<string | null> {
  if (typeof dataUrl !== "string") return null;
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 1_500_000) return null;
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const path = `parivar/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("feed-images").upload(path, buf, { contentType: `image/${m[1]}` });
  if (error) {
    console.warn("parivar photo upload failed:", error.message);
    return null;
  }
  return supabase.storage.from("feed-images").getPublicUrl(path).data.publicUrl;
}

/** Head khud, ya staff (super admin global, baaki apni city). */
export async function canAccessFamily(
  supabase: AdminClient,
  session: { userId: string; role: string; cityId?: string | null },
  headUserId: string
): Promise<boolean> {
  if (session.userId === headUserId) return true;
  if (!STAFF_ROLES.includes(session.role)) return false;
  if (session.role === "super_admin") return true;
  const { data: head } = await supabase.from("users").select("city_id").eq("id", headUserId).maybeSingle();
  return !!head && !!session.cityId && head.city_id === session.cityId;
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
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

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["volunteer", "core_committee", "super_admin"];
const MAX_MEMBERS = 30;
const BOOL_COLUMNS = new Set(["is_unemployed", "needs_care"]);

// Sirf yehi real columns config se likhe ja sakte hain; baaki sab custom_fields me jaata hai.
const FAMILY_COLUMNS = new Set([
  "native_village", "address", "education_summary", "employment_status", "needs",
  "house_ownership", "ration_card_type", "family_income_range",
]);
const MEMBER_COLUMNS = new Set([
  "name", "relation", "age", "education_level", "occupation", "is_unemployed", "needs_care",
  "gender", "marital_status", "blood_group", "dob", "contact_number", "skills", "income_range",
  "disability_status", "support_needed",
]);

interface Processed {
  columns: Record<string, any>;
  custom: Record<string, any>;
  errors: string[];
}

function processScope(fields: FormField[], answers: Answers, who: string, allowed: Set<string>): Processed {
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

async function uploadPhoto(supabase: ReturnType<typeof createAdminClient>, dataUrl: unknown, folder: string): Promise<string | null> {
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

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.session) return auth.response;
  const session = auth.session;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const familyIn = body?.family || {};
  const membersIn: any[] = Array.isArray(body?.members) ? body.members : [];
  if (membersIn.length === 0) {
    return NextResponse.json({ error: "Please add at least one family member" }, { status: 400 });
  }
  if (membersIn.length > MAX_MEMBERS) {
    return NextResponse.json({ error: `Maximum ${MAX_MEMBERS} members allowed` }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Head of family: khud ya (staff ke liye) assisted entry
  let headUserId = session.userId;
  let filledVia = "self";
  if (body?.forPhone) {
    if (!STAFF_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Only volunteers can fill for others" }, { status: 403 });
    }
    const phone = String(body.forPhone).replace(/\D/g, "").slice(-10);
    const { data: target } = await supabase.from("users").select("id, city_id").eq("phone", phone).maybeSingle();
    if (!target) return NextResponse.json({ error: "No member found with this phone" }, { status: 404 });
    if (session.role !== "super_admin" && session.cityId && target.city_id !== session.cityId) {
      return NextResponse.json({ error: "This member belongs to another city" }, { status: 403 });
    }
    headUserId = target.id;
    filledVia = "assisted";
  }

  // Config load (server-side truth; client ki validation par bharosa nahi)
  const { data: cfg, error: cfgError } = await supabase.rpc("get_parivar_form_config", { p_include_hidden: false });
  if (cfgError || !Array.isArray(cfg)) {
    return NextResponse.json({ error: "Could not load form configuration" }, { status: 500 });
  }
  const sections = cfg as FormSection[];
  const familyFields = sections.filter((s) => s.scope === "family").flatMap(activeFields);
  const memberFields = sections.filter((s) => s.scope === "member").flatMap(activeFields);

  const fam = processScope(familyFields, familyIn.answers || {}, "", FAMILY_COLUMNS);
  const errors = [...fam.errors];
  if (!fam.columns.native_village || !fam.columns.address) {
    errors.push("Native place and address are required");
  }

  const memberResults = membersIn.map((m, i) => {
    const who = `Member ${i + 1}: `;
    const r = processScope(memberFields, m?.answers || {}, who, MEMBER_COLUMNS);
    if (!r.columns.name) r.errors.push(`${who}Name is required`);
    if (!r.columns.relation) r.errors.push(`${who}Relation is required`);
    const age = r.columns.dob ? calcAge(r.columns.dob) : (r.columns.age ?? null);
    if (age === null || age === undefined) r.errors.push(`${who}Age or date of birth is required`);
    else r.columns.age = age;
    return r;
  });
  memberResults.forEach((r) => errors.push(...r.errors));

  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }

  // Soft warning: same head ka pehle se family record
  let warning: string | null = null;
  const { data: existing } = await supabase.from("families").select("id").eq("head_of_family", headUserId).limit(1);
  if (existing && existing.length > 0) {
    warning = "A family record already exists for this member. New entry saved; please review for duplicates.";
  }

  // Photos -> storage (URL custom_fields me)
  const folder = crypto.randomUUID();
  const famPhoto = await uploadPhoto(supabase, familyIn.photo, folder);
  if (famPhoto) fam.custom.photo_url = famPhoto;
  for (let i = 0; i < membersIn.length; i++) {
    const url = await uploadPhoto(supabase, membersIn[i]?.photo, folder);
    if (url) memberResults[i].custom.photo_url = url;
  }

  const { data: familyRow, error: familyError } = await supabase
    .from("families")
    .insert({
      head_of_family: headUserId,
      ...fam.columns,
      needs: fam.columns.needs ?? [],
      custom_fields: fam.custom,
      filled_via: filledVia,
      entered_by: filledVia === "assisted" ? session.userId : null,
    })
    .select("id")
    .single();
  if (familyError || !familyRow) {
    console.error("parivar family insert error:", familyError?.message);
    return NextResponse.json({ error: "Could not save family details" }, { status: 500 });
  }

  const rows = memberResults.map((r) => ({ family_id: familyRow.id, ...r.columns, custom_fields: r.custom }));
  const { error: membersError } = await supabase.from("family_members").insert(rows);
  if (membersError) {
    console.error("parivar members insert error:", membersError.message);
    await supabase.from("families").delete().eq("id", familyRow.id); // partial data na rahe
    return NextResponse.json({ error: "Could not save members. Nothing was saved, please try again." }, { status: 500 });
  }

  const { data: completion } = await supabase.rpc("compute_parivar_completion", { p_family_id: familyRow.id });
  if (typeof completion === "number") {
    await supabase.from("families").update({ completion_percent: completion }).eq("id", familyRow.id);
  }

  await supabase.from("parivar_form_drafts").delete().eq("user_id", session.userId);
  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "census_submit",
    target_id: familyRow.id,
  });

  return NextResponse.json({
    success: true,
    familyId: familyRow.id,
    completion: typeof completion === "number" ? completion : null,
    warning,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcAge } from "@/lib/parivar/form";
import { suggestSchemes } from "@/lib/parivar/schemes";
import {
  FAMILY_COLUMNS,
  MAX_MEMBERS,
  MEMBER_COLUMNS,
  STAFF_ROLES,
  answersFromRow,
  canAccessFamily,
  emptyColumnsFor,
  loadConfig,
  mergeCustom,
  processScope,
  uploadPhoto,
} from "@/lib/parivar/server";

export const dynamic = "force-dynamic";

type Supa = ReturnType<typeof createAdminClient>;
type Cfg = NonNullable<Awaited<ReturnType<typeof loadConfig>>>;

function memberAge(columns: Record<string, any>): number | null {
  const age = columns.dob ? calcAge(columns.dob) : (columns.age ?? null);
  return age === undefined ? null : age;
}

async function buildFamilyDetail(supabase: Supa, cfg: Cfg, fam: any) {
  const { data: memberRows } = await supabase
    .from("family_members")
    .select("*")
    .eq("family_id", fam.id)
    .order("created_at", { ascending: true });
  const famAnswers = answersFromRow(cfg.family, fam, FAMILY_COLUMNS);
  const members = (memberRows || []).map((m: any) => ({
    id: m.id as string,
    answers: answersFromRow(cfg.member, m, MEMBER_COLUMNS),
    photo_url: (m.custom_fields && m.custom_fields.photo_url) || null,
  }));
  return {
    id: fam.id as string,
    completion_percent: fam.completion_percent ?? 0,
    created_at: fam.created_at ?? null,
    answers: famAnswers,
    photo_url: (fam.custom_fields && fam.custom_fields.photo_url) || null,
    members,
    suggestions: suggestSchemes(famAnswers, members.map((m) => m.answers)),
  };
}

// GET /api/census?mine=1  -> meri families (summary + yojana suggestions)
// GET /api/census?id=UUID -> ek family ka poora detail (edit ke liye), head ya staff hi dekh sakta hai
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.session) return auth.response;
  const session = auth.session;
  const supabase = createAdminClient();

  const cfg = await loadConfig(supabase);
  if (!cfg) return NextResponse.json({ error: "Could not load form configuration" }, { status: 500 });

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const { data: fam } = await supabase.from("families").select("*").eq("id", id).maybeSingle();
    if (!fam) return NextResponse.json({ error: "Family not found" }, { status: 404 });
    if (!(await canAccessFamily(supabase, session, fam.head_of_family))) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    const detail = await buildFamilyDetail(supabase, cfg, fam);
    return NextResponse.json({ family: detail }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: fams } = await supabase
    .from("families")
    .select("*")
    .eq("head_of_family", session.userId)
    .order("created_at", { ascending: false })
    .limit(10);
  const families = await Promise.all((fams || []).map((f: any) => buildFamilyDetail(supabase, cfg, f)));
  return NextResponse.json({ families }, { headers: { "Cache-Control": "no-store" } });
}

type Validated =
  | { ok: true; fam: ReturnType<typeof processScope>; members: ReturnType<typeof processScope>[] }
  | { ok: false; errors: string[] };

function validatePayload(cfg: Cfg, familyIn: any, membersIn: any[]): Validated {
  const fam = processScope(cfg.family, familyIn?.answers || {}, "", FAMILY_COLUMNS);
  const errors = [...fam.errors];
  if (!fam.columns.native_village || !fam.columns.address) errors.push("Native place and address are required");

  const members = membersIn.map((m, i) => {
    const who = `Member ${i + 1}: `;
    const r = processScope(cfg.member, m?.answers || {}, who, MEMBER_COLUMNS);
    if (!r.columns.name) r.errors.push(`${who}Name is required`);
    if (!r.columns.relation) r.errors.push(`${who}Relation is required`);
    const age = memberAge(r.columns);
    if (age === null) r.errors.push(`${who}Age or date of birth is required`);
    else r.columns.age = age;
    errors.push(...r.errors);
    return r;
  });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, fam, members };
}

async function parseBody(request: NextRequest): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.session) return auth.response;
  const session = auth.session;

  const body = await parseBody(request);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const familyIn = body.family || {};
  const membersIn: any[] = Array.isArray(body.members) ? body.members : [];
  if (membersIn.length === 0) return NextResponse.json({ error: "Please add at least one family member" }, { status: 400 });
  if (membersIn.length > MAX_MEMBERS) return NextResponse.json({ error: `Maximum ${MAX_MEMBERS} members allowed` }, { status: 400 });

  const supabase = createAdminClient();

  // Head of family: khud ya (staff ke liye) assisted entry
  let headUserId = session.userId;
  let filledVia = "self";
  if (body.forPhone) {
    if (!STAFF_ROLES.includes(session.role)) return NextResponse.json({ error: "Only volunteers can fill for others" }, { status: 403 });
    const phone = String(body.forPhone).replace(/\D/g, "").slice(-10);
    const { data: target } = await supabase.from("users").select("id, city_id").eq("phone", phone).maybeSingle();
    if (!target) return NextResponse.json({ error: "No member found with this phone" }, { status: 404 });
    if (session.role !== "super_admin" && session.cityId && target.city_id !== session.cityId) {
      return NextResponse.json({ error: "This member belongs to another city" }, { status: 403 });
    }
    headUserId = target.id;
    filledVia = "assisted";
  }

  const cfg = await loadConfig(supabase);
  if (!cfg) return NextResponse.json({ error: "Could not load form configuration" }, { status: 500 });

  const v = validatePayload(cfg, familyIn, membersIn);
  if (!v.ok) return NextResponse.json({ error: v.errors[0], errors: v.errors }, { status: 400 });
  const { fam, members } = v;

  let warning: string | null = null;
  const { data: existing } = await supabase.from("families").select("id").eq("head_of_family", headUserId).limit(1);
  if (existing && existing.length > 0) {
    warning = "A family record already exists for this member. New entry saved; please review for duplicates.";
  }

  const folder = crypto.randomUUID();
  const famPhoto = await uploadPhoto(supabase, familyIn.photo, folder);
  if (famPhoto) fam.custom.photo_url = famPhoto;
  for (let i = 0; i < membersIn.length; i++) {
    const url = await uploadPhoto(supabase, membersIn[i]?.photo, folder);
    if (url) members[i].custom.photo_url = url;
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

  const rows = members.map((r) => ({ family_id: familyRow.id, ...r.columns, custom_fields: r.custom }));
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
  await supabase.from("audit_logs").insert({ actor_id: session.userId, action: "census_submit", target_id: familyRow.id });

  return NextResponse.json({
    success: true,
    familyId: familyRow.id,
    completion: typeof completion === "number" ? completion : null,
    warning,
  });
}

// PUT: bhari hui family ko edit karo (head ya staff)
export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.session) return auth.response;
  const session = auth.session;

  const body = await parseBody(request);
  if (!body?.familyId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const familyIn = body.family || {};
  const membersIn: any[] = Array.isArray(body.members) ? body.members : [];
  if (membersIn.length === 0) return NextResponse.json({ error: "A family needs at least one member" }, { status: 400 });
  if (membersIn.length > MAX_MEMBERS) return NextResponse.json({ error: `Maximum ${MAX_MEMBERS} members allowed` }, { status: 400 });

  const supabase = createAdminClient();
  const { data: famRow } = await supabase.from("families").select("*").eq("id", body.familyId).maybeSingle();
  if (!famRow) return NextResponse.json({ error: "Family not found" }, { status: 404 });
  if (!(await canAccessFamily(supabase, session, famRow.head_of_family))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const cfg = await loadConfig(supabase);
  if (!cfg) return NextResponse.json({ error: "Could not load form configuration" }, { status: 500 });

  const v = validatePayload(cfg, familyIn, membersIn);
  if (!v.ok) return NextResponse.json({ error: v.errors[0], errors: v.errors }, { status: 400 });
  const { fam, members } = v;

  const { data: existingMembers } = await supabase.from("family_members").select("*").eq("family_id", famRow.id);
  const existingById = new Map<string, any>((existingMembers || []).map((m: any): [string, any] => [m.id as string, m]));
  for (const m of membersIn) {
    if (m?.id && !existingById.has(m.id)) return NextResponse.json({ error: "Invalid member reference" }, { status: 400 });
  }

  const folder = famRow.id as string;
  const famPhoto = await uploadPhoto(supabase, familyIn.photo, folder);
  const famCustom = mergeCustom(famRow.custom_fields, cfg.family, fam.custom);
  if (famPhoto) famCustom.photo_url = famPhoto;

  const { error: famErr } = await supabase
    .from("families")
    .update({
      ...emptyColumnsFor(cfg.family, FAMILY_COLUMNS, fam.columns),
      ...fam.columns,
      custom_fields: famCustom,
    })
    .eq("id", famRow.id);
  if (famErr) {
    console.error("parivar family update error:", famErr.message);
    return NextResponse.json({ error: "Could not update family details" }, { status: 500 });
  }

  const keepIds = new Set<string>();
  for (let i = 0; i < membersIn.length; i++) {
    const m = membersIn[i];
    const r = members[i];
    const photo = await uploadPhoto(supabase, m?.photo, folder);
    if (m?.id) {
      keepIds.add(m.id);
      const prev = existingById.get(m.id);
      const custom = mergeCustom(prev?.custom_fields, cfg.member, r.custom);
      if (photo) custom.photo_url = photo;
      const { error } = await supabase
        .from("family_members")
        .update({ ...emptyColumnsFor(cfg.member, MEMBER_COLUMNS, r.columns), ...r.columns, custom_fields: custom })
        .eq("id", m.id)
        .eq("family_id", famRow.id);
      if (error) {
        console.error("parivar member update error:", error.message);
        return NextResponse.json({ error: `Could not update member ${i + 1}` }, { status: 500 });
      }
    } else {
      const custom = { ...r.custom };
      if (photo) custom.photo_url = photo;
      const { error } = await supabase
        .from("family_members")
        .insert({ family_id: famRow.id, ...emptyColumnsFor(cfg.member, MEMBER_COLUMNS, r.columns), ...r.columns, custom_fields: custom });
      if (error) {
        console.error("parivar member insert error:", error.message);
        return NextResponse.json({ error: `Could not add member ${i + 1}` }, { status: 500 });
      }
    }
  }

  // Jo members form se hata diye gaye, unhe delete karo (agar kahin aur linked ho to batao)
  const removeIds = Array.from(existingById.keys()).filter((id) => !keepIds.has(id));
  let warning: string | null = null;
  if (removeIds.length > 0) {
    const { error } = await supabase.from("family_members").delete().in("id", removeIds);
    if (error) {
      console.error("parivar member delete error:", error.message);
      warning = "Changes saved, but some removed members could not be deleted because they are linked elsewhere.";
    }
  }

  const { data: completion } = await supabase.rpc("compute_parivar_completion", { p_family_id: famRow.id });
  if (typeof completion === "number") {
    await supabase.from("families").update({ completion_percent: completion }).eq("id", famRow.id);
  }
  await supabase.from("audit_logs").insert({ actor_id: session.userId, action: "census_edit", target_id: famRow.id });

  return NextResponse.json({ success: true, familyId: famRow.id, completion: typeof completion === "number" ? completion : null, warning });
}

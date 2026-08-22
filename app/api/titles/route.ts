import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { TITLE_OPTIONS } from "@/lib/titles";

/**
 * Live schema:
 * - titles: key, name_en, name_hi, name_mr, description (definitions)
 * - city_titles: title_id, city_id, user_id, assigned_by, assigned_at, term_start, term_end
 * - title_history: audit of changes
 */

async function ensureTitleDefs(supabase: ReturnType<typeof createAdminClient>) {
  // Seed definitions from TITLE_OPTIONS if table empty / missing keys
  const { data: existing } = await supabase.from("titles").select("id, key");
  const have = new Set((existing || []).map((t: any) => t.key));
  for (const opt of TITLE_OPTIONS) {
    if (!have.has(opt.key)) {
      await supabase.from("titles").upsert(
        {
          key: opt.key,
          name_en: opt.label,
          name_hi: opt.label,
          name_mr: opt.label,
          description: opt.label,
        },
        { onConflict: "key" }
      );
    }
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();

  try {
    await ensureTitleDefs(supabase);
  } catch {
    /* definitions may already exist */
  }

  // Assignments via city_titles join titles + users
  let q = supabase
    .from("city_titles")
    .select(
      "id, city_id, user_id, assigned_by, assigned_at, term_start, term_end, titles:title_id(id, key, name_en, name_hi, name_mr, description), users:user_id(full_name, phone)"
    )
    .order("assigned_at", { ascending: false });

  if (session.role !== "super_admin" && session.cityId) {
    q = q.eq("city_id", session.cityId);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({
      titles: [],
      options: TITLE_OPTIONS,
      error: error.message,
    });
  }

  const titlesRaw = (data || []).map((row: any) => ({
    id: row.id,
    city_id: row.city_id,
    user_id: row.user_id,
    assigned_at: row.assigned_at,
    title_key: row.titles?.key,
    title_label: row.titles?.name_en || row.titles?.name_hi || row.titles?.key,
    users: row.users,
  }));

  // Attach city names
  const cityIds = Array.from(new Set(titlesRaw.map((r: any) => r.city_id).filter(Boolean)));
  let cityMap: Record<string, string> = {};
  if (cityIds.length) {
    const { data: cities } = await supabase.from("cities").select("id, name").in("id", cityIds);
    for (const c of cities || []) {
      cityMap[(c as any).id] = (c as any).name;
    }
  }
  const titles = titlesRaw.map((r: any) => ({
    ...r,
    city_name: r.city_id ? cityMap[r.city_id] || null : null,
  }));

  return NextResponse.json({ titles, options: TITLE_OPTIONS });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Committee / Super Admin only" }, { status: 403 });
  }
  const { title_key, user_id, city_id, term_start, term_end } = await request.json();
  if (!title_key || !user_id) {
    return NextResponse.json({ error: "title_key and user_id required" }, { status: 400 });
  }
  const cityId = city_id || session.cityId;
  if (!cityId) return NextResponse.json({ error: "city_id required" }, { status: 400 });

  const supabase = createAdminClient();
  try {
    await ensureTitleDefs(supabase);
  } catch {}

  const { data: titleRow, error: tErr } = await supabase
    .from("titles")
    .select("id, key, name_en")
    .eq("key", title_key)
    .maybeSingle();
  if (tErr || !titleRow) {
    return NextResponse.json({ error: tErr?.message || "Unknown title key" }, { status: 400 });
  }

  // Upsert city assignment (one holder per title per city if unique constraint exists)
  const { data, error } = await supabase
    .from("city_titles")
    .upsert(
      {
        title_id: titleRow.id,
        city_id: cityId,
        user_id,
        assigned_by: session.userId,
        assigned_at: new Date().toISOString(),
        term_start: term_start || null,
        term_end: term_end || null,
      },
      { onConflict: "city_id,title_id" }
    )
    .select()
    .single();

  if (error) {
    // Fallback: plain insert if no unique constraint
    const ins = await supabase
      .from("city_titles")
      .insert({
        title_id: titleRow.id,
        city_id: cityId,
        user_id,
        assigned_by: session.userId,
        assigned_at: new Date().toISOString(),
        term_start: term_start || null,
        term_end: term_end || null,
      })
      .select()
      .single();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
    await logHistory(supabase, session.userId, cityId, titleRow.id, user_id, "assign");
    return NextResponse.json({ success: true, title: ins.data });
  }

  await logHistory(supabase, session.userId, cityId, titleRow.id, user_id, "assign");
  return NextResponse.json({ success: true, title: data });
}

async function logHistory(
  supabase: any,
  actor: string,
  cityId: string,
  titleId: string,
  userId: string,
  action: string
) {
  try {
    await supabase.from("title_history").insert({
      title_id: titleId,
      city_id: cityId,
      user_id: userId,
      action,
      changed_by: actor,
    });
  } catch {}
  try {
    await supabase.from("audit_logs").insert({
      actor_id: actor,
      action: "title_assign",
      target_id: userId,
      meta: { title_id: titleId, city_id: cityId },
    });
  } catch {}
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from("city_titles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

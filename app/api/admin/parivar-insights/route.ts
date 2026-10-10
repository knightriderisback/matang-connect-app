import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessFamily } from "@/lib/parivar/server";

export const dynamic = "force-dynamic";

const STAFF = ["volunteer", "core_committee", "super_admin"];

// City-scoped stats: super admin global, volunteer/core committee sirf apni city (DB function ke andar enforce).
export async function GET() {
  const auth = await requireAuth(STAFF);
  if (!auth.session) return auth.response;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_parivar_insights", { p_actor: auth.session.userId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.message.includes("forbidden") ? 403 : 500 });
  }
  return NextResponse.json({ insights: data }, { headers: { "Cache-Control": "no-store" } });
}

// POST { op: "remind", familyIds: string[] } -> head ko in-app notification
export async function POST(request: NextRequest) {
  const auth = await requireAuth(STAFF);
  if (!auth.session) return auth.response;
  const session = auth.session;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body?.op !== "remind" || !Array.isArray(body.familyIds)) {
    return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
  }
  const ids: string[] = body.familyIds.map(String).slice(0, 100);
  const supabase = createAdminClient();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;
  let skipped = 0;

  for (const familyId of ids) {
    const { data: fam } = await supabase.from("families").select("id, head_of_family").eq("id", familyId).maybeSingle();
    if (!fam || !(await canAccessFamily(supabase, session, fam.head_of_family))) { skipped++; continue; }

    const { data: recent } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", fam.head_of_family)
      .eq("type", "parivar_reminder")
      .eq("ref_id", fam.id)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) { skipped++; continue; }

    const { error } = await supabase.from("notifications").insert({
      user_id: fam.head_of_family,
      title: "परिवार फॉर्म अधूरा है / Parivar Form incomplete",
      body: "कृपया अपना परिवार फॉर्म पूरा करें ताकि समाज की योजनाओं का लाभ मिल सके। Please complete your Parivar Form.",
      type: "parivar_reminder",
      ref_id: fam.id,
      is_read: false,
    });
    if (error) { skipped++; continue; }
    sent++;
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "parivar_reminder_sent",
    target_id: null,
  });
  return NextResponse.json({ success: true, sent, skipped });
}

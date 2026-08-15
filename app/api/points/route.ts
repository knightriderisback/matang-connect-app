import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const BADGE_THRESHOLDS = [
  { at: 10, badge: "Sevak" },
  { at: 50, badge: "Karyakarta" },
  { at: 100, badge: "Senani" },
  { at: 250, badge: "Gaurav" },
];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();

  // Staff: list members for award dropdown
  if (request.nextUrl.searchParams.get("users") === "1") {
    if (!STAFF_ROLES.includes(session.role as any)) {
      return NextResponse.json({ error: "Staff only" }, { status: 403 });
    }
    let q = supabase
      .from("users")
      .select("id, full_name, phone, role, native_village")
      .order("full_name")
      .limit(200);
    if (session.role !== "super_admin" && session.cityId) {
      q = q.eq("city_id", session.cityId);
    }
    const { data, error } = await q;
    if (error) return NextResponse.json({ users: [], error: error.message });
    return NextResponse.json({ users: data || [] });
  }

  const { data: me } = await supabase
    .from("volunteer_points")
    .select("*")
    .eq("user_id", session.userId)
    .maybeSingle();

  // Leaders without relying on FK embed
  const { data: leadersRaw, error: leadErr } = await supabase
    .from("volunteer_points")
    .select("user_id, points, badges")
    .order("points", { ascending: false })
    .limit(15);

  let leaders: any[] = [];
  if (!leadErr && leadersRaw?.length) {
    const ids = leadersRaw.map((l) => l.user_id);
    const { data: names } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", ids);
    const map: Record<string, string> = {};
    (names || []).forEach((u) => {
      map[u.id] = u.full_name;
    });
    leaders = leadersRaw.map((l) => ({
      ...l,
      full_name: map[l.user_id] || l.user_id?.slice(0, 8),
      users: { full_name: map[l.user_id] || "Member" },
    }));
  }

  return NextResponse.json({
    me: me || { points: 0, badges: [] },
    leaders,
    error: leadErr?.message,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const user_id = body.user_id || body.userId;
  const points = body.points;
  const reason = body.reason || "Manual award";
  if (!user_id || !points) {
    return NextResponse.json({ error: "user_id and points required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const pts = Math.min(Math.max(parseInt(String(points), 10) || 0, 1), 100);

  const { data: existing } = await supabase
    .from("volunteer_points")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();

  const newPoints = (existing?.points || 0) + pts;
  const badges = new Set<string>(existing?.badges || []);
  BADGE_THRESHOLDS.forEach((b) => {
    if (newPoints >= b.at) badges.add(b.badge);
  });
  const badgeArr = Array.from(badges);

  // Upsert with fallbacks
  let error: any = null;
  {
    const r = await supabase.from("volunteer_points").upsert(
      {
        user_id,
        points: newPoints,
        badges: badgeArr,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    error = r.error;
  }
  if (error) {
    const r2 = await supabase.from("volunteer_points").upsert(
      { user_id, points: newPoints, badges: badgeArr },
      { onConflict: "user_id" }
    );
    error = r2.error;
  }
  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "Ensure volunteer_points table exists (see migrations)",
      },
      { status: 500 }
    );
  }

  try {
    await supabase.from("volunteer_point_log").insert({
      user_id,
      points: pts,
      reason,
      awarded_by: session.userId,
    });
  } catch {
    /* optional */
  }

  return NextResponse.json({ success: true, points: newPoints, badges: badgeArr });
}

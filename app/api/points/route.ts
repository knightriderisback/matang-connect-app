import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const BADGE_THRESHOLDS = [
  { at: 10, badge: "Sevak" },
  { at: 50, badge: "Karyakarta" },
  { at: 100, badge: "Senani" },
  { at: 250, badge: "Gaurav" },
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  const { data } = await supabase.from("volunteer_points").select("*").eq("user_id", session.userId).maybeSingle();
  const { data: leaders } = await supabase
    .from("volunteer_points")
    .select("user_id, points, badges, users(full_name)")
    .order("points", { ascending: false })
    .limit(10);
  return NextResponse.json({ me: data || { points: 0, badges: [] }, leaders: leaders || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const { user_id, points, reason } = await request.json();
  if (!user_id || !points) return NextResponse.json({ error: "user_id and points required" }, { status: 400 });
  const supabase = createAdminClient();
  const pts = Math.min(Math.max(parseInt(points, 10) || 0, 1), 100);
  const { data: existing } = await supabase.from("volunteer_points").select("*").eq("user_id", user_id).maybeSingle();
  const newPoints = (existing?.points || 0) + pts;
  const badges = new Set<string>(existing?.badges || []);
  BADGE_THRESHOLDS.forEach((b) => { if (newPoints >= b.at) badges.add(b.badge); });
  const { error } = await supabase.from("volunteer_points").upsert({
    user_id, points: newPoints, badges: Array.from(badges), updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("volunteer_point_log").insert({ user_id, points: pts, reason: reason || "Manual award", awarded_by: session.userId });
  return NextResponse.json({ success: true, points: newPoints, badges: Array.from(badges) });
}

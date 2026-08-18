import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const BADGE_THRESHOLDS = [
  { at: 10, badge: "Sevak" },
  { at: 50, badge: "Karyakarta" },
  { at: 100, badge: "Senani" },
  { at: 250, badge: "Gaurav" },
];

async function readPointsFallback(supabase: any, userId: string) {
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", `volunteer_points:${userId}`)
    .maybeSingle();
  const v = data?.setting_value;
  if (v && typeof v === "object") {
    return {
      user_id: userId,
      points: Number(v.points) || 0,
      badges: Array.isArray(v.badges) ? v.badges : [],
    };
  }
  return null;
}

async function writePointsFallback(
  supabase: any,
  userId: string,
  points: number,
  badges: string[]
) {
  await supabase.from("app_settings").upsert(
    {
      setting_key: `volunteer_points:${userId}`,
      setting_value: { points, badges, updated_at: new Date().toISOString() },
    },
    { onConflict: "setting_key" }
  );
}

async function appendAwardLog(
  supabase: any,
  entry: {
    user_id: string;
    awarded_by: string;
    points: number;
    reason: string;
  }
) {
  const row = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };
  try {
    await supabase.from("volunteer_point_log").insert({
      user_id: entry.user_id,
      points: entry.points,
      reason: entry.reason,
      awarded_by: entry.awarded_by,
    });
  } catch {
    /* table may not exist */
  }
  // Always keep a rolling log in app_settings
  const key = "volunteer_award_logs";
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .maybeSingle();
  const prev = Array.isArray(data?.setting_value) ? data.setting_value : [];
  const next = [row, ...prev].slice(0, 100);
  await supabase.from("app_settings").upsert(
    { setting_key: key, setting_value: next },
    { onConflict: "setting_key" }
  );
  return row;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();

  if (request.nextUrl.searchParams.get("users") === "1") {
    if (!STAFF_ROLES.includes(session.role as any)) {
      return NextResponse.json({ error: "Staff only" }, { status: 403 });
    }
    let q = supabase
      .from("users")
      .select("id, full_name, phone, role, native_village")
      .order("full_name")
      .limit(300);
    if (session.role !== "super_admin" && session.cityId) {
      q = q.eq("city_id", session.cityId);
    }
    const { data, error } = await q;
    if (error) return NextResponse.json({ users: [], error: error.message });
    return NextResponse.json({ users: data || [] });
  }

  let me: any = null;
  {
    const { data } = await supabase
      .from("volunteer_points")
      .select("*")
      .eq("user_id", session.userId)
      .maybeSingle();
    me = data;
  }
  if (!me) {
    me = await readPointsFallback(supabase, session.userId);
  }

  let leaders: any[] = [];
  const { data: leadersRaw, error: leadErr } = await supabase
    .from("volunteer_points")
    .select("user_id, points, badges")
    .order("points", { ascending: false })
    .limit(10);

  if (!leadErr && leadersRaw?.length) {
    const ids = leadersRaw.map((l) => l.user_id);
    const { data: names } = await supabase.from("users").select("id, full_name").in("id", ids);
    const map: Record<string, string> = {};
    (names || []).forEach((u) => {
      map[u.id] = u.full_name;
    });
    leaders = leadersRaw.map((l) => ({
      ...l,
      full_name: map[l.user_id] || "Member",
      users: { full_name: map[l.user_id] || "Member" },
    }));
  } else {
    // Fallback leaders from app_settings keys
    const { data: rows } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .like("setting_key", "volunteer_points:%")
      .limit(20);
    const list = (rows || [])
      .map((r: any) => {
        const uid = String(r.setting_key || "").replace("volunteer_points:", "");
        const v = r.setting_value || {};
        return {
          user_id: uid,
          points: Number(v.points) || 0,
          badges: v.badges || [],
        };
      })
      .filter((x: any) => x.points > 0)
      .sort((a: any, b: any) => b.points - a.points)
      .slice(0, 15);
    if (list.length) {
      const ids = list.map((l: any) => l.user_id);
      const { data: names } = await supabase.from("users").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (names || []).forEach((u) => {
        map[u.id] = u.full_name;
      });
      leaders = list.map((l: any) => ({
        ...l,
        full_name: map[l.user_id] || "Member",
        users: { full_name: map[l.user_id] || "Member" },
      }));
    }
  }

  // Award logs (individual)
  let logs: any[] = [];
  {
    const { data: logRows } = await supabase
      .from("volunteer_point_log")
      .select("id, user_id, points, reason, awarded_by, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (logRows?.length) logs = logRows;
  }
  if (!logs.length) {
    const { data: sett } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "volunteer_award_logs")
      .maybeSingle();
    if (Array.isArray(sett?.setting_value)) logs = sett.setting_value.slice(0, 20);
  }
  if (logs.length) {
    const ids = Array.from(
      new Set(logs.flatMap((l) => [l.user_id, l.awarded_by]).filter(Boolean))
    ) as string[];
    const { data: names } = await supabase.from("users").select("id, full_name").in("id", ids);
    const map: Record<string, string> = {};
    (names || []).forEach((u) => {
      map[u.id] = u.full_name;
    });
    logs = logs.map((l) => ({
      ...l,
      recipient_name: map[l.user_id] || "Member",
      awarder_name: map[l.awarded_by] || "Staff",
    }));
  }

  return NextResponse.json({
    me: me || { points: 0, badges: [] },
    leaders,
    logs,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only — volunteer / core / super admin" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const user_id = body.user_id || body.userId;
  const points = body.points;
  const reason = body.reason || "Manual award";
  if (!user_id || points === undefined || points === null || points === "") {
    return NextResponse.json({ error: "Select member and points" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const pts = Math.min(Math.max(parseInt(String(points), 10) || 0, 1), 100);

  let existing: any = null;
  {
    const { data } = await supabase
      .from("volunteer_points")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();
    existing = data;
  }
  if (!existing) {
    existing = await readPointsFallback(supabase, user_id);
  }

  const newPoints = (existing?.points || 0) + pts;
  const badges = new Set<string>(
    Array.isArray(existing?.badges) ? existing.badges : []
  );
  BADGE_THRESHOLDS.forEach((b) => {
    if (newPoints >= b.at) badges.add(b.badge);
  });
  const badgeArr = Array.from(badges);

  let tableOk = false;
  if (existing && existing.user_id) {
    const { error } = await supabase
      .from("volunteer_points")
      .update({
        points: newPoints,
        badges: badgeArr,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);
    tableOk = !error;
    if (error) {
      const ins = await supabase.from("volunteer_points").insert({
        user_id,
        points: newPoints,
        badges: badgeArr,
      });
      tableOk = !ins.error;
    }
  } else {
    const { error } = await supabase.from("volunteer_points").insert({
      user_id,
      points: newPoints,
      badges: badgeArr,
    });
    tableOk = !error;
    if (error) {
      const up = await supabase.from("volunteer_points").upsert(
        { user_id, points: newPoints, badges: badgeArr },
        { onConflict: "user_id" }
      );
      tableOk = !up.error;
    }
  }

  // Always mirror to app_settings so awards work even without table
  try {
    await writePointsFallback(supabase, user_id, newPoints, badgeArr);
  } catch {
    if (!tableOk) {
      return NextResponse.json(
        { error: "Could not save points — check DB tables app_settings / volunteer_points" },
        { status: 500 }
      );
    }
  }

  try {
    await appendAwardLog(supabase, {
      user_id,
      awarded_by: session.userId,
      points: pts,
      reason: String(reason).slice(0, 200),
    });
  } catch {
    /* log best-effort */
  }

  try {
    const { writeAuditLog } = await import("@/lib/audit");
    await writeAuditLog({
      actorId: session.userId,
      action: "award_points",
      targetId: user_id,
      meta: { points: pts, reason, total: newPoints },
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ success: true, points: newPoints, badges: badgeArr });
}

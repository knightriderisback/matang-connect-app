/** LOCKED B1 — ride poster profile join. */
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();

  let q = supabase
    .from("rides")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Prefer active rides when column exists
  try {
    q = supabase
      .from("rides")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);
  } catch {
    /* ignore */
  }

  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`city_id.eq.${session.cityId},city_id.is.null`);
  }

  const { data, error } = await q;
  if (error) {
    // Fallback without is_active filter
    const { data: d2, error: e2 } = await supabase
      .from("rides")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (e2) return NextResponse.json({ rides: [], error: e2.message });
    return NextResponse.json({ rides: await attachPosters(supabase, d2 || []) });
  }

  return NextResponse.json({ rides: await attachPosters(supabase, data || []) });
}

async function attachPosters(supabase: ReturnType<typeof createAdminClient>, rides: any[]) {
  const ids = Array.from(
    new Set(
      rides
        .map((r) => r.poster_id || r.posted_by || r.created_by || r.user_id)
        .filter(Boolean)
    )
  ) as string[];
  if (!ids.length) return rides.map((r) => ({ ...r, poster_name: null, poster_id: null }));

  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, role, qr_code_id")
    .in("id", ids);

  const map: Record<string, any> = {};
  (users || []).forEach((u) => {
    map[u.id] = u;
  });

  return rides.map((r) => {
    const pid = r.poster_id || r.posted_by || r.created_by || r.user_id || null;
    const u = pid ? map[pid] : null;
    return {
      ...r,
      poster_id: pid,
      poster_name: u?.full_name || null,
      poster_role: u?.role || null,
      poster_qr: u?.qr_code_id || null,
    };
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();
  if (!body.from_place || !body.to_place) {
    return NextResponse.json({ error: "From and To required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {
    from_place: body.from_place,
    to_place: body.to_place,
    ride_type: body.ride_type || "offer",
    ride_date: body.ride_date || null,
    ride_time: body.ride_time || null,
    seats: body.seats || 1,
    contact_phone: body.contact_phone || null,
    notes: body.notes || null,
    city_id: session.cityId || null,
    poster_id: session.userId,
    is_active: true,
  };
  const { data, error } = await supabase.from("rides").insert(row).select().single();
  if (error) {
    // Retry without is_active if column missing
    delete row.is_active;
    const r2 = await supabase.from("rides").insert(row).select().single();
    if (r2.error) return NextResponse.json({ error: r2.error.message }, { status: 500 });
    return NextResponse.json({ success: true, ride: r2.data });
  }
  return NextResponse.json({ success: true, ride: data });
}

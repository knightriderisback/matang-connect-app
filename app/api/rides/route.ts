import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase.from("rides").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(50);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`city_id.eq.${session.cityId},city_id.is.null`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ rides: [], error: error.message });
  return NextResponse.json({ rides: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();
  if (!body.from_place || !body.to_place) {
    return NextResponse.json({ error: "From and To required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("rides").insert({
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
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, ride: data });
}

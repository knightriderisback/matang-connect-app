import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  // Upcoming + recent festivals (last 30 days to next 90 days)
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();
  to.setDate(to.getDate() + 90);
  let q = supabase
    .from("festivals")
    .select("id, title, description, festival_date, is_recurring, city_id, created_at")
    .gte("festival_date", from.toISOString().slice(0, 10))
    .lte("festival_date", to.toISOString().slice(0, 10))
    .order("festival_date", { ascending: true })
    .limit(50);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`city_id.is.null,city_id.eq.${session.cityId}`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ festivals: [], error: error.message });
  return NextResponse.json({ festivals: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json();
  if (!body.title || !body.festival_date) {
    return NextResponse.json({ error: "Title and date required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("festivals")
    .insert({
      title: body.title,
      description: body.description || null,
      festival_date: body.festival_date,
      is_recurring: body.is_recurring !== false,
      city_id: body.is_global ? null : session.cityId || null,
      created_by: session.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, festival: data });
}

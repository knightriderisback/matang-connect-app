import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase.from("jobs").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(50);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`city_id.eq.${session.cityId},city_id.is.null`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ jobs: [], error: error.message });
  return NextResponse.json({ jobs: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("jobs").insert({
    title: body.title,
    description: body.description || null,
    location: body.location || null,
    contact_phone: body.contact_phone || null,
    salary_range: body.salary_range || null,
    city_id: session.cityId || null,
    created_by: session.userId,
    is_active: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, job: data });
}

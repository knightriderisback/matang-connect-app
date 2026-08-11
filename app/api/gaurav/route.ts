import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase.from("gaurav_posts").select("*").order("created_at", { ascending: false }).limit(30);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`is_global.eq.true,city_id.eq.${session.cityId}`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ posts: [], error: error.message });
  return NextResponse.json({ posts: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json();
  if (!body.title || !body.body) return NextResponse.json({ error: "Title and body required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("gaurav_posts").insert({
    title: body.title,
    body: body.body,
    month_label: body.month_label || null,
    city_id: session.cityId || null,
    is_global: !!body.is_global && session.role === "super_admin",
    created_by: session.userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, post: data });
}

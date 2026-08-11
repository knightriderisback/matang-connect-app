import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase
    .from("mahila_posts")
    .select("id, title, body, post_type, event_date, contact_phone, is_global, city_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
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
  if (!body.title || !body.body) {
    return NextResponse.json({ error: "Title and body required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("mahila_posts")
    .insert({
      title: body.title,
      body: body.body,
      post_type: body.post_type || "resource",
      event_date: body.event_date || null,
      contact_phone: body.contact_phone || null,
      is_global: !!body.is_global && session.role === "super_admin",
      city_id: session.cityId || null,
      created_by: session.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "mahila_create",
    target_id: data.id,
  });
  return NextResponse.json({ success: true, post: data });
}

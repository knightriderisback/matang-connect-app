import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase
    .from("arthik_schemes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`is_global.eq.true,city_id.eq.${session.cityId}`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ schemes: [], error: error.message });
  return NextResponse.json({ schemes: data || [] });
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
    .from("arthik_schemes")
    .insert({
      title: body.title,
      body: body.body,
      category: body.category || "scheme",
      contact_phone: body.contact_phone || null,
      link_url: body.link_url || null,
      city_id: session.cityId || null,
      is_global: !!body.is_global && session.role === "super_admin",
      created_by: session.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "arthik_create",
    target_id: data.id,
  });
  return NextResponse.json({ success: true, scheme: data });
}

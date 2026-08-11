import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const category = request.nextUrl.searchParams.get("category");
  const supabase = createAdminClient();
  let q = supabase
    .from("businesses")
    .select("id, name, category, description, address, contact_phone, whatsapp, photo_url, is_verified, city_id, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.eq("city_id", session.cityId);
  }
  if (category && category !== "all") {
    q = q.eq("category", category);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ businesses: [], error: error.message });
  return NextResponse.json({ businesses: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();
  if (!body.name || !body.category) {
    return NextResponse.json({ error: "Name and category required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      name: body.name,
      category: body.category,
      description: body.description || null,
      address: body.address || null,
      contact_phone: body.contact_phone || null,
      whatsapp: body.whatsapp || null,
      photo_url: body.photo_url || null,
      city_id: session.cityId || null,
      owner_id: session.userId,
      is_verified: STAFF_ROLES.includes(session.role as any),
      is_active: true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "business_create",
    target_id: data.id,
  });
  return NextResponse.json({ success: true, business: data });
}

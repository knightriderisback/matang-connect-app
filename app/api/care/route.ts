import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase.from("care_requests").select("*").order("created_at", { ascending: false }).limit(50);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.eq("city_id", session.cityId);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ requests: [], error: error.message });
  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();
  if (!body.title || !body.request_type) {
    return NextResponse.json({ error: "Title and type required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("care_requests").insert({
    title: body.title,
    description: body.description || null,
    request_type: body.request_type,
    contact_phone: body.contact_phone || null,
    location: body.location || null,
    urgency: body.urgency || "normal",
    status: "open",
    city_id: session.cityId || null,
    requester_id: session.userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("audit_logs").insert({ actor_id: session.userId, action: "care_request", target_id: data.id });
  return NextResponse.json({ success: true, request: data });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id, status } = await request.json();
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from("care_requests").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

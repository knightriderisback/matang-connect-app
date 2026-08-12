import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

const CARE_TYPES = ["medical", "elderly", "disability", "financial", "educational", "other"] as const;
const URGENCIES = ["low", "normal", "high", "emergency"] as const;
const STATUSES = ["open", "in_progress", "completed", "declined"] as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("care_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ requests: [], error: error.message });
  // Map for frontend compatibility
  const requests = (data || []).map((r: any) => ({
    ...r,
    title: r.notes || r.care_type || "Care request",
    request_type: r.care_type,
  }));
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();

  let care_type = String(body.care_type || body.request_type || "other").toLowerCase();
  // Map legacy aliases
  if (care_type === "elder") care_type = "elderly";
  if (care_type === "education") care_type = "educational";
  if (!CARE_TYPES.includes(care_type as any)) care_type = "other";

  let urgency = String(body.urgency || "normal").toLowerCase();
  if (urgency === "critical" || urgency === "urgent") urgency = "emergency";
  if (!URGENCIES.includes(urgency as any)) urgency = "normal";

  const description = body.description || body.title || null;
  if (!description) {
    return NextResponse.json({ error: "Description required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("care_requests")
    .insert({
      requester_id: session.userId,
      family_member_id: body.family_member_id || null,
      care_type,
      description,
      urgency,
      status: "open",
      notes: body.notes || body.title || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try {
    await supabase.from("audit_logs").insert({
      actor_id: session.userId,
      action: "care_request",
      target_id: data.id,
    });
  } catch {}
  return NextResponse.json({ success: true, request: data });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id, status, assigned_to, notes } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let nextStatus = status ? String(status).toLowerCase() : undefined;
  if (nextStatus === "closed") nextStatus = "completed";
  if (nextStatus && !STATUSES.includes(nextStatus as any)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (nextStatus) {
    update.status = nextStatus;
    if (nextStatus === "completed") update.completion_date = new Date().toISOString();
    if (nextStatus === "in_progress") update.assignment_date = new Date().toISOString();
  }
  if (assigned_to) {
    update.assigned_to = assigned_to;
    update.assignment_date = new Date().toISOString();
    if (!nextStatus) update.status = "in_progress";
  }
  if (notes !== undefined) update.notes = notes;

  const supabase = createAdminClient();
  // Staff can update any; members only own open requests
  let q = supabase.from("care_requests").update(update).eq("id", id);
  if (!STAFF_ROLES.includes(session.role as any)) {
    q = q.eq("requester_id", session.userId);
  }
  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

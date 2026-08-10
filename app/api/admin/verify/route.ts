import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("users")
    .select("id, full_name, phone, native_village, city_id, cities(name), created_at, verification_status")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  if (session.role === "core_committee" && session.cityId) {
    query = query.eq("city_id", session.cityId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { userId, status } = await request.json();
  if (!userId || !["verified", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (session.role === "core_committee") {
    const { data: target } = await supabase.from("users").select("city_id").eq("id", userId).single();
    if (!target || target.city_id !== session.cityId) {
      return NextResponse.json({ error: "Not authorized for this user's city" }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ verification_status: status, verified_by: session.userId, verified_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: status === "verified" ? "verified_user" : "rejected_user",
    target_id: userId,
  });

  return NextResponse.json({ success: true });
}

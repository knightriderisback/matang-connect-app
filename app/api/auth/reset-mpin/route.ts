import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Only staff can reset M-PIN" }, { status: 403 });
  }

  const body = await request.json();
  const userId = body.userId || body.user_id;
  const newMpin = String(body.newMpin || body.new_mpin || "");

  if (!userId || !/^\d{4}$/.test(newMpin)) {
    return NextResponse.json({ error: "userId and 4-digit newMpin required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (session.role === "core_committee") {
    const { data: target } = await supabase
      .from("users")
      .select("city_id")
      .eq("id", userId)
      .maybeSingle();
    if (!target || target.city_id !== session.cityId) {
      return NextResponse.json({ error: "Not authorized for this user" }, { status: 403 });
    }
  }

  const hash = await bcrypt.hash(newMpin, 10);
  const { data, error } = await supabase
    .from("users")
    .update({ m_pin_hash: hash })
    .eq("id", userId)
    .select("id, full_name")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Reset failed: " + error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await supabase.from("audit_logs").insert({
      actor_id: session.userId,
      action: "reset_mpin",
      target_id: userId,
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ success: true, user: data });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Only staff can reset M-PIN" }, { status: 403 });
  }

  const { userId, newMpin } = await request.json();
  if (!userId || !newMpin || !/^\d{4}$/.test(newMpin)) {
    return NextResponse.json({ error: "userId and 4-digit newMpin required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (session.role === "core_committee") {
    const { data: target } = await supabase.from("users").select("city_id").eq("id", userId).single();
    if (!target || target.city_id !== session.cityId) {
      return NextResponse.json({ error: "Not authorized for this user" }, { status: 403 });
    }
  }

  const { error } = await supabase.rpc("admin_reset_mpin", {
    p_user_id: userId,
    p_new_mpin: newMpin,
  });

  if (error) {
    console.error("reset mpin error:", error.message);
    return NextResponse.json({
      error: "Reset failed. Ensure admin_reset_mpin function exists in Supabase.",
      detail: error.message,
    }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "reset_mpin",
    target_id: userId,
  });

  return NextResponse.json({ success: true });
}

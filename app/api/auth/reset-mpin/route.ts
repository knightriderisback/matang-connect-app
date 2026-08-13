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

  // Core committee limited to same city
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

  // 1) Prefer DB RPC (pgcrypto crypt — same as login_with_mpin)
  const rpc = await supabase.rpc("admin_reset_mpin", {
    p_user_id: userId,
    p_new_mpin: newMpin,
  });

  if (!rpc.error) {
    try {
      await supabase.from("audit_logs").insert({
        actor_id: session.userId,
        action: "reset_mpin",
        target_id: userId,
      });
    } catch {
      /* non-fatal */
    }
    return NextResponse.json({ success: true, method: "rpc" });
  }

  console.warn("admin_reset_mpin RPC failed, trying direct hash:", rpc.error.message);

  // 2) Fallback: bcryptjs hash written to m_pin_hash (compatible with crypt bf)
  try {
    const hash = await bcrypt.hash(newMpin, 10);
    const { error: upErr } = await supabase
      .from("users")
      .update({
        m_pin_hash: hash,
        failed_mpin_attempts: 0,
        mpin_locked_until: null,
      })
      .eq("id", userId);

    if (upErr) {
      return NextResponse.json(
        {
          error: "Reset failed",
          detail: upErr.message,
          rpc: rpc.error.message,
        },
        { status: 500 }
      );
    }

    try {
      await supabase.from("audit_logs").insert({
        actor_id: session.userId,
        action: "reset_mpin",
        target_id: userId,
      });
    } catch {
      /* non-fatal */
    }
    return NextResponse.json({ success: true, method: "direct" });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Reset failed", detail: e?.message || rpc.error.message },
      { status: 500 }
    );
  }
}

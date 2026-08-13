import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { currentMpin, newMpin } = await request.json();
  if (!/^\d{4}$/.test(String(currentMpin || "")) || !/^\d{4}$/.test(String(newMpin || ""))) {
    return NextResponse.json({ error: "Both current and new M-PIN must be 4 digits" }, { status: 400 });
  }
  if (currentMpin === newMpin) {
    return NextResponse.json({ error: "New M-PIN must be different" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data: me } = await supabase.from("users").select("phone").eq("id", session.userId).maybeSingle();
  if (!me?.phone) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { data: loginData, error: loginErr } = await supabase.rpc("login_with_mpin", {
    p_phone: me.phone,
    p_mpin: currentMpin,
  });
  if (loginErr || !loginData || (Array.isArray(loginData) && loginData.length === 0)) {
    return NextResponse.json({ error: "Current M-PIN is incorrect" }, { status: 403 });
  }
  const rpc = await supabase.rpc("admin_reset_mpin", {
    p_user_id: session.userId,
    p_new_mpin: newMpin,
  });
  if (rpc.error) {
    const hash = await bcrypt.hash(String(newMpin), 10);
    const { error } = await supabase
      .from("users")
      .update({ m_pin_hash: hash, failed_mpin_attempts: 0, mpin_locked_until: null })
      .eq("id", session.userId);
    if (error) return NextResponse.json({ error: "Could not update M-PIN: " + error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}


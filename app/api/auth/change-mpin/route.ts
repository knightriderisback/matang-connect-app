import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";

/** Any logged-in user can change their own M-PIN */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const currentMpin = String(body.currentMpin || body.current_mpin || "");
  const newMpin = String(body.newMpin || body.new_mpin || "");
  const confirmMpin = String(body.confirmMpin || body.confirm_mpin || newMpin);

  if (!/^\d{4}$/.test(currentMpin) || !/^\d{4}$/.test(newMpin)) {
    return NextResponse.json(
      { error: "Current and new M-PIN must be exactly 4 digits" },
      { status: 400 }
    );
  }
  if (newMpin !== confirmMpin) {
    return NextResponse.json({ error: "New M-PIN and confirm do not match" }, { status: 400 });
  }
  if (currentMpin === newMpin) {
    return NextResponse.json({ error: "New M-PIN must be different" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("id, m_pin_hash")
    .eq("id", session.userId)
    .maybeSingle();

  if (meErr || !me) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let ok = false;
  try {
    ok = await bcrypt.compare(currentMpin, me.m_pin_hash || "");
  } catch {
    ok = false;
  }

  if (!ok) {
    return NextResponse.json({ error: "Current M-PIN is incorrect" }, { status: 403 });
  }

  const hash = await bcrypt.hash(newMpin, 10);
  const { error } = await supabase
    .from("users")
    .update({ m_pin_hash: hash })
    .eq("id", session.userId);

  if (error) {
    return NextResponse.json({ error: "Could not update M-PIN: " + error.message }, { status: 500 });
  }

  await writeAuditLog({
    actorId: session.userId,
    action: "change_own_mpin",
    targetId: session.userId,
  });

  return NextResponse.json({ success: true, message: "M-PIN updated. Use the new PIN on next login." });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";
import { resetAccountLockout } from "@/lib/auth/rateLimit";

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

  if (userId === session.userId) {
    return NextResponse.json(
      { error: "Use change-mpin to change your own M-PIN" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (session.role !== "super_admin") {
    if (!session.cityId) {
      return NextResponse.json(
        { error: "Staff must have an assigned city to reset member M-PIN" },
        { status: 403 }
      );
    }

    const { data: target, error: targetErr } = await supabase
      .from("users")
      .select("id, role, city_id")
      .eq("id", userId)
      .maybeSingle();

    if (targetErr || !target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.city_id !== session.cityId) {
      return NextResponse.json({ error: "Not authorized for this user's city" }, { status: 403 });
    }

    if (session.role === "core_committee") {
      if (target.role === "super_admin" || target.role === "core_committee") {
        return NextResponse.json(
          { error: "Core Committee cannot reset M-PIN for committee or super admin accounts" },
          { status: 403 }
        );
      }
    } else if (session.role === "volunteer") {
      if (target.role !== "normal") {
        return NextResponse.json(
          { error: "Volunteers can only reset M-PIN for regular members" },
          { status: 403 }
        );
      }
    }
  }

  const hash = await bcrypt.hash(newMpin, 10);
  let updatedUser = null;
  const { data, error } = await supabase
    .from("users")
    .update({ m_pin_hash: hash, failed_mpin_attempts: 0, mpin_locked_until: null })
    .eq("id", userId)
    .select("id, full_name")
    .maybeSingle();

  if (error) {
    const fallback = await supabase
      .from("users")
      .update({ m_pin_hash: hash })
      .eq("id", userId)
      .select("id, full_name")
      .maybeSingle();
    if (fallback.error) {
      return NextResponse.json({ error: "Reset failed: " + fallback.error.message }, { status: 500 });
    }
    updatedUser = fallback.data;
  } else {
    updatedUser = data;
  }

  if (!updatedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await resetAccountLockout(supabase, userId);

  await writeAuditLog({ actorId: session.userId, action: "reset_mpin", targetId: userId });

  return NextResponse.json({ success: true, user: updatedUser });
}

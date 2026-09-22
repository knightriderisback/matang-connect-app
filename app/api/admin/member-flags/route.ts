import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULTS } from "@/lib/featureFlags";
import {
  getUserEffectiveFeatures,
  setUserFeatureOverride,
  resetAllUserOverrides,
  getUserVisibleModules,
  type RoleCol,
} from "@/lib/featureRoleMatrix";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select(
      "id, full_name, phone, role, native_village, verification_status, qr_code_id, photo_url, gender, blood_group, education_level, occupation, about, address, city_id, created_at, cities(name)"
    )
    .eq("id", userId)
    .maybeSingle();

  const { data: fam } = await supabase
    .from("families")
    .select(
      "id, address, education_summary, employment_status, needs, family_members(name, relation, age, gender, occupation, education_level, blood_group)"
    )
    .eq("head_of_family", userId)
    .limit(1);

  const effData = await getUserEffectiveFeatures(userId, user?.role);

  return NextResponse.json({
    user,
    family: fam?.[0] || null,
    overrides: effData.overrides,
    effective: effData.effective,
    categoryDefaults: effData.categoryDefaults,
    matrix: effData.matrix,
    roleCol: effData.roleCol,
    defaults: DEFAULTS,
    canEdit: session.role === "super_admin",
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  // Personal overrides can strictly only be modified by Super Admin
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string;
  const key = body.key as string;
  const value = body.value; // boolean or null (null = revert to inherit)
  const action = body.action as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("users").select("id, role").eq("id", userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (action === "reset_all") {
    const res = await resetAllUserOverrides(userId);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
    const eff = await getUserEffectiveFeatures(userId, target.role);
    try {
      await writeAuditLog({
        actorId: session.userId,
        action: "reset_member_feature_overrides",
        meta: { userId },
      });
    } catch {
      /* ignore */
    }
    return NextResponse.json({ success: true, overrides: eff.overrides, effective: eff.effective });
  }

  if (!key || (typeof value !== "boolean" && value !== null)) {
    return NextResponse.json({ error: "userId, key, value (boolean or null) required" }, { status: 400 });
  }

  const result = await setUserFeatureOverride(userId, key, value);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Save failed" }, { status: 500 });
  }

  try {
    await writeAuditLog({
      actorId: session.userId,
      action: "feature_flag_override_personal",
      meta: { userId, key, value },
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ success: true, overrides: result.overrides, effective: result.effective });
}

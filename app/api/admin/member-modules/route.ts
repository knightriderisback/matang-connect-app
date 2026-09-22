import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
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
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, phone, role")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { matrix, overrides, categoryDefaults, effective, roleCol } =
    await getUserEffectiveFeatures(userId, user.role);
  const modules = await getUserVisibleModules(userId, user.role);

  return NextResponse.json({
    userId,
    user,
    modules,
    effective,
    overrides,
    categoryDefaults,
    roleCol,
    matrix,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string;
  const key = body.key as string;
  const view = body.view; // boolean or null (null = revert to inherit category default)
  const action = body.action as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Action: reset all overrides for this member back to category default
  if (action === "reset_all") {
    const res = await resetAllUserOverrides(userId);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
    const supabase = createAdminClient();
    const { data: target } = await supabase.from("users").select("id, role").eq("id", userId).maybeSingle();
    const eff = await getUserEffectiveFeatures(userId, target?.role);
    const modules = await getUserVisibleModules(userId, target?.role);
    try {
      await writeAuditLog({
        actorId: session.userId,
        action: "reset_member_feature_overrides",
        meta: { userId },
      });
    } catch {
      /* ignore */
    }
    return NextResponse.json({ success: true, effective: eff.effective, overrides: eff.overrides, modules });
  }

  if (!key || (typeof view !== "boolean" && view !== null)) {
    return NextResponse.json({ error: "key and view (boolean or null) required" }, { status: 400 });
  }

  const result = await setUserFeatureOverride(userId, key, view);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to update" }, { status: 500 });
  }

  try {
    await writeAuditLog({
      actorId: session.userId,
      action: "set_member_feature_access",
      meta: { userId, key, view },
    });
  } catch {
    /* ignore */
  }

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("users").select("id, role").eq("id", userId).maybeSingle();
  const eff = await getUserEffectiveFeatures(userId, target?.role);
  const modules = await getUserVisibleModules(userId, target?.role);

  return NextResponse.json({
    success: true,
    effective: eff.effective,
    overrides: eff.overrides,
    categoryDefaults: eff.categoryDefaults,
    modules,
  });
}

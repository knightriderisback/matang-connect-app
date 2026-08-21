import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_KEYS, normalizeModuleList } from "@/lib/moduleKeys";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Committee / Super Admin only" }, { status: 403 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_effective_modules_for_user", {
    p_caller_id: session.userId,
    p_target_user_id: userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let modules = normalizeModuleList(data);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    modules = normalizeModuleList((data as any).modules ?? data);
  }

  const effective: Record<string, boolean> = {};
  for (const k of MODULE_KEYS) {
    effective[k] = modules.includes(k);
  }

  return NextResponse.json({ userId, modules, effective });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Committee / Super Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string;
  const key = body.key as string;
  const view = body.view;

  if (!userId || !key || typeof view !== "boolean") {
    return NextResponse.json({ error: "userId, key, view required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("set_module_access_for_user", {
    p_caller_id: session.userId,
    p_user_id: userId,
    p_module_key: key,
    p_visible: view,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await writeAuditLog({
      actorId: session.userId,
      action: "set_module_access_for_user",
      meta: { userId, key, view },
    });
  } catch {
    /* ignore */
  }

  // Refresh effective
  const { data: eff, error: effErr } = await supabase.rpc("get_effective_modules_for_user", {
    p_caller_id: session.userId,
    p_target_user_id: userId,
  });
  if (effErr) {
    return NextResponse.json({ success: true, data, error_refresh: effErr.message });
  }

  let modules = normalizeModuleList(eff);
  if (eff && typeof eff === "object" && !Array.isArray(eff)) {
    modules = normalizeModuleList((eff as any).modules ?? eff);
  }
  const effective: Record<string, boolean> = {};
  for (const k of MODULE_KEYS) {
    effective[k] = modules.includes(k);
  }

  return NextResponse.json({ success: true, data, modules, effective });
}

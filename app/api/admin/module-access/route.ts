import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_KEYS, normalizeModuleList } from "@/lib/moduleKeys";
import { writeAuditLog } from "@/lib/audit";

type RoleCol = "member" | "volunteer" | "core";

async function fetchRoleModules(
  supabase: ReturnType<typeof createAdminClient>,
  callerId: string,
  role: RoleCol
): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_modules_for_role", {
    p_caller_id: callerId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
  // May return full matrix rows with visible flags
  if (Array.isArray(data) && data.length && typeof data[0] === "object" && data[0] !== null) {
    const visible = data
      .filter((r: any) => r.visible === true || r.visible === "true")
      .map((r: any) => String(r.module_key || r.module || ""))
      .filter(Boolean);
    if (visible.length || data.some((r: any) => "visible" in (r || {}))) return visible;
  }
  return normalizeModuleList(data);
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const supabase = createAdminClient();
  try {
    const [member, volunteer, core] = await Promise.all([
      fetchRoleModules(supabase, session.userId, "member"),
      fetchRoleModules(supabase, session.userId, "volunteer"),
      fetchRoleModules(supabase, session.userId, "core"),
    ]);

    // Build visibility map for UI: key → { member, volunteer, core }
    const matrix: Record<string, { member: boolean; volunteer: boolean; core: boolean }> = {};
    for (const key of MODULE_KEYS) {
      matrix[key] = {
        member: member.includes(key),
        volunteer: volunteer.includes(key),
        core: core.includes(key),
      };
    }

    return NextResponse.json({
      lists: { member, volunteer, core },
      matrix,
      keys: MODULE_KEYS,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const key = body.key as string;
  const role = body.role as RoleCol;
  const view = body.view;

  if (!key || !["member", "volunteer", "core"].includes(role) || typeof view !== "boolean") {
    return NextResponse.json({ error: "key, role (member|volunteer|core), view boolean required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("set_module_access", {
    p_caller_id: session.userId,
    p_module_key: key,
    p_role: role,
    p_visible: view,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await writeAuditLog({
      actorId: session.userId,
      action: "set_module_access",
      meta: { key, role, view },
    });
  } catch {
    /* ignore */
  }

  // Return refreshed matrix
  try {
    const [member, volunteer, core] = await Promise.all([
      fetchRoleModules(supabase, session.userId, "member"),
      fetchRoleModules(supabase, session.userId, "volunteer"),
      fetchRoleModules(supabase, session.userId, "core"),
    ]);
    const matrix: Record<string, { member: boolean; volunteer: boolean; core: boolean }> = {};
    for (const k of MODULE_KEYS) {
      matrix[k] = {
        member: member.includes(k),
        volunteer: volunteer.includes(k),
        core: core.includes(k),
      };
    }
    return NextResponse.json({ success: true, data, lists: { member, volunteer, core }, matrix });
  } catch {
    return NextResponse.json({ success: true, data });
  }
}

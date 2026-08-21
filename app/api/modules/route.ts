import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_KEYS, normalizeModuleList } from "@/lib/moduleKeys";

function roleCol(role?: string | null): "member" | "volunteer" | "core" | "super_admin" {
  if (role === "super_admin") return "super_admin";
  if (role === "core_committee") return "core";
  if (role === "volunteer") return "volunteer";
  return "member"; // normal and anything else
}

/** Direct table read — reliable fallback if RPC shape is wrong / empty */
async function modulesFromTables(
  userId: string,
  role: string | null | undefined
): Promise<string[]> {
  const supabase = createAdminClient();
  const col = roleCol(role);

  if (col === "super_admin") return [...MODULE_KEYS];

  // Role-level visible modules
  const { data: roleRows, error: roleErr } = await supabase
    .from("module_role_access")
    .select("module_key, visible")
    .eq("role", col)
    .eq("visible", true);

  if (roleErr) {
    console.error("module_role_access", roleErr.message);
  }

  let set = new Set<string>(
    (roleRows || [])
      .map((r: any) => String(r.module_key || ""))
      .filter(Boolean)
  );

  // If no rows at all for this role, don't assume empty product — seed-like default all MODULE_KEYS
  // (only when table truly has zero visible rows AND zero rows for role)
  if (!roleErr && (!roleRows || roleRows.length === 0)) {
    const { count } = await supabase
      .from("module_role_access")
      .select("module_key", { count: "exact", head: true })
      .eq("role", col);
    if (!count) {
      // table empty for role — default all on so Services isn't blank
      set = new Set(MODULE_KEYS);
    }
  }

  // Personal overrides
  const { data: userRows, error: userErr } = await supabase
    .from("module_user_access")
    .select("module_key, visible")
    .eq("user_id", userId);

  if (userErr) {
    console.error("module_user_access", userErr.message);
  }

  for (const r of userRows || []) {
    const k = String((r as any).module_key || "");
    if (!k) continue;
    if ((r as any).visible === true) set.add(k);
    if ((r as any).visible === false) set.delete(k);
  }

  return Array.from(set);
}

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();
  let modules: string[] = [];
  let source: "rpc" | "tables" | "default" = "rpc";
  let rpcError: string | null = null;

  // 1) Try RPC
  try {
    const { data, error } = await supabase.rpc("get_my_modules", {
      p_user_id: session.userId,
    });
    if (error) {
      rpcError = error.message;
    } else {
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const o = data as any;
        modules = normalizeModuleList(o.modules ?? o.module_keys ?? o.keys ?? data);
      } else {
        modules = normalizeModuleList(data);
      }
    }
  } catch (e: any) {
    rpcError = e?.message || "rpc failed";
  }

  // 2) Fallback / merge: if RPC empty or failed, use tables
  if (modules.length === 0) {
    try {
      modules = await modulesFromTables(session.userId, session.role);
      source = rpcError ? "tables" : "tables";
    } catch (e: any) {
      rpcError = rpcError || e?.message;
      if (session.role === "super_admin") {
        modules = [...MODULE_KEYS];
        source = "default";
      }
    }
  }

  if (session.role === "super_admin") {
    modules = [...MODULE_KEYS];
    source = "default";
  }

  return NextResponse.json(
    {
      role: session.role,
      modules,
      source,
      rpcError,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeModuleList } from "@/lib/moduleKeys";

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_my_modules", {
    p_caller_id: session.userId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message, role: session.role, modules: null },
      { status: 500 }
    );
  }

  let role = session.role;
  let modules: string[] = [];

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const o = data as any;
    if (o.role) role = o.role;
    modules = normalizeModuleList(o.modules ?? o.module_keys ?? data);
  } else {
    modules = normalizeModuleList(data);
  }

  // Super admin: always all (belt and suspenders if RPC already does this)
  if (session.role === "super_admin" && modules.length === 0) {
    const { MODULE_KEYS } = await import("@/lib/moduleKeys");
    modules = [...MODULE_KEYS];
  }

  return NextResponse.json(
    { role, modules },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

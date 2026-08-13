import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const supabase = createAdminClient();

  // Try widest select first, then narrow
  const attempts = [
    "id, actor_id, action, target_id, meta, metadata, created_at",
    "id, actor_id, action, target_id, metadata, created_at",
    "id, actor_id, action, target_id, meta, created_at",
    "id, actor_id, action, created_at",
    "id, action, created_at",
    "*",
  ];

  let logs: any[] = [];
  let lastError = "";

  for (const cols of attempts) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select(cols)
      .order("created_at", { ascending: false })
      .limit(150);
    if (!error) {
      logs = (data || []).map((r: any) => ({
        id: r.id,
        actor_id: r.actor_id,
        action: r.action,
        target_id: r.target_id,
        meta: r.meta ?? r.metadata ?? null,
        created_at: r.created_at,
      }));
      break;
    }
    lastError = error.message;
  }

  // Resolve actor names when possible
  const actorIds = Array.from(
    new Set(logs.map((l) => l.actor_id).filter(Boolean))
  ) as string[];
  let nameMap: Record<string, string> = {};
  if (actorIds.length) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", actorIds.slice(0, 100));
    (users || []).forEach((u: any) => {
      nameMap[u.id] = u.full_name;
    });
  }

  logs = logs.map((l) => ({
    ...l,
    actor_name: l.actor_id ? nameMap[l.actor_id] || l.actor_id.slice(0, 8) : "—",
  }));

  return NextResponse.json({
    logs,
    error: logs.length ? undefined : lastError || undefined,
  });
}

/** Super Admin can write a test audit entry */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const ok = await writeAuditLog({
    actorId: session.userId,
    action: "audit_test",
    meta: { source: "admin_ui", at: new Date().toISOString() },
  });
  return NextResponse.json({ success: ok });
}

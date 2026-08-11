import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const supabase = createAdminClient();
  // Prefer meta; fall back to metadata for legacy rows
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_id, meta, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    // Fallback if metadata column missing
    const retry = await supabase
      .from("audit_logs")
      .select("id, actor_id, action, target_id, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (retry.error) return NextResponse.json({ logs: [], error: retry.error.message });
    return NextResponse.json({
      logs: (retry.data || []).map((r: any) => ({
        ...r,
        meta: r.meta ?? null,
      })),
    });
  }
  return NextResponse.json({
    logs: (data || []).map((r: any) => ({
      ...r,
      meta: r.meta ?? r.metadata ?? null,
    })),
  });
}

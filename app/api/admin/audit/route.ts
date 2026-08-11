import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_id, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ logs: [], error: error.message });
  return NextResponse.json({ logs: data || [] });
}

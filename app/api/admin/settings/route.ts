import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsAdmin } from "@/lib/featureFlags";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const flags = await getFeatureFlagsAdmin();
  return NextResponse.json({ flags });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const { key, value } = await request.json();
  if (!key || typeof value !== "boolean") {
    return NextResponse.json({ error: "key and boolean value required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("app_settings").upsert({
    setting_key: key,
    setting_value: value,
    updated_by: session.userId,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("audit_logs").insert({ actor_id: session.userId, action: "feature_flag_toggle", meta: { key, value } });
  return NextResponse.json({ success: true });
}

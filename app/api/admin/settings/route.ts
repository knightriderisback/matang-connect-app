import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsAdmin } from "@/lib/featureFlags";
import { writeAuditLog } from "@/lib/audit";

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
  const body = await request.json();
  const key = body.key;
  const value = body.value;
  if (!key || typeof value !== "boolean") {
    return NextResponse.json({ error: "key and boolean value required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Always replace rows for this key (handles missing UNIQUE + jsonb/text)
  await supabase.from("app_settings").delete().eq("setting_key", key);

  const payload = {
    setting_key: key,
    setting_value: value, // boolean true/false in jsonb
    updated_by: session.userId,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase.from("app_settings").insert(payload);

  // text-column schemas sometimes need stringified json
  if (error) {
    const payload2 = {
      ...payload,
      setting_value: value ? "true" : "false",
    };
    ({ error } = await supabase.from("app_settings").insert(payload2 as any));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({ actorId: session.userId, action: "feature_flag_toggle", meta: { key, value } });

  // Return fresh flags so UI can sync
  const flags = await getFeatureFlagsAdmin();
  return NextResponse.json({ success: true, flags });
}

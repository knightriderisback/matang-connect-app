import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";

function memberKey(userId: string) {
  return `member_flags:${userId}`;
}

function coerceBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select(
      "id, full_name, phone, role, native_village, verification_status, qr_code_id, photo_url, gender, blood_group, education_level, occupation, about, address, city_id, created_at, cities(name)"
    )
    .eq("id", userId)
    .maybeSingle();

  const { data: fam } = await supabase
    .from("families")
    .select("id, address, education_summary, employment_status, needs, family_members(name, relation, age, gender, occupation, education_level, blood_group)")
    .eq("head_of_family", userId)
    .limit(1);

  const { data: row } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", memberKey(userId))
    .maybeSingle();

  let overrides: Record<string, boolean> = {};
  const raw = row?.setting_value;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
      const b = coerceBool(v);
      if (b !== undefined) overrides[k] = b;
    });
  }

  return NextResponse.json({
    user,
    family: fam?.[0] || null,
    overrides,
    defaults: DEFAULTS,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Committee / Super Admin only" }, { status: 403 });
  }
  const { userId, key, value } = await request.json();
  if (!userId || !key || typeof value !== "boolean") {
    return NextResponse.json({ error: "userId, key, boolean value required" }, { status: 400 });
  }
  if (!(key in DEFAULTS)) {
    return NextResponse.json({ error: "Unknown flag key" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const sk = memberKey(userId);
  const { data: existing } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", sk)
    .maybeSingle();

  const current: Record<string, boolean> =
    existing?.setting_value && typeof existing.setting_value === "object"
      ? { ...(existing.setting_value as Record<string, boolean>) }
      : {};
  current[key] = value;

  const payload = {
    setting_key: sk,
    setting_value: current,
    updated_by: session.userId,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase.from("app_settings").upsert(payload, { onConflict: "setting_key" });
  if (error) {
    await supabase.from("app_settings").delete().eq("setting_key", sk);
    ({ error } = await supabase.from("app_settings").insert(payload));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, overrides: current });
}

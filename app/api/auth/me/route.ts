import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

/** Live users core columns from 001 schema + optional profile extras */
const CORE =
  "id, full_name, phone, role, city_id, native_village, verification_status, qr_code_id, created_at";
const WITH_CITY = `${CORE}, cities(name)`;
const EXTENDED = `${CORE}, photo_url, gender, blood_group, education_level, occupation, about, address, title, cities(name)`;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1) Prefer extended profile columns
  let { data: user, error } = await supabase
    .from("users")
    .select(EXTENDED)
    .eq("id", session.userId)
    .maybeSingle();

  // 2) Core + city join
  if (error || !user) {
    ({ data: user, error } = await supabase
      .from("users")
      .select(WITH_CITY)
      .eq("id", session.userId)
      .maybeSingle());
  }

  // 3) Absolute core only
  if (error || !user) {
    ({ data: user, error } = await supabase
      .from("users")
      .select(CORE)
      .eq("id", session.userId)
      .maybeSingle());
  }


  if (!user) {
    // Session valid but DB row missing — still return session-based stub so UI works
    return NextResponse.json({
      user: {
        id: session.userId,
        full_name: session.fullName,
        phone: "",
        role: session.role,
        city_id: session.cityId,
        native_village: "",
        verification_status: "pending",
        qr_code_id: null,
        created_at: new Date().toISOString(),
        cities: null,
      },
      warning: "profile_row_missing",
    });
  }

  // Merge profile_extra (includes photo_url if column absent on users)
  try {
    const { data: extraRow } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", `profile_extra:${session.userId}`)
      .maybeSingle();
    if (extraRow?.setting_value && typeof extraRow.setting_value === "object") {
      const extra = extraRow.setting_value as Record<string, unknown>;
      user = { ...user, ...extra };
      // Prefer non-empty photo
      if (!user.photo_url && extra.photo_url) user.photo_url = extra.photo_url;
    }
  } catch {
    /* ignore */
  }

  // Last try: photo_url column only
  if (user && !user.photo_url) {
    try {
      const { data: ph } = await supabase
        .from("users")
        .select("photo_url")
        .eq("id", session.userId)
        .maybeSingle();
      if (ph?.photo_url) user.photo_url = ph.photo_url;
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ user });
}

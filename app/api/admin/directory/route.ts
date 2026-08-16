import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const all = request.nextUrl.searchParams.get("all") === "1" || session.role === "super_admin";

  const fullSelect =
    "id, full_name, phone, native_village, role, qr_code_id, verification_status, city_id, photo_url, gender, blood_group, education_level, occupation, about, address, cities(name), families(education_summary, employment_status, address, needs, family_members(name, relation, age, blood_group, occupation))";

  let query = supabase
    .from("users")
    .select(fullSelect)
    .order("full_name", { ascending: true })
    .limit(500);

  if (!all) {
    query = query.eq("verification_status", "verified");
  }
  if (session.role !== "super_admin" && session.cityId) {
    query = query.eq("city_id", session.cityId);
  }

  let { data, error } = await query;

  if (error) {
    const fallback = await supabase
      .from("users")
      .select(
        "id, full_name, phone, native_village, role, verification_status, city_id, photo_url, cities(name), families(education_summary, employment_status, family_members(name, relation, age))"
      )
      .order("full_name", { ascending: true })
      .limit(500);
    data = fallback.data as any;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: "Could not load directory", detail: error.message }, { status: 500 });
  }

  // Merge profile_extra for gender/education etc.
  const users = data || [];
  try {
    const keys = users.map((u: any) => `profile_extra:${u.id}`);
    if (keys.length) {
      const { data: extras } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", keys.slice(0, 200));
      const map: Record<string, any> = {};
      (extras || []).forEach((row: any) => {
        const id = String(row.setting_key || "").replace("profile_extra:", "");
        if (id && row.setting_value && typeof row.setting_value === "object") {
          map[id] = row.setting_value;
        }
      });
      for (const u of users as any[]) {
        if (map[u.id]) Object.assign(u, map[u.id]);
      }
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ users });
}

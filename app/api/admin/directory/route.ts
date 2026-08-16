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

  let query = supabase
    .from("users")
    .select(
      "id, full_name, phone, native_village, role, qr_code_id, verification_status, city_id, photo_url, cities(name), families(education_summary, employment_status, address, needs, family_members(name, relation, age, blood_group, occupation))"
    )
    .order("full_name", { ascending: true })
    .limit(500);

  if (!all) {
    query = query.eq("verification_status", "verified");
  }
  if (session.role !== "super_admin" && session.cityId) {
    query = query.eq("city_id", session.cityId);
  }

  const { data, error } = await query;
  if (error) {
    const { data: d2, error: e2 } = await supabase
      .from("users")
      .select("id, full_name, phone, native_village, role, verification_status, city_id, cities(name)")
      .order("full_name", { ascending: true })
      .limit(500);
    if (e2) return NextResponse.json({ error: "Could not load directory" }, { status: 500 });
    return NextResponse.json({ users: d2 || [] });
  }
  return NextResponse.json({ users: data || [] });
}

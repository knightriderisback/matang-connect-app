import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export const TITLE_OPTIONS = [
  { key: "adhyaksh", label: "अध्यक्ष (Adhyaksh)" },
  { key: "sachiv", label: "सचिव (Sachiv)" },
  { key: "kosadhyaksh", label: "कोषाध्यक्ष (Kosadhyaksh)" },
  { key: "sah_adhyaksh", label: "सह-अध्यक्ष" },
  { key: "prachar_mantri", label: "प्रचार मंत्री" },
  { key: "yuvat_pramukh", label: "युवा प्रमुख" },
  { key: "mahila_pramukh", label: "महिला प्रमुख" },
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase.from("titles").select("id, city_id, title_key, title_label, user_id, assigned_at, users:user_id(full_name, phone)").order("title_key");
  if (session.role !== "super_admin" && session.cityId) {
    q = q.eq("city_id", session.cityId);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ titles: [], options: TITLE_OPTIONS, error: error.message });
  return NextResponse.json({ titles: data || [], options: TITLE_OPTIONS });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Committee / Super Admin only" }, { status: 403 });
  }
  const { title_key, title_label, user_id, city_id } = await request.json();
  if (!title_key || !user_id) return NextResponse.json({ error: "title_key and user_id required" }, { status: 400 });
  const cityId = city_id || session.cityId;
  if (!cityId) return NextResponse.json({ error: "city_id required" }, { status: 400 });
  const opt = TITLE_OPTIONS.find((o) => o.key === title_key);
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("titles").upsert({
    city_id: cityId,
    title_key,
    title_label: title_label || opt?.label || title_key,
    user_id,
    assigned_by: session.userId,
    assigned_at: new Date().toISOString(),
  }, { onConflict: "city_id,title_key" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("audit_logs").insert({ actor_id: session.userId, action: "title_assign", target_id: user_id, meta: { title_key, city_id: cityId } });
  return NextResponse.json({ success: true, title: data });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { error } = await supabase.from("titles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

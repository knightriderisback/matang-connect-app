import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createAdminClient();
  let { data: member, error } = await supabase
    .from("users")
    .select(
      "id, full_name, phone, native_village, verification_status, role, qr_code_id, photo_url, gender, blood_group, education_level, occupation, about, address, title, city_id, cities(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    ({ data: member, error } = await supabase
      .from("users")
      .select(
        "id, full_name, phone, native_village, verification_status, role, qr_code_id, photo_url, city_id"
      )
      .eq("id", id)
      .maybeSingle());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  let extra: Record<string, unknown> = {};
  try {
    const { data: extraRow } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", `profile_extra:${id}`)
      .maybeSingle();
    if (extraRow?.setting_value && typeof extraRow.setting_value === "object") {
      extra = { ...(extraRow.setting_value as object) };
      member = { ...member, ...extra };
    }
  } catch {
    /* ignore */
  }

  const showPhone = extra.show_phone === true || (member as any).show_phone === true;
  const isSelf = session.userId === id;
  const isSA = session.role === "super_admin";
  // Phone: default hidden. Visible only to SA, self, or if member opted Show.
  if (!isSA && !isSelf && !showPhone) {
    (member as any).phone = null;
    (member as any).phone_hidden = true;
  } else {
    (member as any).phone_hidden = false;
  }
  (member as any).show_phone = showPhone;

  return NextResponse.json({ member, can_edit: isSelf || isSA });
}

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
      "id, full_name, phone, native_village, verification_status, role, qr_code_id, photo_url, cities(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    ({ data: member, error } = await supabase
      .from("users")
      .select("id, full_name, phone, native_village, verification_status, role, qr_code_id")
      .eq("id", id)
      .maybeSingle());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  try {
    const { data: extraRow } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", `profile_extra:${id}`)
      .maybeSingle();
    if (extraRow?.setting_value && typeof extraRow.setting_value === "object") {
      member = { ...member, ...extraRow.setting_value };
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ member });
}

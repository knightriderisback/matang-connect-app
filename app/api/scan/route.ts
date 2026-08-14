import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json(
      { error: "Scan is only for volunteer, core committee and super admin" },
      { status: 403 }
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Query required" }, { status: 400 });

  const supabase = createAdminClient();

  let code = q;
  const urlMatch = q.match(/\/u\/([A-Za-z0-9\-]+)/i);
  if (urlMatch) code = urlMatch[1];

  const phone = code.replace(/\D/g, "").slice(-10);
  const upper = code.toUpperCase();
  const select =
    "id, full_name, phone, native_village, verification_status, role, qr_code_id, photo_url, cities(name)";

  let member: any = null;
  let error: any = null;

  if (/^\d{10}$/.test(phone) && phone.length === 10 && !/[A-Za-z]/.test(code)) {
    const res = await supabase.from("users").select(select).eq("phone", phone).maybeSingle();
    member = res.data;
    error = res.error;
  } else {
    let res = await supabase.from("users").select(select).eq("qr_code_id", upper).maybeSingle();
    if (!res.data) {
      res = await supabase.from("users").select(select).eq("qr_code_id", code).maybeSingle();
    }
    if (!res.data) {
      res = await supabase.from("users").select(select).ilike("qr_code_id", code).maybeSingle();
    }
    member = res.data;
    error = res.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  try {
    const { data: extraRow } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", `profile_extra:${member.id}`)
      .maybeSingle();
    if (extraRow?.setting_value && typeof extraRow.setting_value === "object") {
      member = { ...member, ...extraRow.setting_value };
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({ member });
}

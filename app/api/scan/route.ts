import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Query required" }, { status: 400 });

  const supabase = createAdminClient();

  // Support full URL containing /u/MATANG-xxx
  let code = q;
  const urlMatch = q.match(/\/u\/([A-Z0-9\-]+)/i);
  if (urlMatch) code = urlMatch[1];

  let query = supabase
    .from("users")
    .select("id, full_name, phone, native_village, verification_status, role, qr_code_id, photo_url, cities(name)")
    .limit(1);

  if (code.toUpperCase().startsWith("MATANG")) {
    query = query.eq("qr_code_id", code.toUpperCase());
  } else if (/^\d{10}$/.test(code.replace(/\D/g, ""))) {
    const phone = code.replace(/\D/g, "").slice(-10);
    query = query.eq("phone", phone);
  } else {
    query = query.or(`qr_code_id.eq.${code},phone.eq.${code}`);
  }

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({ member: data });
}

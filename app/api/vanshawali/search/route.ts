import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

/** Member search for vanshawali link (any logged-in user) */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, native_village, photo_url, role, verification_status")
    .ilike("full_name", `%${q}%`)
    .neq("id", session.userId)
    .limit(15);

  if (error) {
    // fallback without ilike filter complexity
    const all = await supabase
      .from("users")
      .select("id, full_name, native_village, photo_url, role, verification_status")
      .limit(80);
    const ql = q.toLowerCase();
    const users = (all.data || []).filter(
      (u: any) =>
        u.id !== session.userId &&
        String(u.full_name || "").toLowerCase().includes(ql)
    ).slice(0, 15);
    return NextResponse.json({ users });
  }

  return NextResponse.json({ users: data || [] });
}

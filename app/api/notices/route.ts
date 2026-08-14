import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

/** Live schema: posted_by, title, content, type, city_id */

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (session.role !== "super_admin" && session.cityId) {
    q = q.or(`city_id.eq.${session.cityId},city_id.is.null`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ notices: [], error: error.message });

  const posterIds = Array.from(
    new Set((data || []).map((n: any) => n.posted_by).filter(Boolean))
  ) as string[];

  const posterMap: Record<
    string,
    { id: string; full_name: string; role?: string; qr_code_id?: string | null }
  > = {};

  if (posterIds.length) {
    const { data: posters } = await supabase
      .from("users")
      .select("id, full_name, role, qr_code_id")
      .in("id", posterIds);
    for (const p of posters || []) {
      posterMap[p.id] = p;
    }
  }

  const notices = (data || []).map((n: any) => {
    const poster = n.posted_by ? posterMap[n.posted_by] : null;
    return {
      ...n,
      body: n.content,
      priority: n.type === "urgent" || n.type === "shok_sandesh" ? "high" : "normal",
      category: n.type || "general",
      posted_by: n.posted_by,
      poster_name: poster?.full_name || null,
      poster_role: poster?.role || null,
      poster_qr: poster?.qr_code_id || null,
    };
  });
  return NextResponse.json({ notices });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const content = body.content || body.body || "";
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  let type = body.type || body.category || "general";
  if (body.priority === "urgent") type = "urgent";
  if (body.category === "shok_sandesh") type = "shok_sandesh";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notices")
    .insert({
      title: body.title,
      content,
      type,
      city_id: body.is_global ? null : session.cityId || null,
      posted_by: session.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, notice: data });
}

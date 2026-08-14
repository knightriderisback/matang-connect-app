import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsAdmin } from "@/lib/featureFlags";

const IMG_MARK = "\n\n[[MC_IMG:";
const IMG_END = "]]";

function parseImage(content: string): { text: string; image: string | null } {
  const i = content.indexOf(IMG_MARK);
  if (i < 0) return { text: content, image: null };
  const start = i + IMG_MARK.length;
  const end = content.indexOf(IMG_END, start);
  if (end < 0) return { text: content, image: null };
  const image = content.slice(start, end);
  const text = (content.slice(0, i) + content.slice(end + IMG_END.length)).trim();
  return { text, image: image.startsWith("data:") ? image : null };
}

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
  const posterMap: Record<string, any> = {};
  if (posterIds.length) {
    const { data: posters } = await supabase
      .from("users")
      .select("id, full_name, role, qr_code_id")
      .in("id", posterIds);
    for (const p of posters || []) posterMap[p.id] = p;
  }

  const notices = (data || []).map((n: any) => {
    const poster = n.posted_by ? posterMap[n.posted_by] : null;
    const { text, image } = parseImage(String(n.content || ""));
    return {
      ...n,
      content: text,
      body: text,
      image_url: image,
      priority: n.type === "urgent" || n.type === "shok_sandesh" ? "high" : "normal",
      category: n.type || "general",
      poster_name: poster?.full_name || null,
      poster_role: poster?.role || null,
      poster_qr: poster?.qr_code_id || null,
    };
  });
  return NextResponse.json({ notices });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const isStaff = STAFF_ROLES.includes(session.role as any);
  const flags = await getFeatureFlagsAdmin();

  // Personal override for member post
  let memberPostOk = flags.feed_member_post_enabled === true;
  try {
    const supabase0 = createAdminClient();
    const { data: ov } = await supabase0
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", `member_flags:${session.userId}`)
      .maybeSingle();
    const o = ov?.setting_value;
    if (o && typeof o === "object" && "feed_member_post_enabled" in (o as object)) {
      memberPostOk = Boolean((o as any).feed_member_post_enabled);
    }
  } catch {
    /* ignore */
  }

  if (!isStaff && !memberPostOk) {
    return NextResponse.json(
      { error: "Posting on Feed is disabled for members" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (!body.title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  let content = String(body.content || body.body || "");
  if (!content && !body.image) {
    return NextResponse.json({ error: "Content or image required" }, { status: 400 });
  }

  let imagesAllowed = flags.feed_images_enabled !== false;
  try {
    const supabase0 = createAdminClient();
    const { data: ov } = await supabase0
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", `member_flags:${session.userId}`)
      .maybeSingle();
    const o = ov?.setting_value;
    if (o && typeof o === "object" && "feed_images_enabled" in (o as object)) {
      imagesAllowed = Boolean((o as any).feed_images_enabled);
    }
  } catch {
    /* ignore */
  }

  if (body.image && typeof body.image === "string" && body.image.startsWith("data:")) {
    if (!imagesAllowed) {
      return NextResponse.json({ error: "Feed images are disabled" }, { status: 403 });
    }
    const img = body.image.slice(0, 400000);
    content = content + IMG_MARK + img + IMG_END;
  }

  let type = body.type || body.category || "general";
  if (body.priority === "urgent") type = "urgent";
  if (body.category === "shok_sandesh") type = "shok_sandesh";
  // Members cannot force urgent unless staff
  if (!isStaff && (type === "urgent" || type === "shok_sandesh")) {
    type = "general";
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notices")
    .insert({
      title: String(body.title).slice(0, 200),
      content,
      type,
      city_id: body.is_global && isStaff ? null : session.cityId || null,
      posted_by: session.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, notice: data });
}

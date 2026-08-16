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
  return { text, image: image.startsWith("data:") || image.startsWith("https://") ? image : null };
}


async function uploadFeedImage(
  supabase: ReturnType<typeof createAdminClient>,
  dataUrl: string,
  userId: string
): Promise<string | null> {
  try {
    const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!m) return null;
    const mime = m[1];
    const b64 = m[2].replace(/\s/g, "");
    const buf = Buffer.from(b64, "base64");
    if (buf.length < 32 || buf.length > 2_500_000) return null;
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bucket = "feed-images";

    let up = await supabase.storage.from(bucket).upload(path, buf, {
      contentType: mime,
      upsert: false,
      cacheControl: "31536000",
    });
    if (up.error) {
      // Bucket may not exist yet — create public bucket once
      await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 3_000_000,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      });
      up = await supabase.storage.from(bucket).upload(path, buf, {
        contentType: mime,
        upsert: false,
        cacheControl: "31536000",
      });
      if (up.error) {
        console.error("feed image upload failed", up.error.message);
        return null;
      }
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) {
    console.error("feed image upload exception", e);
    return null;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = createAdminClient();
  let q = supabase
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
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
    // Huge inline base64 freezes low-end phones during scroll
    let image_url = image;
    if (image_url && image_url.startsWith("data:") && image_url.length > 100000) {
      image_url = null;
    }
    return {
      ...n,
      content: text,
      body: text,
      image_url,
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

  if (body.image && typeof body.image === "string") {
    if (!imagesAllowed) {
      return NextResponse.json({ error: "Feed images are disabled" }, { status: 403 });
    }
    const supabaseImg = createAdminClient();
    let publicUrl: string | null = null;
    if (body.image.startsWith("data:")) {
      publicUrl = await uploadFeedImage(supabaseImg, body.image, session.userId);
    } else if (body.image.startsWith("https://")) {
      publicUrl = body.image.slice(0, 500);
    }
    if (publicUrl) {
      content = content + IMG_MARK + publicUrl + IMG_END;
    } else if (body.image.startsWith("data:")) {
      // Last-resort tiny embed only if storage unavailable (still cap size)
      const img = body.image.slice(0, 80_000);
      content = content + IMG_MARK + img + IMG_END;
    }
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

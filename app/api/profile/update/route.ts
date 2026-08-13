import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const full_name = String(body.full_name || "").trim();
  const native_village = String(body.native_village || "").trim();

  if (!full_name || !native_village) {
    return NextResponse.json({ error: "Name and village required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const core: Record<string, unknown> = { full_name, native_village };
  const optional: Record<string, unknown> = {};
  if (body.gender !== undefined && body.gender !== "") optional.gender = String(body.gender).slice(0, 20);
  if (body.blood_group !== undefined) optional.blood_group = body.blood_group || null;
  if (body.education_level !== undefined) optional.education_level = body.education_level || null;
  if (body.occupation !== undefined) optional.occupation = body.occupation || null;
  if (body.about !== undefined) optional.about = String(body.about || "").slice(0, 1000);
  if (body.address !== undefined) optional.address = String(body.address || "").slice(0, 300);
  if (body.photo && typeof body.photo === "string" && body.photo.startsWith("data:")) {
    optional.photo_url = body.photo.slice(0, 400000);
  }

  let saved: Record<string, unknown> = { ...core, ...optional };
  let { error } = await supabase.from("users").update(saved).eq("id", session.userId);

  if (error && optional.photo_url) {
    delete saved.photo_url;
    ({ error } = await supabase.from("users").update(saved).eq("id", session.userId));
  }
  if (error) {
    // strip unknown columns one by one by falling back to core only
    console.warn("profile update soft fail:", error.message);
    ({ error } = await supabase.from("users").update(core).eq("id", session.userId));
    saved = { ...core };
  }
  if (error) {
    return NextResponse.json({ error: "Update failed: " + error.message }, { status: 500 });
  }

  // Read back what is actually stored
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, phone, role, city_id, native_village, verification_status, qr_code_id, photo_url, gender, blood_group, education_level, occupation, about, address, created_at, cities(name)")
    .eq("id", session.userId)
    .maybeSingle();

  try {
    await supabase.from("audit_logs").insert({
      actor_id: session.userId,
      action: "profile_update",
      target_id: session.userId,
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ success: true, user: user || saved });
}

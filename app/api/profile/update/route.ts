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

  // Core fields always present on live schema
  const core: Record<string, unknown> = {
    full_name,
    native_village,
  };

  // Optional extended profile columns (may be missing until migrations run)
  const optional: Record<string, unknown> = {};
  if (body.gender) optional.gender = String(body.gender).slice(0, 20);
  if (body.blood_group !== undefined) optional.blood_group = body.blood_group || null;
  if (body.education_level !== undefined) optional.education_level = body.education_level || null;
  if (body.occupation !== undefined) optional.occupation = body.occupation || null;
  if (body.about !== undefined) optional.about = String(body.about || "").slice(0, 1000);
  if (body.address !== undefined) optional.address = String(body.address || "").slice(0, 300);

  const photo =
    body.photo && typeof body.photo === "string" && body.photo.startsWith("data:")
      ? body.photo.slice(0, 400000)
      : null;
  if (photo) optional.photo_url = photo;

  // 1) Try core + optional
  let { error } = await supabase
    .from("users")
    .update({ ...core, ...optional })
    .eq("id", session.userId);

  // 2) If column missing / size issue — try without photo
  if (error && photo) {
    const withoutPhoto = { ...core, ...optional };
    delete withoutPhoto.photo_url;
    ({ error } = await supabase.from("users").update(withoutPhoto).eq("id", session.userId));
  }

  // 3) Still failing — save only core columns (full_name, native_village)
  if (error) {
    console.warn("profile optional update failed:", error.message);
    ({ error } = await supabase.from("users").update(core).eq("id", session.userId));
  }

  if (error) {
    console.error("profile update failed:", error.message);
    return NextResponse.json(
      { error: "Update failed: " + error.message },
      { status: 500 }
    );
  }

  try {
    await supabase.from("audit_logs").insert({
      actor_id: session.userId,
      action: "profile_update",
      target_id: session.userId,
    });
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ success: true });
}

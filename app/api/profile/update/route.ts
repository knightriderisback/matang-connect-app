import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const full_name = body.full_name?.trim();
  const native_village = body.native_village?.trim();
  const photo = body.photo;

  if (!full_name || !native_village) {
    return NextResponse.json({ error: "Name and village required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const update: Record<string, unknown> = {
    full_name,
    native_village,
  };

  if (body.gender) update.gender = String(body.gender).slice(0, 20);
  if (body.blood_group !== undefined) update.blood_group = body.blood_group || null;
  if (body.education_level !== undefined) update.education_level = body.education_level || null;
  if (body.occupation !== undefined) update.occupation = body.occupation || null;
  if (body.about !== undefined) update.about = String(body.about || "").slice(0, 1000);
  if (body.address !== undefined) update.address = String(body.address || "").slice(0, 300);

  if (photo && typeof photo === "string" && photo.startsWith("data:")) {
    update.photo_url = photo.slice(0, 500000);
  }

  let { error } = await supabase.from("users").update(update).eq("id", session.userId);
  if (error && photo) {
    // Retry without photo if column/size issue
    delete update.photo_url;
    ({ error } = await supabase.from("users").update(update).eq("id", session.userId));
  }
  if (error) {
    console.error("profile update", error.message);
    return NextResponse.json({ error: "Update failed: " + error.message }, { status: 500 });
  }

  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "profile_update",
    target_id: session.userId,
  });

  return NextResponse.json({ success: true });
}

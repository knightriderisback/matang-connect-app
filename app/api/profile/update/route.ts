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
  const update: Record<string, unknown> = { full_name, native_village };
  if (photo && typeof photo === "string" && photo.startsWith("data:")) {
    update.photo_url = photo.slice(0, 500000);
  }

  let { error } = await supabase.from("users").update(update).eq("id", session.userId);
  if (error && photo) {
    ({ error } = await supabase.from("users").update({ full_name, native_village }).eq("id", session.userId));
  }
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await supabase.from("audit_logs").insert({
    actor_id: session.userId,
    action: "profile_update",
    target_id: session.userId,
  });

  return NextResponse.json({ success: true });
}

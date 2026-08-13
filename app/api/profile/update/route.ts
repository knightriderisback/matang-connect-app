import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

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
  const optional: Record<string, unknown> = { ...core };
  if (body.gender !== undefined) optional.gender = body.gender ? String(body.gender).slice(0, 20) : null;
  if (body.blood_group !== undefined) optional.blood_group = body.blood_group || null;
  if (body.education_level !== undefined) optional.education_level = body.education_level || null;
  if (body.occupation !== undefined) optional.occupation = body.occupation || null;
  if (body.about !== undefined) optional.about = String(body.about || "").slice(0, 1000);
  if (body.address !== undefined) optional.address = String(body.address || "").slice(0, 300);
  if (body.photo && typeof body.photo === "string" && body.photo.startsWith("data:")) {
    optional.photo_url = body.photo.slice(0, 400000);
  }

  let { data, error } = await supabase
    .from("users")
    .update(optional)
    .eq("id", session.userId)
    .select("id, full_name, native_village, photo_url, gender, blood_group, education_level, occupation, about, address, role, city_id, phone, verification_status, qr_code_id")
    .maybeSingle();

  if (error) {
    console.warn("profile full update:", error.message);
    ({ data, error } = await supabase
      .from("users")
      .update(core)
      .eq("id", session.userId)
      .select("id, full_name, native_village, role, city_id, phone, verification_status, qr_code_id")
      .maybeSingle());
  }

  if (error) {
    return NextResponse.json({ error: "Update failed: " + error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Update failed: user row not found for this session" },
      { status: 404 }
    );
  }

  // Refresh session name if changed
  const response = NextResponse.json({ success: true, user: data });
  try {
    const token = await createSessionToken({
      userId: session.userId,
      role: session.role,
      cityId: session.cityId,
      fullName: data.full_name || session.fullName,
    });
    response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
  } catch {
    /* ignore */
  }
  return response;
}

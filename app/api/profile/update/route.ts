import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";

/**
 * Profile save:
 * 1) Always try full_name + native_village on users
 * 2) Optional columns if present on users
 * 3) Otherwise store extras in app_settings profile_extra:{userId}
 * Does not touch SOS.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const full_name = String(body.full_name || "").trim();
  const native_village = String(body.native_village || "").trim();
  if (!full_name || !native_village) {
    return NextResponse.json({ error: "Name and village required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const userId = session.userId;

  const extras: Record<string, unknown> = {};
  if (body.gender !== undefined) extras.gender = body.gender ? String(body.gender).slice(0, 20) : null;
  if (body.blood_group !== undefined) extras.blood_group = body.blood_group || null;
  if (body.education_level !== undefined) extras.education_level = body.education_level || null;
  if (body.occupation !== undefined) extras.occupation = body.occupation || null;
  if (body.about !== undefined) extras.about = String(body.about || "").slice(0, 1000);
  if (body.address !== undefined) extras.address = String(body.address || "").slice(0, 300);
  if (body.photo && typeof body.photo === "string" && body.photo.startsWith("data:")) {
    extras.photo_url = body.photo.slice(0, 350000);
  }

  // Core always
  let { data: user, error } = await supabase
    .from("users")
    .update({ full_name, native_village })
    .eq("id", userId)
    .select("id, full_name, native_village, phone, role, city_id, verification_status, qr_code_id")
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json(
      {
        error: "Update failed: " + (error?.message || "user not found"),
        detail: "Could not update name/village on users table",
      },
      { status: 500 }
    );
  }

  // Try optional columns one field at a time
  const applied: Record<string, unknown> = { ...user };
  const leftover: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(extras)) {
    const { data, error: e } = await supabase
      .from("users")
      .update({ [key]: value })
      .eq("id", userId)
      .select(`id, ${key}`)
      .maybeSingle();
    if (!e && data) {
      applied[key] = (data as any)[key];
    } else {
      leftover[key] = value;
    }
  }

  // Always mirror photo into profile_extra so Profile card can load it even if users.photo_url missing
  if (extras.photo_url) {
    leftover.photo_url = extras.photo_url;
  }

  // Persist leftover extras in app_settings
  if (Object.keys(leftover).length > 0) {
    const key = `profile_extra:${userId}`;
    const { data: existing } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", key)
      .maybeSingle();
    const prev =
      existing?.setting_value && typeof existing.setting_value === "object"
        ? { ...(existing.setting_value as object) }
        : {};
    const merged = { ...prev, ...leftover };
    const payload = {
      setting_key: key,
      setting_value: merged,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    let { error: se } = await supabase
      .from("app_settings")
      .upsert(payload, { onConflict: "setting_key" });
    if (se) {
      await supabase.from("app_settings").delete().eq("setting_key", key);
      await supabase.from("app_settings").insert(payload);
    }
    Object.assign(applied, leftover);
  }

  await writeAuditLog({
    actorId: userId,
    action: "profile_update",
    targetId: userId,
  });

  const response = NextResponse.json({
    success: true,
    user: applied,
    saved_extra_keys: Object.keys(leftover),
  });

  try {
    const token = await createSessionToken({
      userId: session.userId,
      role: session.role,
      cityId: session.cityId,
      fullName: full_name,
    });
    response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
  } catch {
    /* ignore */
  }

  return response;
}

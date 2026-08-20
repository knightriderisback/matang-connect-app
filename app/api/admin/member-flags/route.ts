import { NextRequest, NextResponse } from "next/server";
import { getSession, STAFF_ROLES } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";
import {
  getFeatureRoleMatrix,
  roleToCol,
  MATRIX_FLAG_KEYS,
  type FeatureRoleMatrix,
  type RoleCol,
} from "@/lib/featureRoleMatrix";

function memberKey(userId: string) {
  return `member_flags:${userId}`;
}

function coerceBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return undefined;
}

function parseOverrides(raw: unknown): Record<string, boolean> {
  const overrides: Record<string, boolean> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
      const b = coerceBool(v);
      if (b !== undefined) overrides[k] = b;
    });
  }
  return overrides;
}

function effectiveForUser(
  matrix: FeatureRoleMatrix,
  overrides: Record<string, boolean>,
  role: string | null | undefined
): Record<string, boolean> {
  const col = roleToCol(role);
  const out: Record<string, boolean> = {};
  for (const key of MATRIX_FLAG_KEYS) {
    if (col === "super_admin") {
      out[key] = true;
      continue;
    }
    if (key in overrides) {
      out[key] = overrides[key];
      continue;
    }
    const cell = matrix[key];
    out[key] = cell ? cell[col as RoleCol] !== false : true;
  }
  return out;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !STAFF_ROLES.includes(session.role as any)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select(
      "id, full_name, phone, role, native_village, verification_status, qr_code_id, photo_url, gender, blood_group, education_level, occupation, about, address, city_id, created_at, cities(name)"
    )
    .eq("id", userId)
    .maybeSingle();

  const { data: fam } = await supabase
    .from("families")
    .select(
      "id, address, education_summary, employment_status, needs, family_members(name, relation, age, gender, occupation, education_level, blood_group)"
    )
    .eq("head_of_family", userId)
    .limit(1);

  const { data: row } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", memberKey(userId))
    .maybeSingle();

  const overrides = parseOverrides(row?.setting_value);
  const matrix = await getFeatureRoleMatrix();
  const effective = effectiveForUser(matrix, overrides, user?.role);

  return NextResponse.json({
    user,
    family: fam?.[0] || null,
    overrides,
    effective,
    matrix,
    roleCol:
      user?.role === "core_committee"
        ? "core"
        : user?.role === "volunteer"
          ? "volunteer"
          : user?.role === "super_admin"
            ? "super_admin"
            : "member",
    defaults: DEFAULTS,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["core_committee", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Committee / Super Admin only" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = body.userId as string;
  const key = body.key as string;
  const value = body.value;

  if (!userId || !key || typeof value !== "boolean") {
    return NextResponse.json({ error: "userId, key, value required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: target } = await supabase.from("users").select("id, role").eq("id", userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: row } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", memberKey(userId))
    .maybeSingle();

  const overrides = parseOverrides(row?.setting_value);
  // Always store explicit personal override
  overrides[key] = value;

  if (row) {
    const { error } = await supabase
      .from("app_settings")
      .update({ setting_value: overrides })
      .eq("setting_key", memberKey(userId));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("app_settings").insert({
      setting_key: memberKey(userId),
      setting_value: overrides,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matrix = await getFeatureRoleMatrix();
  const effective = effectiveForUser(matrix, overrides, target.role);

  return NextResponse.json({ success: true, overrides, effective });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { getFeatureFlagsAdmin, writeFeatureFlag, writeAllFlags, DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";
import { writeAuditLog } from "@/lib/audit";
import {
  getFeatureRoleMatrix,
  setMatrixCell,
  setFeatureRoleMatrix,
  defaultMatrix,
  type RoleCol,
} from "@/lib/featureRoleMatrix";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const flags = await getFeatureFlagsAdmin();
  const matrix = await getFeatureRoleMatrix();
  return NextResponse.json({ flags, matrix });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));

  // Role matrix cell: { action: "matrix_cell", key, role: member|volunteer|core, view: boolean }
  if (body.action === "matrix_cell") {
    const key = body.key as string;
    const role = body.role as RoleCol;
    const view = body.view;
    if (!key || !["member", "volunteer", "core"].includes(role) || typeof view !== "boolean") {
      return NextResponse.json({ error: "key, role, view required" }, { status: 400 });
    }
    const result = await setMatrixCell(key, role, view);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Save failed" }, { status: 500 });
    }
    try {
      await writeAuditLog({
        actorId: session.userId,
        action: "feature_matrix_cell",
        meta: { key, role, view },
      });
    } catch {
      /* ignore */
    }

    // Sync: clear personal overrides for this flag so everyone follows global again
    try {
      const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
      const { data: rows } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .like("setting_key", "member_flags:%");
      if (rows?.length) {
        for (const row of rows) {
          const raw = row.setting_value;
          if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
          const o = { ...(raw as Record<string, unknown>) };
          if (key in o) {
            delete o[key];
            await supabase
              .from("app_settings")
              .update({ setting_value: o })
              .eq("setting_key", row.setting_key);
          }
        }
      }
    } catch {
      /* non-fatal */
    }

    // Also mirror to legacy boolean for this flag (any role view => true)
    const cell = result.matrix[key];
    if (cell && key in DEFAULTS) {
      const anyOn = !!(cell.member || cell.volunteer || cell.core);
      await writeFeatureFlag(key as keyof FeatureFlags, anyOn, session.userId);
    }
    return NextResponse.json({ success: true, matrix: result.matrix });
  }

  if (body.action === "matrix_reset") {
    const m = defaultMatrix();
    const saved = await setFeatureRoleMatrix(m);
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 500 });
    return NextResponse.json({ success: true, matrix: m });
  }

  if (body.action === "unlock_all") {
    const allOn = { ...DEFAULTS } as FeatureFlags;
    (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).forEach((k) => {
      (allOn as any)[k] = true;
    });
    const result = await writeAllFlags(allOn);
    const m = defaultMatrix();
    for (const k of Object.keys(m)) {
      m[k] = { member: true, volunteer: true, core: true };
    }
    await setFeatureRoleMatrix(m);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed", flags: result.flags }, { status: 500 });
    }
    return NextResponse.json({ success: true, flags: result.flags, matrix: m });
  }

  // Legacy single boolean toggle
  const key = body.key as string;
  const value = body.value;
  if (!key || typeof value !== "boolean") {
    return NextResponse.json({ error: "key and boolean value required" }, { status: 400 });
  }

  const result = await writeFeatureFlag(key as keyof FeatureFlags, value, session.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Save failed" }, { status: 500 });
  }

  // Mirror to all roles in matrix
  await setMatrixCell(key, "member", value);
  await setMatrixCell(key, "volunteer", value);
  await setMatrixCell(key, "core", value);

  try {
    await writeAuditLog({
      actorId: session.userId,
      action: "feature_flag_toggle",
      meta: { key, value },
    });
  } catch {
    /* ignore */
  }

  const matrix = await getFeatureRoleMatrix();
  return NextResponse.json({ success: true, flags: result.flags, matrix });
}

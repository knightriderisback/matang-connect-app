import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsAdmin, DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";
import {
  getFeatureRoleMatrix,
  matrixToLegacyFlags,
  roleToCol,
  MATRIX_FLAG_KEYS,
  type RoleCol,
  type FeatureRoleMatrix,
} from "@/lib/featureRoleMatrix";

function coerceBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return undefined;
}

export async function GET() {
  let flags: FeatureFlags = await getFeatureFlagsAdmin();
  let matrix = await getFeatureRoleMatrix();
  flags = matrixToLegacyFlags(matrix, flags);

  try {
    const session = await getSession();
    if (session?.userId && session.role !== "super_admin") {
      const supabase = createAdminClient();
      const { data: row } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", `member_flags:${session.userId}`)
        .maybeSingle();
      const raw = row?.setting_value;
      const overrides: Record<string, boolean> = {};
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
          const b = coerceBool(v);
          if (b !== undefined) overrides[k] = b;
        });
      }

      // Apply personal overrides onto matrix copy for this user's role column
      const col = roleToCol(session.role);
      if (col !== "super_admin" && Object.keys(overrides).length) {
        matrix = { ...matrix };
        for (const key of MATRIX_FLAG_KEYS) {
          if (key in overrides) {
            const prev = matrix[key] || { member: true, volunteer: true, core: true };
            matrix[key] = { ...prev, [col as RoleCol]: overrides[key] };
          }
        }
        flags = matrixToLegacyFlags(matrix, flags);
        // Also flatten overrides onto flags
        Object.entries(overrides).forEach(([k, v]) => {
          if (k in DEFAULTS) (flags as any)[k] = v;
        });
      }
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json(
    {
      flags,
      matrix,
      stages: {
        s1: flags.stage_1_enabled,
        s2: flags.stage_2_enabled,
        s3: flags.stage_3_enabled,
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

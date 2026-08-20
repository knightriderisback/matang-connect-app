import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsAdmin, DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";
import { getFeatureRoleMatrix, matrixToLegacyFlags } from "@/lib/featureRoleMatrix";

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
  const matrix = await getFeatureRoleMatrix();
  // Merge matrix into legacy booleans so old clients still work
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
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const merged = { ...flags };
        Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
          if (k in DEFAULTS) {
            const b = coerceBool(v);
            if (b !== undefined) (merged as any)[k] = b;
          }
        });
        flags = merged;
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

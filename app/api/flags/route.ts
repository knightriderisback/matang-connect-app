import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsAdmin, DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";

function coerceBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return undefined;
}

/** Public feature flags for client gating — merges personal overrides for logged-in user */
export async function GET() {
  let flags: FeatureFlags = await getFeatureFlagsAdmin();

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
    /* ignore member override errors */
  }

  return NextResponse.json(
    { flags },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsAdmin, DEFAULTS, type FeatureFlags } from "@/lib/featureFlags";
import {
  getModuleAccessLists,
  accessAllows,
  type ModuleAccessLists,
} from "@/lib/moduleAccess";

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
  const flags: FeatureFlags = await getFeatureFlagsAdmin();
  let lists: ModuleAccessLists = await getModuleAccessLists();

  try {
    const session = await getSession();
    // Personal overrides: member_flags:userId as { key: boolean }
    if (session?.userId && session.role !== "super_admin") {
      const supabase = createAdminClient();
      const { data: row } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", `member_flags:${session.userId}`)
        .maybeSingle();
      let raw = row?.setting_value;
      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw);
        } catch {
          raw = null;
        }
      }
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const col =
          session.role === "core_committee"
            ? "core"
            : session.role === "volunteer"
              ? "volunteer"
              : "member";
        const set = new Set(lists[col]);
        Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
          const b = coerceBool(v);
          if (b === true) set.add(k);
          if (b === false) set.delete(k);
        });
        lists = { ...lists, [col]: Array.from(set) };
      }
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json(
    {
      flags,
      access: lists,
      memberModules: lists.member,
      stages: {
        s1: flags.stage_1_enabled,
        s2: flags.stage_2_enabled,
        s3: flags.stage_3_enabled,
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

import { createClient } from "./supabase/client";
import { createAdminClient } from "./supabase/admin";

export interface FeatureFlags {
  stage_1_enabled: boolean;
  stage_2_enabled: boolean;
  stage_3_enabled: boolean;
  kosh_transparency_mode: boolean;
  sos_enabled: boolean;
  jobs_enabled: boolean;
  notices_enabled: boolean;
  care_enabled: boolean;
  titles_enabled: boolean;
  vyapar_enabled: boolean;
  matrimony_enabled: boolean;
  dharohar_enabled: boolean;
  panchang_enabled: boolean;
  mahila_enabled: boolean;
  polls_enabled: boolean;
  arthik_enabled: boolean;
  scan_enabled: boolean;
  rides_enabled: boolean;
  gaurav_enabled: boolean;
  gamification_enabled: boolean;
  ai_member_enabled: boolean;
  ai_god_mode_enabled: boolean;
  feed_images_enabled: boolean;
  feed_member_post_enabled: boolean;
  admin_requests_enabled: boolean;
}

/** Fail-closed for expansion: stages 2/3 OFF until Super Admin unlocks */
export const DEFAULTS: FeatureFlags = {
  stage_1_enabled: true,
  stage_2_enabled: false,
  stage_3_enabled: false,
  kosh_transparency_mode: true,
  sos_enabled: true,
  jobs_enabled: true,
  notices_enabled: true,
  care_enabled: true,
  titles_enabled: true,
  vyapar_enabled: true,
  matrimony_enabled: true,
  dharohar_enabled: true,
  panchang_enabled: true,
  mahila_enabled: true,
  polls_enabled: true,
  arthik_enabled: true,
  scan_enabled: true,
  rides_enabled: true,
  gaurav_enabled: true,
  gamification_enabled: true,
  ai_member_enabled: true,
  ai_god_mode_enabled: true,
  feed_images_enabled: true,
  feed_member_post_enabled: false,
  admin_requests_enabled: true,
};

export const MODULE_STAGE: Record<string, 1 | 2 | 3> = {
  census: 1,
  profile: 1,
  directory: 1,
  scan: 1,
  sos: 2,
  jobs: 2,
  notices: 2,
  care: 2,
  kosh: 2,
  titles: 2,
  vyapar: 3,
  matrimony: 3,
  dharohar: 3,
  panchang: 3,
  mahila: 3,
  polls: 3,
  arthik: 3,
  rides: 3,
  gaurav: 3,
  gamification: 3,
  admin_requests: 1,
};

const BUNDLE_KEY = "feature_flags_bundle";

export function coerceBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "0" || s === "no" || s === "off") return false;
    try {
      return coerceBool(JSON.parse(v));
    } catch {
      return undefined;
    }
  }
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if ("value" in o) return coerceBool(o.value);
    if ("enabled" in o) return coerceBool(o.enabled);
  }
  return undefined;
}

function parseFlags(data: any[]): FeatureFlags {
  const flags = { ...DEFAULTS };

  // 1) Apply individual keys first (legacy)
  data.forEach((row: any) => {
    const key = row.setting_key as keyof FeatureFlags;
    if (key in DEFAULTS) {
      const b = coerceBool(row.setting_value);
      if (b !== undefined) flags[key] = b;
    }
  });

  // 2) Bundle ALWAYS wins when present (authoritative — stops stale rows overriding)
  const bundleRow = data.find((r) => r.setting_key === BUNDLE_KEY);
  const rawBundle = bundleRow?.setting_value;
  let bundleObj: Record<string, unknown> | null = null;
  if (rawBundle && typeof rawBundle === "object" && !Array.isArray(rawBundle)) {
    bundleObj = rawBundle as Record<string, unknown>;
  } else if (typeof rawBundle === "string") {
    try {
      const p = JSON.parse(rawBundle);
      if (p && typeof p === "object") bundleObj = p;
    } catch {
      /* ignore */
    }
  }
  if (bundleObj) {
    (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).forEach((k) => {
      if (k in bundleObj!) {
        const v = coerceBool(bundleObj![k]);
        if (v !== undefined) flags[k] = v;
      }
    });
  }
  return flags;
}

export async function getFeatureFlagsAdmin(): Promise<FeatureFlags> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value");
    if (error || !data?.length) return { ...DEFAULTS };
    return parseFlags(data);
  } catch {
    return { ...DEFAULTS };
  }
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return getFeatureFlagsAdmin();
}

/** Persist one flag + full bundle so members always read consistent state */
export async function writeFeatureFlag(
  key: keyof FeatureFlags | string,
  value: boolean,
  userId?: string
): Promise<{ ok: boolean; flags: FeatureFlags; error?: string }> {
  const supabase = createAdminClient();
  const current = await getFeatureFlagsAdmin();
  if (!(key in DEFAULTS)) {
    return { ok: false, flags: current, error: "Unknown flag key" };
  }
  const next: FeatureFlags = { ...current, [key]: value };

  // 1) Bundle (authoritative for app)
  await supabase.from("app_settings").delete().eq("setting_key", BUNDLE_KEY);
  const bundleIns = await supabase.from("app_settings").insert({
    setting_key: BUNDLE_KEY,
    setting_value: next,
  });
  if (bundleIns.error) {
    // try upsert without delete
    const up = await supabase.from("app_settings").upsert(
      { setting_key: BUNDLE_KEY, setting_value: next },
      { onConflict: "setting_key" }
    );
    if (up.error) {
      return { ok: false, flags: current, error: up.error.message };
    }
  }

  // 2) Individual key (settings UI / legacy)
  await supabase.from("app_settings").delete().eq("setting_key", key);
  const row: Record<string, unknown> = {
    setting_key: key,
    setting_value: value,
  };
  if (userId) {
    row.updated_by = userId;
    row.updated_at = new Date().toISOString();
  }
  let { error } = await supabase.from("app_settings").insert(row);
  if (error) {
    // minimal columns only
    ({ error } = await supabase.from("app_settings").insert({
      setting_key: key,
      setting_value: value,
    }));
  }
  if (error) {
    console.error("individual flag write:", error.message);
  }

  // Sync ALL individual keys from bundle so nothing stays stale false
  for (const k of Object.keys(DEFAULTS) as (keyof FeatureFlags)[]) {
    try {
      await supabase.from("app_settings").delete().eq("setting_key", k);
      await supabase.from("app_settings").insert({
        setting_key: k,
        setting_value: next[k],
      });
    } catch {
      /* best effort */
    }
  }

  const verified = await getFeatureFlagsAdmin();
  return { ok: true, flags: verified };
}

export function isModuleVisible(
  moduleKey: string,
  flags: FeatureFlags,
  role?: string | null
): boolean {
  // Only super_admin bypasses — everyone else respects stages/flags
  if (role === "super_admin") return true;

  const stage = MODULE_STAGE[moduleKey] ?? 1;
  if (stage === 1 && !flags.stage_1_enabled) return false;
  if (stage === 2 && !flags.stage_2_enabled) return false;
  if (stage === 3 && !flags.stage_3_enabled) return false;

  const flagMap: Partial<Record<string, keyof FeatureFlags>> = {
    sos: "sos_enabled",
    jobs: "jobs_enabled",
    notices: "notices_enabled",
    care: "care_enabled",
    titles: "titles_enabled",
    vyapar: "vyapar_enabled",
    matrimony: "matrimony_enabled",
    dharohar: "dharohar_enabled",
    panchang: "panchang_enabled",
    mahila: "mahila_enabled",
    polls: "polls_enabled",
    arthik: "arthik_enabled",
    scan: "scan_enabled",
    admin_requests: "admin_requests_enabled",
    rides: "rides_enabled",
    gaurav: "gaurav_enabled",
    gamification: "gamification_enabled",
    kosh: "kosh_transparency_mode",
  };
  const fk = flagMap[moduleKey];
  if (fk && flags[fk] === false) return false;
  return true;
}

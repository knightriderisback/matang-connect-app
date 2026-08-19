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

export const DEFAULTS: FeatureFlags = {
  stage_1_enabled: true,
  stage_2_enabled: true,
  stage_3_enabled: true,
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

/** moduleKey → flag key (visibility for members) */
export const MODULE_FLAG: Record<string, keyof FeatureFlags> = {
  census: "stage_1_enabled", // census follows stage 1
  profile: "stage_1_enabled",
  directory: "stage_1_enabled",
  scan: "scan_enabled",
  sos: "sos_enabled",
  jobs: "jobs_enabled",
  notices: "notices_enabled",
  care: "care_enabled",
  kosh: "kosh_transparency_mode",
  titles: "titles_enabled",
  vyapar: "vyapar_enabled",
  matrimony: "matrimony_enabled",
  dharohar: "dharohar_enabled",
  panchang: "panchang_enabled",
  mahila: "mahila_enabled",
  polls: "polls_enabled",
  arthik: "arthik_enabled",
  rides: "rides_enabled",
  gaurav: "gaurav_enabled",
  gamification: "gamification_enabled",
  admin_requests: "admin_requests_enabled",
};

export const STAGE_MODULES: Record<string, (keyof FeatureFlags)[]> = {
  stage_1_enabled: ["scan_enabled"],
  stage_2_enabled: [
    "sos_enabled",
    "jobs_enabled",
    "notices_enabled",
    "care_enabled",
    "kosh_transparency_mode",
    "titles_enabled",
  ],
  stage_3_enabled: [
    "vyapar_enabled",
    "matrimony_enabled",
    "dharohar_enabled",
    "panchang_enabled",
    "mahila_enabled",
    "polls_enabled",
    "arthik_enabled",
    "rides_enabled",
    "gaurav_enabled",
    "gamification_enabled",
  ],
};

// keep for any legacy imports
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

export const BUNDLE_KEY = "feature_flags_bundle";

export function coerceBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(s)) return true;
    if (["false", "0", "no", "off"].includes(s)) return false;
    try {
      return coerceBool(JSON.parse(v));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function parseFlags(data: any[]): FeatureFlags {
  const flags = { ...DEFAULTS };
  const bundleRow = (data || []).find((r) => r?.setting_key === BUNDLE_KEY);
  if (bundleRow?.setting_value != null) {
    let raw = bundleRow.setting_value;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const k of Object.keys(DEFAULTS) as (keyof FeatureFlags)[]) {
        if (k in raw) {
          const v = coerceBool((raw as any)[k]);
          if (v !== undefined) flags[k] = v;
        }
      }
      return flags;
    }
  }
  for (const row of data || []) {
    const key = row?.setting_key as keyof FeatureFlags;
    if (key && key in DEFAULTS) {
      const v = coerceBool(row.setting_value);
      if (v !== undefined) flags[key] = v;
    }
  }
  return flags;
}

export async function getFeatureFlagsAdmin(): Promise<FeatureFlags> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("app_settings").select("setting_key, setting_value");
    if (error) {
      console.error("[flags] select error", error.message);
      return { ...DEFAULTS };
    }
    return parseFlags(data || []);
  } catch (e: any) {
    console.error("[flags] exception", e?.message);
    return { ...DEFAULTS };
  }
}

async function persistBundle(next: FeatureFlags): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  // Store as plain JSON object
  const payload = JSON.parse(JSON.stringify(next));

  // Try update first
  const { data: existing } = await supabase
    .from("app_settings")
    .select("setting_key")
    .eq("setting_key", BUNDLE_KEY)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("app_settings")
      .update({ setting_value: payload })
      .eq("setting_key", BUNDLE_KEY);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from("app_settings").insert({
    setting_key: BUNDLE_KEY,
    setting_value: payload,
  });
  if (error) {
    // upsert fallback
    const up = await supabase.from("app_settings").upsert(
      { setting_key: BUNDLE_KEY, setting_value: payload },
      { onConflict: "setting_key" }
    );
    if (up.error) return { ok: false, error: up.error.message };
  }
  return { ok: true };
}

export async function writeFeatureFlag(
  key: string,
  value: boolean,
  _userId?: string
): Promise<{ ok: boolean; flags: FeatureFlags; error?: string }> {
  if (!(key in DEFAULTS)) {
    return { ok: false, flags: await getFeatureFlagsAdmin(), error: "Unknown key" };
  }

  const current = await getFeatureFlagsAdmin();
  const next: FeatureFlags = { ...current, [key]: value };

  // Stage toggle → bulk set that stage's modules
  if (key in STAGE_MODULES) {
    for (const mk of STAGE_MODULES[key]) {
      (next as any)[mk] = value;
    }
  }

  const saved = await persistBundle(next);
  if (!saved.ok) {
    return { ok: false, flags: current, error: saved.error };
  }

  // Verify
  const verified = await getFeatureFlagsAdmin();
  return { ok: true, flags: verified };
}

export async function writeAllFlags(
  flags: FeatureFlags
): Promise<{ ok: boolean; flags: FeatureFlags; error?: string }> {
  const next = { ...DEFAULTS, ...flags };
  // force every known key true if unlock
  const saved = await persistBundle(next);
  if (!saved.ok) return { ok: false, flags: await getFeatureFlagsAdmin(), error: saved.error };
  return { ok: true, flags: await getFeatureFlagsAdmin() };
}

/**
 * Members: visible only if module flag is true.
 * Super Admin: always true.
 * Stages no longer independently hide modules — stage toggle updates module flags in writeFeatureFlag.
 */
export function isModuleVisible(
  moduleKey: string,
  flags: FeatureFlags,
  role?: string | null
): boolean {
  if (role === "super_admin") return true;
  const fk = MODULE_FLAG[moduleKey];
  if (!fk) return true; // unknown modules allowed
  return flags[fk] !== false;
}

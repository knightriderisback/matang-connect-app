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

/**
 * Defaults: stages ON so members see modules when DB/bundle missing.
 * Super Admin OFF toggles persist via feature_flags_bundle only.
 */
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
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if ("value" in o) return coerceBool(o.value);
    if ("enabled" in o) return coerceBool(o.enabled);
  }
  return undefined;
}

function applyObj(flags: FeatureFlags, obj: Record<string, unknown>) {
  (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).forEach((k) => {
    if (k in obj) {
      const v = coerceBool(obj[k]);
      if (v !== undefined) flags[k] = v;
    }
  });
}

export function parseFlags(data: any[]): FeatureFlags {
  const flags = { ...DEFAULTS };

  // ONLY the bundle controls runtime (ignore stale individual keys)
  const bundleRow = (data || []).find((r) => r?.setting_key === BUNDLE_KEY);
  if (bundleRow) {
    let raw = bundleRow.setting_value;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      applyObj(flags, raw as Record<string, unknown>);
      return flags;
    }
  }

  // No bundle yet — fall back to individual keys (first-time / migration)
  (data || []).forEach((row: any) => {
    const key = row?.setting_key as keyof FeatureFlags;
    if (key && key in DEFAULTS) {
      const b = coerceBool(row.setting_value);
      if (b !== undefined) flags[key] = b;
    }
  });
  return flags;
}

export async function getFeatureFlagsAdmin(): Promise<FeatureFlags> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value");
    if (error) {
      console.error("getFeatureFlagsAdmin:", error.message);
      return { ...DEFAULTS };
    }
    return parseFlags(data || []);
  } catch (e: any) {
    console.error("getFeatureFlagsAdmin exception:", e?.message);
    return { ...DEFAULTS };
  }
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return getFeatureFlagsAdmin();
}

export async function writeFeatureFlag(
  key: string,
  value: boolean,
  _userId?: string
): Promise<{ ok: boolean; flags: FeatureFlags; error?: string }> {
  if (!(key in DEFAULTS)) {
    return { ok: false, flags: await getFeatureFlagsAdmin(), error: `Unknown key: ${key}` };
  }

  const supabase = createAdminClient();
  const current = await getFeatureFlagsAdmin();
  const next: FeatureFlags = { ...current, [key as keyof FeatureFlags]: value };

  // Delete + insert bundle (most reliable across schemas)
  await supabase.from("app_settings").delete().eq("setting_key", BUNDLE_KEY);
  const ins = await supabase.from("app_settings").insert({
    setting_key: BUNDLE_KEY,
    setting_value: next as any,
  });

  if (ins.error) {
    const up = await supabase.from("app_settings").upsert(
      { setting_key: BUNDLE_KEY, setting_value: next as any },
      { onConflict: "setting_key" }
    );
    if (up.error) {
      return { ok: false, flags: current, error: up.error.message };
    }
  }

  // Also write the single key (for admin UI compatibility)
  await supabase.from("app_settings").delete().eq("setting_key", key);
  await supabase.from("app_settings").insert({
    setting_key: key,
    setting_value: value as any,
  });

  const verified = await getFeatureFlagsAdmin();
  // Ensure written value stuck
  if ((verified as any)[key] !== value) {
    return {
      ok: false,
      flags: verified,
      error: `Write did not stick for ${key} (got ${(verified as any)[key]})`,
    };
  }
  return { ok: true, flags: verified };
}

/** One-shot: unlock all stages + modules (writes full bundle) */
export async function writeAllFlags(flags: FeatureFlags): Promise<{ ok: boolean; flags: FeatureFlags; error?: string }> {
  const supabase = createAdminClient();
  const next = { ...DEFAULTS, ...flags };
  await supabase.from("app_settings").delete().eq("setting_key", BUNDLE_KEY);
  const ins = await supabase.from("app_settings").insert({
    setting_key: BUNDLE_KEY,
    setting_value: next as any,
  });
  if (ins.error) {
    const up = await supabase.from("app_settings").upsert(
      { setting_key: BUNDLE_KEY, setting_value: next as any },
      { onConflict: "setting_key" }
    );
    if (up.error) return { ok: false, flags: await getFeatureFlagsAdmin(), error: up.error.message };
  }
  return { ok: true, flags: await getFeatureFlagsAdmin() };
}

export function isModuleVisible(
  moduleKey: string,
  flags: FeatureFlags,
  role?: string | null
): boolean {
  if (role === "super_admin") return true;

  const stage = MODULE_STAGE[moduleKey] ?? 1;
  if (stage === 1 && flags.stage_1_enabled === false) return false;
  if (stage === 2 && flags.stage_2_enabled === false) return false;
  if (stage === 3 && flags.stage_3_enabled === false) return false;

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

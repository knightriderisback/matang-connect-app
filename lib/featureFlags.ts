import { createAdminClient } from "./supabase/admin";

export interface FeatureFlags {
  stage_1_enabled: boolean;
  stage_2_enabled: boolean;
  stage_3_enabled: boolean;
  // 1. Core identity & access
  registration_enabled: boolean;
  login_enabled: boolean;
  profile_edit_enabled: boolean;
  profile_photo_enabled: boolean;
  mpin_change_self: boolean;
  directory_enabled: boolean;
  directory_filters_enabled: boolean;
  scan_enabled: boolean;
  scan_file_upload: boolean;
  public_qr_profile: boolean;
  // 2. Feed / home
  feed_enabled: boolean;
  feed_images_enabled: boolean;
  feed_member_post_enabled: boolean;
  feed_staff_post_only: boolean;
  feed_whatsapp_share: boolean;
  notices_enabled: boolean;
  // 3. Emergency & care
  sos_enabled: boolean;
  sos_header_button: boolean;
  sos_volunteer_respond: boolean;
  sos_location_share: boolean;
  care_enabled: boolean;
  care_close_staff: boolean;
  // 4. Livelihood & money
  jobs_enabled: boolean;
  jobs_post_enabled: boolean;
  kosh_enabled: boolean;
  kosh_transparency_mode: boolean;
  arthik_enabled: boolean;
  vyapar_enabled: boolean;
  // 5. Community life
  matrimony_enabled: boolean;
  matrimony_share: boolean;
  polls_enabled: boolean;
  polls_create: boolean;
  polls_vote_change_request: boolean;
  rides_enabled: boolean;
  panchang_enabled: boolean;
  panchang_staff_add: boolean;
  dharohar_enabled: boolean;
  mahila_enabled: boolean;
  gaurav_enabled: boolean;
  history_page_enabled: boolean;
  // 6. Census
  census_enabled: boolean;
  census_edit_others: boolean;
  // 7. Recognition
  gamification_enabled: boolean;
  awards_create: boolean;
  leaderboard_enabled: boolean;
  titles_enabled: boolean;
  // 8. Admin tools
  admin_requests_enabled: boolean;
  admin_verify_enabled: boolean;
  admin_directory_enabled: boolean;
  admin_audit_enabled: boolean;
  admin_reset_mpin: boolean;
  admin_seed_demo: boolean;
  // 9. AI & PWA
  ai_member_enabled: boolean;
  ai_god_mode_enabled: boolean;
  pwa_install_prompt: boolean;
  // 10. Cross-cutting
  whatsapp_share_global: boolean;
  language_toggle: boolean;
  services_tab_members: boolean;
}

export const DEFAULTS: FeatureFlags = {
  stage_1_enabled: true,
  stage_2_enabled: true,
  stage_3_enabled: true,
  registration_enabled: true,
  login_enabled: true,
  profile_edit_enabled: true,
  profile_photo_enabled: true,
  mpin_change_self: true,
  directory_enabled: true,
  directory_filters_enabled: true,
  scan_enabled: true,
  scan_file_upload: true,
  public_qr_profile: true,
  feed_enabled: true,
  feed_images_enabled: true,
  feed_member_post_enabled: false,
  feed_staff_post_only: false,
  feed_whatsapp_share: true,
  notices_enabled: true,
  sos_enabled: true,
  sos_header_button: true,
  sos_volunteer_respond: true,
  sos_location_share: true,
  care_enabled: true,
  care_close_staff: true,
  jobs_enabled: true,
  jobs_post_enabled: true,
  kosh_enabled: true,
  kosh_transparency_mode: true,
  arthik_enabled: true,
  vyapar_enabled: true,
  matrimony_enabled: true,
  matrimony_share: true,
  polls_enabled: true,
  polls_create: true,
  polls_vote_change_request: true,
  rides_enabled: true,
  panchang_enabled: true,
  panchang_staff_add: true,
  dharohar_enabled: true,
  mahila_enabled: true,
  gaurav_enabled: true,
  history_page_enabled: true,
  census_enabled: true,
  census_edit_others: true,
  gamification_enabled: true,
  awards_create: true,
  leaderboard_enabled: true,
  titles_enabled: true,
  admin_requests_enabled: true,
  admin_verify_enabled: true,
  admin_directory_enabled: true,
  admin_audit_enabled: true,
  admin_reset_mpin: true,
  admin_seed_demo: true,
  ai_member_enabled: true,
  ai_god_mode_enabled: true,
  pwa_install_prompt: true,
  whatsapp_share_global: true,
  language_toggle: true,
  services_tab_members: true,
};

/** moduleKey → flag key (visibility for members) */
export const MODULE_FLAG: Record<string, keyof FeatureFlags> = {
  census: "census_enabled",
  profile: "profile_edit_enabled",
  directory: "directory_enabled",
  scan: "scan_enabled",
  sos: "sos_enabled",
  jobs: "jobs_enabled",
  notices: "notices_enabled",
  care: "care_enabled",
  kosh: "kosh_enabled",
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
  history: "history_page_enabled",
  feed: "feed_enabled",
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
  role?: string | null,
  matrix?: Record<string, { member?: boolean; volunteer?: boolean; core?: boolean }> | null
): boolean {
  if (role === "super_admin") return true;

  const col: "member" | "volunteer" | "core" =
    role === "core_committee" ? "core" : role === "volunteer" ? "volunteer" : "member";

  // Resolve flag key (module name → flag, or raw flag key)
  const fk = (MODULE_FLAG[moduleKey] || moduleKey) as string;

  // Prefer role matrix whenever present
  if (matrix && typeof matrix === "object") {
    const cell = matrix[fk] || matrix[moduleKey];
    if (cell && typeof cell === "object") {
      // Explicit false/true only — missing role key treated as true for safety on partial data
      if (cell[col] === false) return false;
      if (cell[col] === true) return true;
      // undefined on cell: fall through
    }
  }

  // Legacy boolean flags
  const flagKey = MODULE_FLAG[moduleKey];
  if (flagKey) return flags[flagKey] !== false;
  if (fk in flags) return (flags as any)[fk] !== false;
  // Unknown module keys: allow (unless matrix said false above)
  return true;
}

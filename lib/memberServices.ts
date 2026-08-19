/**
 * Global allowlist for normal members' Services + sync to personal member_flags.
 * Personal overrides (Directory → member) apply only after explicit per-user toggle.
 */
import { createAdminClient } from "./supabase/admin";

export const ALL_MEMBER_MODULE_KEYS = [
  "census",
  "sos",
  "care",
  "jobs",
  "kosh",
  "matrimony",
  "vyapar",
  "rides",
  "polls",
  "panchang",
  "dharohar",
  "mahila",
  "arthik",
  "gaurav",
  "gamification",
  "scan",
] as const;

export type MemberModuleKey = (typeof ALL_MEMBER_MODULE_KEYS)[number];

export const ALLOWLIST_KEY = "member_services_allowlist";

/** module key → feature flag key stored in member_flags:{userId} */
export const MODULE_TO_FLAG: Record<string, string> = {
  census: "stage_1_enabled",
  sos: "sos_enabled",
  care: "care_enabled",
  jobs: "jobs_enabled",
  kosh: "kosh_transparency_mode",
  matrimony: "matrimony_enabled",
  vyapar: "vyapar_enabled",
  rides: "rides_enabled",
  polls: "polls_enabled",
  panchang: "panchang_enabled",
  dharohar: "dharohar_enabled",
  mahila: "mahila_enabled",
  arthik: "arthik_enabled",
  gaurav: "gaurav_enabled",
  gamification: "gamification_enabled",
  scan: "scan_enabled",
};

export const DEFAULT_ALLOWLIST: string[] = [...ALL_MEMBER_MODULE_KEYS];

export async function getMemberAllowlist(): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", ALLOWLIST_KEY)
      .maybeSingle();
    if (error || data == null) return [...DEFAULT_ALLOWLIST];
    const v = data.setting_value;
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    if (typeof v === "string") {
      try {
        const p = JSON.parse(v);
        if (Array.isArray(p)) return p.map(String);
      } catch {
        /* ignore */
      }
    }
    return [...DEFAULT_ALLOWLIST];
  } catch {
    return [...DEFAULT_ALLOWLIST];
  }
}

/** Push global module on/off into every personal member_flags row */
async function syncPersonalFlagsToGlobal(keys: string[]) {
  const supabase = createAdminClient();
  const allowed = new Set(keys);

  // Build flag map for all known modules
  const flagValues: Record<string, boolean> = {};
  for (const mod of ALL_MEMBER_MODULE_KEYS) {
    const fk = MODULE_TO_FLAG[mod];
    if (fk) flagValues[fk] = allowed.has(mod);
  }

  const { data: rows } = await supabase
    .from("app_settings")
    .select("setting_key, setting_value")
    .like("setting_key", "member_flags:%");

  for (const row of rows || []) {
    const prev =
      row.setting_value && typeof row.setting_value === "object" && !Array.isArray(row.setting_value)
        ? { ...(row.setting_value as Record<string, unknown>) }
        : {};
    // Overwrite module-related flags to match global (personal sync)
    for (const [fk, val] of Object.entries(flagValues)) {
      prev[fk] = val;
    }
    await supabase
      .from("app_settings")
      .update({ setting_value: prev })
      .eq("setting_key", row.setting_key);
  }
}

export async function setMemberAllowlist(
  keys: string[]
): Promise<{ ok: boolean; keys: string[]; error?: string }> {
  const cleaned = keys.filter((k) =>
    (ALL_MEMBER_MODULE_KEYS as readonly string[]).includes(k)
  );
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("app_settings")
    .select("setting_key")
    .eq("setting_key", ALLOWLIST_KEY)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("app_settings")
      .update({ setting_value: cleaned })
      .eq("setting_key", ALLOWLIST_KEY);
    if (error) return { ok: false, keys: cleaned, error: error.message };
  } else {
    const { error } = await supabase.from("app_settings").insert({
      setting_key: ALLOWLIST_KEY,
      setting_value: cleaned,
    });
    if (error) {
      const up = await supabase.from("app_settings").upsert(
        { setting_key: ALLOWLIST_KEY, setting_value: cleaned },
        { onConflict: "setting_key" }
      );
      if (up.error) return { ok: false, keys: cleaned, error: up.error.message };
    }
  }

  // Sync all personal member_flags to match this global list
  try {
    await syncPersonalFlagsToGlobal(cleaned);
  } catch (e: any) {
    console.error("personal sync", e?.message);
  }

  const read = await getMemberAllowlist();
  return { ok: true, keys: read };
}

/**
 * Effective visibility for one user:
 * 1) Start from global allowlist
 * 2) If personal member_flags has explicit module flag, that wins
 */
export async function getEffectiveModulesForUser(userId: string): Promise<string[]> {
  const global = await getMemberAllowlist();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", `member_flags:${userId}`)
    .maybeSingle();

  const personal =
    data?.setting_value && typeof data.setting_value === "object" && !Array.isArray(data.setting_value)
      ? (data.setting_value as Record<string, unknown>)
      : null;

  if (!personal) return global;

  const result: string[] = [];
  for (const mod of ALL_MEMBER_MODULE_KEYS) {
    const fk = MODULE_TO_FLAG[mod];
    if (!fk) continue;
    if (fk in personal) {
      const v = personal[fk];
      const on = v === true || v === "true" || v === 1;
      if (on) result.push(mod);
    } else if (global.includes(mod)) {
      result.push(mod);
    }
  }
  return result;
}

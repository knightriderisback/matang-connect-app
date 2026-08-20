/**
 * WORKING MODEL:
 * 1) GLOBAL allowlist = default for all members
 * 2) PERSONAL = only if Super Admin set override for that person
 *    - no override → follow global
 *    - override true/false → that person only
 * 3) Global ON/OFF does NOT rewrite personal rows
 * 4) "Reset personal overrides" clears overrides so everyone follows global
 */
import { createAdminClient } from "./supabase/admin";

export const ALL_MEMBER_MODULE_KEYS = [
  "census", "sos", "care", "jobs", "kosh", "matrimony", "vyapar", "rides",
  "polls", "panchang", "dharohar", "mahila", "arthik", "gaurav", "gamification", "scan",
] as const;

export const ALLOWLIST_KEY = "member_services_allowlist";

export const MODULE_TO_FLAG: Record<string, string> = {
  census: "census_enabled",
  sos: "sos_enabled",
  care: "care_enabled",
  jobs: "jobs_enabled",
  kosh: "kosh_enabled",
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
      } catch { /* ignore */ }
    }
    return [...DEFAULT_ALLOWLIST];
  } catch {
    return [...DEFAULT_ALLOWLIST];
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
  return { ok: true, keys: await getMemberAllowlist() };
}

export async function getEffectiveModulesForUser(userId: string): Promise<string[]> {
  const global = await getMemberAllowlist();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", `member_flags:${userId}`)
    .maybeSingle();

  const personal =
    data?.setting_value &&
    typeof data.setting_value === "object" &&
    !Array.isArray(data.setting_value)
      ? (data.setting_value as Record<string, unknown>)
      : null;

  if (!personal || Object.keys(personal).length === 0) return global;

  const result: string[] = [];
  for (const mod of ALL_MEMBER_MODULE_KEYS) {
    const fk = MODULE_TO_FLAG[mod];
    if (!fk) continue;
    if (Object.prototype.hasOwnProperty.call(personal, fk)) {
      const v = personal[fk];
      const on = v === true || v === "true" || v === 1 || v === "1";
      if (on) result.push(mod);
    } else if (global.includes(mod)) {
      result.push(mod);
    }
  }
  return result;
}

export async function resetAllPersonalModuleOverrides(): Promise<{
  ok: boolean;
  cleared: number;
  error?: string;
}> {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("app_settings")
    .select("setting_key, setting_value")
    .like("setting_key", "member_flags:%");
  if (error) return { ok: false, cleared: 0, error: error.message };

  const flagKeys = new Set(Object.values(MODULE_TO_FLAG));
  let cleared = 0;
  for (const row of rows || []) {
    if (!row.setting_value || typeof row.setting_value !== "object") continue;
    const prev = { ...(row.setting_value as Record<string, unknown>) };
    let changed = false;
    for (const fk of Array.from(flagKeys)) {
      if (fk in prev) {
        delete prev[fk];
        changed = true;
      }
    }
    if (changed) {
      await supabase
        .from("app_settings")
        .update({ setting_value: prev })
        .eq("setting_key", row.setting_key);
      cleared++;
    }
  }
  return { ok: true, cleared };
}

/**
 * Simple allowlist of module keys visible to normal members.
 * Super Admin edits this via Stage & Feature Control.
 * Stored in app_settings key: member_services_allowlist (jsonb array of strings)
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

/** Default: all modules visible */
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

  // Verify
  const read = await getMemberAllowlist();
  return { ok: true, keys: read };
}

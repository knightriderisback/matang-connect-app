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
};

function parseFlags(data: any[]): FeatureFlags {
  const flags = { ...DEFAULTS };
  data.forEach((row: any) => {
    const key = row.setting_key as keyof FeatureFlags;
    if (key in flags) {
      const v = row.setting_value;
      flags[key] = typeof v === "boolean" ? v : v === true || v === "true";
    }
  });
  return flags;
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const supabase = createClient();
    const { data } = await supabase.from("app_settings").select("setting_key, setting_value");
    if (!data?.length) return { ...DEFAULTS };
    return parseFlags(data);
  } catch {
    return { ...DEFAULTS };
  }
}

export async function getFeatureFlagsAdmin(): Promise<FeatureFlags> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("app_settings").select("setting_key, setting_value");
    if (!data?.length) return { ...DEFAULTS };
    return parseFlags(data);
  } catch {
    return { ...DEFAULTS };
  }
}

export function isModuleVisible(
  moduleKey: string,
  flags: FeatureFlags,
  role?: string | null
): boolean {
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
    rides: "rides_enabled",
    gaurav: "gaurav_enabled",
    gamification: "gamification_enabled",
    kosh: "kosh_transparency_mode",
  };
  const fk = flagMap[moduleKey];
  if (fk && flags[fk] === false) return false;
  return true;
}

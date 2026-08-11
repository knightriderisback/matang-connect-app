import { createClient } from "./supabase/client";
import { createAdminClient } from "./supabase/admin";

export interface FeatureFlags {
  stage_2_enabled: boolean;
  stage_3_enabled: boolean;
  kosh_transparency_mode: boolean;
  sos_enabled: boolean;
  jobs_enabled: boolean;
  notices_enabled: boolean;
  care_enabled: boolean;
  titles_enabled: boolean;
}

const DEFAULTS: FeatureFlags = {
  stage_2_enabled: true,
  stage_3_enabled: false,
  kosh_transparency_mode: true,
  sos_enabled: true,
  jobs_enabled: true,
  notices_enabled: true,
  care_enabled: true,
  titles_enabled: true,
};

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const supabase = createClient();
    const { data } = await supabase.from("app_settings").select("setting_key, setting_value");
    if (!data?.length) return { ...DEFAULTS };
    const flags = { ...DEFAULTS };
    data.forEach((row: any) => {
      const key = row.setting_key as keyof FeatureFlags;
      if (key in flags) {
        const v = row.setting_value;
        flags[key] = typeof v === "boolean" ? v : v === true || v === "true";
      }
    });
    return flags;
  } catch {
    return { ...DEFAULTS };
  }
}

export async function getFeatureFlagsAdmin(): Promise<FeatureFlags> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("app_settings").select("setting_key, setting_value");
    if (!data?.length) return { ...DEFAULTS };
    const flags = { ...DEFAULTS };
    data.forEach((row: any) => {
      const key = row.setting_key as keyof FeatureFlags;
      if (key in flags) {
        const v = row.setting_value;
        flags[key] = typeof v === "boolean" ? v : v === true || v === "true";
      }
    });
    return flags;
  } catch {
    return { ...DEFAULTS };
  }
}

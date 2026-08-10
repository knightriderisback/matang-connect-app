import { createClient } from "./supabase/client";
export interface FeatureFlags { stage_2_enabled: boolean; stage_3_enabled: boolean; kosh_transparency_mode: boolean; sos_enabled: boolean; jobs_enabled: boolean; notices_enabled: boolean; }
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("setting_key, setting_value");
  const defaults: FeatureFlags = { stage_2_enabled: false, stage_3_enabled: false, kosh_transparency_mode: false, sos_enabled: false, jobs_enabled: false, notices_enabled: false };
  if (!data) return defaults;
  const flags = { ...defaults };
  data.forEach((row) => { const key = row.setting_key as keyof FeatureFlags; if (key in flags) flags[key] = row.setting_value as boolean; });
  return flags;
}

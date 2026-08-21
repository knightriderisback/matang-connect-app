import { createAdminClient } from "./supabase/admin";
import { MODULE_FLAG } from "./featureFlags";

export type RoleCol = "member" | "volunteer" | "core";

export type ModuleAccessLists = {
  member: string[];
  volunteer: string[];
  core: string[];
};

export const ACCESS_KEY = "module_access_lists";

/** Module keys used in Services / Admin grids */
export const ALL_MODULE_KEYS = [
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
  "notices",
  "titles",
  "admin_requests",
] as const;

/** Extra flag-style keys (not in Services grid but controllable) */
export const EXTRA_FLAG_KEYS = [
  "ai_member_enabled",
  "ai_god_mode_enabled",
  "feed_enabled",
  "feed_images_enabled",
  "feed_member_post_enabled",
  "services_tab_members",
  "sos_header_button",
  "registration_enabled",
  "profile_edit_enabled",
] as const;

export const ACCESS_SECTIONS: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: "Services & modules",
    items: [
      { key: "census", label: "Census" },
      { key: "sos", label: "SOS" },
      { key: "care", label: "Care" },
      { key: "jobs", label: "Jobs" },
      { key: "kosh", label: "Sahyog / Kosh" },
      { key: "matrimony", label: "Matrimony" },
      { key: "vyapar", label: "Vyapar" },
      { key: "rides", label: "Rides" },
      { key: "polls", label: "Polls" },
      { key: "panchang", label: "Panchang" },
      { key: "dharohar", label: "Dharohar" },
      { key: "mahila", label: "Mahila" },
      { key: "arthik", label: "Arthik" },
      { key: "gaurav", label: "Gaurav" },
      { key: "gamification", label: "Credits / Badges" },
      { key: "scan", label: "QR Scan" },
      { key: "notices", label: "Notices / Feed posts" },
    ],
  },
  {
    title: "App chrome",
    items: [
      { key: "services_tab_members", label: "Services tab (members footer)" },
      { key: "sos_header_button", label: "SOS header button" },
      { key: "ai_member_enabled", label: "Matang AI (members)" },
      { key: "ai_god_mode_enabled", label: "Matang AI God Mode" },
      { key: "feed_images_enabled", label: "Feed image posts" },
      { key: "feed_member_post_enabled", label: "Members can post on Feed" },
      { key: "profile_edit_enabled", label: "Profile edit" },
      { key: "registration_enabled", label: "Registration" },
    ],
  },
  {
    title: "Admin tools",
    items: [
      { key: "admin_requests", label: "All Requests" },
      { key: "titles", label: "City titles" },
      { key: "directory", label: "Directory" },
    ],
  },
];

export function defaultAccessLists(): ModuleAccessLists {
  const all = [
    ...ALL_MODULE_KEYS,
    ...EXTRA_FLAG_KEYS,
    "directory",
  ];
  const uniq = Array.from(new Set(all));
  return {
    member: [...uniq],
    volunteer: [...uniq],
    core: [...uniq],
  };
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map(String).filter(Boolean)));
}

export function normalizeAccess(raw: unknown): ModuleAccessLists {
  const d = defaultAccessLists();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return d;
  const o = raw as Record<string, unknown>;
  return {
    member: Array.isArray(o.member) ? uniq(o.member as string[]) : d.member,
    volunteer: Array.isArray(o.volunteer) ? uniq(o.volunteer as string[]) : d.volunteer,
    core: Array.isArray(o.core) ? uniq(o.core as string[]) : d.core,
  };
}

async function upsert(key: string, value: unknown) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("app_settings")
    .select("setting_key")
    .eq("setting_key", key)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("app_settings")
      .update({ setting_value: value as any })
      .eq("setting_key", key);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("app_settings").insert({
      setting_key: key,
      setting_value: value as any,
    });
    if (error) throw new Error(error.message);
  }
}

export async function getModuleAccessLists(): Promise<ModuleAccessLists> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", ACCESS_KEY)
      .maybeSingle();
    let raw = data?.setting_value;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }
    return normalizeAccess(raw);
  } catch {
    return defaultAccessLists();
  }
}

export async function saveModuleAccessLists(
  lists: ModuleAccessLists
): Promise<ModuleAccessLists> {
  const cleaned = {
    member: uniq(lists.member),
    volunteer: uniq(lists.volunteer),
    core: uniq(lists.core),
  };
  await upsert(ACCESS_KEY, cleaned);
  // verify read-back
  return getModuleAccessLists();
}

export async function setAccessCell(
  key: string,
  role: RoleCol,
  view: boolean
): Promise<ModuleAccessLists> {
  const lists = await getModuleAccessLists();
  const set = new Set(lists[role]);
  if (view) set.add(key);
  else set.delete(key);
  lists[role] = Array.from(set);
  return saveModuleAccessLists(lists);
}

export function roleToAccessCol(role?: string | null): RoleCol | "super_admin" {
  if (role === "super_admin") return "super_admin";
  if (role === "core_committee") return "core";
  if (role === "volunteer") return "volunteer";
  return "member";
}

/** Can this role see this module/flag key? */
export function accessAllows(
  key: string,
  lists: ModuleAccessLists,
  role?: string | null
): boolean {
  if (role === "super_admin") return true;
  const col = roleToAccessCol(role);
  if (col === "super_admin") return true;
  return lists[col].includes(key);
}

/** Map FeatureGate moduleKey → access list key */
export function gateKeyToAccessKey(moduleKey: string): string {
  if (moduleKey in MODULE_FLAG || ALL_MODULE_KEYS.includes(moduleKey as any)) {
    return moduleKey;
  }
  return moduleKey;
}

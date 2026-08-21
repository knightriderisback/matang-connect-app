/** Canonical module keys for Supabase module_role_access RPCs */
export const MODULE_KEYS = [
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
  "directory",
  "services_tab_members",
  "sos_header_button",
  "ai_member_enabled",
  "ai_god_mode_enabled",
  "feed_images_enabled",
  "feed_member_post_enabled",
  "profile_edit_enabled",
  "registration_enabled",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<string, string> = {
  census: "Census",
  sos: "SOS",
  care: "Care",
  jobs: "Jobs",
  kosh: "Sahyog / Kosh",
  matrimony: "Matrimony",
  vyapar: "Vyapar",
  rides: "Rides",
  polls: "Polls",
  panchang: "Panchang",
  dharohar: "Dharohar",
  mahila: "Mahila",
  arthik: "Arthik",
  gaurav: "Gaurav",
  gamification: "Credits / Badges",
  scan: "QR Scan",
  notices: "Notices / Feed",
  titles: "City titles",
  admin_requests: "All Requests",
  directory: "Directory",
  services_tab_members: "Services tab (members)",
  sos_header_button: "SOS header button",
  ai_member_enabled: "Matang AI (members)",
  ai_god_mode_enabled: "Matang AI God Mode",
  feed_images_enabled: "Feed image posts",
  feed_member_post_enabled: "Members can post on Feed",
  profile_edit_enabled: "Profile edit",
  registration_enabled: "Registration",
};

export const MODULE_SECTIONS: { title: string; keys: string[] }[] = [
  {
    title: "Services & community",
    keys: [
      "census", "sos", "care", "jobs", "kosh", "matrimony", "vyapar", "rides",
      "polls", "panchang", "dharohar", "mahila", "arthik", "gaurav", "gamification", "scan", "notices",
    ],
  },
  {
    title: "Chrome & AI",
    keys: [
      "services_tab_members", "sos_header_button", "ai_member_enabled", "ai_god_mode_enabled",
      "feed_images_enabled", "feed_member_post_enabled", "profile_edit_enabled", "registration_enabled",
    ],
  },
  {
    title: "Admin tools",
    keys: ["admin_requests", "titles", "directory"],
  },
];

/** Normalize RPC payload to string[] */
export function normalizeModuleList(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (data.length && typeof data[0] === "string") return data.map(String);
    // [{ module_key, visible }]
    return data
      .filter((r: any) => r && (r.visible === true || r.visible === undefined) && (r.module_key || r.module))
      .map((r: any) => String(r.module_key || r.module));
  }
  if (typeof data === "object") {
    const o = data as any;
    if (Array.isArray(o.modules)) return normalizeModuleList(o.modules);
    if (Array.isArray(o.module_keys)) return normalizeModuleList(o.module_keys);
  }
  return [];
}

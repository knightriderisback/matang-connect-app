import { createAdminClient } from "./supabase/admin";
import { DEFAULTS, MODULE_FLAG, type FeatureFlags } from "./featureFlags";

export type RoleCol = "member" | "volunteer" | "core";

export type RoleAccess = Record<RoleCol, boolean>;

/** flagKey → which roles can View */
export type FeatureRoleMatrix = Record<string, RoleAccess>;

export const MATRIX_KEY = "feature_role_matrix";

/** All flag keys we expose in Feature Control matrix (same as settings UI) */
export const MATRIX_FLAG_KEYS: string[] = [
  "registration_enabled",
  "login_enabled",
  "profile_edit_enabled",
  "profile_photo_enabled",
  "mpin_change_self",
  "directory_enabled",
  "directory_filters_enabled",
  "scan_enabled",
  "scan_file_upload",
  "public_qr_profile",
  "feed_enabled",
  "feed_images_enabled",
  "feed_member_post_enabled",
  "feed_staff_post_only",
  "feed_whatsapp_share",
  "notices_enabled",
  "sos_enabled",
  "sos_header_button",
  "sos_volunteer_respond",
  "sos_location_share",
  "care_enabled",
  "care_close_staff",
  "jobs_enabled",
  "jobs_post_enabled",
  "kosh_enabled",
  "kosh_transparency_mode",
  "arthik_enabled",
  "vyapar_enabled",
  "matrimony_enabled",
  "matrimony_share",
  "polls_enabled",
  "polls_create",
  "polls_vote_change_request",
  "rides_enabled",
  "panchang_enabled",
  "panchang_staff_add",
  "dharohar_enabled",
  "mahila_enabled",
  "gaurav_enabled",
  "history_page_enabled",
  "census_enabled",
  "census_edit_others",
  "gamification_enabled",
  "awards_create",
  "leaderboard_enabled",
  "titles_enabled",
  "admin_requests_enabled",
  "admin_verify_enabled",
  "admin_directory_enabled",
  "admin_audit_enabled",
  "admin_reset_mpin",
  "admin_seed_demo",
  "ai_member_enabled",
  "ai_god_mode_enabled",
  "pwa_install_prompt",
  "whatsapp_share_global",
  "language_toggle",
  "services_tab_members",
];

export const MATRIX_SECTIONS: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: "1. Core identity & access",
    items: [
      { key: "registration_enabled", label: "Registration (naye member)" },
      { key: "login_enabled", label: "Login" },
      { key: "profile_edit_enabled", label: "Profile edit / save" },
      { key: "profile_photo_enabled", label: "Profile photo upload" },
      { key: "mpin_change_self", label: "Self M-PIN change" },
      { key: "directory_enabled", label: "Directory" },
      { key: "directory_filters_enabled", label: "Directory advanced filters" },
      { key: "scan_enabled", label: "QR Scan" },
      { key: "scan_file_upload", label: "Scan — file upload" },
      { key: "public_qr_profile", label: "Public QR profile (/u/...)" },
    ],
  },
  {
    title: "2. Feed / home",
    items: [
      { key: "feed_enabled", label: "Home feed" },
      { key: "feed_images_enabled", label: "Feed image posts" },
      { key: "feed_member_post_enabled", label: "Members can post on Feed" },
      { key: "feed_staff_post_only", label: "Staff-only posting mode" },
      { key: "feed_whatsapp_share", label: "Feed WhatsApp share" },
      { key: "notices_enabled", label: "Notices" },
    ],
  },
  {
    title: "3. Emergency & care",
    items: [
      { key: "sos_enabled", label: "SOS trigger" },
      { key: "sos_header_button", label: "SOS header button" },
      { key: "sos_volunteer_respond", label: "SOS volunteer respond" },
      { key: "sos_location_share", label: "SOS location link" },
      { key: "care_enabled", label: "Care / Vridh Seva" },
      { key: "care_close_staff", label: "Care — staff mark closed" },
    ],
  },
  {
    title: "4. Livelihood & money",
    items: [
      { key: "jobs_enabled", label: "Jobs (Rojgar)" },
      { key: "jobs_post_enabled", label: "Jobs — post new" },
      { key: "kosh_enabled", label: "Sahyog / Kosh" },
      { key: "kosh_transparency_mode", label: "Kosh transparency (amounts)" },
      { key: "arthik_enabled", label: "Arthik / schemes" },
      { key: "vyapar_enabled", label: "Vyapar" },
    ],
  },
  {
    title: "5. Community life",
    items: [
      { key: "matrimony_enabled", label: "Matrimony" },
      { key: "matrimony_share", label: "Matrimony WhatsApp share" },
      { key: "polls_enabled", label: "Polls" },
      { key: "polls_create", label: "Polls — create" },
      { key: "polls_vote_change_request", label: "Polls — vote change request" },
      { key: "rides_enabled", label: "Ride sharing" },
      { key: "panchang_enabled", label: "Panchang" },
      { key: "panchang_staff_add", label: "Panchang — staff add festival" },
      { key: "dharohar_enabled", label: "Dharohar" },
      { key: "mahila_enabled", label: "Mahila Shakti" },
      { key: "gaurav_enabled", label: "Matang Gaurav" },
      { key: "history_page_enabled", label: "History page" },
    ],
  },
  {
    title: "6. Census & data",
    items: [
      { key: "census_enabled", label: "Census" },
      { key: "census_edit_others", label: "Census — edit others (staff)" },
    ],
  },
  {
    title: "7. Recognition",
    items: [
      { key: "gamification_enabled", label: "Points / badges page" },
      { key: "awards_create", label: "Create awards" },
      { key: "leaderboard_enabled", label: "Leaderboard" },
      { key: "titles_enabled", label: "City titles" },
    ],
  },
  {
    title: "8. Admin tools (staff visibility)",
    items: [
      { key: "admin_requests_enabled", label: "All Requests inbox" },
      { key: "admin_verify_enabled", label: "Verify users" },
      { key: "admin_directory_enabled", label: "Admin directory tool" },
      { key: "admin_audit_enabled", label: "Audit log" },
      { key: "admin_reset_mpin", label: "Reset M-PIN tool" },
      { key: "admin_seed_demo", label: "Demo seed button" },
    ],
  },
  {
    title: "9. AI & PWA",
    items: [
      { key: "ai_member_enabled", label: "Matang AI (members)" },
      { key: "ai_god_mode_enabled", label: "Matang AI God-Mode (super admin)" },
      { key: "pwa_install_prompt", label: "PWA install prompt" },
    ],
  },
  {
    title: "10. Cross-cutting UX",
    items: [
      { key: "whatsapp_share_global", label: "App-wide WhatsApp share" },
      { key: "language_toggle", label: "Language toggle" },
      { key: "services_tab_members", label: "Services tab (normal members)" },
    ],
  },
];

export function defaultMatrix(): FeatureRoleMatrix {
  const m: FeatureRoleMatrix = {};
  for (const key of MATRIX_FLAG_KEYS) {
    // God mode: hide for member/vol by default
    if (key === "ai_god_mode_enabled") {
      m[key] = { member: false, volunteer: false, core: false };
      continue;
    }
    // Admin tools: member hide by default
    if (key.startsWith("admin_")) {
      m[key] = { member: false, volunteer: true, core: true };
      continue;
    }
    m[key] = { member: true, volunteer: true, core: true };
  }
  return m;
}

function normalizeMatrix(raw: unknown): FeatureRoleMatrix {
  const base = defaultMatrix();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const src = raw as Record<string, unknown>;
  for (const key of MATRIX_FLAG_KEYS) {
    const cell = src[key];
    if (cell && typeof cell === "object" && !Array.isArray(cell)) {
      const c = cell as Record<string, unknown>;
      base[key] = {
        member: c.member !== false,
        volunteer: c.volunteer !== false,
        core: c.core !== false,
      };
      // respect explicit false
      if (typeof c.member === "boolean") base[key].member = c.member;
      if (typeof c.volunteer === "boolean") base[key].volunteer = c.volunteer;
      if (typeof c.core === "boolean") base[key].core = c.core;
    } else if (typeof cell === "boolean") {
      // legacy flat true/false → all roles
      base[key] = { member: cell, volunteer: cell, core: cell };
    }
  }
  return base;
}

export async function getFeatureRoleMatrix(): Promise<FeatureRoleMatrix> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", MATRIX_KEY)
      .maybeSingle();
    let raw = data?.setting_value;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }
    return normalizeMatrix(raw);
  } catch {
    return defaultMatrix();
  }
}

/** Module keys (census, sos, …) visible to normal members — derived from matrix */
export const MEMBER_ALLOWLIST_KEY = "member_visible_modules";

export function memberModulesFromMatrix(matrix: FeatureRoleMatrix): string[] {
  const mods: string[] = [];
  for (const [mod, fk] of Object.entries(MODULE_FLAG)) {
    const cell = matrix[fk as string];
    if (!cell || cell.member !== false) mods.push(mod);
  }
  // extras not in MODULE_FLAG but in services
  for (const extra of ["scan", "gaurav", "gamification"] as const) {
    if (!mods.includes(extra)) {
      const fk = MODULE_FLAG[extra];
      if (fk && matrix[fk]?.member !== false) mods.push(extra);
    }
  }
  return Array.from(new Set(mods));
}

async function upsertSetting(key: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
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
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("app_settings").insert({
      setting_key: key,
      setting_value: value as any,
    });
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function setFeatureRoleMatrix(
  matrix: FeatureRoleMatrix
): Promise<{ ok: boolean; error?: string }> {
  const cleaned = normalizeMatrix(matrix);
  const saved = await upsertSetting(MATRIX_KEY, cleaned);
  if (!saved.ok) return saved;
  // Dual-write member module allowlist for Services grid (reliable)
  const mods = memberModulesFromMatrix(cleaned);
  const al = await upsertSetting(MEMBER_ALLOWLIST_KEY, mods);
  if (!al.ok) return { ok: false, error: al.error || "allowlist save failed" };
  return { ok: true };
}

export async function getMemberVisibleModules(): Promise<string[]> {
  // Always derive from matrix (never stale allowlist cache) so View can turn back ON
  try {
    const matrix = await getFeatureRoleMatrix();
    return memberModulesFromMatrix(matrix);
  } catch {
    return memberModulesFromMatrix(defaultMatrix());
  }
}

export async function setMatrixCell(
  flagKey: string,
  role: RoleCol,
  view: boolean
): Promise<{ ok: boolean; matrix: FeatureRoleMatrix; memberModules: string[]; error?: string }> {
  const matrix = await getFeatureRoleMatrix();
  const prev = matrix[flagKey] || { member: true, volunteer: true, core: true };
  matrix[flagKey] = {
    member: role === "member" ? view : prev.member !== false,
    volunteer: role === "volunteer" ? view : prev.volunteer !== false,
    core: role === "core" ? view : prev.core !== false,
  };
  // ensure booleans
  matrix[flagKey].member = role === "member" ? !!view : !!matrix[flagKey].member;
  matrix[flagKey].volunteer = role === "volunteer" ? !!view : !!matrix[flagKey].volunteer;
  matrix[flagKey].core = role === "core" ? !!view : !!matrix[flagKey].core;

  const saved = await setFeatureRoleMatrix(matrix);
  const fresh = await getFeatureRoleMatrix();
  const memberModules = memberModulesFromMatrix(fresh);
  if (!saved.ok) return { ok: false, matrix: fresh, memberModules, error: saved.error };
  return { ok: true, matrix: fresh, memberModules };
}

export function roleToCol(role?: string | null): RoleCol | "super_admin" {
  if (role === "super_admin") return "super_admin";
  if (role === "core_committee") return "core";
  if (role === "volunteer") return "volunteer";
  return "member";
}

/** moduleKey (census, sos…) or flag key → visible for role */
export function isVisibleForRole(
  moduleOrFlag: string,
  matrix: FeatureRoleMatrix,
  role?: string | null,
  legacyFlags?: FeatureFlags
): boolean {
  if (role === "super_admin") return true;
  const col = roleToCol(role);
  if (col === "super_admin") return true;

  // Resolve to flag key
  let flagKey = moduleOrFlag;
  if (moduleOrFlag in MODULE_FLAG) {
    flagKey = MODULE_FLAG[moduleOrFlag] as string;
  }

  const cell = matrix[flagKey];
  if (cell) {
    return cell[col] !== false;
  }

  // Fallback legacy boolean flags
  if (legacyFlags && flagKey in legacyFlags) {
    return (legacyFlags as any)[flagKey] !== false;
  }
  return true;
}

/** Sync legacy FeatureFlags booleans from matrix (member column as primary for old code) */
export function matrixToLegacyFlags(matrix: FeatureRoleMatrix, base: FeatureFlags): FeatureFlags {
  const next = { ...base };
  for (const key of MATRIX_FLAG_KEYS) {
    if (key in DEFAULTS || (key as string) in (next as any)) {
      const cell = matrix[key];
      if (cell) {
        // Keep true if any role has View (legacy single-bool). Role matrix still authoritative in isModuleVisible.
        (next as any)[key] = cell.member === true || cell.volunteer === true || cell.core === true;
      }
    }
  }
  return next;
}

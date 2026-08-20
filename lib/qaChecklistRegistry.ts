/**
 * QA checklist auto-registry.
 * New modules: add to FeatureFlags + MODULE_FLAG (featureFlags.ts)
 *   → automatically appear in Part 2 of /admin/qa-checklist
 * New admin tools: add to ADMIN_TOOL_ROUTES below (or they stay critical-curated)
 */

import { DEFAULTS, MODULE_FLAG, type FeatureFlags } from "@/lib/featureFlags";
import { ALL_MEMBER_MODULE_KEYS } from "@/lib/memberServices";

/** Curated smoke — do not auto-bloat; edit only when product-critical */
export const CRITICAL_SMOKE: string[] = [
  "Login works (phone + M-PIN numeric keyboard)",
  "Register ke baad SAME credentials se login success",
  "Refresh ke baad session rehti hai",
  "Home/feed load; scroll pe blank nahi",
  "Header: MATANG CONNECT + name/role",
  "Normal footer: Home · Profile · Services ONLY",
  "Staff footer: Home · Profile · Admin (no Census)",
  "Profile EDIT → SAVE → reload pe data same",
  "M-PIN change YA admin reset → naya PIN se login",
  "Services: flag OFF module normal ko nahi dikhe",
  "Services: flag ON module sahi page khole",
  "Admin Settings: flag toggle → member pe asar",
  "Personal override sirf us user pe (agar use)",
  "SOS trigger + detail (crash nahi)",
  "Scan: QR/file → member card → profile",
  "Feed: author name → profile",
  "Care YA Jobs create 500 nahi",
  "Polls: vote save YA clear error",
  "Panchang calendar + Today",
  "Directory load + 1 filter",
  "All Requests allowed roles pe open",
  "WhatsApp share wa.me open",
  "Language toggle kaam kare",
  "Logout ke baad private → login",
  "Production deploy; Vercel error nahi",
  "Home + Profile pe critical console error nahi",
  "QA Checklist page opens (this page)",
  "Super Admin only pages deny normal user",
  "Admin hub links open without crash",
  "Feature flags bundle loads on /admin/settings",
];

/** Static baseline sections (infra / auth) — always present */
export const BASELINE_SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "A. Environment",
    items: ["HTTPS loads", "Vercel build green", "Supabase env set", "Old cache stuck UI nahi"],
  },
  {
    title: "B. Auth extra",
    items: ["Wrong PIN clear error", "Register + CG cities", "Duplicate phone reject", "Pending behaviour OK"],
  },
  {
    title: "C. Shell UI",
    items: ["Logo 3D correct", "SOS header near language", "Floaters opacity", "PWA install prompt", "Splash real logo"],
  },
  {
    title: "D. Home / Feed",
    items: ["Normal: feed only", "Image posts flag", "Member post flag", "WhatsApp image+text", "SOS short in feed"],
  },
  {
    title: "E. Profile",
    items: ["Photo after save", "Dropdown + Other", "DOB + height cm/ft", "Share + branded WA", "Admin full member view"],
  },
  {
    title: "F. Flags / Stages",
    items: ["Stage 1/2/3 lock", "Module flags save", "URL gated when off", "Reset personal overrides", "Staff admin tools OK"],
  },
];

/** Admin tool routes — add new admin pages here so QA picks them up */
export const ADMIN_TOOL_ROUTES: { path: string; label: string }[] = [
  { path: "/admin", label: "Admin hub" },
  { path: "/admin/requests", label: "All Requests" },
  { path: "/admin/verify", label: "Verify Users" },
  { path: "/admin/reset-mpin", label: "Reset M-PIN" },
  { path: "/admin/titles", label: "City Titles" },
  { path: "/admin/directory", label: "Directory" },
  { path: "/admin/audit", label: "Audit Log" },
  { path: "/admin/settings", label: "Stage Lock / Feature Flags" },
  { path: "/admin/qa-checklist", label: "QA Checklist" },
];

/** Main app routes for modules (moduleKey → path) — extend when new page added */
export const MODULE_ROUTES: Record<string, string> = {
  census: "/census",
  sos: "/sos",
  care: "/care",
  jobs: "/jobs",
  notices: "/notices",
  kosh: "/kosh",
  titles: "/admin/titles",
  vyapar: "/vyapar",
  matrimony: "/matrimony",
  dharohar: "/dharohar",
  panchang: "/panchang",
  mahila: "/mahila",
  polls: "/polls",
  arthik: "/arthik",
  scan: "/scan",
  rides: "/rides",
  gaurav: "/gaurav",
  gamification: "/badges",
  admin_requests: "/admin/requests",
  profile: "/profile",
  directory: "/admin/directory",
};

const FLAG_LABELS: Partial<Record<keyof FeatureFlags, string>> = {
  stage_1_enabled: "Stage 1",
  stage_2_enabled: "Stage 2",
  stage_3_enabled: "Stage 3",
  kosh_transparency_mode: "Kosh transparency",
  sos_enabled: "SOS",
  jobs_enabled: "Jobs",
  notices_enabled: "Notices",
  care_enabled: "Care",
  titles_enabled: "Titles",
  vyapar_enabled: "Vyapar",
  matrimony_enabled: "Matrimony",
  dharohar_enabled: "Dharohar",
  panchang_enabled: "Panchang",
  mahila_enabled: "Mahila",
  polls_enabled: "Polls",
  arthik_enabled: "Arthik",
  scan_enabled: "Scan",
  rides_enabled: "Rides",
  gaurav_enabled: "Gaurav",
  gamification_enabled: "Credits / Badges",
  ai_member_enabled: "Member AI",
  ai_god_mode_enabled: "AI God Mode",
  feed_images_enabled: "Feed images",
  feed_member_post_enabled: "Member feed post",
  admin_requests_enabled: "All Requests flag",
};

function titleCaseModule(key: string) {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Auto-built from FeatureFlags keys + MODULE_FLAG + MODULE_ROUTES + ADMIN_TOOL_ROUTES */
export function buildDynamicSections(): { title: string; items: string[] }[] {
  const sections: { title: string; items: string[] }[] = [...BASELINE_SECTIONS];

  // Auto: every feature flag
  const flagItems = (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).map((k) => {
    const name = FLAG_LABELS[k] || titleCaseModule(k);
    return `Flag "${name}" (${k}): toggle save + member effect checked`;
  });
  sections.push({ title: "Auto · Feature flags (from code)", items: flagItems });

  // Auto: every module in MODULE_FLAG
  const moduleItems = Object.keys(MODULE_FLAG).map((mod) => {
    const path = MODULE_ROUTES[mod] || `/${mod}`;
    return `Module "${titleCaseModule(mod)}" → open ${path} (no crash)`;
  });
  // member services keys not already in MODULE_FLAG
  for (const mod of ALL_MEMBER_MODULE_KEYS) {
    if (!(mod in MODULE_FLAG)) {
      const path = MODULE_ROUTES[mod] || `/${mod}`;
      moduleItems.push(`Member service "${titleCaseModule(mod)}" → ${path}`);
    }
  }
  sections.push({ title: "Auto · Modules / pages (from code)", items: moduleItems });

  // Auto: admin tools
  sections.push({
    title: "Auto · Admin tools (from registry)",
    items: ADMIN_TOOL_ROUTES.map(
      (r) => `Admin tool "${r.label}" → ${r.path} opens (SA/staff as designed)`
    ),
  });

  // Auto: AI + feed extras
  sections.push({
    title: "Auto · Cross-cutting",
    items: [
      "Member AI responds (if ai_member_enabled)",
      "God Mode SA only (if ai_god_mode_enabled)",
      "Admin/AI load acceptable",
      "Mobile 375px no major overflow",
      "Normal denied /admin/settings + /admin/qa-checklist",
    ],
  });

  return sections;
}

export function allChecklistIds(): { id: string; label: string; critical: boolean }[] {
  const ids: { id: string; label: string; critical: boolean }[] = [];
  CRITICAL_SMOKE.forEach((label, i) => ids.push({ id: `c${i}`, label, critical: true }));
  buildDynamicSections().forEach((sec, si) => {
    sec.items.forEach((label, ti) => {
      ids.push({ id: `s${si}_${ti}`, label: `${sec.title}: ${label}`, critical: false });
    });
  });
  return ids;
}

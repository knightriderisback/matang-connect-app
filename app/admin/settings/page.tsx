"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Settings } from "lucide-react";

type Flags = Record<string, boolean>;

/** Category → flag key → label (full control list) */
const MODULE_SECTIONS: { title: string; items: { key: string; label: string }[] }[] = [
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

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [flags, setFlags] = useState<Flags>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setFlags(d.flags || {}))
      .catch(() => toast("Failed to load settings", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const toggle = async (key: string, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Could not update", "error");
        setFlags((prev) => ({ ...prev, [key]: !value }));
        return;
      }
      if (data.flags && typeof data.flags === "object") {
        setFlags((prev) => ({ ...prev, ...data.flags }));
      }
      toast(`${key}: ${value ? "ON" : "OFF"}`, "success");
    } catch {
      toast("Network error", "error");
      setFlags((prev) => ({ ...prev, [key]: !value }));
    }
  };

  if (!user || user.role !== "super_admin") {
    return <div className="p-4 text-center text-sm text-gray-500">Super Admin only</div>;
  }

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-2">
        <Settings className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">Feature Control</h1>
      </div>
      <p className="text-xs text-gray-500">
        Maximum fine-grained modules (category-wise). Super Admin always full access. Members / staff
        flows in-app gradually respect these flags.
      </p>

      {loading && <p className="text-center text-gray-400 text-sm">Loading…</p>}

      {MODULE_SECTIONS.map((sec) => (
        <div key={sec.title}>
          <h2 className="text-sm font-bold text-matang-navy mb-2 sticky top-0 bg-gray-50/95 backdrop-blur py-1 z-[1]">
            {sec.title}
          </h2>
          <div className="space-y-2">
            {sec.items.map(({ key, label }) => (
              <Card key={key}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-matang-navy block">{label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{key}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(key, !flags[key])}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                      flags[key] ? "bg-matang-gold" : "bg-gray-300"
                    }`}
                    aria-label={label}
                  >
                    <span
                      className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                        flags[key] ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

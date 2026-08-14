"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Settings, Lock, Unlock } from "lucide-react";

type Flags = Record<string, boolean>;

const STAGE_KEYS = [
  { key: "stage_1_enabled", label: "Stage 1 — Foundation", desc: "Census, Digital ID, Directory, Profile, QR Scan (staff)" },
  { key: "stage_2_enabled", label: "Stage 2 — Support System", desc: "SOS, Jobs, Notices, Care, Kosh" },
  { key: "stage_3_enabled", label: "Stage 3 — Expansion", desc: "Vyapar, Matrimony, Dharohar, Rides, Gaurav, Gamification…" },
];

const MODULE_LABELS: Record<string, string> = {
  sos_enabled: "SOS / Emergency",
  jobs_enabled: "Jobs (Rojgar)",
  notices_enabled: "Notices / Feed",
  feed_images_enabled: "Feed image posts",
  feed_member_post_enabled: "Members can post on Feed",
  care_enabled: "Care / Vridh Seva",
  kosh_transparency_mode: "Kosh transparency",
  titles_enabled: "City titles",
  vyapar_enabled: "Vyapar",
  matrimony_enabled: "Matrimony",
  dharohar_enabled: "Dharohar",
  panchang_enabled: "Panchang",
  mahila_enabled: "Mahila Shakti",
  polls_enabled: "Polls",
  arthik_enabled: "Arthik / Portfolio",
  scan_enabled: "QR Scan (Volunteer / Core / Super Admin)",
  rides_enabled: "Ride sharing",
  gaurav_enabled: "Matang Gaurav",
  gamification_enabled: "Volunteer points & badges",
  ai_member_enabled: "Matang AI (members)",
  ai_god_mode_enabled: "Matang AI God-Mode (super admin)",
};

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
  }, []);

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
      toast(`${key}: ${value ? "UNLOCKED / ON" : "LOCKED / OFF"}`, "success");
    } catch {
      toast("Network error", "error");
      setFlags((prev) => ({ ...prev, [key]: !value }));
    }
  };

  if (!user || user.role !== "super_admin") {
    return <div className="p-4 text-center text-sm text-gray-500">Super Admin only</div>;
  }

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Settings className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">Stage & Feature Control</h1>
      </div>
      <p className="text-xs text-gray-500">
        Stages control what <strong>members</strong> see. Super Admin always has full access.
        Lock a stage to hide those modules from normal users until the pilot is ready.
      </p>

      {loading && <p className="text-center text-gray-400">Loading...</p>}

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2 flex items-center gap-1">
          <Lock size={14} /> Stage rollout (members)
        </h2>
        <div className="space-y-2">
          {STAGE_KEYS.map((s) => (
            <Card key={s.key} className="border-matang-gold/30">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-matang-navy">{s.label}</p>
                  <p className="text-[11px] text-gray-500">{s.desc}</p>
                </div>
                <button
                  onClick={() => toggle(s.key, !flags[s.key])}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                    flags[s.key]
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {flags[s.key] ? <Unlock size={12} /> : <Lock size={12} />}
                  {flags[s.key] ? "Unlocked" : "Locked"}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">Fine-grained modules</h2>
        <div className="space-y-2">
          {Object.keys(MODULE_LABELS).map((key) => (
            <Card key={key}>
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-matang-navy">{MODULE_LABELS[key]}</span>
                <button
                  onClick={() => toggle(key, !flags[key])}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    flags[key] ? "bg-matang-gold" : "bg-gray-300"
                  }`}
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
    </div>
  );
}

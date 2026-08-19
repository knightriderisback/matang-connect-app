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
  admin_requests_enabled: "All Requests inbox",
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
  const [memberKeys, setMemberKeys] = useState<string[]>([]);
  const [allMemberKeys, setAllMemberKeys] = useState<string[]>([]);


  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setFlags(d.flags || {}))
      .catch(() => toast("Failed to load settings", "error"))
      .finally(() => setLoading(false));
    fetch("/api/member-services", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setMemberKeys(Array.isArray(d.keys) ? d.keys : []);
        setAllMemberKeys(Array.isArray(d.all) ? d.all : []);
      })
      .catch(() => {});
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

      <button
        type="button"
        onClick={async () => {
          try {
            const res = await fetch("/api/admin/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "unlock_all" }),
            });
            const data = await res.json();
            if (!res.ok) {
              toast(data.error || "Failed", "error");
              return;
            }
            if (data.flags) setFlags(data.flags);
            toast("All stages & modules unlocked for members", "success");
          } catch {
            toast("Network error", "error");
          }
        }}
        className="w-full py-2.5 rounded-xl bg-matang-navy text-matang-gold text-sm font-semibold"
      >
        Unlock ALL stages + modules for members
      </button>

      <div className="p-4 rounded-2xl border-2 border-matang-gold/40 bg-white space-y-3">
        <h2 className="text-sm font-bold text-matang-navy">Member Services (show / hide)</h2>
        <p className="text-[11px] text-gray-500">
          Global list for members&apos; Services. ON/OFF also syncs every member&apos;s personal flags. After that, Directory → person pe personal override alag se.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 py-2 rounded-xl bg-matang-navy text-matang-gold text-xs font-semibold"
            onClick={async () => {
              const res = await fetch("/api/member-services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "enable_all" }),
              });
              const d = await res.json();
              if (!res.ok) return toast(d.error || "Failed", "error");
              setMemberKeys(d.keys || []);
              toast("All services ON for members", "success");
            }}
          >
            Enable all
          </button>
          <button
            type="button"
            className="flex-1 py-2 rounded-xl border text-xs font-semibold text-matang-navy"
            onClick={async () => {
              const res = await fetch("/api/member-services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "disable_all" }),
              });
              const d = await res.json();
              if (!res.ok) return toast(d.error || "Failed", "error");
              setMemberKeys(d.keys || []);
              toast("All services OFF for members", "success");
            }}
          >
            Disable all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(allMemberKeys.length ? allMemberKeys : [
            "census","sos","care","jobs","kosh","matrimony","vyapar","rides","polls","panchang","dharohar","mahila","arthik","gaurav","gamification","scan"
          ]).map((key) => {
            const on = memberKeys.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/member-services", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "toggle", key, value: !on }),
                  });
                  const d = await res.json();
                  if (!res.ok) return toast(d.error || "Failed", "error");
                  setMemberKeys(d.keys || []);
                  toast(`${key}: ${!on ? "ON" : "OFF"}`, "success");
                }}
                className={`text-left px-3 py-2 rounded-xl border text-xs font-medium ${
                  on ? "bg-matang-gold/20 border-matang-gold text-matang-navy" : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                {on ? "✓ " : "○ "}{key}
              </button>
            );
          })}
        </div>
      </div>



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

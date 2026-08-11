"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Settings } from "lucide-react";

type Flags = Record<string, boolean>;

const LABELS: Record<string, string> = {
  stage_2_enabled: "Stage 2 modules",
  stage_3_enabled: "Stage 3 modules",
  sos_enabled: "SOS / Emergency",
  jobs_enabled: "Jobs board",
  notices_enabled: "Notices",
  care_enabled: "Care requests",
  titles_enabled: "City titles",
  kosh_transparency_mode: "Kosh transparency",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [flags, setFlags] = useState<Flags>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => setFlags(d.flags || {}))
      .catch(() => toast("Failed to load settings", "error"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: string, value: boolean) => {
    setFlags(prev => ({ ...prev, [key]: value }));
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) {
      toast("Could not update", "error");
      setFlags(prev => ({ ...prev, [key]: !value }));
      return;
    }
    toast(`${LABELS[key] || key}: ${value ? "ON" : "OFF"}`, "success");
  };

  if (!user || user.role !== "super_admin") {
    return <div className="p-4 text-center text-sm text-gray-500">Super Admin only</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">Feature Flags</h1>
      </div>
      <p className="text-xs text-gray-500">Toggle modules on/off without redeploying.</p>
      {loading && <p className="text-center text-gray-400">Loading...</p>}
      <div className="space-y-2">
        {Object.keys(LABELS).map(key => (
          <Card key={key}>
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium text-matang-navy">{LABELS[key]}</span>
              <button
                onClick={() => toggle(key, !flags[key])}
                className={`relative w-12 h-7 rounded-full transition-colors ${flags[key] ? "bg-matang-gold" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${flags[key] ? "left-5" : "left-0.5"}`} />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

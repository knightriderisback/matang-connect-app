"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Settings } from "lucide-react";
import {
  MATRIX_SECTIONS,
  defaultMatrix,
  type FeatureRoleMatrix,
  type RoleCol,
} from "@/lib/featureRoleMatrix";

function ViewHideBtn({
  on,
  onClick,
  busy,
}: {
  on: boolean;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`min-w-[4.25rem] px-2.5 py-1.5 rounded-full text-[11px] font-bold transition active:scale-95 disabled:opacity-50 ${
        on
          ? "bg-green-100 text-green-800 border border-green-300"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {on ? "View" : "Hide"}
    </button>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [matrix, setMatrix] = useState<FeatureRoleMatrix>(() => defaultMatrix());
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.matrix) setMatrix(d.matrix);
      })
      .catch(() => toast("Failed to load", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const toggle = async (key: string, role: RoleCol) => {
    const cur = matrix[key]?.[role] !== false;
    const next = !cur;
    setMatrix((prev) => ({
      ...prev,
      [key]: {
        member: prev[key]?.member !== false,
        volunteer: prev[key]?.volunteer !== false,
        core: prev[key]?.core !== false,
        [role]: next,
      },
    }));
    setBusyKey(`${key}:${role}`);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "matrix_cell", key, role, view: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Save failed", "error");
        // revert
        setMatrix((prev) => ({
          ...prev,
          [key]: { ...prev[key], [role]: cur },
        }));
        return;
      }
      if (data.matrix) setMatrix(data.matrix);
      toast(`${next ? "View" : "Hide"} · ${role}`, "success");
    } catch {
      toast("Network error", "error");
      setMatrix((prev) => ({
        ...prev,
        [key]: { ...prev[key], [role]: cur },
      }));
    } finally {
      setBusyKey(null);
    }
  };

  if (!user || user.role !== "super_admin") {
    return <div className="p-4 text-center text-sm text-gray-500">Super Admin only</div>;
  }

  const counts = { member: 0, volunteer: 0, core: 0 };
  Object.values(matrix).forEach((c) => {
    if (c?.member) counts.member++;
    if (c?.volunteer) counts.volunteer++;
    if (c?.core) counts.core++;
  });

  return (
    <div className="p-3 space-y-4 max-w-3xl mx-auto pb-28">
      <div className="flex items-center gap-2">
        <Settings className="text-matang-gold" size={22} />
        <div>
          <h1 className="text-lg font-bold text-matang-navy">Feature Control</h1>
          <p className="text-[11px] text-gray-500">
            View = dikhe · Hide = chhupe. Member → Services · Vol/Core → Admin. Super Admin always full.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-matang-navy text-matang-gold px-3 py-2 text-[11px] font-semibold flex flex-wrap gap-3">
        <span>Member View: {counts.member}</span>
        <span>Volunteer View: {counts.volunteer}</span>
        <span>Core View: {counts.core}</span>
      </div>

      {/* sticky col headers */}
      <div className="sticky top-0 z-10 grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] gap-1 bg-gray-50/95 backdrop-blur border-b border-gray-200 py-2 px-1 text-[10px] font-bold text-matang-navy text-center">
        <div className="text-left pl-1">Feature</div>
        <div>Member</div>
        <div>Vol</div>
        <div>Core</div>
      </div>

      {loading && <p className="text-center text-gray-400 text-sm">Loading…</p>}

      {MATRIX_SECTIONS.map((sec) => (
        <div key={sec.title} className="space-y-1">
          <h2 className="text-xs font-bold text-matang-navy pt-2 pb-1">{sec.title}</h2>
          {sec.items.map(({ key, label }) => {
            const cell = matrix[key] || { member: true, volunteer: true, core: true };
            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] gap-1 items-center bg-white rounded-xl border border-gray-100 px-2 py-2"
              >
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-medium text-matang-navy leading-tight truncate">{label}</p>
                  <p className="text-[9px] text-gray-400 font-mono truncate">{key}</p>
                </div>
                {(["member", "volunteer", "core"] as RoleCol[]).map((role) => (
                  <div key={role} className="flex justify-center">
                    <ViewHideBtn
                      on={cell[role] !== false}
                      busy={busyKey === `${key}:${role}`}
                      onClick={() => toggle(key, role)}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

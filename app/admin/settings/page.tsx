"use client";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Settings, Search, RotateCcw, Unlock } from "lucide-react";
import {
  MATRIX_SECTIONS,
  MATRIX_LABELS,
  MATRIX_FLAG_KEYS,
  type RoleCol,
  type FeatureRoleMatrix,
  defaultMatrix,
} from "@/lib/featureRoleMatrix";

type CellMap = Record<string, { member: boolean; volunteer: boolean; core: boolean }>;

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
  const [matrix, setMatrix] = useState<CellMap>(() => defaultMatrix());
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError("");
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Load failed");
        if (d.matrix) setMatrix(d.matrix);
      })
      .catch((e) => {
        setLoadError(e.message || "Failed");
        toast(e.message || "Failed to load settings", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (key: string, role: RoleCol) => {
    const cur = matrix[key]?.[role] === true;
    const next = !cur;
    setMatrix((prev) => ({
      ...prev,
      [key]: { ...prev[key], [role]: next },
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
        load();
        return;
      }
      if (data.matrix) setMatrix(data.matrix);
      toast(`${MATRIX_LABELS[key] || key}: ${next ? "View" : "Hide"} (${role})`, "success");
    } catch {
      toast("Network error", "error");
      load();
    } finally {
      setBusyKey(null);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm("Reset all roles to default settings?")) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "matrix_reset" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reset failed");
      if (data.matrix) setMatrix(data.matrix);
      toast("Feature matrix reset to defaults", "success");
    } catch (e: any) {
      toast(e.message || "Reset failed", "error");
    } finally {
      setActionBusy(false);
    }
  };

  const handleUnlockAll = async () => {
    if (!confirm("Unlock all features for all roles?")) return;
    setActionBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock_all" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unlock failed");
      if (data.matrix) setMatrix(data.matrix);
      toast("All features unlocked for all roles", "success");
    } catch (e: any) {
      toast(e.message || "Unlock failed", "error");
    } finally {
      setActionBusy(false);
    }
  };

  const counts = useMemo(() => {
    const c = { member: 0, volunteer: 0, core: 0 };
    Object.values(matrix).forEach((row) => {
      if (row.member) c.member++;
      if (row.volunteer) c.volunteer++;
      if (row.core) c.core++;
    });
    return c;
  }, [matrix]);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return MATRIX_SECTIONS;
    const q = search.trim().toLowerCase();
    return MATRIX_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (it) =>
          it.key.toLowerCase().includes(q) ||
          it.label.toLowerCase().includes(q) ||
          sec.title.toLowerCase().includes(q)
      ),
    })).filter((sec) => sec.items.length > 0);
  }, [search]);

  if (!user || user.role !== "super_admin") {
    return <div className="p-4 text-center text-sm text-gray-500">Super Admin only</div>;
  }

  return (
    <div className="p-3 space-y-4 max-w-3xl mx-auto pb-28">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings className="text-matang-gold" size={24} />
          <div>
            <h1 className="text-lg font-bold text-matang-navy">Feature Control</h1>
            <p className="text-[11px] text-gray-500">
              Category level: Member · Volunteer · Core · Changes apply to everyone in that category
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={actionBusy}
            onClick={handleResetDefaults}
            className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg border border-gray-200 transition"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            type="button"
            disabled={actionBusy}
            onClick={handleUnlockAll}
            className="flex items-center gap-1 text-[11px] font-semibold text-matang-navy bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition"
          >
            <Unlock size={12} /> Unlock all
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-matang-navy text-matang-gold px-3 py-2 text-[11px] font-semibold flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-3">
          <span>Member: {counts.member} / {MATRIX_FLAG_KEYS.length}</span>
          <span>Volunteer: {counts.volunteer} / {MATRIX_FLAG_KEYS.length}</span>
          <span>Core: {counts.core} / {MATRIX_FLAG_KEYS.length}</span>
        </div>
        <span className="text-white/60 text-[10px]">Total: {MATRIX_FLAG_KEYS.length} features</span>
      </div>

      {loadError && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{loadError}</p>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search features by name or key…"
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-matang-gold"
        />
      </div>

      <div className="sticky top-0 z-10 grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] gap-1 bg-gray-50/95 backdrop-blur border-b border-gray-200 py-2 px-1 text-[10px] font-bold text-matang-navy text-center">
        <div className="text-left pl-1">Feature</div>
        <div>Member</div>
        <div>Vol</div>
        <div>Core</div>
      </div>

      {loading && <p className="text-center text-gray-400 text-sm py-4">Loading features…</p>}

      {filteredSections.map((sec) => (
        <div key={sec.title} className="space-y-1">
          <h2 className="text-xs font-bold text-matang-navy pt-2 pb-1 border-b border-gray-100">
            {sec.title} ({sec.items.length})
          </h2>
          {sec.items.map((item) => {
            const cell = matrix[item.key] || { member: false, volunteer: false, core: false };
            return (
              <div
                key={item.key}
                className="grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] gap-1 items-center bg-white rounded-xl border border-gray-100 px-2 py-2 hover:border-gray-200 transition"
              >
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-medium text-matang-navy leading-tight truncate">
                    {item.label}
                  </p>
                  <p className="text-[9px] text-gray-400 font-mono truncate">{item.key}</p>
                </div>
                {(["member", "volunteer", "core"] as RoleCol[]).map((role) => (
                  <div key={role} className="flex justify-center">
                    <ViewHideBtn
                      on={cell[role] === true}
                      busy={busyKey === `${item.key}:${role}`}
                      onClick={() => toggle(item.key, role)}
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

"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { effectiveRole } from "@/lib/auth/roleCache";
import { Trophy, Award } from "lucide-react";

const POINT_PRESETS = [
  { label: "Community service — 10 pts", points: 10, reason: "Community service" },
  { label: "Event help — 15 pts", points: 15, reason: "Event help" },
  { label: "SOS / emergency support — 25 pts", points: 25, reason: "SOS / emergency support" },
  { label: "Census / data work — 10 pts", points: 10, reason: "Census / data work" },
  { label: "Blood donation coordination — 20 pts", points: 20, reason: "Blood donation coordination" },
  { label: "Leadership / organising — 30 pts", points: 30, reason: "Leadership / organising" },
  { label: "Custom…", points: 0, reason: "custom" },
];

function NameLink({
  id,
  name,
  className,
}: {
  id?: string | null;
  name: string;
  className?: string;
}) {
  const router = useRouter();
  if (!id) return <span className={className}>{name}</span>;
  return (
    <button
      type="button"
      onClick={() => router.push(`/member/${id}`)}
      className={`font-semibold text-matang-navy hover:underline ${className || ""}`}
    >
      {name}
    </button>
  );
}

function BadgesPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const role = effectiveRole(user?.role);
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(role || "");
  const [me, setMe] = useState<any>({ points: 0, badges: [] });
  const [leaders, setLeaders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [presetIdx, setPresetIdx] = useState(0);
  const [award, setAward] = useState({ user_id: "", points: "10", reason: "Community service" });
  const [saving, setSaving] = useState(false);
  const isCustom = POINT_PRESETS[presetIdx]?.reason === "custom";

  const load = () => {
    fetch("/api/points")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.me || { points: 0, badges: [] });
        setLeaders(d.leaders || []);
        setLogs(d.logs || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!isStaff) return;
    fetch("/api/points?users=1")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, [isStaff]);

  const onPreset = (idx: number) => {
    setPresetIdx(idx);
    const p = POINT_PRESETS[idx];
    if (p.reason === "custom") {
      setAward((a) => ({ ...a, points: a.points || "5", reason: "" }));
    } else {
      setAward((a) => ({ ...a, points: String(p.points), reason: p.reason }));
    }
  };

  const submitAward = async () => {
    if (!award.user_id) {
      toast("Select a member", "error");
      return;
    }
    if (!award.points || Number(award.points) < 1) {
      toast("Enter points", "error");
      return;
    }
    if (isCustom && !award.reason.trim()) {
      toast("Enter custom reason", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(award),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      toast(`Awarded — total ${data.points} pts`, "success");
      setPresetIdx(0);
      setAward({ user_id: award.user_id, points: "10", reason: "Community service" });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Trophy className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">Volunteer Credits</h1>
      </div>

      {isStaff && (
        <Card className="border-matang-gold/40 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-matang-navy flex items-center gap-1">
              <Award size={16} className="text-matang-gold" /> Award points
            </p>
            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">Member</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                value={award.user_id}
                onChange={(e) => setAward({ ...award, user_id: e.target.value })}
              >
                <option value="">Select member…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} · {u.phone} · {u.role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">Points for</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                value={presetIdx}
                onChange={(e) => onPreset(Number(e.target.value))}
              >
                {POINT_PRESETS.map((p, i) => (
                  <option key={p.label} value={i}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {isCustom && (
              <>
                <Input
                  label="Custom points"
                  inputMode="numeric"
                  value={award.points}
                  onChange={(e) =>
                    setAward({ ...award, points: e.target.value.replace(/\D/g, "").slice(0, 3) })
                  }
                />
                <Input
                  label="Custom reason"
                  value={award.reason}
                  onChange={(e) => setAward({ ...award, reason: e.target.value })}
                  placeholder="Why awarding?"
                />
              </>
            )}
            {!isCustom && (
              <p className="text-[11px] text-gray-500">
                Will award <strong>{award.points}</strong> pts — {award.reason}
              </p>
            )}
            <Button className="w-full" isLoading={saving} onClick={submitAward}>
              Award
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-matang-navy to-blue-900 text-white">
        <CardContent className="p-4">
          <p className="text-white/70 text-xs">Your points</p>
          <p className="text-3xl font-bold text-matang-gold">{me.points || 0}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {(me.badges || []).map((b: string) => (
              <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-white/15">
                {b}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">Leaderboard</h2>
        <div className="space-y-2">
          {leaders.map((l, i) => (
            <Card key={l.user_id}>
              <CardContent className="p-3 flex justify-between text-sm items-center">
                <span className="font-medium">
                  #{i + 1}{" "}
                  <NameLink id={l.user_id} name={l.full_name || l.users?.full_name || "Member"} />
                </span>
                <span className="text-matang-gold font-bold">{l.points} pts</span>
              </CardContent>
            </Card>
          ))}
          {!leaders.length && <p className="text-xs text-gray-400">No points yet.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">Award log</h2>
        <div className="space-y-2">
          {logs.map((log, i) => (
            <Card key={log.id || i}>
              <CardContent className="p-3 space-y-1 text-sm">
                <p>
                  <NameLink id={log.awarded_by} name={log.awarder_name || "Staff"} />
                  <span className="text-gray-500"> awarded </span>
                  <span className="font-bold text-matang-gold">{log.points} pts</span>
                  <span className="text-gray-500"> to </span>
                  <NameLink id={log.user_id} name={log.recipient_name || "Member"} />
                </p>
                {log.reason && (
                  <p className="text-xs text-gray-600">
                    <span className="text-gray-400">Reason:</span> {log.reason}
                  </p>
                )}
                {log.created_at && (
                  <p className="text-[10px] text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
          {!logs.length && (
            <p className="text-xs text-gray-400">No award history yet. Awards will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BadgesPage() {
  return (
    <FeatureGate moduleKey="gamification">
      <BadgesPageInner />
    </FeatureGate>
  );
}

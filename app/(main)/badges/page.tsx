"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Trophy, Award } from "lucide-react";

function BadgesPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");
  const [me, setMe] = useState<any>({ points: 0, badges: [] });
  const [leaders, setLeaders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [award, setAward] = useState({ user_id: "", points: "10", reason: "Community service" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/points")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.me || { points: 0, badges: [] });
        setLeaders(d.leaders || []);
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

  const submitAward = async () => {
    if (!award.user_id) {
      toast("Select a member", "error");
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
        toast(data.error || data.hint || "Failed", "error");
        return;
      }
      toast(`Awarded — now ${data.points} pts`, "success");
      setAward((a) => ({ ...a, reason: "Community service" }));
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

      <Card className="bg-gradient-to-br from-matang-navy to-blue-900 text-white">
        <CardContent className="p-4">
          <p className="text-3xl font-bold">{me.points || 0}</p>
          <p className="text-xs opacity-80">Your service points</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(me.badges || []).map((b: string) => (
              <span
                key={b}
                className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/30 text-matang-gold font-semibold flex items-center gap-0.5"
              >
                <Award size={10} />
                {b}
              </span>
            ))}
            {!(me.badges || []).length && (
              <span className="text-xs opacity-60">
                Sevak (10) · Karyakarta (50) · Senani (100) · Gaurav (250)
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">Leaderboard</h2>
        <div className="space-y-2">
          {leaders.map((l, i) => (
            <Card key={l.user_id}>
              <CardContent className="p-3 flex justify-between text-sm">
                <span className="font-medium">
                  #{i + 1} {l.full_name || l.users?.full_name || "Member"}
                </span>
                <span className="text-matang-gold font-bold">{l.points} pts</span>
              </CardContent>
            </Card>
          ))}
          {!leaders.length && (
            <p className="text-xs text-gray-400">No points awarded yet. Staff can award below.</p>
          )}
        </div>
      </div>

      {isStaff && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-matang-navy">Award points</p>
            <label className="block text-sm font-medium text-matang-navy">Member</label>
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
            {!users.length && (
              <p className="text-[11px] text-amber-700">
                No users loaded. Run Admin → Load demo data, or check Directory.
              </p>
            )}
            <Input
              label="Points"
              value={award.points}
              onChange={(e) => setAward({ ...award, points: e.target.value.replace(/\D/g, "").slice(0, 3) })}
            />
            <Input
              label="Reason"
              value={award.reason}
              onChange={(e) => setAward({ ...award, reason: e.target.value })}
            />
            <Button className="w-full" isLoading={saving} onClick={submitAward}>
              Award
            </Button>
          </CardContent>
        </Card>
      )}
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

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
  const [me, setMe] = useState<{ points: number; badges: string[] }>({ points: 0, badges: [] });
  const [leaders, setLeaders] = useState<any[]>([]);
  const [award, setAward] = useState({ user_id: "", points: "10", reason: "" });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/points").then((r) => r.json()).then((d) => {
      setMe(d.me || { points: 0, badges: [] });
      setLeaders(d.leaders || []);
    }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const submitAward = async () => {
    if (!award.user_id) { toast("User ID required", "error"); return; }
    const res = await fetch("/api/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(award) });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Failed", "error"); return; }
    toast(`Awarded — now ${data.points} pts`, "success");
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2"><Trophy className="text-matang-gold" size={22} /><h1 className="text-lg font-bold text-matang-navy">Volunteer Credits</h1></div>
      <Card className="bg-gradient-to-br from-matang-navy to-blue-900 text-white"><CardContent className="p-4">
        <p className="text-3xl font-bold">{me.points || 0}</p>
        <p className="text-xs opacity-80">Your service points</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(me.badges || []).map((b) => (
            <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/30 text-matang-gold font-semibold flex items-center gap-0.5"><Award size={10} />{b}</span>
          ))}
          {!(me.badges || []).length && <span className="text-xs opacity-60">Earn badges: Sevak (10) · Karyakarta (50) · Senani (100) · Gaurav (250)</span>}
        </div>
      </CardContent></Card>
      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">Leaderboard</h2>
        <div className="space-y-2">
          {leaders.map((l, i) => (
            <Card key={l.user_id}><CardContent className="p-3 flex justify-between text-sm">
              <span className="font-medium">#{i + 1} {(l.users as any)?.full_name || l.user_id?.slice(0, 8)}</span>
              <span className="text-matang-gold font-bold">{l.points} pts</span>
            </CardContent></Card>
          ))}
          {!leaders.length && <p className="text-xs text-gray-400">No points awarded yet.</p>}
        </div>
      </div>
      {isStaff && (
        <Card className="border-matang-gold/30"><CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold text-matang-navy">Award points (staff)</p>
          <Input label="User ID (UUID)" value={award.user_id} onChange={(e) => setAward({ ...award, user_id: e.target.value })} />
          <Input label="Points" value={award.points} onChange={(e) => setAward({ ...award, points: e.target.value })} />
          <Input label="Reason" value={award.reason} onChange={(e) => setAward({ ...award, reason: e.target.value })} />
          <Button className="w-full" onClick={submitAward}>Award</Button>
        </CardContent></Card>
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

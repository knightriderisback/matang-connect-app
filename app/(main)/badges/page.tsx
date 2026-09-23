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
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Trophy, Award, Medal, Clock, Sparkles } from "lucide-react";
import { NameLink } from "@/components/shared/NameLink";

const POINT_PRESETS = [
  { label: "Community service — 10 pts", points: 10, reason: "Community service" },
  { label: "Event help — 15 pts", points: 15, reason: "Event help" },
  { label: "SOS / emergency support — 25 pts", points: 25, reason: "SOS / emergency support" },
  { label: "Census / data work — 10 pts", points: 10, reason: "Census / data work" },
  { label: "Blood donation coordination — 20 pts", points: 20, reason: "Blood donation coordination" },
  { label: "Leadership / organising — 30 pts", points: 30, reason: "Leadership / organising" },
  { label: "Custom…", points: 0, reason: "custom" },
];

function BadgesPageInner() {
  const { t, n, timeAgo } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const role = effectiveRole(user?.role);
  /** Only core + SA can award. Volunteers only view own credits. */
  const canAward = ["core_committee", "super_admin"].includes(role || "");
  const isVolunteer = role === "volunteer";
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
    if (!canAward) return;
    fetch("/api/points?users=1")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
  }, [canAward]);

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
      toast(t("auth.invalidCredentials") || "Select a member", "error");
      return;
    }
    if (!award.points || Number(award.points) < 1) {
      toast(t("common.error"), "error");
      return;
    }
    if (isCustom && !award.reason.trim()) {
      toast(t("common.details"), "error");
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
      toast(`${t("common.success")} — ${n(data.points)} pts`, "success");
      setPresetIdx(0);
      setAward({ user_id: award.user_id, points: "10", reason: "Community service" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const badges: string[] = Array.isArray(me.badges) ? me.badges : [];

  return (
    <div className="p-4 space-y-4 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <Trophy className="text-matang-gold" size={22} />
        <div>
          <h1 className="text-lg font-bold text-matang-navy">
            {t("badges.title")}
          </h1>
          <p className="text-[11px] text-gray-500">{t("badges.subtitle")}</p>
        </div>
      </div>

      {/* Own points */}
      <Card className="bg-gradient-to-br from-matang-navy to-blue-900 text-white overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-white/70 text-xs">{t("badges.points")}</p>
              <p className="text-4xl font-bold text-matang-gold tabular-nums">{n(me.points || 0)}</p>
            </div>
            <Sparkles className="text-matang-gold/80" size={28} />
          </div>
          {me.updated_at && (
            <p className="text-[10px] text-white/50 flex items-center gap-1">
              <Clock size={10} /> {t("common.time")}: {timeAgo(me.updated_at)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Badges / medals */}
      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2 flex items-center gap-1.5">
          <Medal size={16} className="text-matang-gold" /> {t("badges.badges")}
        </h2>
        {badges.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">{t("badges.noBadges")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((b: string) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-medium"
              >
                <Award size={12} className="text-matang-gold" />
                {t(b)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Award — ONLY core / super_admin (not volunteer) */}
      {canAward && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-bold text-matang-navy">{t("badges.points")}</h2>
            <p className="text-[11px] text-gray-500">{t("auth.superAdmin")} / {t("auth.coreCommittee")}</p>
            <select
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={award.user_id}
              onChange={(e) => setAward((a) => ({ ...a, user_id: e.target.value }))}
            >
              <option value="">— {t("common.details")} —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} {u.phone ? `(${u.phone})` : ""}
                </option>
              ))}
            </select>
            <select
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              value={presetIdx}
              onChange={(e) => onPreset(Number(e.target.value))}
            >
              {POINT_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
            {isCustom && (
              <>
                <Input
                  type="number"
                  min={1}
                  value={award.points}
                  onChange={(e) => setAward((a) => ({ ...a, points: e.target.value }))}
                  placeholder="Points"
                />
                <Input
                  value={award.reason}
                  onChange={(e) => setAward((a) => ({ ...a, reason: e.target.value }))}
                  placeholder={t("common.details")}
                />
              </>
            )}
            {!isCustom && (
              <p className="text-xs text-gray-500">
                <strong>{n(award.points)}</strong> pts — {award.reason}
              </p>
            )}
            <Button className="w-full cursor-pointer" isLoading={saving} onClick={submitAward}>
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">{t("badges.leaderboard")}</h2>
        <div className="space-y-2">
          {leaders.map((l, i) => {
            const isMe = l.user_id === user?.id || l.user_id === (user as any)?.userId;
            return (
              <Card key={l.user_id} className={isMe ? "border-matang-gold/50 ring-1 ring-matang-gold/30" : ""}>
                <CardContent className="p-3 flex justify-between text-sm items-center">
                  <span className="font-medium">
                    #{n(i + 1)}{" "}
                    <NameLink id={l.user_id} name={l.full_name || l.users?.full_name || t("auth.member")} />
                    {isMe && (
                      <span className="ml-1 text-[10px] text-matang-gold font-bold">({t("relations.self")})</span>
                    )}
                  </span>
                  <span className="text-matang-gold font-bold">{n(l.points)} pts</span>
                </CardContent>
              </Card>
            );
          })}
          {!leaders.length && <p className="text-xs text-gray-400">{t("common.noData")}</p>}
        </div>
      </div>

      {/* Personal / award log */}
      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">
          {t("badges.points")} Log
        </h2>
        <div className="space-y-2">
          {logs.map((log, i) => (
            <Card key={log.id || i}>
              <CardContent className="p-3 space-y-1.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-matang-gold text-base">+{n(log.points)} pts</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-0.5 shrink-0">
                    <Clock size={10} />
                    {timeAgo(log.created_at)}
                  </p>
                </div>
                {log.reason && (
                  <p className="text-xs text-gray-700">
                    <span className="text-gray-400">{t("common.details")}: </span>
                    {log.reason}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  <span className="text-gray-400">By: </span>
                  <NameLink id={log.awarded_by} name={log.awarder_name || t("auth.volunteer")} />
                  {!isVolunteer && (
                    <>
                      <span className="text-gray-400"> → </span>
                      <NameLink id={log.user_id} name={log.recipient_name || t("auth.member")} />
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
          {!logs.length && (
            <p className="text-xs text-gray-400">
              {t("common.noData")}
            </p>
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

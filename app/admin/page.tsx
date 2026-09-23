"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import {
  Users, AlertTriangle, Briefcase, Bell, Heart, BookOpen, Shield, HeartHandshake,
  Store, Landmark, Calendar, Flower2, BarChart3, TrendingUp, QrCode,
  Car, Award, Trophy, Settings, UserCheck, KeyRound, ScrollText, Inbox, ClipboardCheck,
} from "lucide-react";

const ALL_ACTIONS = [
  { key: "census", icon: Users, labelKey: "nav.census", href: "/census", color: "bg-blue-100 text-blue-600" },
  { key: "sos", icon: AlertTriangle, labelKey: "nav.sos", href: "/sos", color: "bg-red-100 text-red-600" },
  { key: "care", icon: HeartHandshake, labelKey: "nav.care", href: "/care", color: "bg-rose-100 text-rose-600" },
  { key: "jobs", icon: Briefcase, labelKey: "nav.jobs", href: "/jobs", color: "bg-green-100 text-green-600" },
  { key: "notices", icon: Bell, labelKey: "nav.notices", href: "/notices", color: "bg-yellow-100 text-yellow-600" },
  { key: "kosh", icon: Heart, labelKey: "nav.kosh", href: "/kosh", color: "bg-pink-100 text-pink-600" },
  { key: "vyapar", icon: Store, labelKey: "nav.vyapar", href: "/vyapar", color: "bg-orange-100 text-orange-600" },
  { key: "matrimony", icon: Heart, labelKey: "nav.matrimony", href: "/matrimony", color: "bg-fuchsia-100 text-fuchsia-600" },
  { key: "dharohar", icon: Landmark, labelKey: "nav.dharohar", href: "/dharohar", color: "bg-amber-100 text-amber-700" },
  { key: "panchang", icon: Calendar, labelKey: "nav.panchang", href: "/panchang", color: "bg-indigo-100 text-indigo-600" },
  { key: "mahila", icon: Flower2, labelKey: "nav.mahila", href: "/mahila", color: "bg-pink-100 text-pink-600" },
  { key: "polls", icon: BarChart3, labelKey: "nav.polls", href: "/polls", color: "bg-cyan-100 text-cyan-600" },
  { key: "arthik", icon: TrendingUp, labelKey: "nav.arthik", href: "/arthik", color: "bg-emerald-100 text-emerald-700" },
  { key: "rides", icon: Car, labelKey: "nav.rides", href: "/rides", color: "bg-sky-100 text-sky-700" },
  { key: "gaurav", icon: Award, labelKey: "nav.gaurav", href: "/gaurav", color: "bg-yellow-100 text-yellow-800" },
  { key: "gamification", icon: Trophy, labelKey: "nav.badges", href: "/badges", color: "bg-violet-100 text-violet-700" },
  { key: "scan", icon: QrCode, labelKey: "nav.scan", href: "/scan", color: "bg-slate-100 text-slate-700" },
  { key: "directory", icon: BookOpen, labelKey: "nav.directory", href: "/admin/directory", color: "bg-purple-100 text-purple-600" },
  { key: "history", icon: ScrollText, labelKey: "nav.history", href: "/history", color: "bg-stone-100 text-stone-700" },
  { key: "profile", icon: Users, labelKey: "nav.profile", href: "/profile", color: "bg-blue-50 text-blue-800" },
];

const ADMIN_LINKS = [
  { href: "/admin/requests", labelKey: "nav.allRequests", icon: Inbox },
  { href: "/admin/verify", labelKey: "admin.verifyUsers", icon: UserCheck },
  { href: "/admin/reset-mpin", labelKey: "nav.resetMpin", icon: KeyRound },
  { href: "/admin/titles", labelKey: "nav.titles", icon: Award },
  { href: "/admin/directory", labelKey: "nav.directory", icon: BookOpen },
  { href: "/admin/audit", labelKey: "nav.audit", icon: ScrollText },
  { href: "/admin/settings", labelKey: "nav.settings", icon: Settings },
  { href: "/admin/qa-checklist", labelKey: "nav.qaChecklist", icon: ClipboardCheck, superOnly: true },
];

export default function AdminHubPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading } = useCurrentUser();
  const { can, loading: flagsLoading } = useFeatureFlags(user?.role);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  if (loading || flagsLoading) {
    return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
  }
  if (!isStaff) {
    return <div className="p-8 text-center text-sm text-gray-500">{t("auth.superAdmin")} / {t("auth.coreCommittee")}</div>;
  }

  const runSeed = async () => {
    setSeeding(true);
    setSeedMsg("");
    try {
      const r = await fetch("/api/admin/seed", { method: "POST" });
      const d = await r.json();
      if (!r.ok) setSeedMsg(d.error || "Failed");
      else setSeedMsg("Done: " + JSON.stringify(d.results));
    } catch {
      setSeedMsg("Network error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 space-y-5 pb-6">
      <div>
        <h1 className="text-lg font-bold text-matang-navy flex items-center gap-2">
          <Shield size={20} className="text-matang-gold" /> {t("admin.title")}
        </h1>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {t("app.footer")}
        </p>
      </div>

      {user?.role === "super_admin" && (
        <div className="p-4 rounded-2xl border border-matang-gold/40 bg-matang-gold/10 space-y-2">
          <p className="text-sm font-semibold text-matang-navy">Demo data</p>
          <p className="text-[11px] text-gray-600">
            50 members (phone 90000xxxxx, M-PIN 1234), 12 posts all types, jobs, care, kosh.
          </p>
          <button
            type="button"
            disabled={seeding}
            onClick={runSeed}
            className="w-full py-2.5 rounded-xl bg-matang-navy text-matang-gold text-sm font-semibold disabled:opacity-50 cursor-pointer"
          >
            {seeding ? t("common.loading") : "Load demo data (50+ members)"}
          </button>
          {seedMsg && <p className="text-[10px] text-gray-600 break-all">{seedMsg}</p>}
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">{t("services.title")}</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {ALL_ACTIONS.filter((a) => can(a.key)).map((a) => (
            <button
              key={a.href + a.key}
              type="button"
              onClick={() => router.push(a.href)}
              className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 cursor-pointer"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.color}`}>
                <a.icon size={20} />
              </div>
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                {t(a.labelKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">{t("admin.title")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {ADMIN_LINKS.filter((l: any) => {
            if ((l as any).superOnly && user?.role !== "super_admin") return false;
            if (user?.role === "super_admin") return true;
            if (l.href === "/admin/settings") return false;
            const toolFlag: Record<string, string> = {
              "/admin/requests": "admin_requests_enabled",
              "/admin/verify": "admin_verify_enabled",
              "/admin/reset-mpin": "admin_reset_mpin",
              "/admin/titles": "titles_enabled",
              "/admin/directory": "admin_directory_enabled",
              "/admin/audit": "admin_audit_enabled",
            };
            const fk = toolFlag[l.href];
            if (fk) return can(fk);
            if (l.href === "/admin/requests") return can("admin_requests");
            return true;
          }).map((l) => (
            <button
              key={l.href}
              type="button"
              onClick={() => router.push(l.href)}
              className={`p-3 rounded-xl border text-sm font-medium text-left flex items-center gap-2 cursor-pointer ${
                l.href === "/admin/settings"
                  ? "bg-matang-navy text-matang-gold col-span-2"
                  : l.href === "/admin/qa-checklist"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 col-span-2"
                    : "bg-white text-matang-navy"
              }`}
            >
              <l.icon size={16} />
              {t(l.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

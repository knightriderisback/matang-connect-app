"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { WelcomeAnimation } from "@/components/shared/WelcomeAnimation";
import { Onboarding } from "@/components/shared/Onboarding";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { QRCodeSVG } from "qrcode.react";
import {
  Users, AlertTriangle, Briefcase, Bell, Heart, BookOpen, Shield, HeartHandshake,
  Store, Landmark, Calendar, Flower2, BarChart3, TrendingUp, QrCode, Sparkles,
  Car, Award, Trophy, Settings, UserCheck, KeyRound, ScrollText,
} from "lucide-react";

/** Full catalog — Super Admin always sees every item. Members filtered by stage flags. */
const ALL_ACTIONS = [
  { key: "census", icon: Users, labelKey: "nav.census", label: "Census", href: "/census", color: "bg-blue-100 text-blue-600" },
  { key: "sos", icon: AlertTriangle, labelKey: "nav.sos", label: "SOS", href: "/sos", color: "bg-red-100 text-red-600" },
  { key: "care", icon: HeartHandshake, labelKey: "nav.care", label: "Care", href: "/care", color: "bg-rose-100 text-rose-600" },
  { key: "jobs", icon: Briefcase, labelKey: "nav.jobs", label: "Jobs", href: "/jobs", color: "bg-green-100 text-green-600" },
  { key: "notices", icon: Bell, labelKey: "nav.notices", label: "Notices", href: "/notices", color: "bg-yellow-100 text-yellow-600" },
  { key: "kosh", icon: Heart, labelKey: "nav.kosh", label: "Sahyog", href: "/kosh", color: "bg-pink-100 text-pink-600" },
  { key: "vyapar", icon: Store, labelKey: "nav.vyapar", label: "Vyapar", href: "/vyapar", color: "bg-orange-100 text-orange-600" },
  { key: "matrimony", icon: Heart, labelKey: "nav.matrimony", label: "Matrimony", href: "/matrimony", color: "bg-fuchsia-100 text-fuchsia-600" },
  { key: "dharohar", icon: Landmark, labelKey: "nav.dharohar", label: "Dharohar", href: "/dharohar", color: "bg-amber-100 text-amber-700" },
  { key: "panchang", icon: Calendar, labelKey: "nav.panchang", label: "Panchang", href: "/panchang", color: "bg-indigo-100 text-indigo-600" },
  { key: "mahila", icon: Flower2, labelKey: "nav.mahila", label: "Mahila", href: "/mahila", color: "bg-pink-100 text-pink-600" },
  { key: "polls", icon: BarChart3, labelKey: "nav.polls", label: "Polls", href: "/polls", color: "bg-cyan-100 text-cyan-600" },
  { key: "arthik", icon: TrendingUp, labelKey: "nav.arthik", label: "Arthik", href: "/arthik", color: "bg-emerald-100 text-emerald-700" },
  { key: "rides", icon: Car, labelKey: null, label: "Rides", href: "/rides", color: "bg-sky-100 text-sky-700" },
  { key: "gaurav", icon: Award, labelKey: null, label: "Gaurav", href: "/gaurav", color: "bg-yellow-100 text-yellow-800" },
  { key: "gamification", icon: Trophy, labelKey: null, label: "Credits", href: "/badges", color: "bg-violet-100 text-violet-700" },
  { key: "scan", icon: QrCode, labelKey: "nav.scan", label: "Scan", href: "/scan", color: "bg-slate-100 text-slate-700" },
  { key: "directory", icon: BookOpen, labelKey: "nav.directory", label: "Directory", href: "/admin/directory", color: "bg-purple-100 text-purple-600" },
  { key: "history", icon: ScrollText, labelKey: null, label: "History", href: "/history", color: "bg-stone-100 text-stone-700" },
  { key: "profile", icon: Users, labelKey: "nav.profile", label: "Profile", href: "/profile", color: "bg-blue-50 text-blue-800" },
];

const ADMIN_LINKS = [
  { href: "/admin/verify", label: "Verify Users", icon: UserCheck },
  { href: "/admin/reset-mpin", label: "Reset M-PIN", icon: KeyRound },
  { href: "/admin/titles", label: "City Titles", icon: Award },
  { href: "/admin/directory", label: "Directory", icon: BookOpen },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Stage Lock / Feature Flags", icon: Settings },
];

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { can } = useFeatureFlags(user?.role);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("matang-welcome") === "true") {
      setShowWelcome(true);
      localStorage.removeItem("matang-welcome");
    }
  }, []);

  const isSuper = user?.role === "super_admin";
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  // Super Admin = EVERY module, no stage filter. Members = stage flags only.
  const actions = ALL_ACTIONS.filter((a) => {
    if (isSuper) return true;
    if (!user) return true; // show all until role known
    return can(a.key);
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
  }

  return (
    <>
      <Onboarding />
      {showWelcome && <WelcomeAnimation onComplete={() => setShowWelcome(false)} />}
      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-gray-500">Welcome,</p>
          <p className="text-[11px] text-matang-gold/90 flex items-center gap-1 mt-0.5">
            <Sparkles size={12} /> Matang AI — left bottom chat
          </p>
          <h2 className="text-xl font-bold text-matang-navy flex items-center gap-2 flex-wrap">
            {user?.full_name || "..."}
            {isSuper && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-matang-gold/25 text-matang-navy text-[10px] rounded-full font-semibold">
                <Shield size={10} /> Super Admin
              </span>
            )}
          </h2>
          {isSuper && (
            <p className="text-[11px] text-gray-500 mt-1">
              Full access — stage lock only affects members (Admin → Stage Lock).
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-matang-navy to-blue-900 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">
                {user?.verification_status === "verified" ? "✓" : "⏳"}
              </p>
              <p className="text-xs opacity-80">{t("profile.verified")}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-matang-gold to-yellow-500 text-matang-navy">
            <CardContent className="p-4">
              <p className="text-xl font-bold truncate">{user?.cities?.name || "-"}</p>
              <p className="text-xs opacity-80">Your City</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-base font-bold text-matang-navy mb-2">
            {isSuper ? "All modules" : "Quick Actions"}
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {actions.map((a) => (
              <button
                key={a.href + a.key}
                onClick={() => router.push(a.href)}
                className="relative flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.color}`}>
                  <a.icon size={20} />
                </div>
                <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                  {a.labelKey ? t(a.labelKey) : a.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isStaff && (
          <div>
            <h2 className="text-base font-bold text-matang-navy mb-2">Admin Tools</h2>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_LINKS.filter((l) => isSuper || l.href !== "/admin/settings").map((l) => (
                <button
                  key={l.href}
                  onClick={() => router.push(l.href)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left flex items-center gap-2 ${
                    l.href === "/admin/settings"
                      ? "bg-matang-navy text-matang-gold col-span-2"
                      : "bg-white text-matang-navy"
                  }`}
                >
                  <l.icon size={16} />
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Card className="border-2 border-matang-gold/30">
          <CardHeader>
            <CardTitle className="text-base">🪷 {t("profile.digitalId")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {user?.qr_code_id ? (
                <div className="bg-white p-2 rounded-lg border shrink-0">
                  <QRCodeSVG
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/u/${user.qr_code_id}`}
                    size={72}
                    level="M"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 bg-matang-navy rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {user?.full_name?.[0] || "?"}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-matang-navy truncate">{user?.full_name}</p>
                <p className="text-sm text-gray-500">{user?.native_village}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{user?.qr_code_id}</p>
                <button
                  onClick={() => router.push("/scan")}
                  className="text-xs text-matang-gold font-medium mt-1"
                >
                  {t("profile.scanQr")} →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

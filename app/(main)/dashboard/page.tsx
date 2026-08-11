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
  Car, Award, Trophy,
} from "lucide-react";

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

  const allActions = [
    { key: "census", icon: Users, label: t("nav.census"), href: "/census", color: "bg-blue-100 text-blue-600" },
    { key: "sos", icon: AlertTriangle, label: t("nav.sos"), href: "/sos", color: "bg-red-100 text-red-600" },
    { key: "care", icon: HeartHandshake, label: t("nav.care"), href: "/care", color: "bg-rose-100 text-rose-600" },
    { key: "jobs", icon: Briefcase, label: t("nav.jobs"), href: "/jobs", color: "bg-green-100 text-green-600" },
    { key: "notices", icon: Bell, label: t("nav.notices"), href: "/notices", color: "bg-yellow-100 text-yellow-600" },
    { key: "kosh", icon: Heart, label: t("nav.kosh"), href: "/kosh", color: "bg-pink-100 text-pink-600" },
    { key: "vyapar", icon: Store, label: t("nav.vyapar"), href: "/vyapar", color: "bg-orange-100 text-orange-600" },
    { key: "matrimony", icon: Heart, label: t("nav.matrimony"), href: "/matrimony", color: "bg-fuchsia-100 text-fuchsia-600" },
    { key: "dharohar", icon: Landmark, label: t("nav.dharohar"), href: "/dharohar", color: "bg-amber-100 text-amber-700" },
    { key: "panchang", icon: Calendar, label: t("nav.panchang"), href: "/panchang", color: "bg-indigo-100 text-indigo-600" },
    { key: "mahila", icon: Flower2, label: t("nav.mahila"), href: "/mahila", color: "bg-pink-100 text-pink-600" },
    { key: "polls", icon: BarChart3, label: t("nav.polls"), href: "/polls", color: "bg-cyan-100 text-cyan-600" },
    { key: "arthik", icon: TrendingUp, label: t("nav.arthik"), href: "/arthik", color: "bg-emerald-100 text-emerald-700" },
    { key: "rides", icon: Car, label: "Rides", href: "/rides", color: "bg-sky-100 text-sky-700" },
    { key: "gaurav", icon: Award, label: "Gaurav", href: "/gaurav", color: "bg-yellow-100 text-yellow-800" },
    { key: "gamification", icon: Trophy, label: "Credits", href: "/badges", color: "bg-violet-100 text-violet-700" },
    { key: "scan", icon: QrCode, label: t("nav.scan"), href: "/scan", color: "bg-slate-100 text-slate-700" },
    { key: "directory", icon: BookOpen, label: t("nav.directory"), href: "/admin/directory", color: "bg-purple-100 text-purple-600" },
  ];

  const actions = allActions.filter((a) => can(a.key));

  if (loading) return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;

  return (
    <>
      <Onboarding />
      {showWelcome && <WelcomeAnimation onComplete={() => setShowWelcome(false)} />}
      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-gray-500">Welcome,</p>
          <p className="text-[11px] text-matang-gold/90 flex items-center gap-1 mt-0.5">
            <Sparkles size={12} /> Matang AI — left bottom chat button
          </p>
          <h2 className="text-xl font-bold text-matang-navy flex items-center gap-2 flex-wrap">
            {user?.full_name || "..."}
            {user?.role === "super_admin" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-matang-gold/25 text-matang-navy text-[10px] rounded-full font-semibold">
                <Shield size={10} /> Super Admin
              </span>
            )}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-matang-navy to-blue-900 text-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{user?.verification_status === "verified" ? "✓" : "⏳"}</p>
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
          <h2 className="text-base font-bold text-matang-navy mb-2">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {actions.map((a) => (
              <button
                key={a.href}
                onClick={() => router.push(a.href)}
                className="relative flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.color}`}>
                  <a.icon size={20} />
                </div>
                <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {can("notices") && (
          <Card className="border-matang-gold/30">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-matang-navy mb-1">Community posts</p>
              <p className="text-xs text-gray-500 mb-3">
                Notices, Shok Sandesh, Dharohar, Gaurav. Staff publish with +.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => router.push("/notices")} className="p-2.5 bg-yellow-50 border border-yellow-100 rounded-xl text-xs font-medium text-matang-navy">Notices</button>
                {can("dharohar") && (
                  <button onClick={() => router.push("/dharohar")} className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs font-medium text-matang-navy">Dharohar</button>
                )}
                {can("gaurav") && (
                  <button onClick={() => router.push("/gaurav")} className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-xs font-medium text-matang-navy">Gaurav</button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {["core_committee", "super_admin", "volunteer"].includes(user?.role || "") && (
          <div>
            <h2 className="text-base font-bold text-matang-navy mb-2">Admin Tools</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => router.push("/admin/verify")} className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left">Verify Users</button>
              <button onClick={() => router.push("/admin/reset-mpin")} className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left">Reset M-PIN</button>
              <button onClick={() => router.push("/admin/titles")} className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left">City Titles</button>
              <button onClick={() => router.push("/admin/audit")} className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left">Audit Log</button>
              {user?.role === "super_admin" && (
                <button
                  onClick={() => router.push("/admin/settings")}
                  className="p-3 bg-matang-navy text-matang-gold rounded-xl border text-sm font-medium text-left col-span-2"
                >
                  Stage Lock / Unlock & Feature Flags
                </button>
              )}
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
                <button onClick={() => router.push("/scan")} className="text-xs text-matang-gold font-medium mt-1">
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

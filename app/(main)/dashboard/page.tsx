"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { WelcomeAnimation } from "@/components/shared/WelcomeAnimation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import {
  Users,
  AlertTriangle,
  Briefcase,
  Bell,
  Heart,
  Shield,
  HeartHandshake,
} from "lucide-react";

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("matang-welcome") === "true") {
      setShowWelcome(true);
      localStorage.removeItem("matang-welcome");
    }
  }, []);

  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const actions = [
    { icon: Users, label: t("nav.census"), href: "/census", color: "bg-blue-100 text-blue-600" },
    { icon: AlertTriangle, label: t("nav.sos"), href: "/sos", color: "bg-red-100 text-red-600" },
    { icon: HeartHandshake, label: "Care", href: "/care", color: "bg-rose-100 text-rose-600" },
    { icon: Briefcase, label: "Jobs", href: "/jobs", color: "bg-green-100 text-green-600" },
    { icon: Bell, label: "Notices", href: "/notices", color: "bg-yellow-100 text-yellow-600" },
    { icon: Heart, label: "Sahyog", href: "/kosh", color: "bg-pink-100 text-pink-600" },
  ];

  if (isStaff) {
    actions.push({
      icon: Shield,
      label: "Directory",
      href: "/admin/directory",
      color: "bg-purple-100 text-purple-600",
    });
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
  }

  return (
    <>
      {showWelcome && <WelcomeAnimation onComplete={() => setShowWelcome(false)} />}
      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-gray-500">Welcome,</p>
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
                <span className="text-[11px] font-medium text-gray-700">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {isStaff && (
          <div>
            <h2 className="text-base font-bold text-matang-navy mb-2">Admin Tools</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => router.push("/admin/verify")}
                className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left"
              >
                Verify Users
              </button>
              <button
                onClick={() => router.push("/admin/reset-mpin")}
                className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left"
              >
                Reset M-PIN
              </button>
              <button
                onClick={() => router.push("/admin/titles")}
                className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left"
              >
                City Titles
              </button>
              <button
                onClick={() => router.push("/admin/audit")}
                className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left"
              >
                Audit Log
              </button>
              {user?.role === "super_admin" && (
                <button
                  onClick={() => router.push("/admin/settings")}
                  className="p-3 bg-white rounded-xl border text-sm font-medium text-matang-navy text-left col-span-2"
                >
                  Feature Flags
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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-matang-navy rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0">
                {user?.full_name?.[0] || "?"}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-matang-navy truncate">{user?.full_name}</p>
                <p className="text-sm text-gray-500">{user?.native_village}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{user?.qr_code_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

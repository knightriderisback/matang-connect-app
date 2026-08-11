"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { WelcomeAnimation } from "@/components/shared/WelcomeAnimation";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Users, AlertTriangle, Briefcase, Bell, Heart, BookOpen, Shield } from "lucide-react";

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

  const actions = [
    { icon: Users, label: t("nav.census"), href: "/census", color: "bg-blue-100 text-blue-600" },
    { icon: AlertTriangle, label: t("nav.sos"), href: "/sos", color: "bg-red-100 text-red-600" },
    { icon: Briefcase, label: "Jobs", href: "/jobs", color: "bg-green-100 text-green-600" },
    { icon: Bell, label: "Notices", href: "/notices", color: "bg-yellow-100 text-yellow-600" },
    { icon: Heart, label: "Sahyog", href: "/kosh", color: "bg-pink-100 text-pink-600" },
    { icon: BookOpen, label: "Directory", href: "/admin/directory", color: "bg-purple-100 text-purple-600" },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;

  return (
    <>
      {showWelcome && <WelcomeAnimation onComplete={() => setShowWelcome(false)} />}
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-matang-navy">{t("app.name")}</h1>
            <p className="text-sm text-gray-500">{user?.full_name ? `Welcome, ${user.full_name}` : t("app.tagline")}</p>
            {user?.role === "super_admin" && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-matang-gold/20 text-xs rounded-full font-medium">
                <Shield size={12} /> Super Admin
              </span>
            )}
          </div>
          <LanguageToggle />
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
              <p className="text-2xl font-bold">{user?.cities?.name || "-"}</p>
              <p className="text-xs opacity-80">Your City</p>
            </CardContent>
          </Card>
        </div>
        <div>
          <h2 className="text-lg font-bold text-matang-navy mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            {actions.map((a) => (
              <button key={a.href} onClick={() => router.push(a.href)}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border active:scale-95">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.color}`}><a.icon size={22} /></div>
                <span className="text-xs font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Card className="border-2 border-matang-gold/30">
          <CardHeader><CardTitle>🪷 {t("profile.digitalId")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-matang-navy rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.full_name?.[0] || "?"}
              </div>
              <div>
                <p className="font-bold text-matang-navy">{user?.full_name || "Guest"}</p>
                <p className="text-sm text-gray-500">{user?.native_village}</p>
                <p className="text-xs text-gray-400">{user?.qr_code_id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

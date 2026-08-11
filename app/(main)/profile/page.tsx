"use client";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { QRCodeSVG } from "qrcode.react";
import { LogOut, Shield, MapPin, Phone } from "lucide-react";

export default function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const roleLabels: Record<string, string> = {
    normal: "Member", volunteer: "Volunteer",
    core_committee: "Core Committee", super_admin: "Super Admin",
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-matang-navy">{t("profile.title")}</h1>
      <Card className="border-2 border-matang-gold overflow-hidden">
        <div className="bg-gradient-to-r from-matang-navy to-blue-900 p-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-matang-gold">🪷 {t("profile.digitalId")}</span>
            {user?.verification_status === "verified" && (
              <span className="bg-green-500 text-xs px-2 py-1 rounded-full">✓ {t("profile.verified")}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-3xl font-bold">
              {user?.full_name?.[0] || "?"}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.full_name}</h2>
              <p className="text-white/70 text-sm flex items-center gap-1"><MapPin size={14} /> {user?.native_village}</p>
              <p className="text-white/70 text-sm flex items-center gap-1"><Phone size={14} /> {user?.phone}</p>
            </div>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("profile.role")}</span>
            <span className="font-medium flex items-center gap-1"><Shield size={14} /> {roleLabels[user?.role || "normal"]}</span>
          </div>
          <div className="flex justify-between"><span className="text-gray-500">City</span><span className="font-medium">{user?.cities?.name || "-"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">QR ID</span><span className="font-mono text-xs">{user?.qr_code_id}</span></div>
        </CardContent>
      </Card>
      {user?.qr_code_id && (
        <Card>
          <CardHeader><CardTitle>{t("profile.qrCode")}</CardTitle></CardHeader>
          <CardContent className="flex justify-center py-4">
            <div className="bg-white p-3 rounded-xl border">
              <QRCodeSVG value={user.qr_code_id} size={160} level="M" />
            </div>
          </CardContent>
        </Card>
      )}
      <Button variant="danger" className="w-full" onClick={handleLogout}>
        <LogOut size={18} /> Logout
      </Button>
    </div>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggleLight } from "@/components/shared/LanguageToggleLight";
import { Logo } from "@/components/shared/Logo";
import { Heart, Shield, Users, Sparkles } from "lucide-react";

export default function LandingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const features = [
    { icon: Users, title: "Smart Census", desc: "Complete family data collection" },
    { icon: Shield, title: "Emergency SOS", desc: "Instant blood & medical alerts" },
    { icon: Heart, title: "Community Kosh", desc: "Transparent crowdfunding" },
    { icon: Sparkles, title: "Matang AI", desc: "God-mode admin assistant" },
  ];
  return (
    <div className="min-h-screen bg-matang-cream flex flex-col">
      <div className="p-4 flex justify-end"><LanguageToggleLight /></div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <Logo className="w-24 h-24 object-contain bg-transparent mb-6 drop-shadow-lg" />
        <h1 className="text-3xl font-bold text-matang-navy mb-2 text-center">{t("app.name")}</h1>
        <p className="text-gray-500 text-center mb-8 max-w-xs">{t("app.tagline")}</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
          {features.map((f) => (
            <div key={f.title} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-matang-gold/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <f.icon size={20} className="text-matang-gold" />
              </div>
              <p className="text-sm font-semibold text-matang-navy">{f.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="w-full max-w-sm space-y-3">
          <Button className="w-full text-lg py-4" onClick={() => router.push("/login")}>{t("auth.login")}</Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/register")}>{t("auth.register")}</Button>
        </div>
        <p className="mt-6 text-xs text-gray-400 text-center">Pilot: Bilaspur, Chhattisgarh</p>
      </div>
    </div>
  );
}

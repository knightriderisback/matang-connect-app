"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggleLight } from "@/components/shared/LanguageToggleLight";

export default function LandingPage() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <div className="min-h-screen bg-matang-cream flex flex-col">
      <div className="p-4 flex justify-end">
        <LanguageToggleLight />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-splash.png"
          alt="Matang Connect"
          className="splash-logo-float w-52 h-52 sm:w-64 sm:h-64 object-contain bg-transparent mb-8"
          draggable={false}
        />
        <h1 className="text-3xl font-bold text-matang-navy mb-2 text-center">{t("app.name")}</h1>
        <p className="text-gray-500 text-center mb-10 max-w-xs">{t("app.tagline")}</p>
        <div className="w-full max-w-sm space-y-3">
          <Button className="w-full text-lg py-4" onClick={() => router.push("/login")}>
            {t("auth.login")}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push("/register")}>
            {t("auth.register")}
          </Button>
        </div>
        <p className="mt-6 text-xs text-gray-400 text-center">Pilot: Bilaspur, Chhattisgarh</p>
      </div>
    </div>
  );
}

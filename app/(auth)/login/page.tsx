"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggleLight } from "@/components/shared/LanguageToggleLight";
import { WelcomeAnimation } from "@/components/shared/WelcomeAnimation";
import { useToast } from "@/components/ui/Toaster";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<string>("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mpin }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error || t("common.error"), "error");
        setLoading(false);
        return;
      }
      let userName = "";
      try {
        const u = result.user;
        if (u) {
          userName = u.full_name || u.fullName || "";
          const normalized = {
            ...u,
            full_name: userName,
            verification_status: u.verification_status || u.verificationStatus || "pending",
            qr_code_id: u.qr_code_id || u.qrCodeId || null,
          };
          const payload = JSON.stringify({ user: normalized, ts: Date.now() });
          localStorage.setItem("matang_me_cache", payload);
          sessionStorage.setItem("matang_me_cache", payload);
        }
      } catch {
        /* ignore */
      }
      // Clear dashboard-level flag so it won't duplicate the welcome screen
      localStorage.removeItem("matang-welcome");
      
      setLoggedInUser(userName);
      setShowWelcome(true);
      setLoading(false);
    } catch {
      toast(t("common.error"), "error");
      setLoading(false);
    }
  };

  const handleWelcomeComplete = () => {
    // Full navigation so AppHeader/BottomNav remount with fresh user cache
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-matang-cream flex flex-col">
      {showWelcome && (
        <WelcomeAnimation
          onComplete={handleWelcomeComplete}
          userName={loggedInUser}
        />
      )}
      <div
        className="p-4 flex justify-end"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
      >
        <LanguageToggleLight />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Matang" className="w-48 h-48 sm:w-56 sm:h-56 object-contain bg-transparent mb-6 drop-shadow-xl" draggable={false} />
        <h1 className="text-2xl font-bold text-matang-navy mb-1">{t("app.name")}</h1>
        <p className="text-gray-500 mb-8">{t("app.tagline")}</p>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <Input label={t("auth.phone")} type="tel" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input
            label={t("auth.mpin")}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            placeholder="****"
            maxLength={4}
            value={mpin}
            onChange={(e) => setMpin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
          />
          <Button type="submit" className="w-full" isLoading={loading}>{t("auth.login")}</Button>
        </form>

        <button
          type="button"
          onClick={() => setShowForgot(!showForgot)}
          className="mt-4 text-sm text-amber-800 hover:text-amber-900 font-semibold underline underline-offset-2 cursor-pointer"
        >
          {t("auth.forgotMpin") || "Forgot M-PIN?"}
        </button>

        {showForgot && (
          <div className="mt-3 w-full max-w-sm bg-white border border-matang-gold/30 rounded-2xl p-4 text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-matang-navy">{t("auth.resetMpin") || "How to reset your M-PIN"}</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Contact your city <strong>Volunteer</strong>, <strong>Core Committee</strong>, or <strong>Super Admin</strong>.</li>
              <li>They will verify your identity and reset your 4-digit M-PIN from the Admin panel.</li>
              <li>After reset, login with the new M-PIN and change it if needed.</li>
            </ol>
            <p className="text-[11px] text-gray-400">For security, M-PIN cannot be reset by SMS/email in Stage 1.</p>
          </div>
        )}

        <p className="mt-6 text-sm text-gray-500">
          {t("auth.noAccount") || "New member?"}{" "}
          <button type="button" className="text-amber-800 hover:text-amber-900 font-bold cursor-pointer" onClick={() => router.push("/register")}>
            {t("auth.register") || "Register"}
          </button>
        </p>
      </div>
    </div>
  );
}

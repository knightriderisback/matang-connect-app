"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggleLight } from "@/components/shared/LanguageToggleLight";
import { Logo } from "@/components/shared/Logo";
import { useToast } from "@/components/ui/Toaster";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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
      localStorage.setItem("matang-welcome", "true");
      toast("Login successful!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-matang-cream flex flex-col">
      <div className="p-4 flex justify-end"><LanguageToggleLight /></div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <Logo className="w-20 h-20 object-contain bg-transparent mb-5 drop-shadow-md" />
        <h1 className="text-2xl font-bold text-matang-navy mb-1">{t("app.name")}</h1>
        <p className="text-gray-500 mb-8">{t("app.tagline")}</p>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <Input label={t("auth.phone")} type="tel" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label={t("auth.mpin")} type="password" placeholder="****" maxLength={4} value={mpin} onChange={(e) => setMpin(e.target.value)} required />
          <Button type="submit" className="w-full" isLoading={loading}>{t("auth.login")}</Button>
        </form>

        <button
          type="button"
          onClick={() => setShowForgot(!showForgot)}
          className="mt-4 text-sm text-matang-gold font-medium underline underline-offset-2"
        >
          Forgot M-PIN?
        </button>

        {showForgot && (
          <div className="mt-3 w-full max-w-sm bg-white border border-matang-gold/30 rounded-2xl p-4 text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-matang-navy">How to reset your M-PIN</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Contact your city <strong>Volunteer</strong>, <strong>Core Committee</strong>, or <strong>Super Admin</strong>.</li>
              <li>They will verify your identity and reset your 4-digit M-PIN from the Admin panel.</li>
              <li>After reset, login with the new M-PIN and change it if needed.</li>
            </ol>
            <p className="text-[11px] text-gray-400">For security, M-PIN cannot be reset by SMS/email in Stage 1.</p>
          </div>
        )}

        <p className="mt-6 text-sm text-gray-500">
          New member?{" "}
          <button type="button" className="text-matang-gold font-semibold" onClick={() => router.push("/register")}>
            Register
          </button>
        </p>
      </div>
    </div>
  );
}

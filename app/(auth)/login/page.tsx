"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useToast } from "@/components/ui/Toaster";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      toast(t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-matang-cream flex flex-col">
      <div className="p-4 flex justify-end"><LanguageToggle /></div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-20 h-20 bg-matang-gold rounded-2xl flex items-center justify-center mb-6 shadow-lg"><span className="text-4xl">🪷</span></div>
        <h1 className="text-2xl font-bold text-matang-navy mb-1">{t("app.name")}</h1>
        <p className="text-gray-500 mb-8">{t("app.tagline")}</p>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <Input label={t("auth.phone")} type="tel" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Input label={t("auth.mpin")} type="password" placeholder="****" maxLength={4} value={mpin} onChange={(e) => setMpin(e.target.value)} required />
          <Button type="submit" className="w-full" isLoading={loading}>{t("auth.login")}</Button>
        </form>
        <p className="mt-6 text-sm text-gray-500">{t("auth.dontHaveAccount")}{" "}<button onClick={() => router.push("/register")} className="text-matang-gold font-semibold">{t("auth.register")}</button></p>
      </div>
    </div>
  );
}

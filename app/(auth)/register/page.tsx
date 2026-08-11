"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { LanguageToggleLight } from "@/components/shared/LanguageToggleLight";
import { useToast } from "@/components/ui/Toaster";

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<{ id: string; name: string; state?: string }[]>([]);
  const [citiesError, setCitiesError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    mpin: "",
    confirmMpin: "",
    cityId: "",
    nativeVillage: "",
  });

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((json) => {
        const data = json.cities || [];
        if (data.length > 0) {
          setCities(data);
          setForm((p) => ({ ...p, cityId: p.cityId || data[0].id }));
        } else {
          setCitiesError(json.error || "No cities found. Run migrations in Supabase.");
        }
      })
      .catch(() => setCitiesError("Could not load cities"));
  }, []);

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.mpin !== form.confirmMpin) {
      toast("M-PINs do not match", "error");
      return;
    }
    if (form.mpin.length !== 4) {
      toast("M-PIN must be 4 digits", "error");
      return;
    }
    if (!form.cityId) {
      toast("Please select a city", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          mpin: form.mpin,
          cityId: form.cityId,
          nativeVillage: form.nativeVillage,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error || result.detail || t("common.error"), "error");
        return;
      }
      toast("Registration successful! Awaiting verification.", "success");
      router.push("/login");
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const cityOptions =
    cities.length > 0
      ? cities.map((c) => ({
          value: c.id,
          label: c.state ? `${c.name} (${c.state})` : c.name,
        }))
      : [{ value: "", label: citiesError ? "No cities — run SQL migration" : "Loading..." }];

  return (
    <div className="min-h-screen bg-matang-cream flex flex-col">
      <div className="p-4 flex justify-end">
        <LanguageToggleLight />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <h1 className="text-2xl font-bold text-matang-navy mb-6">{t("auth.createAccount")}</h1>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <Input
            label={t("auth.fullName")}
            value={form.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            required
          />
          <Input
            label={t("auth.phone")}
            type="tel"
            placeholder="9876543210"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            required
          />
          <Select
            label={t("auth.city")}
            value={form.cityId}
            onChange={(e) => handleChange("cityId", e.target.value)}
            options={cityOptions}
          />
          {citiesError && <p className="text-xs text-red-600 -mt-2">{citiesError}</p>}
          <Input
            label={t("auth.nativeVillage")}
            value={form.nativeVillage}
            onChange={(e) => handleChange("nativeVillage", e.target.value)}
            required
          />
          <Input
            label={t("auth.mpin")}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={form.mpin}
            onChange={(e) => handleChange("mpin", e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
          />
          <Input
            label={t("auth.confirmMpin")}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={form.confirmMpin}
            onChange={(e) => handleChange("confirmMpin", e.target.value.replace(/\D/g, "").slice(0, 4))}
            required
          />
          <Button type="submit" className="w-full" isLoading={loading} disabled={!form.cityId}>
            {t("auth.submit")}
          </Button>
        </form>
        <p className="mt-6 text-sm text-gray-500">
          {t("auth.alreadyHaveAccount")}{" "}
          <button onClick={() => router.push("/login")} className="text-matang-gold font-semibold">
            {t("auth.login")}
          </button>
        </p>
      </div>
    </div>
  );
}

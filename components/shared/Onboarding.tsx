"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Users, AlertTriangle, LayoutGrid, Sparkles } from "lucide-react";

const STEPS = [
  { key: "step1", icon: Sparkles, color: "from-matang-navy to-blue-900" },
  { key: "step2", icon: Users, color: "from-blue-700 to-indigo-800" },
  { key: "step3", icon: AlertTriangle, color: "from-red-600 to-orange-700" },
  { key: "step4", icon: LayoutGrid, color: "from-emerald-700 to-teal-800" },
];

export function Onboarding({ onDone }: { onDone?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("matang-onboarded")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    localStorage.setItem("matang-onboarded", "1");
    setVisible(false);
    onDone?.();
  };

  const next = () => {
    if (isLast) {
      finish();
      if (step === 1) router.push("/census");
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
        <div className={`bg-gradient-to-br ${current.color} p-8 text-white text-center`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/15 flex items-center justify-center">
            <Icon size={32} className="text-matang-gold" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            {t(`onboarding.${current.key}Title` as any)}
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            {t(`onboarding.${current.key}Body` as any)}
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-matang-gold" : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {!isLast && (
              <Button variant="outline" className="flex-1" onClick={finish}>
                {t("common.skip")}
              </Button>
            )}
            <Button className="flex-1" onClick={next}>
              {isLast ? t("common.done") : t("common.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

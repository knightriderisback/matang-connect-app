"use client";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Languages } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "EN", full: "English" },
  { code: "hi", label: "हि", full: "हिंदी" },
  { code: "mr", label: "मर", full: "मराठी" },
  { code: "cg", label: "छग", full: "छत्तीसगढ़ी" },
];

const VARIANT_CLASSES: Record<"dark" | "light", string> = {
  dark: "bg-white/15 hover:bg-white/25 border border-white/20 text-white",
  light: "bg-matang-navy/5 border border-matang-navy/15 text-matang-navy",
};

/**
 * Language switcher, used in two places with two looks:
 *  - variant="dark"  → navy header (AppHeader) — default, unchanged behavior
 *  - variant="light" → cream landing page
 * (Previously two near-identical components: LanguageToggle + LanguageToggleLight.
 * Merged into one on 2026-09-20 — same LANGUAGES list, same cycling logic, just themed.)
 */
export function LanguageToggle({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const next = () => {
    const idx = LANGUAGES.findIndex((l) => l.code === lang);
    const n = LANGUAGES[(idx + 1) % LANGUAGES.length];
    setLang(n.code);
  };

  return (
    <button
      onClick={next}
      title={`Language: ${current.full} (tap to switch)`}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm transition-all active:scale-95 ${VARIANT_CLASSES[variant]}`}
    >
      <Languages size={14} />
      <span>{current.label}</span>
    </button>
  );
}

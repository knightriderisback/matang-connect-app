"use client";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Languages } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हि" },
  { code: "mr", label: "मर" },
  { code: "cg", label: "छग" },
];

export function LanguageToggleLight() {
  const { lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const next = () => {
    const idx = LANGUAGES.findIndex((l) => l.code === lang);
    setLang(LANGUAGES[(idx + 1) % LANGUAGES.length].code);
  };
  return (
    <button
      onClick={next}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-matang-navy/5 border border-matang-navy/15 text-matang-navy text-xs font-semibold active:scale-95"
    >
      <Languages size={14} />
      <span>{current.label}</span>
    </button>
  );
}

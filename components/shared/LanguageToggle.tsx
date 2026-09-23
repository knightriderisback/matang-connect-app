"use client";
import { useI18n, SUPPORTED_LANGUAGES, LanguageCode } from "@/lib/i18n/LanguageProvider";
import { Languages } from "lucide-react";

const VARIANT_CLASSES: Record<"dark" | "light", string> = {
  dark: "bg-white/15 hover:bg-white/25 border border-white/20 text-white",
  light: "bg-matang-navy/5 hover:bg-matang-navy/10 border border-matang-navy/15 text-matang-navy",
};

/**
 * Universal 5-Language switcher:
 * English ('en') | Hindi ('hi') | Marathi ('mr') | Chhattisgarhi ('cg') | Hinglish ('hng')
 *
 * Used with two themes:
 *  - variant="dark"  → navy header (AppHeader)
 *  - variant="light" → cream landing page / light surfaces
 */
export function LanguageToggle({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { lang, setLang } = useI18n();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  const next = () => {
    const idx = SUPPORTED_LANGUAGES.findIndex((l) => l.code === lang);
    const n = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
    setLang(n.code);
  };

  return (
    <button
      onClick={next}
      type="button"
      aria-label={`Current language: ${current.full}. Tap to switch language.`}
      title={`भाषा: ${current.full} (बदलने के लिए टैप करें / Tap to change)`}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm transition-all active:scale-95 cursor-pointer shadow-sm select-none ${VARIANT_CLASSES[variant]}`}
    >
      <Languages size={14} className="opacity-90" />
      <span className="tracking-wide font-medium">{current.label}</span>
    </button>
  );
}

export default LanguageToggle;

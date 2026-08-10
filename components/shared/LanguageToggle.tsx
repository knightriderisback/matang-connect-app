"use client";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
  { code: "cg", label: "छत्तीसगढ़ी" },
];
export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl">
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all",
            lang === l.code ? "bg-matang-gold text-matang-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

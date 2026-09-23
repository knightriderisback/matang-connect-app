"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import en from "./translations/en.json";
import hi from "./translations/hi.json";
import mr from "./translations/mr.json";
import cg from "./translations/cg.json";
import hng from "./translations/hng.json";
import {
  toLocalizedDigits,
  formatLocalizedNumber,
  formatCurrency,
  timeAgo as computeTimeAgo,
  SupportedLocale,
} from "@/lib/numbers";

export type LanguageCode = "en" | "hi" | "mr" | "cg" | "hng";

export interface LanguageInfo {
  code: LanguageCode;
  label: string;
  full: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", label: "EN", full: "English" },
  { code: "hi", label: "हि", full: "हिंदी" },
  { code: "mr", label: "मर", full: "मराठी" },
  { code: "cg", label: "छग", full: "छत्तीसगढ़ी" },
  { code: "hng", label: "Hing", full: "Hinglish" },
];

const DICTIONARIES: Record<LanguageCode, Record<string, any>> = {
  en,
  hi,
  mr,
  cg,
  hng,
};

interface I18nContextType {
  lang: LanguageCode;
  setLang: (lang: LanguageCode | string) => void;
  /** Translate a dot-path key with optional interpolation params e.g. { name: 'John' } */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Format number with Indian numbering and Devanagari numerals where applicable */
  n: (value: number | string | null | undefined) => string;
  /** Format currency with Rupee symbol and localized digits */
  c: (value: number | string | null | undefined) => string;
  /** Localized time ago e.g. '5 मिनट पहले' or '5 min pehle' */
  timeAgo: (date: string | number | Date | null | undefined) => string;
  isReady: boolean;
  languages: LanguageInfo[];
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key: string) => key,
  n: (val) => String(val ?? ""),
  c: (val) => `₹${val ?? 0}`,
  timeAgo: () => "",
  isReady: true,
  languages: SUPPORTED_LANGUAGES,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>("hi");
  const [isReady, setIsReady] = useState(false);

  // Initialize from localStorage or navigator
  useEffect(() => {
    try {
      const saved = localStorage.getItem("matang-lang") as LanguageCode | null;
      if (saved && (saved in DICTIONARIES)) {
        setLangState(saved);
        document.documentElement.lang = saved === "hng" ? "hi-Latn" : saved;
      } else {
        // Default to Hindi or English based on browser
        const browserLang = navigator.language?.toLowerCase() || "";
        if (browserLang.startsWith("mr")) {
          setLangState("mr");
        } else if (browserLang.startsWith("hi")) {
          setLangState("hi");
        } else {
          setLangState("hi"); // Community default is Hindi
        }
      }
    } catch {
      setLangState("hi");
    } finally {
      setIsReady(true);
    }
  }, []);

  const setLang = useCallback((newLang: LanguageCode | string) => {
    const validLang = (newLang in DICTIONARIES ? newLang : "hi") as LanguageCode;
    setLangState(validLang);
    try {
      localStorage.setItem("matang-lang", validLang);
      document.documentElement.lang = validLang === "hng" ? "hi-Latn" : validLang;
    } catch {
      // ignore storage errors
    }
  }, []);

  /**
   * Safe nested key getter with strict fallback:
   * currentLang -> hi -> en -> last segment of key (cleaned)
   */
  const getNested = useCallback(
    (dict: Record<string, any>, path: string): string | null => {
      const parts = path.split(".");
      let cur: any = dict;
      for (const p of parts) {
        if (!cur || typeof cur !== "object") return null;
        cur = cur[p];
      }
      return typeof cur === "string" ? cur : null;
    },
    []
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!key) return "";

      const currentDict = DICTIONARIES[lang] || DICTIONARIES.hi;
      let text = getNested(currentDict, key);

      // Fallback 1: Hindi
      if (!text && lang !== "hi") {
        text = getNested(DICTIONARIES.hi, key);
      }

      // Fallback 2: English
      if (!text && lang !== "en") {
        text = getNested(DICTIONARIES.en, key);
      }

      // Fallback 3: Return key itself or clean last part
      if (!text) {
        const parts = key.split(".");
        return parts[parts.length - 1] ?? key;
      }

      // Variable interpolation: {{key}}
      if (params && typeof text === "string") {
        for (const [pKey, pVal] of Object.entries(params)) {
          const formattedVal =
            typeof pVal === "number" ? formatLocalizedNumber(pVal, lang) : String(pVal);
          text = text.replace(new RegExp(`{{\\s*${pKey}\\s*}}`, "g"), formattedVal);
        }
      }

      return text;
    },
    [lang, getNested]
  );

  const n = useCallback(
    (value: number | string | null | undefined): string => {
      return formatLocalizedNumber(value, lang);
    },
    [lang]
  );

  const c = useCallback(
    (value: number | string | null | undefined): string => {
      return formatCurrency(value, lang);
    },
    [lang]
  );

  const localizedTimeAgo = useCallback(
    (date: string | number | Date | null | undefined): string => {
      return computeTimeAgo(date, lang);
    },
    [lang]
  );

  const contextValue = useMemo(
    () => ({
      lang,
      setLang,
      t,
      n,
      c,
      timeAgo: localizedTimeAgo,
      isReady,
      languages: SUPPORTED_LANGUAGES,
    }),
    [lang, setLang, t, n, c, localizedTimeAgo, isReady]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

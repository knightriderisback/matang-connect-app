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
  /** Translate a dot-path key, raw term, or identifier with optional params */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Format number with Indian numbering and standard digits (1, 2, 3...) */
  n: (value: number | string | null | undefined) => string;
  /** Format currency with Rupee symbol and standard digits */
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

function normalizeLookupKey(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, "_")
    .replace(/[^\w]/g, "");
}

function camelToSnake(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>("hi");
  const [isReady, setIsReady] = useState(false);

  // Initialize from localStorage or navigator
  useEffect(() => {
    try {
      const saved = localStorage.getItem("matang-lang") as LanguageCode | null;
      if (saved && saved in DICTIONARIES) {
        setLangState(saved);
        document.documentElement.lang = saved === "hng" ? "hi-Latn" : saved;
      } else {
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
   * Search helper within a dictionary
   */
  const searchDictionary = useCallback((dict: Record<string, any>, key: string): string | null => {
    if (!dict || typeof dict !== "object" || !key) return null;

    // 1. Exact dotted path
    if (key.includes(".")) {
      const parts = key.split(".");
      let cur: any = dict;
      for (const p of parts) {
        if (!cur || typeof cur !== "object") {
          cur = null;
          break;
        }
        cur = cur[p];
      }
      if (typeof cur === "string") return cur;
    }

    // 2. Direct top-level key
    if (typeof dict[key] === "string") return dict[key];

    // 3. Search across all top-level sections
    const candidates = [
      key,
      normalizeLookupKey(key),
      camelToSnake(key),
      snakeToCamel(key),
      key.toLowerCase(),
    ];

    const prioritySections = [
      "roles",
      "categories",
      "genders",
      "marital",
      "relations",
      "education_opts",
      "occupations",
      "common",
      "nav",
      "auth",
      "dashboard",
      "census",
      "profile",
      "matrimony",
      "care",
      "jobs",
      "admin",
      "services",
      "sos",
      "rides",
      "vyapar",
      "panchang",
      "dharohar",
      "mahila",
      "polls",
      "gaurav",
      "badges",
      "scan",
    ];

    for (const sec of prioritySections) {
      if (dict[sec] && typeof dict[sec] === "object") {
        for (const cand of candidates) {
          if (typeof dict[sec][cand] === "string") {
            return dict[sec][cand];
          }
        }
      }
    }

    // 4. Any other section
    for (const secKey of Object.keys(dict)) {
      if (!prioritySections.includes(secKey) && typeof dict[secKey] === "object") {
        for (const cand of candidates) {
          if (typeof dict[secKey][cand] === "string") {
            return dict[secKey][cand];
          }
        }
      }
    }

    return null;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!key) return "";

      const currentDict = DICTIONARIES[lang] || DICTIONARIES.hi;
      let text = searchDictionary(currentDict, key);

      // Fallback 1: Hindi
      if (!text && lang !== "hi") {
        text = searchDictionary(DICTIONARIES.hi, key);
      }

      // Fallback 2: English
      if (!text && lang !== "en") {
        text = searchDictionary(DICTIONARIES.en, key);
      }

      // Fallback 3: Return key itself or clean last part
      if (!text) {
        if (key.includes(".")) {
          const parts = key.split(".");
          return parts[parts.length - 1] ?? key;
        }
        return key;
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
    [lang, searchDictionary]
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

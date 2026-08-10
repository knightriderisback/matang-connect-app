"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
const translations: Record<string, any> = {};
async function loadTranslation(lang: string) {
  if (!translations[lang]) {
    const mod = await import(`./translations/${lang}.json`);
    translations[lang] = mod.default;
  }
  return translations[lang];
}
interface I18nContextType { lang: string; setLang: (lang: string) => void; t: (key: string) => string | any; isReady: boolean; }
const I18nContext = createContext<I18nContextType>({ lang: "en", setLang: () => {}, t: (key: string) => key, isReady: false });
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState("en");
  const [isReady, setIsReady] = useState(false);
  const [dict, setDict] = useState<any>({});
  useEffect(() => { const saved = localStorage.getItem("matang-lang"); if (saved) setLangState(saved); }, []);
  useEffect(() => { loadTranslation(lang).then((d) => { setDict(d); setIsReady(true); }); localStorage.setItem("matang-lang", lang); }, [lang]);
  const setLang = (l: string) => { setIsReady(false); setLangState(l); };
  const t = (key: string): string => { const parts = key.split("."); let val = dict; for (const part of parts) { val = val?.[part]; if (!val) return key; } return val as string; };
  return <I18nContext.Provider value={{ lang, setLang, t, isReady }}>{children}</I18nContext.Provider>;
}
export function useI18n() { return useContext(I18nContext); }

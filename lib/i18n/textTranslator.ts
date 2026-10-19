import en from "./translations/en.json";
import hi from "./translations/hi.json";
import mr from "./translations/mr.json";
import cg from "./translations/cg.json";
import hng from "./translations/hng.json";

export type UiLanguage = "en" | "hi" | "mr" | "cg" | "hng";
type Dict = Record<string, unknown>;

function flatten(value: Dict, prefix = "", out: Record<string, string> = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child as Dict, path, out);
    else if (typeof child === "string") out[path] = child;
  }
  return out;
}

const FLAT: Record<UiLanguage, Record<string, string>> = {
  en: flatten(en),
  hi: flatten(hi),
  mr: flatten(mr),
  cg: flatten(cg),
  hng: flatten(hng),
};

const REVERSE = new Map<string, { key: string; sourceLang: UiLanguage }>();
for (const sourceLang of Object.keys(FLAT) as UiLanguage[]) {
  for (const [key, value] of Object.entries(FLAT[sourceLang])) {
    const normalized = value.trim().toLocaleLowerCase();
    if (normalized && !REVERSE.has(normalized)) REVERSE.set(normalized, { key, sourceLang });
  }
}

const PHRASES = Array.from(REVERSE.entries())
  .filter(([value]) => value.length >= 2)
  .sort((a, b) => b[0].length - a[0].length);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
}

export function translateKnownText(text: string, target: UiLanguage): string | null {
  if (!text || !text.trim()) return text;

  const trimmed = text.trim();
  const hit = REVERSE.get(trimmed.toLocaleLowerCase());

  if (hit) {
    const translated = FLAT[target][hit.key];
    if (typeof translated === "string" && translated.trim()) {
      return text.replace(trimmed, translated);
    }
  }

  let result = text;
  for (const [source, hitInfo] of PHRASES) {
    const targetValue = FLAT[target][hitInfo.key];
    if (!targetValue || source === targetValue.trim().toLocaleLowerCase()) continue;

    const re = new RegExp(
      "(^|[^\\p{L}])" + escapeRegExp(source) + "(?=$|[^\\p{L}])",
      "giu"
    );
    result = result.replace(re, (_match, prefix: string) => `${prefix}${targetValue}`);
  }

  return result === text ? null : result;
}

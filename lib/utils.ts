import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatPhone(phone: string): string { return phone.replace(/\D/g, "").slice(-10); }
export function generateQRId(): string { return `MATANG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`; }

/** Display-only number localization. IDs, phone, Aadhaar always stay English digits. */
const DIGIT_MAPS: Record<string, string[]> = {
  hi: ["०","१","२","३","४","५","६","७","८","९"],
  mr: ["०","१","२","३","४","५","६","७","८","९"],
  cg: ["०","१","२","३","४","५","६","७","८","९"],
  en: ["0","1","2","3","4","5","6","7","8","9"],
};

export function localizeNumber(value: string | number, lang: string = "en"): string {
  const str = String(value);
  const map = DIGIT_MAPS[lang] || DIGIT_MAPS.en;
  return str.replace(/\d/g, (d) => map[parseInt(d, 10)]);
}

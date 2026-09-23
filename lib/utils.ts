import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatPhone(phone: string): string { return phone.replace(/\D/g, "").slice(-10); }
export function generateQRId(): string { return `MATANG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`; }

/** Display-only number formatting. All numbers strictly use standard Western digits (0-9). */
export function localizeNumber(value: string | number, _lang: string = "en"): string {
  return String(value);
}

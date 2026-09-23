/**
 * Number & Date localization helpers for Matang Connect
 * Supports English ('en'), Hindi ('hi'), Marathi ('mr'), Chhattisgarhi ('cg'), and Hinglish ('hng').
 */

const DEV_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export type SupportedLocale = "en" | "hi" | "mr" | "cg" | "hng";

/**
 * Converts Western digits to Devanagari numerals for hi, mr, and cg.
 * For en and hng, keeps Western digits.
 */
export function toLocalizedDigits(value: string | number | null | undefined, locale: string = "en"): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (locale === "en" || locale === "hng") return s;
  // hi, mr, cg use Devanagari digits
  return s.replace(/\d/g, (d) => DEV_DIGITS[parseInt(d, 10)] ?? d);
}

/**
 * Formats a number with Indian grouping (e.g. 1,50,000) and converts to Devanagari if applicable.
 */
export function formatLocalizedNumber(
  value: number | string | null | undefined,
  locale: string = "en"
): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);

  // Format with en-IN grouping (lakhs / crores separator)
  const formattedEn = num.toLocaleString("en-IN");
  return toLocalizedDigits(formattedEn, locale);
}

/**
 * Formats an amount as Indian Rupee (₹) with Indian grouping and localized digits.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  locale: string = "en"
): string {
  if (value === null || value === undefined || value === "") return "₹0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return `₹${value}`;
  const formattedEn = num.toLocaleString("en-IN");
  return `₹${toLocalizedDigits(formattedEn, locale)}`;
}

/**
 * Localized relative time ago
 */
export function timeAgo(
  dateInput: string | number | Date | null | undefined,
  locale: string = "en"
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) {
    // Just now
    switch (locale) {
      case "hi": return "अभी-अभी";
      case "mr": return "आत्ताच";
      case "cg": return "एभे";
      case "hng": return "Abhi just";
      default: return "Just now";
    }
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const loc = (n: number) => toLocalizedDigits(n, locale);

  if (diffSec < 60) {
    switch (locale) {
      case "hi": return "अभी-अभी";
      case "mr": return "आत्ताच";
      case "cg": return "एभे";
      case "hng": return "Just now";
      default: return "Just now";
    }
  }
  if (diffMin < 60) {
    switch (locale) {
      case "hi": return `${loc(diffMin)} मिनट पहले`;
      case "mr": return `${loc(diffMin)} मिनिटांपूर्वी`;
      case "cg": return `${loc(diffMin)} मिनट पहिली`;
      case "hng": return `${loc(diffMin)} min pehle`;
      default: return `${loc(diffMin)}m ago`;
    }
  }
  if (diffHour < 24) {
    switch (locale) {
      case "hi": return `${loc(diffHour)} घंटे पहले`;
      case "mr": return `${loc(diffHour)} तासांपूर्वी`;
      case "cg": return `${loc(diffHour)} घंटा पहिली`;
      case "hng": return `${loc(diffHour)} ghante pehle`;
      default: return `${loc(diffHour)}h ago`;
    }
  }
  if (diffDay < 7) {
    switch (locale) {
      case "hi": return `${loc(diffDay)} दिन पहले`;
      case "mr": return `${loc(diffDay)} दिवसांपूर्वी`;
      case "cg": return `${loc(diffDay)} दिन पहिली`;
      case "hng": return `${loc(diffDay)} din pehle`;
      default: return `${loc(diffDay)}d ago`;
    }
  }

  // Format full date if older than 7 days
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const dateFormatted = `${d}/${m}/${y}`;
  return toLocalizedDigits(dateFormatted, locale);
}

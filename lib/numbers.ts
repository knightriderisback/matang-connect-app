/** Display-only Devanagari numerals. IDs/phones/Aadhaar stay English. */
const DEV = ["०","१","२","३","४","५","६","७","८","९"];

export function toLocalizedDigits(value: string | number, locale: string): string {
  const s = String(value);
  if (locale === "en") return s;
  // hi, mr, cg use Devanagari
  return s.replace(/\d/g, (d) => DEV[parseInt(d, 10)]);
}

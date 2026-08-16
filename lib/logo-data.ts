/**
 * Prefer transparent PNG assets from /public.
 * JPEG base64 fallback kept only if PNGs missing at build time (runtime uses public URL).
 *
 * Place a transparent logo at: public/logo-float.png (preferred) or public/logo.png
 */
export const LOGO_SRC = "/logo-float.png";
export const LOGO_FALLBACK = "/logo.png";
export const LOGO_SVG = "/logo.svg";

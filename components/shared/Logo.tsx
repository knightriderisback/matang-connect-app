"use client";
import { useState } from "react";
import { LOGO_SRC, LOGO_FALLBACK, LOGO_SVG } from "@/lib/logo-data";
import { useI18n } from "@/lib/i18n/LanguageProvider";

/**
 * Official Matang logo — transparent PNG only, no plate / background box.
 */
export function Logo({
  className = "w-10 h-10",
  title,
}: {
  className?: string;
  title?: string;
}) {
  const [src, setSrc] = useState(LOGO_SRC);
  const { t } = useI18n();
  const resolvedTitle = title || t("app.name");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={resolvedTitle}
      className={`${className} object-contain`}
      style={{
        backgroundColor: "transparent",
        background: "none",
        imageRendering: "auto",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
      }}
      draggable={false}
      decoding="async"
      onError={() => {
        if (src === LOGO_SRC) setSrc(LOGO_FALLBACK);
        else if (src === LOGO_FALLBACK) setSrc(LOGO_SVG);
      }}
    />
  );
}

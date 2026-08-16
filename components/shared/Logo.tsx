"use client";
import { useState } from "react";
import { LOGO_SRC, LOGO_FALLBACK, LOGO_SVG } from "@/lib/logo-data";

/**
 * High-clarity logo (transparent PNG). No plate background.
 */
export function Logo({
  className = "w-10 h-10",
  title = "Matang Connect",
}: {
  className?: string;
  title?: string;
}) {
  const [src, setSrc] = useState(LOGO_SRC);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      className={`${className} object-contain bg-transparent`}
      style={{
        background: "transparent",
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

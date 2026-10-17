"use client";
import { useState, useEffect } from "react";

/** Exact user-provided gold "वंशावली" image as heading only. */
export function VanshNameplate() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const parts: string[] = [];
        for (let i = 0; i <= 5; i++) {
          const res = await fetch(`/vanshawali-title-${i}.b64?v=6`);
          if (!res.ok) throw new Error(`chunk ${i}`);
          parts.push((await res.text()).trim());
        }
        if (!cancelled) {
          setSrc(`data:image/jpeg;base64,${parts.join("")}`);
        }
      } catch (e) {
        console.error("Vanshawali title load failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!src) {
    return (
      <div
        className="vh-sign"
        style={{ width: "min(72vw, 320px)", height: 72 }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt="वंशावली"
      className="vh-sign select-none"
      draggable={false}
      style={{
        width: "min(72vw, 320px)",
        maxHeight: 96,
        height: "auto",
        objectFit: "contain",
        pointerEvents: "none",
        display: "block",
        margin: "0 auto",
      }}
    />
  );
}

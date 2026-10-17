"use client";
import { useState, useEffect } from "react";

/** Exact user-provided gold "वंशावली" PNG/JPEG as heading only. */
export function VanshNameplate() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/vanshawali-title.b64?v=5`);
        if (!res.ok) throw new Error("title load failed");
        const b64 = (await res.text()).trim();
        if (!cancelled) setSrc(`data:image/jpeg;base64,${b64}`);
      } catch (e) {
        console.error("Vanshawali title load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
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

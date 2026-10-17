"use client";
import { useState, useEffect } from "react";

export default function VanshawaliPage() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const parts: string[] = [];
        for (let i = 0; i <= 5; i++) {
          const res = await fetch(`/vanshawali-title-${i}.b64`);
          if (!res.ok) throw new Error(`chunk ${i}`);
          parts.push((await res.text()).trim());
        }
        if (!cancelled) {
          setSrc(`data:image/png;base64,${parts.join("")}`);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center pt-10 px-4 bg-gray-50">
      {src ? (
        <img
          src={src}
          alt="वंशावली"
          style={{
            width: "min(56vw, 220px)",
            maxHeight: 48,
            height: "auto",
            objectFit: "contain",
            pointerEvents: "none",
            display: "block",
            margin: "0 auto",
          }}
          draggable={false}
        />
      ) : (
        <div style={{ width: "min(56vw, 220px)", height: 48 }} />
      )}
      <p className="mt-6 text-center text-sm text-gray-600 max-w-md">
        Exact gold image (transparent, no background) is now the heading. Full family tree restoring next.
      </p>
    </div>
  );
}

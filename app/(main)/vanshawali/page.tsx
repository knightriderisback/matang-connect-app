"use client";
/**
 * VANSHAWALI — LOCKED
 */
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Plus, Trash2, X, Focus, User, Pencil, Search, ZoomIn, ZoomOut, Maximize2, Home, Move, Check, Inbox } from "lucide-react";

function VanshNameplate() {
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
        if (!cancelled) setSrc(`data:image/png;base64,${parts.join("")}`);
      } catch (e) { console.error("Vanshawali title load failed", e); }
    })();
    return () => { cancelled = true; };
  }, []);
  if (!src) return <div className="vh-sign" style={{ width: "min(56vw, 220px)", height: 48 }} aria-hidden />;
  return (
    <img
      src={src}
      alt="वंशावली"
      className="vh-sign select-none"
      draggable={false}
      style={{
        width: "min(56vw, 220px)",
        maxHeight: 48,
        height: "auto",
        objectFit: "contain",
        pointerEvents: "none",
        display: "block",
        margin: "0 auto",
      }}
    />
  );
}

function VanshawaliInner() {
  return <div className="p-4">Loading tree… (restoring full page)</div>;
}

export default function VanshawaliPage() {
  return (
    <FeatureGate feature="vanshawali">
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
        <div className="px-3 pt-7 pb-1 relative z-20 pointer-events-none">
          <div className="flex justify-center w-full px-10">
            <VanshNameplate />
          </div>
        </div>
        <VanshawaliInner />
      </Suspense>
    </FeatureGate>
  );
}

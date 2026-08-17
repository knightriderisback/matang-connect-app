"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";

/**
 * LOCKED — do not change welcome design without explicit request.
 * High-tech, minimal welcome — no confetti / particle rain.
 */
export function WelcomeAnimation({ onComplete }: { onComplete: () => void }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 700);
    const t2 = setTimeout(() => setPhase("out"), 2800);
    const t3 = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        phase === "out" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 40%, #132a4a 0%, #0a1628 55%, #050d18 100%)",
      }}
    >
      {/* soft tech grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,162,39,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,39,0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 75%)",
        }}
      />

      {/* gold ring pulse */}
      <div className="pointer-events-none absolute left-1/2 top-[42%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-matang-gold/25 welcome-ring" />
      <div className="pointer-events-none absolute left-1/2 top-[42%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-matang-gold/10 welcome-ring-slow" />

      <div
        className={`relative z-10 flex flex-col items-center px-6 text-center transition-all duration-700 ${
          phase === "in" ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-splash.png"
          alt="Matang Connect"
          className="welcome-logo-3d mb-6 h-[min(78vw,22rem)] w-[min(78vw,22rem)] max-h-[45vh] max-w-[90vw] object-contain bg-transparent"
          draggable={false}
        />
        <h1 className="text-2xl font-semibold tracking-wide text-matang-gold sm:text-3xl">
          {t("common.welcome")}
        </h1>
        <p className="mt-2 max-w-xs text-sm text-white/70 sm:text-base">{t("common.welcomeMessage")}</p>
        {/* thin gold progress line */}
        <div className="mt-8 h-[2px] w-40 overflow-hidden rounded-full bg-white/10">
          <div className="welcome-progress h-full rounded-full bg-gradient-to-r from-matang-gold/40 via-matang-gold to-matang-gold/40" />
        </div>
      </div>
    </div>
  );
}

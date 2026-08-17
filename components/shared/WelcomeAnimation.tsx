"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/LanguageProvider";

export function WelcomeAnimation({ onComplete }: { onComplete: () => void }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const [confetti, setConfetti] = useState<
    Array<{ id: number; left: number; delay: number; color: string }>
  >([]);

  useEffect(() => {
    const pieces = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: ["#c9a227", "#f0d060", "#0a1628", "#22c55e", "#e8c547"][
        Math.floor(Math.random() * 5)
      ],
    }));
    setConfetti(pieces);
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 3800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-matang-navy flex flex-col items-center justify-center">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            backgroundColor: piece.color,
          }}
        />
      ))}
      <div className="text-center z-10 px-6">
        {/* Original transparent logo — soft 3D + entrance */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-splash.png"
          alt="Matang Connect"
          className="welcome-logo-3d mx-auto mb-6 w-48 h-48 sm:w-56 sm:h-56 object-contain bg-transparent"
          draggable={false}
        />
        <h1 className="text-3xl font-bold text-matang-gold mb-2">{t("common.welcome")}</h1>
        <p className="text-white/80 text-lg">{t("common.welcomeMessage")}</p>
      </div>
    </div>
  );
}

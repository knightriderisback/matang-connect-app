"use client";
import { QRCodeSVG } from "qrcode.react";
import { LOGO_SRC } from "@/lib/logo-data";

/**
 * Matang ID QR — centre logo is transparent PNG only (no white plate / box).
 * Logo is overlaid; high error correction (H) keeps QR scannable.
 */
export function MatangQR({
  value,
  size = 160,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const logoSize = Math.max(24, Math.round(size * 0.26));

  return (
    <div
      className={`relative inline-flex items-center justify-center bg-white p-2 rounded-xl border ${className}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        bgColor="#ffffff"
        fgColor="#0a1628"
        // No imageSettings excavate — avoids solid white rectangle behind logo
      />
      {/* Transparent official logo only — no background plate */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt=""
        width={logoSize}
        height={logoSize}
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
        style={{
          width: logoSize,
          height: logoSize,
          background: "transparent",
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
}

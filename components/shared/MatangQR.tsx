"use client";
import { QRCodeSVG } from "qrcode.react";
import { LOGO_SRC } from "@/lib/logo-data";

/**
 * Matang ID QR — centre uses transparent official logo only (no plate / dummy).
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
  const logoSize = Math.max(22, Math.round(size * 0.24));
  return (
    <div className={`inline-flex items-center justify-center bg-white p-2 rounded-xl border ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        bgColor="#ffffff"
        fgColor="#0a1628"
        imageSettings={{
          src: LOGO_SRC,
          height: logoSize,
          width: logoSize,
          excavate: true,
        }}
      />
    </div>
  );
}

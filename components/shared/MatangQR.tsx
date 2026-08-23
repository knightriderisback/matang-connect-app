"use client";
import { QRCodeSVG } from "qrcode.react";
import { LOGO_SRC } from "@/lib/logo-data";

/**
 * Matang ID QR with official logo in the centre (not a dummy mark).
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
  const logoSize = Math.max(20, Math.round(size * 0.22));
  return (
    <div className={`bg-white p-2 rounded-xl border inline-flex ${className}`}>
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

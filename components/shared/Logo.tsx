"use client";
import { LOGO_SRC } from "@/lib/logo-data";

export function Logo({
  className = "w-10 h-10",
  title = "Matang Connect",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <img
      src={LOGO_SRC}
      alt={title}
      className={className + " object-contain bg-transparent"}
      draggable={false}
    />
  );
}

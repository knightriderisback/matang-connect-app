"use client";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";

/**
 * Floating history shortcut — transparent, no navy plate behind logo.
 */
export function FloatingLogo() {
  const pathname = usePathname();
  const router = useRouter();
  if (["/", "/login", "/register", "/history"].includes(pathname || "") || pathname?.startsWith("/u/")) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/history")}
      className="fixed bottom-20 right-3 md:bottom-24 md:right-6 z-30 w-14 h-14 bg-transparent border-0 p-0 active:scale-90 transition-transform opacity-50 hover:opacity-90"
      title="Matang Samaj History"
      aria-label="Matang Samaj History"
    >
      <Logo
        className="w-full h-full object-contain bg-transparent"
        title="Matang History"
      />
      {/* Soft 3D lift without a solid plate */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          boxShadow: "0 6px 14px rgba(0,0,0,0.35), 0 2px 4px rgba(201,162,39,0.35)",
        }}
      />
    </button>
  );
}

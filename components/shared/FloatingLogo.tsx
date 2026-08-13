"use client";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";

export function FloatingLogo() {
  const pathname = usePathname();
  const router = useRouter();
  if (["/", "/login", "/register", "/history"].includes(pathname || "") || pathname?.startsWith("/u/")) {
    return null;
  }

  return (
    <button
      onClick={() => router.push("/history")}
      className="fixed bottom-20 right-3 md:bottom-24 md:right-6 z-30 w-12 h-12 rounded-full shadow-xl shadow-matang-navy/40 ring-2 ring-matang-gold/50 overflow-hidden bg-matang-navy active:scale-90 transition-transform"
      title="Matang Samaj History"
    >
      <Logo className="w-full h-full" />
    </button>
  );
}

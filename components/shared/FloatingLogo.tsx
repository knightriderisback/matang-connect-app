"use client";
import { usePathname, useRouter } from "next/navigation";

export function FloatingLogo() {
  const pathname = usePathname();
  const router = useRouter();
  if (["/", "/login", "/register", "/history"].includes(pathname || "")) return null;

  return (
    <button
      onClick={() => router.push("/history")}
      className="fixed bottom-20 right-3 z-30 w-12 h-12 rounded-full shadow-xl shadow-matang-navy/40 ring-2 ring-matang-gold/50 overflow-hidden bg-black active:scale-90 transition-transform"
      title="Matang Samaj History"
    >
      <img src="/logo.png" alt="History" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/logo.svg"; }} />
    </button>
  );
}

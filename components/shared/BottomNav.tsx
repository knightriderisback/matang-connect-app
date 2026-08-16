"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, UserCircle, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { cn } from "@/lib/utils";

const HIDE_ON = ["/", "/login", "/register", "/history"];

function peekIsStaff() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("matang_me_cache") || sessionStorage.getItem("matang_me_cache");
    if (!raw) return false;
    const role = JSON.parse(raw)?.user?.role;
    return ["volunteer", "core_committee", "super_admin"].includes(role || "");
  } catch {
    return false;
  }
}

export function BottomNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useCurrentUser();

  if (HIDE_ON.includes(pathname) || pathname.startsWith("/u/")) {
    return null;
  }

  const isStaff =
    ["volunteer", "core_committee", "super_admin"].includes(user?.role || "") ||
    (!user && peekIsStaff());

  // SOS removed from footer → header red button
  const items: { icon: typeof Home; label: string; href: string }[] = [
    { icon: Home, label: t("nav.home") || "Home", href: "/dashboard" },
    { icon: Users, label: t("nav.census") || "Census", href: "/census" },
    { icon: UserCircle, label: t("nav.profile") || "Profile", href: "/profile" },
  ];

  if (isStaff) {
    items.push({ icon: Shield, label: "Admin", href: "/admin" });
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 border-t border-gray-200/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto w-full max-w-lg md:max-w-5xl lg:max-w-6xl flex justify-around items-center h-11 px-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            (item.href === "/admin" && pathname.startsWith("/admin"));
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0 flex-1 h-full transition-colors",
                active ? "text-matang-gold" : "text-gray-500"
              )}
            >
              <item.icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

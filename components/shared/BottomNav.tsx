"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, UserCircle, Shield, Grid3X3 } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { cn } from "@/lib/utils";
import { effectiveRole } from "@/lib/auth/roleCache";

const HIDE_ON = ["/", "/login", "/register", "/history"];

/**
 * Staff: Home · Profile · Admin
 * Normal members: Home · Profile · Services
 */
export function BottomNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const role = effectiveRole(user?.role);

  if (HIDE_ON.includes(pathname) || pathname.startsWith("/u/")) {
    return null;
  }

  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(role || "");

  const items: { icon: typeof Home; label: string; href: string }[] = [
    { icon: Home, label: t("nav.home") || "Home", href: "/dashboard" },
    { icon: UserCircle, label: t("nav.profile") || "Profile", href: "/profile" },
  ];

  if (isStaff) {
    items.push({ icon: Shield, label: t("nav.admin") || "Admin", href: "/admin" });
  } else {
    // Every non-staff member gets Services in footer
    items.push({ icon: Grid3X3, label: t("nav.services") || "Services", href: "/services" });
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto w-full max-w-lg md:max-w-5xl lg:max-w-6xl flex justify-around items-center h-13 px-2 py-1">
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
                "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all select-none cursor-pointer active:scale-95",
                active ? "text-matang-navy font-bold" : "text-gray-500 hover:text-gray-800"
              )}
            >
              <div className="relative">
                <item.icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? "text-matang-navy" : "text-gray-500"}
                />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-matang-gold shadow-xs" />
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] leading-tight mt-1 tracking-tight truncate max-w-[80px]",
                  active ? "font-bold text-matang-navy" : "font-medium text-gray-500"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;

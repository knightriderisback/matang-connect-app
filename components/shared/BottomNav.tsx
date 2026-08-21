"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, UserCircle, Shield, Grid3X3 } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { cn } from "@/lib/utils";
import { effectiveRole } from "@/lib/auth/roleCache";

const HIDE_ON = ["/", "/login", "/register", "/history"];

/**
 * Staff / Super Admin footer unchanged (Home · Census · Profile · Admin).
 * Normal members only: + Services tab (stage/feature gated page).
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
  const isNormal = !isStaff;

  const items: { icon: typeof Home; label: string; href: string }[] = [
    { icon: Home, label: t("nav.home") || "Home", href: "/dashboard" },
  ];

  items.push({ icon: UserCircle, label: t("nav.profile") || "Profile", href: "/profile" });

  if (isStaff) {
    items.push({ icon: Shield, label: "Admin", href: "/admin" });
  }

  // Normal members: Services tab always (module tiles inside page are gated)
  if (isNormal) {
    items.push({ icon: Grid3X3, label: "Services", href: "/services" });
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

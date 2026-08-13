"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, UserCircle, AlertTriangle, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useCurrentUser();

  if (
    ["/", "/login", "/register", "/history"].includes(pathname || "") ||
    pathname?.startsWith("/u/")
  ) {
    return null;
  }

  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const items: { icon: typeof Home; label: string; href: string }[] = [
    { icon: Home, label: t("nav.home"), href: "/dashboard" },
    { icon: Users, label: t("nav.census"), href: "/census" },
    { icon: AlertTriangle, label: t("nav.sos"), href: "/sos" },
    { icon: UserCircle, label: t("nav.profile"), href: "/profile" },
  ];

  // Admin Tools last in footer (staff / super admin)
  if (isStaff) {
    items.push({ icon: Shield, label: "Admin", href: "/admin/directory" });
  }

  return (
    <nav className="shrink-0 z-40 w-full bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex justify-around items-center h-14 px-1 max-w-lg md:max-w-5xl lg:max-w-6xl mx-auto">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname?.startsWith(item.href + "/") ||
            (item.href === "/admin/directory" && pathname?.startsWith("/admin"));
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                active ? "text-matang-gold" : "text-gray-400"
              )}
            >
              <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

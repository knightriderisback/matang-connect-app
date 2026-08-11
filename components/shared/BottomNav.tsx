"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, UserCircle, AlertTriangle, Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  if (["/login", "/register", "/", "/history"].includes(pathname || "") || pathname?.startsWith("/u/")) {
    return null;
  }

  const items = [
    { icon: Home, label: t("nav.home"), href: "/dashboard" },
    { icon: Users, label: t("nav.census"), href: "/census" },
    { icon: Bell, label: t("nav.notices"), href: "/notices" },
    { icon: AlertTriangle, label: t("nav.sos"), href: "/sos" },
    { icon: UserCircle, label: t("nav.profile"), href: "/profile" },
  ];

  return (
    <nav className="shrink-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 md:border-t-0 md:bg-white md:shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex justify-around items-center h-16 px-1 max-w-lg md:max-w-5xl lg:max-w-6xl mx-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                active ? "text-matang-gold" : "text-gray-400 hover:text-matang-navy"
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

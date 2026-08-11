"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, UserCircle, AlertTriangle, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  if (["/login", "/register", "/"].includes(pathname || "")) return null;

  const items = [
    { icon: Home, label: t("nav.home"), href: "/dashboard" },
    { icon: Users, label: t("nav.census"), href: "/census" },
    { icon: AlertTriangle, label: t("nav.sos"), href: "/sos" },
    { icon: UserCircle, label: t("nav.profile"), href: "/profile" },
    { icon: Shield, label: t("nav.admin"), href: "/admin/directory" },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="flex justify-around items-center h-16 px-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <button key={item.href} onClick={() => router.push(item.href)}
              className={cn("flex flex-col items-center justify-center gap-0.5 flex-1 h-full", active ? "text-matang-gold" : "text-gray-400")}>
              <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

"use client";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, UserCircle, AlertTriangle, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const navItems = [
    { icon: Home, label: t("nav.home"), href: "/dashboard" },
    { icon: Users, label: t("nav.census"), href: "/census" },
    { icon: AlertTriangle, label: t("nav.sos"), href: "/sos" },
    { icon: UserCircle, label: t("nav.profile"), href: "/profile" },
    { icon: Shield, label: t("nav.admin"), href: "/admin/directory" },
  ];
  if (pathname === "/login" || pathname === "/register" || pathname === "/") return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <button key={item.href} onClick={() => router.push(item.href)} className={cn("flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors", isActive ? "text-matang-gold" : "text-gray-400")}>
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

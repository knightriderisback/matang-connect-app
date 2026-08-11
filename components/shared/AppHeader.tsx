"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  "/dashboard": "nav.home",
  "/census": "nav.census",
  "/sos": "nav.sos",
  "/profile": "nav.profile",
  "/care": "nav.care",
  "/jobs": "nav.jobs",
  "/notices": "nav.notices",
  "/kosh": "nav.kosh",
  "/vyapar": "nav.vyapar",
  "/matrimony": "nav.matrimony",
  "/dharohar": "nav.dharohar",
  "/panchang": "nav.panchang",
  "/mahila": "nav.mahila",
  "/polls": "nav.polls",
  "/arthik": "nav.arthik",
  "/scan": "nav.scan",
  "/admin/directory": "nav.admin",
  "/admin/verify": "nav.verify",
  "/admin/titles": "nav.admin",
  "/admin/audit": "nav.admin",
  "/admin/settings": "nav.admin",
  "/admin/reset-mpin": "nav.admin",
  "/history": "Matang History",
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const main = document.querySelector("[data-scroll-root]");
    const target = main || window;
    const onScroll = () => {
      const y = main ? (main as HTMLElement).scrollTop : window.scrollY;
      setScrolled(y > 12);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  if (["/", "/login", "/register"].includes(pathname || "")) return null;

  const exact = TITLES[pathname || ""];
  const prefixKey = Object.keys(TITLES)
    .filter((k) => k !== pathname && pathname?.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const titleKey = exact || (prefixKey ? TITLES[prefixKey] : null);
  const title = titleKey?.startsWith("nav.") ? t(titleKey) : titleKey || t("app.name");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-matang-navy/80 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-matang-navy/20"
          : "bg-gradient-to-r from-matang-navy via-[#0d1f3c] to-matang-navy"
      )}
    >
      <div className="h-0.5 bg-gradient-to-r from-transparent via-matang-gold to-transparent opacity-80" />
      <div className="px-3 py-2.5 flex items-center gap-2.5">
        <button
          onClick={() => router.push("/history")}
          className="shrink-0 relative group"
          title="Matang Samaj History"
        >
          <Logo className="w-9 h-9 rounded-lg shadow-md ring-1 ring-matang-gold/40 group-active:scale-95 transition-transform" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-matang-gold rounded-full border border-matang-navy" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{title}</p>
          {user?.full_name && (
            <p className="text-white/50 text-[10px] truncate">{user.full_name}</p>
          )}
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}

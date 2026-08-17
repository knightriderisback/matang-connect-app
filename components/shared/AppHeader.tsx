"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { cn } from "@/lib/utils";
import { ChevronLeft, HeartPulse } from "lucide-react";

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
  "/badges": "Volunteer Credits",
  "/gaurav": "Matang Gaurav",
  "/rides": "Ride Share",
  "/admin": "Admin",
  "/admin/directory": "Directory",
  "/admin/verify": "Verify Users",
  "/admin/titles": "City Titles",
  "/admin/audit": "Audit Log",
  "/admin/settings": "Stage Lock",
  "/admin/reset-mpin": "Reset M-PIN",
  "/history": "Matang History",
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const { can } = useFeatureFlags(user?.role);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const main = document.querySelector("[data-scroll-root]") as HTMLElement | null;
    const target: any = main || window;
    let last = false;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = main ? main.scrollTop : window.scrollY;
        const next = y > 12;
        if (next !== last) {
          last = next;
          setScrolled(next);
        }
        ticking = false;
      });
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

  const isHome = pathname === "/dashboard";
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else if (pathname?.startsWith("/admin")) {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  const showSos = can("sos");

  const ROLE_LABEL: Record<string, string> = {
    super_admin: "Super Admin",
    core_committee: "Core Committee",
    volunteer: "Volunteer",
    normal: "Member",
  };
  const roleLabel =
    (user as any)?.title ||
    ROLE_LABEL[user?.role || ""] ||
    user?.role ||
    "Member";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        "bg-matang-navy border-b border-white/10"
      )}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        minHeight: "calc(2.75rem + env(safe-area-inset-top, 0px))",
      }}
    >
      {/* fills notch/status — same navy, content sits below inset */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-matang-gold to-transparent opacity-80" />
      <div className="px-2 h-11 flex items-center gap-1.5">
        {!isHome ? (
          <button
            type="button"
            onClick={goBack}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl text-white/90 active:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/history")}
            className="shrink-0 relative group ml-1 bg-transparent border-0 p-0"
            title="Matang Samaj History"
          >
            <Logo
              className="w-11 h-11 object-contain bg-transparent group-active:scale-95 transition-transform -my-1"
            />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p
            className="matang-gold-title relative inline-block max-w-full truncate text-[17px] sm:text-[19px] font-black tracking-[0.1em] uppercase leading-none"
          >
            MATANG CONNECT
          </p>
          <p className="text-white/85 text-[10px] truncate leading-none -mt-0.5">
            {user?.full_name ? (
              <>
                <span className="text-white font-medium">{user.full_name}</span>
                <span className="text-matang-gold/90"> · {roleLabel}</span>
              </>
            ) : (
              <span className="text-matang-gold/80">{roleLabel}</span>
            )}
          </p>
        </div>
        {showSos ? (
          <button
            type="button"
            onClick={() => router.push("/sos")}
            title="Emergency SOS"
            aria-label="Emergency SOS"
            className="shrink-0 relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-red-400 to-red-700 text-white shadow-[0_3px_0_0_#7f1d1d,0_4px_8px_rgba(0,0,0,0.35)] active:shadow-[0_1px_0_0_#7f1d1d] active:translate-y-0.5 transition-all ring-1 ring-red-300/40"
          >
            <HeartPulse size={18} strokeWidth={2.5} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-300 animate-pulse" />
          </button>
        ) : null}
        <LanguageToggle />
      </div>
    </header>
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { effectiveRole } from "@/lib/auth/roleCache";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import {
  Users, AlertTriangle, HeartHandshake, Briefcase, Heart, Store, Car,
  BarChart3, Calendar, Landmark, Flower2, TrendingUp, Award, Trophy, QrCode, Grid3X3, Network,
} from "lucide-react";

interface ServiceItem {
  key: string;
  navKey: string;
  defaultLabel: string;
  href: string;
  icon: any;
  color: string;
}

const MEMBER_SERVICES: ServiceItem[] = [
  { key: "census", navKey: "census", defaultLabel: "Census", href: "/census", icon: Users, color: "bg-blue-100 text-blue-600" },
  { key: "sos", navKey: "sos", defaultLabel: "SOS", href: "/sos", icon: AlertTriangle, color: "bg-red-100 text-red-600" },
  { key: "care", navKey: "care", defaultLabel: "Care", href: "/care", icon: HeartHandshake, color: "bg-rose-100 text-rose-600" },
  { key: "jobs", navKey: "jobs", defaultLabel: "Jobs", href: "/jobs", icon: Briefcase, color: "bg-green-100 text-green-600" },
  { key: "kosh", navKey: "kosh", defaultLabel: "Sahyog", href: "/kosh", icon: Heart, color: "bg-pink-100 text-pink-600" },
  { key: "matrimony", navKey: "matrimony", defaultLabel: "Matrimony", href: "/matrimony", icon: Heart, color: "bg-fuchsia-100 text-fuchsia-600" },
  { key: "vyapar", navKey: "vyapar", defaultLabel: "Vyapar", href: "/vyapar", icon: Store, color: "bg-orange-100 text-orange-600" },
  { key: "rides", navKey: "rides", defaultLabel: "Rides", href: "/rides", icon: Car, color: "bg-sky-100 text-sky-700" },
  { key: "polls", navKey: "polls", defaultLabel: "Polls", href: "/polls", icon: BarChart3, color: "bg-cyan-100 text-cyan-600" },
  { key: "panchang", navKey: "panchang", defaultLabel: "Panchang", href: "/panchang", icon: Calendar, color: "bg-indigo-100 text-indigo-600" },
  { key: "dharohar", navKey: "dharohar", defaultLabel: "Dharohar", href: "/dharohar", icon: Landmark, color: "bg-amber-100 text-amber-700" },
  { key: "mahila", navKey: "mahila", defaultLabel: "Mahila", href: "/mahila", icon: Flower2, color: "bg-pink-100 text-pink-600" },
  { key: "arthik", navKey: "arthik", defaultLabel: "Arthik", href: "/arthik", icon: TrendingUp, color: "bg-emerald-100 text-emerald-700" },
  { key: "gaurav", navKey: "gaurav", defaultLabel: "Gaurav", href: "/gaurav", icon: Award, color: "bg-yellow-100 text-yellow-800" },
  { key: "gamification", navKey: "badges", defaultLabel: "Credits", href: "/badges", icon: Trophy, color: "bg-violet-100 text-violet-700" },
  { key: "scan", navKey: "scan", defaultLabel: "Scan", href: "/scan", icon: QrCode, color: "bg-slate-100 text-slate-700" },
  { key: "vanshawali", navKey: "vanshawali", defaultLabel: "Vanshawali", href: "/vanshawali", icon: Network, color: "bg-amber-100 text-amber-800" },
];

export default function ServicesPage() {
  const router = useRouter();
  const { t, n } = useI18n();
  const { user, loading } = useCurrentUser();
  const role = effectiveRole(user?.role);
  const { can, loading: flagsLoading, modules, refresh } = useFeatureFlags(role);
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(role || "");

  if (loading || flagsLoading) {
    return <div className="p-8 text-center text-gray-400">{t("common.loading")}…</div>;
  }

  // Prefer explicit modules list when present; else can()
  const visible = MEMBER_SERVICES.filter((s) => {
    if (isStaff) return true;
    if (modules !== null && modules.length > 0) return modules.includes(s.key);
    return can(s.key);
  });

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Grid3X3 className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">{t("nav.services")}</h1>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="text-xs text-matang-gold hover:underline font-medium"
        >
          {t("common.refresh")}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {t("services.description") || "Community services and member resources"}
        {" · "}
        <span className="font-medium text-gray-700">({n(visible.length)} {t("services.active") || "active"})</span>
      </p>

      {visible.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm text-gray-400">{t("common.noData")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {visible.map((s) => {
            const label = t(`nav.${s.navKey}`) || s.defaultLabel;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => router.push(s.href)}
                className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon size={20} />
                </div>
                <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

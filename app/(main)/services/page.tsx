"use client";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { effectiveRole } from "@/lib/auth/roleCache";
import {
  Users, AlertTriangle, HeartHandshake, Briefcase, Heart, Store, Car,
  BarChart3, Calendar, Landmark, Flower2, TrendingUp, Award, Trophy, QrCode, Grid3X3,
} from "lucide-react";

/** Same visual style as Admin → All modules */
const MEMBER_SERVICES = [
  { key: "census", label: "Census", href: "/census", icon: Users, color: "bg-blue-100 text-blue-600" },
  { key: "sos", label: "SOS", href: "/sos", icon: AlertTriangle, color: "bg-red-100 text-red-600" },
  { key: "care", label: "Care", href: "/care", icon: HeartHandshake, color: "bg-rose-100 text-rose-600" },
  { key: "jobs", label: "Jobs", href: "/jobs", icon: Briefcase, color: "bg-green-100 text-green-600" },
  { key: "kosh", label: "Sahyog", href: "/kosh", icon: Heart, color: "bg-pink-100 text-pink-600" },
  { key: "matrimony", label: "Matrimony", href: "/matrimony", icon: Heart, color: "bg-fuchsia-100 text-fuchsia-600" },
  { key: "vyapar", label: "Vyapar", href: "/vyapar", icon: Store, color: "bg-orange-100 text-orange-600" },
  { key: "rides", label: "Rides", href: "/rides", icon: Car, color: "bg-sky-100 text-sky-700" },
  { key: "polls", label: "Polls", href: "/polls", icon: BarChart3, color: "bg-cyan-100 text-cyan-600" },
  { key: "panchang", label: "Panchang", href: "/panchang", icon: Calendar, color: "bg-indigo-100 text-indigo-600" },
  { key: "dharohar", label: "Dharohar", href: "/dharohar", icon: Landmark, color: "bg-amber-100 text-amber-700" },
  { key: "mahila", label: "Mahila", href: "/mahila", icon: Flower2, color: "bg-pink-100 text-pink-600" },
  { key: "arthik", label: "Arthik", href: "/arthik", icon: TrendingUp, color: "bg-emerald-100 text-emerald-700" },
  { key: "gaurav", label: "Gaurav", href: "/gaurav", icon: Award, color: "bg-yellow-100 text-yellow-800" },
  { key: "gamification", label: "Credits", href: "/badges", icon: Trophy, color: "bg-violet-100 text-violet-700" },
  { key: "scan", label: "Scan", href: "/scan", icon: QrCode, color: "bg-slate-100 text-slate-700" },
];

export default function ServicesPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const role = effectiveRole(user?.role);
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(role || "");
  const { can } = useFeatureFlags(user?.role);
  const visible = MEMBER_SERVICES.filter((s) => can(s.key));

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading…</div>;
  }

  // Staff already have Admin hub — optional redirect
  if (isStaff) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-gray-500">Staff use Admin panel for all modules.</p>
        <button
          type="button"
          className="text-sm font-semibold text-matang-gold"
          onClick={() => router.push("/admin")}
        >
          Open Admin →
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Grid3X3 className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">Services</h1>
      </div>
      <p className="text-[11px] text-gray-500">
        Available modules for members. Super Admin unlocks stages from Admin → Stage Lock.
      </p>
      {visible.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          No services unlocked yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {visible.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => router.push(s.href)}
              className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={20} />
              </div>
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

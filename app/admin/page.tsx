"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import {
  Users, AlertTriangle, Briefcase, Bell, Heart, BookOpen, Shield, HeartHandshake,
  Store, Landmark, Calendar, Flower2, BarChart3, TrendingUp, QrCode,
  Car, Award, Trophy, Settings, UserCheck, KeyRound, ScrollText, Inbox,
} from "lucide-react";

const ALL_ACTIONS = [
  { key: "census", icon: Users, label: "Census", href: "/census", color: "bg-blue-100 text-blue-600" },
  { key: "sos", icon: AlertTriangle, label: "SOS", href: "/sos", color: "bg-red-100 text-red-600" },
  { key: "care", icon: HeartHandshake, label: "Care", href: "/care", color: "bg-rose-100 text-rose-600" },
  { key: "jobs", icon: Briefcase, label: "Jobs", href: "/jobs", color: "bg-green-100 text-green-600" },
  { key: "notices", icon: Bell, label: "Notices", href: "/notices", color: "bg-yellow-100 text-yellow-600" },
  { key: "kosh", icon: Heart, label: "Sahyog", href: "/kosh", color: "bg-pink-100 text-pink-600" },
  { key: "vyapar", icon: Store, label: "Vyapar", href: "/vyapar", color: "bg-orange-100 text-orange-600" },
  { key: "matrimony", icon: Heart, label: "Matrimony", href: "/matrimony", color: "bg-fuchsia-100 text-fuchsia-600" },
  { key: "dharohar", icon: Landmark, label: "Dharohar", href: "/dharohar", color: "bg-amber-100 text-amber-700" },
  { key: "panchang", icon: Calendar, label: "Panchang", href: "/panchang", color: "bg-indigo-100 text-indigo-600" },
  { key: "mahila", icon: Flower2, label: "Mahila", href: "/mahila", color: "bg-pink-100 text-pink-600" },
  { key: "polls", icon: BarChart3, label: "Polls", href: "/polls", color: "bg-cyan-100 text-cyan-600" },
  { key: "arthik", icon: TrendingUp, label: "Arthik", href: "/arthik", color: "bg-emerald-100 text-emerald-700" },
  { key: "rides", icon: Car, label: "Rides", href: "/rides", color: "bg-sky-100 text-sky-700" },
  { key: "gaurav", icon: Award, label: "Gaurav", href: "/gaurav", color: "bg-yellow-100 text-yellow-800" },
  { key: "gamification", icon: Trophy, label: "Credits", href: "/badges", color: "bg-violet-100 text-violet-700" },
  { key: "scan", icon: QrCode, label: "Scan", href: "/scan", color: "bg-slate-100 text-slate-700" },
  { key: "directory", icon: BookOpen, label: "Directory", href: "/admin/directory", color: "bg-purple-100 text-purple-600" },
  { key: "history", icon: ScrollText, label: "History", href: "/history", color: "bg-stone-100 text-stone-700" },
  { key: "profile", icon: Users, label: "Profile", href: "/profile", color: "bg-blue-50 text-blue-800" },
];

const ADMIN_LINKS = [
  { href: "/admin/requests", label: "All Requests", icon: Inbox },
  { href: "/admin/verify", label: "Verify Users", icon: UserCheck },
  { href: "/admin/reset-mpin", label: "Reset M-PIN", icon: KeyRound },
  { href: "/admin/titles", label: "City Titles", icon: Award },
  { href: "/admin/directory", label: "Directory", icon: BookOpen },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Stage Lock / Feature Flags", icon: Settings },
];

export default function AdminHubPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const { can } = useFeatureFlags(user?.role);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading…</div>;
  }
  if (!isStaff) {
    return <div className="p-8 text-center text-sm text-gray-500">Staff / Admin access only</div>;
  }

  const runSeed = async () => {
    setSeeding(true);
    setSeedMsg("");
    try {
      const r = await fetch("/api/admin/seed", { method: "POST" });
      const d = await r.json();
      if (!r.ok) setSeedMsg(d.error || "Failed");
      else setSeedMsg("Done: " + JSON.stringify(d.results));
    } catch {
      setSeedMsg("Network error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 space-y-5 pb-6">
      <div>
        <h1 className="text-lg font-bold text-matang-navy flex items-center gap-2">
          <Shield size={20} className="text-matang-gold" /> Admin
        </h1>
        <p className="text-[11px] text-gray-500 mt-0.5">
          All modules + tools. Stage lock only affects members.
        </p>
      </div>

      {user?.role === "super_admin" && (
        <div className="p-4 rounded-2xl border border-matang-gold/40 bg-matang-gold/10 space-y-2">
          <p className="text-sm font-semibold text-matang-navy">Demo data</p>
          <p className="text-[11px] text-gray-600">
            50 members (phone 90000xxxxx, M-PIN 1234), 12 posts all types, jobs, care, kosh.
          </p>
          <button
            type="button"
            disabled={seeding}
            onClick={runSeed}
            className="w-full py-2.5 rounded-xl bg-matang-navy text-matang-gold text-sm font-semibold disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Load demo data (50+ members)"}
          </button>
          {seedMsg && <p className="text-[10px] text-gray-600 break-all">{seedMsg}</p>}
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">All modules</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {ALL_ACTIONS.filter((a) => can(a.key)).map((a) => (
            <button
              key={a.href + a.key}
              type="button"
              onClick={() => router.push(a.href)}
              className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.color}`}>
                <a.icon size={20} />
              </div>
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">Admin Tools</h2>
        <div className="grid grid-cols-2 gap-2">
          {ADMIN_LINKS.filter((l) => l.href !== "/admin/requests" || can("admin_requests")).map((l) => (
            <button
              key={l.href}
              type="button"
              onClick={() => router.push(l.href)}
              className={`p-3 rounded-xl border text-sm font-medium text-left flex items-center gap-2 ${
                l.href === "/admin/settings"
                  ? "bg-matang-navy text-matang-gold col-span-2"
                  : "bg-white text-matang-navy"
              }`}
            >
              <l.icon size={16} />
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

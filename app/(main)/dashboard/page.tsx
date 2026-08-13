"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { WelcomeAnimation } from "@/components/shared/WelcomeAnimation";
import { Onboarding } from "@/components/shared/Onboarding";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { QRCodeSVG } from "qrcode.react";
import {
  Users, AlertTriangle, Briefcase, Bell, Heart, BookOpen, Shield, HeartHandshake,
  Store, Landmark, Calendar, Flower2, BarChart3, TrendingUp, QrCode, Sparkles,
  Car, Award, Trophy, Settings, UserCheck, KeyRound, ScrollText, Share2, Plus,
} from "lucide-react";

interface Notice {
  id: string;
  title: string;
  body?: string;
  content?: string;
  priority?: string;
  category?: string;
  type?: string;
  created_at: string;
}

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
  { href: "/admin/verify", label: "Verify Users", icon: UserCheck },
  { href: "/admin/reset-mpin", label: "Reset M-PIN", icon: KeyRound },
  { href: "/admin/titles", label: "City Titles", icon: Award },
  { href: "/admin/directory", label: "Directory", icon: BookOpen },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Stage Lock / Feature Flags", icon: Settings },
];

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useCurrentUser();
  const [showWelcome, setShowWelcome] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "general" });

  const isSuper = user?.role === "super_admin";
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  useEffect(() => {
    if (localStorage.getItem("matang-welcome") === "true") {
      setShowWelcome(true);
      localStorage.removeItem("matang-welcome");
    }
  }, []);

  const loadFeed = () => {
    setFeedLoading(true);
    fetch("/api/notices")
      .then((r) => r.json())
      .then((d) => setNotices(d.notices || []))
      .catch(() => {})
      .finally(() => setFeedLoading(false));
  };
  useEffect(() => {
    loadFeed();
  }, []);

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast("Title and message required", "error");
      return;
    }
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        body: form.body,
        category: form.category,
        type: form.category,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Posted", "success");
    setForm({ title: "", body: "", category: "general" });
    setShowPost(false);
    loadFeed();
  };

  const shareWA = (n: Notice) => {
    const text = n.body || n.content || "";
    const msg = `📢 *${n.title}*\n\n${text}\n\n— Matang Connect`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
  }

  return (
    <>
      <Onboarding />
      {showWelcome && <WelcomeAnimation onComplete={() => setShowWelcome(false)} />}
      <div className="space-y-4 pb-4">
        {/* Header strip */}
        <div className="px-4 pt-4">
          <p className="text-sm text-gray-500">Welcome,</p>
          <h2 className="text-xl font-bold text-matang-navy flex items-center gap-2 flex-wrap">
            {user?.full_name || "..."}
            {isSuper && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-matang-gold/25 text-matang-navy text-[10px] rounded-full font-semibold">
                <Shield size={10} /> Super Admin
              </span>
            )}
          </h2>
          <p className="text-[11px] text-matang-gold/90 flex items-center gap-1 mt-0.5">
            <Sparkles size={12} /> Matang AI — left bottom
          </p>
        </div>

        {/* ===== COMMUNITY FEED (primary home) ===== */}
        <div className="px-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-matang-navy flex items-center gap-2">
            <Bell size={18} className="text-matang-gold" /> Community Feed
          </h2>
          {isStaff && (
            <button
              type="button"
              onClick={() => setShowPost((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-matang-navy bg-matang-gold/20 px-2.5 py-1.5 rounded-full"
            >
              <Plus size={14} /> Post
            </button>
          )}
        </div>

        {showPost && isStaff && (
          <div className="mx-4 p-4 bg-white rounded-2xl border border-matang-gold/30 space-y-3 shadow-sm">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <label className="block text-sm font-medium text-matang-navy">Message</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[90px]"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Write for the community…"
            />
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="general">General</option>
              <option value="announcement">Announcement</option>
              <option value="meeting">Meeting</option>
              <option value="shok_sandesh">Shok Sandesh</option>
              <option value="urgent">Urgent</option>
            </select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPost(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={publish}>
                Publish
              </Button>
            </div>
          </div>
        )}

        {/* Feed list — channel style */}
        <div className="px-3 space-y-3">
          {feedLoading && (
            <p className="text-center text-gray-400 text-sm py-8">Loading feed…</p>
          )}
          {!feedLoading && notices.length === 0 && (
            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-gray-200">
              <Bell className="mx-auto text-gray-300 mb-2" size={28} />
              <p className="text-sm text-gray-400">No posts yet</p>
              {isStaff && (
                <p className="text-xs text-gray-400 mt-1">Tap + Post to publish the first notice</p>
              )}
            </div>
          )}
          {notices.map((n) => {
            const text = n.body || n.content || "";
            const tag = n.category || n.type || "general";
            const isShok = tag === "shok_sandesh";
            const isUrgent = tag === "urgent" || n.priority === "high" || n.priority === "urgent";
            return (
              <article
                key={n.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  isShok
                    ? "border-gray-300"
                    : isUrgent
                      ? "border-red-200"
                      : "border-gray-100"
                }`}
              >
                <div className="px-4 pt-3 pb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-matang-gold">
                        Matang Samaj
                      </span>
                      {tag !== "general" && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            isShok
                              ? "bg-gray-200 text-gray-700"
                              : isUrgent
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {tag.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-matang-navy text-[15px] leading-snug mt-0.5">
                      {n.title}
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                    {n.created_at ? timeAgo(n.created_at) : ""}
                  </span>
                </div>
                {text && (
                  <div className="px-4 pb-2">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {text}
                    </p>
                  </div>
                )}
                <div className="px-4 py-2 border-t border-gray-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => shareWA(n)}
                    className="flex items-center gap-1 text-xs text-green-600 font-medium"
                  >
                    <Share2 size={14} /> WhatsApp
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Digital ID — everyone */}
        <div className="px-4">
          <Card className="border-2 border-matang-gold/30">
            <CardHeader>
              <CardTitle className="text-base">🪷 {t("profile.digitalId")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {user?.qr_code_id ? (
                  <div className="bg-white p-2 rounded-lg border shrink-0">
                    <QRCodeSVG
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/u/${user.qr_code_id}`}
                      size={72}
                      level="M"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-matang-navy rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {user?.full_name?.[0] || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-matang-navy truncate">{user?.full_name}</p>
                  <p className="text-sm text-gray-500">{user?.native_village}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{user?.qr_code_id}</p>
                  <button
                    type="button"
                    onClick={() => router.push("/scan")}
                    className="text-xs text-matang-gold font-medium mt-1"
                  >
                    {t("profile.scanQr")} →
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== ADMIN ONLY: modules grid + tools (at the end) ===== */}
        {isStaff && (
          <div className="px-4 pt-2 space-y-4 border-t border-gray-200">
            <div>
              <h2 className="text-base font-bold text-matang-navy mb-1 flex items-center gap-2">
                <Shield size={16} className="text-matang-gold" />
                Admin — All modules
              </h2>
              <p className="text-[11px] text-gray-500 mb-2">
                Stage lock (members) is controlled in Stage Lock settings.
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {ALL_ACTIONS.map((a) => (
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
              <h2 className="text-base font-bold text-matang-navy mb-2">Admin Tools</h2>
              <div className="grid grid-cols-2 gap-2">
                {ADMIN_LINKS.map((l) => (
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
        )}
      </div>
    </>
  );
}

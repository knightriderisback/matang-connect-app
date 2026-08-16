"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { WelcomeAnimation } from "@/components/shared/WelcomeAnimation";
import { Onboarding } from "@/components/shared/Onboarding";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useFeatureFlags } from "@/lib/useFeatureFlags";
import { useToast } from "@/components/ui/Toaster";
import { QRCodeSVG } from "qrcode.react";
import { Bell, Plus, Share2, Sparkles, Shield } from "lucide-react";

interface Notice {
  id: string;
  title: string;
  body?: string;
  content?: string;
  priority?: string;
  category?: string;
  type?: string;
  created_at: string;
  posted_by?: string;
  poster_name?: string | null;
  poster_role?: string | null;
  poster_qr?: string | null;
  image_url?: string | null;
}

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
  const { flags } = useFeatureFlags(user?.role);
  const [showWelcome, setShowWelcome] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [showPost, setShowPost] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "general", image: "" });
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isSuper = user?.role === "super_admin";
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");
  const canPost = isStaff || flags.feed_member_post_enabled === true;
  const canImage = flags.feed_images_enabled !== false;

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

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast("Max 4MB image", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 1000;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = Math.round((h * max) / w); w = max; }
          else { w = Math.round((w * max) / h); h = max; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        setForm((prev) => ({ ...prev, image: canvas.toDataURL("image/jpeg", 0.72) }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  };

  const publish = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast("Title and message required", "error");
      return;
    }
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, body: form.body, category: form.category, image: form.image || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Posted", "success");
    setForm({ title: "", body: "", category: "general", image: "" });
    setShowPost(false);
    loadFeed();
  };

  const shareWA = async (n: Notice) => {
    const text = n.body || n.content || "";
    const img = n.image_url || "";
    const msg =
      `📢 *${n.title}*\n\n${text}` +
      (img ? `\n\n🖼 ${img}` : "") +
      `\n\n— Matang Connect`;

    // Mobile: share image file + text via system sheet (WhatsApp can pick image)
    if (img && typeof navigator !== "undefined" && navigator.share) {
      try {
        let file: File | null = null;
        if (img.startsWith("data:")) {
          const res = await fetch(img);
          const blob = await res.blob();
          file = new File([blob], "matang-feed.jpg", { type: blob.type || "image/jpeg" });
        } else if (img.startsWith("http")) {
          try {
            const res = await fetch(img, { mode: "cors" });
            if (res.ok) {
              const blob = await res.blob();
              file = new File([blob], "matang-feed.jpg", { type: blob.type || "image/jpeg" });
            }
          } catch {
            /* CORS — text+url fallback */
          }
        }
        if (file && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: n.title,
            text: msg,
            files: [file],
          });
          return;
        }
        await navigator.share({ title: n.title, text: msg });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        /* fall through to wa.me */
      }
    }

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

        <div className="px-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-matang-navy flex items-center gap-2">
            <Bell size={18} className="text-matang-gold" /> Community Feed
          </h2>
          {canPost && (
            <button
              type="button"
              onClick={() => setShowPost((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-matang-navy bg-matang-gold/20 px-2.5 py-1.5 rounded-full"
            >
              <Plus size={14} /> Post
            </button>
          )}
        </div>

        {showPost && canPost && (
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
            {canImage && (
              <div className="space-y-2">
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-xs font-semibold text-matang-navy border border-dashed border-matang-gold/50 rounded-xl w-full py-2"
                >
                  {form.image ? "Change image" : "Add image"}
                </button>
                {form.image && (
                  <div className="relative">
                    <img src={form.image} alt="" className="w-full max-h-48 object-cover rounded-xl" />
                    <button type="button" className="absolute top-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded" onClick={() => setForm({ ...form, image: "" })}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
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

        <div className="px-3 space-y-3">
          {feedLoading && (
            <p className="text-center text-gray-400 text-sm py-8">Loading feed…</p>
          )}
          {!feedLoading && notices.length === 0 && (
            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-gray-200">
              <Bell className="mx-auto text-gray-300 mb-2" size={28} />
              <p className="text-sm text-gray-400">No posts yet</p>
              {isStaff && (
                <p className="text-xs text-gray-400 mt-1">Tap + Post to publish</p>
              )}
            </div>
          )}
          {notices.map((n) => {
            const text = n.body || n.content || "";
            const tag = n.category || n.type || "general";
            const isShok = tag === "shok_sandesh";
            const isUrgent =
              tag === "urgent" || n.priority === "high" || n.priority === "urgent";
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
                      {n.poster_name && n.posted_by ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/member/${n.posted_by}`)}
                          className="text-[11px] font-semibold text-matang-navy hover:underline"
                        >
                          {n.poster_name}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-matang-gold">
                          Matang Samaj
                        </span>
                      )}
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
                {(n as any).image_url && (
                  <div className="px-4 pb-2">
                    <img src={(n as any).image_url} alt="" loading="lazy" decoding="async" className="w-full max-h-56 object-cover rounded-xl bg-gray-100" />
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
      </div>
    </>
  );
}

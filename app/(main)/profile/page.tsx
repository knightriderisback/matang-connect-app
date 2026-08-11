"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { QRCodeSVG } from "qrcode.react";
import { LogOut, Shield, MapPin, Phone, Pencil, Save, QrCode, Camera } from "lucide-react";

const ROLE_STYLE: Record<string, { label: string; gradient: string; badge: string }> = {
  super_admin: { label: "Super Admin", gradient: "from-matang-navy via-blue-900 to-purple-900", badge: "bg-matang-gold text-matang-navy" },
  core_committee: { label: "Core Committee", gradient: "from-indigo-800 to-matang-navy", badge: "bg-indigo-200 text-indigo-900" },
  volunteer: { label: "Volunteer", gradient: "from-emerald-700 to-teal-800", badge: "bg-emerald-100 text-emerald-800" },
  normal: { label: "Member", gradient: "from-matang-navy to-blue-900", badge: "bg-white/20 text-white" },
};

export default function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", native_village: "", photo: "" });

  const startEdit = () => {
    setForm({
      full_name: user?.full_name || "",
      native_village: user?.native_village || "",
      photo: user?.photo_url || "",
    });
    setEditing(true);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast("Max 5MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 600;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = Math.round((h * max) / w); w = max; }
          else { w = Math.round((w * max) / h); h = max; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        setForm((prev) => ({ ...prev, photo: canvas.toDataURL("image/jpeg", 0.75) }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  };

  const saveProfile = async () => {
    if (!form.full_name.trim() || !form.native_village.trim()) {
      toast("Name and village required", "error"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json();
        toast(e.error || "Update failed", "error");
        return;
      }
      toast("Profile updated", "success");
      setEditing(false);
      window.location.reload();
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
  const style = ROLE_STYLE[user?.role || "normal"] || ROLE_STYLE.normal;
  const photo = form.photo || user?.photo_url;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-matang-navy">{t("profile.title")}</h1>
        {!editing && (
          <button onClick={startEdit} className="flex items-center gap-1 text-sm text-matang-gold font-medium">
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>

      <Card className="border-2 border-matang-gold/40 overflow-hidden shadow-md">
        <div className={`bg-gradient-to-r ${style.gradient} p-4 text-white`}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-matang-gold text-sm">🪷 {t("profile.digitalId")}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${style.badge}`}>{style.label}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-matang-gold/50 overflow-hidden">
                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : (user?.full_name?.[0] || "?")}
              </div>
              {editing && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-matang-gold rounded-full flex items-center justify-center text-matang-navy">
                  <Camera size={14} />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.full_name}</h2>
              <p className="text-white/70 text-sm flex items-center gap-1"><MapPin size={12} /> {user?.native_village}</p>
              <p className="text-white/70 text-sm flex items-center gap-1"><Phone size={12} /> {user?.phone}</p>
            </div>
          </div>
          {user?.verification_status === "verified" && (
            <span className="inline-block mt-3 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-full">✓ Verified</span>
          )}
        </div>

        {editing ? (
          <CardContent className="p-4 space-y-3">
            <Input label="Full Name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <Input label="Native Village *" value={form.native_village} onChange={(e) => setForm({ ...form, native_village: e.target.value })} required />
            <p className="text-xs text-gray-400">Phone cannot be changed here (security).</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
              <Button className="flex-1" isLoading={saving} onClick={saveProfile}><Save size={16} /> Save</Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">City</span><span className="font-medium">{user?.cities?.name || "-"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">QR ID</span><span className="font-mono text-xs">{user?.qr_code_id}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Role</span>
              <span className="font-medium flex items-center gap-1"><Shield size={14} /> {style.label}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {user?.qr_code_id && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><QrCode size={18} /> {t("profile.qrCode")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center py-4 gap-2">
            <div className="bg-white p-3 rounded-xl border">
              <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/u/${user.qr_code_id}`} size={160} level="M" />
            </div>
            <p className="text-xs text-gray-500 text-center max-w-xs">Show this QR at community events for verification.</p>
            <button
              onClick={() => router.push("/scan")}
              className="text-sm text-matang-gold font-medium flex items-center gap-1"
            >
              <QrCode size={14} /> {t("profile.scanQr")}
            </button>
          </CardContent>
        </Card>
      )}

      <Button variant="danger" className="w-full" onClick={handleLogout}>
        <LogOut size={18} /> Logout
      </Button>
    </div>
  );
}

"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { QRCodeSVG } from "qrcode.react";
import { LogOut, Shield, MapPin, Phone, Pencil, Save, QrCode, ImagePlus } from "lucide-react";

const ROLE_STYLE: Record<string, { label: string; gradient: string; badge: string }> = {
  super_admin: { label: "Super Admin", gradient: "from-matang-navy via-blue-900 to-purple-900", badge: "bg-matang-gold text-matang-navy" },
  core_committee: { label: "Core Committee", gradient: "from-indigo-800 to-matang-navy", badge: "bg-indigo-200 text-indigo-900" },
  volunteer: { label: "Volunteer", gradient: "from-emerald-700 to-teal-800", badge: "bg-emerald-100 text-emerald-800" },
  normal: { label: "Member", gradient: "from-matang-navy to-blue-900", badge: "bg-white/20 text-white" },
};

const GENDERS = [
  { value: "", label: "Select" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];
const BLOOD = ["", "Unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => ({
  value: b,
  label: b || "Select",
}));
const EDUCATION = [
  "",
  "No formal education",
  "Primary (1-5)",
  "Middle (6-8)",
  "High School (9-10)",
  "Higher Secondary (11-12)",
  "Diploma",
  "Graduate",
  "Post Graduate",
  "Professional",
  "Other",
].map((e) => ({ value: e, label: e || "Select" }));
const OCCUPATIONS = [
  "",
  "Student",
  "Farmer",
  "Labourer",
  "Private Job",
  "Government Job",
  "Business",
  "Self Employed",
  "Homemaker",
  "Unemployed",
  "Retired",
  "Other",
].map((o) => ({ value: o, label: o || "Select" }));

export default function ProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    native_village: "",
    photo: "",
    gender: "",
    blood_group: "",
    education_level: "",
    occupation: "",
    about: "",
    address: "",
  });

  const startEdit = () => {
    const u = user as any;
    setForm({
      full_name: user?.full_name || "",
      native_village: user?.native_village || "",
      photo: user?.photo_url || "",
      gender: u?.gender || "",
      blood_group: u?.blood_group || "",
      education_level: u?.education_level || "",
      occupation: u?.occupation || "",
      about: u?.about || "",
      address: u?.address || "",
    });
    setEditing(true);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast("Max 5MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max = 600;
        let w = img.width,
          h = img.height;
        if (w > max || h > max) {
          if (w > h) {
            h = Math.round((h * max) / w);
            w = max;
          } else {
            w = Math.round((w * max) / h);
            h = max;
          }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        setForm((prev) => ({ ...prev, photo: canvas.toDataURL("image/jpeg", 0.75) }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(f);
  };

  const saveProfile = async () => {
    if (!form.full_name.trim() || !form.native_village.trim()) {
      toast("Name and village required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Update failed", "error");
        return;
      }
      toast("Profile updated", "success");
      setEditing(false);
      // Soft refresh so saved fields reappear from server
      window.location.href = "/profile";
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
  if (!user) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-gray-500 text-sm">Profile details could not be loaded.</p>
        <button
          type="button"
          className="text-sm font-semibold text-matang-gold"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  const style = ROLE_STYLE[user?.role || "normal"] || ROLE_STYLE.normal;
  const photo = form.photo || user?.photo_url;
  const u = user as any;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
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
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.full_name?.[0] || "?"
                )}
              </div>
              {editing && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-matang-gold rounded-full flex items-center justify-center text-matang-navy"
                  title="Choose photo from gallery"
                >
                  <ImagePlus size={14} />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.full_name}</h2>
              <p className="text-white/70 text-sm flex items-center gap-1">
                <MapPin size={12} /> {user?.native_village}
              </p>
              <p className="text-white/70 text-sm flex items-center gap-1">
                <Phone size={12} /> {user?.phone}
              </p>
            </div>
          </div>
          {user?.verification_status === "verified" && (
            <span className="inline-block mt-3 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-full">✓ Verified</span>
          )}
        </div>

        {editing ? (
          <CardContent className="p-4 space-y-3">
            <Input
              label="Full Name *"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
            <Input
              label="Native Village *"
              value={form.native_village}
              onChange={(e) => setForm({ ...form, native_village: e.target.value })}
              required
            />
            <Input
              label="Current Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                options={GENDERS}
              />
              <Select
                label="Blood Group"
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                options={BLOOD}
              />
            </div>
            <Select
              label="Education"
              value={form.education_level}
              onChange={(e) => setForm({ ...form, education_level: e.target.value })}
              options={EDUCATION}
            />
            <Select
              label="Occupation"
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              options={OCCUPATIONS}
            />
            <label className="block text-sm font-medium text-matang-navy">About</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[80px]"
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              placeholder="Short intro about you / family"
            />
            <p className="text-xs text-gray-400">Phone & city change only via admin (security).</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button className="flex-1" isLoading={saving} onClick={saveProfile}>
                <Save size={16} /> Save
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">City</span>
              <span className="font-medium">{user?.cities?.name || "-"}</span>
            </div>
            {u?.address && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Address</span>
                <span className="font-medium text-right">{u.address}</span>
              </div>
            )}
            {u?.gender && (
              <div className="flex justify-between">
                <span className="text-gray-500">Gender</span>
                <span className="font-medium">{u.gender}</span>
              </div>
            )}
            {u?.blood_group && (
              <div className="flex justify-between">
                <span className="text-gray-500">Blood Group</span>
                <span className="font-medium">{u.blood_group}</span>
              </div>
            )}
            {u?.education_level && (
              <div className="flex justify-between">
                <span className="text-gray-500">Education</span>
                <span className="font-medium">{u.education_level}</span>
              </div>
            )}
            {u?.occupation && (
              <div className="flex justify-between">
                <span className="text-gray-500">Occupation</span>
                <span className="font-medium">{u.occupation}</span>
              </div>
            )}
            {u?.about && (
              <div>
                <span className="text-gray-500 block mb-0.5">About</span>
                <p className="font-medium text-gray-800">{u.about}</p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">QR ID</span>
              <span className="font-mono text-xs">{user?.qr_code_id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Role</span>
              <span className="font-medium flex items-center gap-1">
                <Shield size={14} /> {style.label}
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {user?.qr_code_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode size={18} /> {t("profile.qrCode")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4 gap-2">
            <div className="bg-white p-3 rounded-xl border">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/u/${user.qr_code_id}`}
                size={160}
                level="M"
              />
            </div>
            <p className="text-xs text-gray-500 text-center max-w-xs">
              Show this QR at community events for verification.
            </p>
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

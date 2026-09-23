"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { MapPin, Phone, Shield, ChevronLeft, User, RotateCcw, Search } from "lucide-react";
import {
  MATRIX_SECTIONS,
  MATRIX_LABELS,
  MATRIX_FLAG_KEYS,
} from "@/lib/featureRoleMatrix";

function ViewHideBtn({
  on,
  onClick,
  busy,
  viewLabel,
  hideLabel,
}: {
  on: boolean;
  onClick: () => void;
  busy?: boolean;
  viewLabel: string;
  hideLabel: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`min-w-[4.25rem] px-2.5 py-1.5 rounded-full text-[11px] font-bold transition active:scale-95 disabled:opacity-50 cursor-pointer ${
        on
          ? "bg-green-100 text-green-800 border border-green-300"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {on ? viewLabel : hideLabel}
    </button>
  );
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, n } = useI18n();
  const { toast } = useToast();
  const { user: me } = useCurrentUser();
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(me?.role || "");
  const canEditFlags = me?.role === "super_admin";
  const [member, setMember] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [effective, setEffective] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [categoryDefaults, setCategoryDefaults] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [flagSearch, setFlagSearch] = useState("");

  const loadFlags = () => {
    if (!id || !canEditFlags) return;
    fetch(`/api/admin/member-modules?userId=${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.effective) setEffective(d.effective);
        if (d.overrides) setOverrides(d.overrides);
        if (d.categoryDefaults) setCategoryDefaults(d.categoryDefaults);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/member/${id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Not found");
        setMember(d.member);
      })
      .catch((e) => setError(e.message || "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canEditFlags]);

  const togglePersonal = async (key: string) => {
    const cur = effective[key] === true;
    const next = !cur;
    setEffective((p) => ({ ...p, [key]: next }));
    setOverrides((p) => ({ ...p, [key]: next }));
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/member-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, key, view: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        loadFlags();
        return;
      }
      if (data.effective) setEffective(data.effective);
      if (data.overrides) setOverrides(data.overrides);
      if (data.categoryDefaults) setCategoryDefaults(data.categoryDefaults);
      toast(`${t("common.success")}: ${next ? t("common.view") : t("common.hide")}`, "success");
    } catch {
      toast(t("common.error"), "error");
      loadFlags();
    } finally {
      setBusyKey(null);
    }
  };

  const revertToCategory = async (key: string) => {
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/member-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, key, view: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      if (data.effective) setEffective(data.effective);
      if (data.overrides) setOverrides(data.overrides);
      if (data.categoryDefaults) setCategoryDefaults(data.categoryDefaults);
      toast(t("common.success"), "success");
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setBusyKey(null);
    }
  };

  const resetAllOverrides = async () => {
    if (!confirm(t("common.confirmDelete"))) return;
    setBusyKey("all");
    try {
      const res = await fetch("/api/admin/member-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, action: "reset_all" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.effective) setEffective(data.effective);
      if (data.overrides) setOverrides(data.overrides || {});
      toast(t("common.success"), "success");
    } catch (e: any) {
      toast(e.message || t("common.error"), "error");
    } finally {
      setBusyKey(null);
    }
  };

  const filteredSections = useMemo(() => {
    if (!flagSearch.trim()) return MATRIX_SECTIONS;
    const q = flagSearch.trim().toLowerCase();
    return MATRIX_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (it) =>
          it.key.toLowerCase().includes(q) ||
          it.label.toLowerCase().includes(q) ||
          sec.title.toLowerCase().includes(q)
      ),
    })).filter((sec) => sec.items.length > 0);
  }, [flagSearch]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">{t("common.loading")}</div>;
  }
  if (error || !member) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-red-600">{error || t("common.noData")}</p>
        <button type="button" onClick={() => router.back()} className="text-matang-gold text-sm font-medium cursor-pointer">
          ← {t("common.back")}
        </button>
      </div>
    );
  }

  const overrideCount = Object.keys(overrides).length;

  return (
    <div className="p-4 space-y-4 pb-28 max-w-lg mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-matang-gold font-medium cursor-pointer"
      >
        <ChevronLeft size={16} /> {t("common.back")}
      </button>

      <Card className="overflow-hidden border-matang-gold/30">
        <div className="bg-gradient-to-r from-matang-navy to-blue-900 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center text-2xl font-bold overflow-hidden">
              {member.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                member.full_name?.[0] || "?"
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{member.full_name}</h1>
              <p className="text-sm text-white/70 flex items-center gap-1">
                <Shield size={12} /> {t(member.role || "member")} · {t(member.verification_status || "pending")}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="p-4 space-y-3 text-sm">
          {member.phone && (
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400" />
              <a href={`tel:${member.phone}`} className="font-medium text-matang-navy">
                {member.phone}
              </a>
            </p>
          )}
          <p className="flex items-center gap-2">
            <MapPin size={14} className="text-gray-400" />
            {member.native_village || "—"}
            {member.cities?.name ? ` · ${member.cities.name}` : ""}
          </p>
          {member.qr_code_id && (
            <p className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <User size={14} /> {member.qr_code_id}
            </p>
          )}
          {member.about && <p className="text-gray-600 pt-1">{member.about}</p>}

          <div className="border-t border-gray-100 pt-2 mt-2 divide-y divide-gray-50">
            <div className="flex justify-between items-center py-2 gap-2">
              <span className="text-gray-500">{t("common.phone")}</span>
              <span className="font-mono text-xs font-medium">
                {member.phone_hidden ? t("common.hide") : member.phone || "—"}
              </span>
            </div>
            {[
              [t("auth.nativeVillage"), member.native_village || "—"],
              [t("auth.city"), member.cities?.name || "—"],
              [t("common.address"), member.address || "—"],
              [t("census.gender"), member.gender ? t(member.gender) : "—"],
              [t("census.bloodGroup"), member.blood_group || "—"],
              [t("census.education"), member.education_level ? t(member.education_level) : "—"],
              [t("census.occupation"), member.occupation ? t(member.occupation) : "—"],
              [t("profile.about"), member.about || "—"],
              [t("profile.qrId"), member.qr_code_id || "—"],
              [t("common.role"), member.role ? t(member.role) : "—"],
              [t("common.status"), member.verification_status ? t(member.verification_status) : "—"],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between items-start gap-2 py-2">
                <span className="text-gray-500 shrink-0">{label}</span>
                <span className="font-medium text-right text-matang-navy max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => router.push(`/vanshawali?user=${member.id}`)}
            className="w-full mt-2 text-sm font-semibold text-matang-navy border border-matang-gold/50 rounded-xl py-2.5 bg-amber-50 cursor-pointer"
          >
            {t("nav.vanshawali")} →
          </button>
          {isStaff && (
            <button
              type="button"
              onClick={() => router.push(`/admin/directory?user=${member.id}`)}
              className="w-full mt-2 text-sm font-semibold text-matang-gold border border-matang-gold/40 rounded-xl py-2 cursor-pointer"
            >
              {t("profile.openInDirectory")} →
            </button>
          )}
        </CardContent>
      </Card>

      {canEditFlags && member.role !== "super_admin" && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-matang-navy">{t("admin.featureControl")}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {t("common.role")}: <span className="font-semibold">{t(member.role || "member")}</span>
              </p>
            </div>
            {overrideCount > 0 && (
              <button
                type="button"
                disabled={busyKey === "all"}
                onClick={resetAllOverrides}
                className="flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition cursor-pointer"
              >
                <RotateCcw size={10} /> Reset ({n(overrideCount)})
              </button>
            )}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={flagSearch}
              onChange={(e) => setFlagSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-matang-gold"
            />
          </div>

          {filteredSections.map((sec) => (
            <div key={sec.title} className="rounded-2xl border border-gray-100 bg-white p-3 space-y-1 shadow-sm">
              <h3 className="text-[11px] font-bold text-matang-navy pb-1 border-b border-gray-50">
                {sec.title}
              </h3>
              {sec.items.map((item) => {
                const key = item.key;
                const isOverridden = key in overrides;
                const on = effective[key] === true;
                const catOn = categoryDefaults[key] !== false;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-medium text-matang-navy truncate">
                        {item.label}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-gray-400 font-mono truncate">{key}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                            catOn ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          Cat: {catOn ? t("common.view") : t("common.hide")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOverridden && (
                        <button
                          type="button"
                          disabled={busyKey === key}
                          onClick={() => revertToCategory(key)}
                          title="Clear override"
                          className="text-[10px] text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-gray-100 transition cursor-pointer"
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                      <ViewHideBtn
                        on={on}
                        busy={busyKey === key}
                        onClick={() => togglePersonal(key)}
                        viewLabel={t("common.view")}
                        hideLabel={t("common.hide")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

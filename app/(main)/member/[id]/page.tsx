"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { MapPin, Phone, Shield, ChevronLeft, User } from "lucide-react";
import { MATRIX_SECTIONS } from "@/lib/featureRoleMatrix";

function ViewHideBtn({
  on,
  onClick,
  busy,
}: {
  on: boolean;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`min-w-[4.25rem] px-2.5 py-1.5 rounded-full text-[11px] font-bold transition active:scale-95 disabled:opacity-50 ${
        on
          ? "bg-green-100 text-green-800 border border-green-300"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {on ? "View" : "Hide"}
    </button>
  );
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user: me } = useCurrentUser();
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(me?.role || "");
  const canEditFlags = ["core_committee", "super_admin"].includes(me?.role || "");
  const [member, setMember] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [effective, setEffective] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadFlags = () => {
    if (!id || !canEditFlags) return;
    fetch(`/api/admin/member-flags?userId=${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.effective) setEffective(d.effective);
        if (d.overrides) setOverrides(d.overrides);
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
    const cur = effective[key] !== false;
    const next = !cur;
    setEffective((p) => ({ ...p, [key]: next }));
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/member-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, key, value: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        setEffective((p) => ({ ...p, [key]: cur }));
        return;
      }
      if (data.effective) setEffective(data.effective);
      if (data.overrides) setOverrides(data.overrides);
      toast(`Personal: ${next ? "View" : "Hide"}`, "success");
    } catch {
      toast("Network error", "error");
      setEffective((p) => ({ ...p, [key]: cur }));
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading profile…</div>;
  }
  if (error || !member) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-red-600">{error || "Member not found"}</p>
        <button type="button" onClick={() => router.back()} className="text-matang-gold text-sm font-medium">
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24 max-w-lg mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-matang-gold font-medium"
      >
        <ChevronLeft size={16} /> Back
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
                <Shield size={12} /> {member.role || "member"} · {member.verification_status || "-"}
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
            {member.native_village || "-"}
            {member.cities?.name ? ` · ${member.cities.name}` : ""}
          </p>
          {member.qr_code_id && (
            <p className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <User size={14} /> {member.qr_code_id}
            </p>
          )}
          {member.about && <p className="text-gray-600 pt-1">{member.about}</p>}

          {isStaff && (
            <button
              type="button"
              onClick={() => router.push(`/admin/directory?user=${member.id}`)}
              className="w-full mt-2 text-sm font-semibold text-matang-gold border border-matang-gold/40 rounded-xl py-2"
            >
              Open in Directory (staff tools) →
            </button>
          )}
        </CardContent>
      </Card>

      {canEditFlags && member.role !== "super_admin" && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-bold text-matang-navy">Personal feature access</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Is person ke liye View/Hide. Global Feature Control se default aata hai; yahan change =
              sirf is member pe. Global change personal override clear karke phir se sync karta hai.
            </p>
          </div>
          {MATRIX_SECTIONS.map((sec) => (
            <div key={sec.title} className="rounded-2xl border border-gray-100 bg-white p-3 space-y-1">
              <h3 className="text-[11px] font-bold text-matang-navy pb-1 border-b border-gray-50">
                {sec.title}
              </h3>
              {sec.items.map(({ key, label }) => {
                const on = effective[key] !== false;
                const isOverride = key in overrides;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-matang-navy truncate">{label}</p>
                      <p className="text-[9px] text-gray-400">
                        {isOverride ? "Personal override" : "From global"}
                      </p>
                    </div>
                    <ViewHideBtn
                      on={on}
                      busy={busyKey === key}
                      onClick={() => togglePersonal(key)}
                    />
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

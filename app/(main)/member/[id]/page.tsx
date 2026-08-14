"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { MapPin, Phone, Shield, ChevronLeft, User } from "lucide-react";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: me } = useCurrentUser();
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(me?.role || "");
  const [member, setMember] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}

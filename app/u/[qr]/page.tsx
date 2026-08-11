"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { MapPin, Shield, User, ArrowLeft } from "lucide-react";

interface Member {
  full_name: string;
  native_village?: string;
  verification_status?: string;
  role?: string;
  qr_code_id?: string;
  photo_url?: string;
  cities?: { name: string } | null;
}

export default function PublicMemberPage() {
  const params = useParams();
  const router = useRouter();
  const qr = decodeURIComponent(String(params?.qr || ""));
  const [member, setMember] = useState<Member | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!qr) {
      setError("Invalid QR");
      setLoading(false);
      return;
    }
    fetch(`/api/public/member?qr=${encodeURIComponent(qr)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Not found");
        setMember(d.member);
      })
      .catch((e) => setError(e.message || "Not found"))
      .finally(() => setLoading(false));
  }, [qr]);

  return (
    <div className="min-h-[100dvh] bg-matang-cream p-4 flex flex-col items-center">
      <div className="w-full max-w-md space-y-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-full bg-white border shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <Logo className="w-10 h-10 rounded-xl" />
          <div>
            <p className="font-bold text-matang-navy text-sm">Matang Connect</p>
            <p className="text-[11px] text-gray-500">Digital Member ID</p>
          </div>
        </div>

        {loading && (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        )}

        {error && !loading && (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <p className="text-red-600 font-medium">{error}</p>
              <p className="text-sm text-gray-500">QR ID: {qr}</p>
              <Button className="w-full" onClick={() => router.push("/login")}>
                Login to Matang Connect
              </Button>
            </CardContent>
          </Card>
        )}

        {member && !loading && (
          <Card className="border-2 border-matang-gold/40 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-matang-navy to-blue-900 p-5 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-matang-gold/50 flex items-center justify-center text-2xl font-bold overflow-hidden">
                  {member.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    member.full_name?.[0] || "?"
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold truncate">{member.full_name}</h1>
                  <p className="text-white/70 text-sm flex items-center gap-1">
                    <MapPin size={12} /> {member.native_village || "—"}
                  </p>
                  {member.verification_status === "verified" && (
                    <span className="inline-block mt-1 bg-green-500/90 text-white text-[10px] px-2 py-0.5 rounded-full">
                      ✓ Verified Member
                    </span>
                  )}
                </div>
              </div>
            </div>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center gap-1">
                  <User size={14} /> Role
                </span>
                <span className="font-medium flex items-center gap-1">
                  <Shield size={14} /> {member.role || "member"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">City</span>
                <span className="font-medium">{member.cities?.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">QR ID</span>
                <span className="font-mono text-xs">{member.qr_code_id || qr}</span>
              </div>
              <p className="text-[11px] text-gray-400 pt-2 text-center">
                Phone is private. Login to contact verified members.
              </p>
              <Button className="w-full mt-2" onClick={() => router.push("/login")}>
                Open Matang Connect
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

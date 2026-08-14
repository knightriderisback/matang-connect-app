"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { QrCode, Search, User, MapPin, Phone, Shield } from "lucide-react";

interface MemberResult {
  id: string;
  full_name: string;
  phone?: string;
  native_village?: string;
  verification_status?: string;
  role?: string;
  qr_code_id?: string;
  cities?: { name: string } | null;
  photo_url?: string;
}

function ScanPageInner() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemberResult | null>(null);

  const lookup = async () => {
    const q = code.trim();
    if (!q) {
      toast("Enter QR ID or phone", "error");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/scan?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Not found", "error");
        return;
      }
      setResult(data.member);
    } catch {
      toast(t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">{t("nav.scan")}</h1>
      </div>

      <Card className="border-matang-gold/30">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            Enter Matang QR ID (e.g. MATANG-…) or registered phone number to view member details.
          </p>
          <Input
            label="QR ID or Phone"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="MATANG-… or 98xxxxxxxx"
          />
          <Button className="w-full" isLoading={loading} onClick={lookup}>
            <Search size={16} /> Look up
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-2 border-matang-gold/40 overflow-hidden">
          <div className="bg-gradient-to-r from-matang-navy to-blue-900 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-matang-gold/50 flex items-center justify-center text-xl font-bold overflow-hidden">
                {result.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  result.full_name?.[0] || "?"
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-lg truncate">{result.full_name}</h2>
                <p className="text-white/70 text-sm flex items-center gap-1">
                  <MapPin size={12} /> {result.native_village || "-"}
                </p>
                {result.verification_status === "verified" && (
                  <span className="inline-block mt-1 bg-green-500/90 text-white text-[10px] px-2 py-0.5 rounded-full">
                    ✓ Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 flex items-center gap-1"><User size={14} /> Role</span>
              <span className="font-medium flex items-center gap-1"><Shield size={14} /> {result.role || "member"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">City</span>
              <span className="font-medium">{result.cities?.name || "-"}</span>
            </div>
            {result.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center gap-1"><Phone size={14} /> Phone</span>
                <a href={`tel:${result.phone}`} className="font-medium text-matang-gold">{result.phone}</a>
              </div>
            )}
            {result.qr_code_id && (
              <div className="flex justify-between">
                <span className="text-gray-500">QR ID</span>
                <span className="font-mono text-xs">{result.qr_code_id}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <FeatureGate moduleKey="scan">
      <ScanPageInner />
    </FeatureGate>
  );
}

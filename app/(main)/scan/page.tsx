"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import {
  QrCode,
  Search,
  User,
  MapPin,
  Phone,
  Shield,
  Camera,
  X,
  ImagePlus,
  Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

const STAFF = ["volunteer", "core_committee", "super_admin"];

function extractCode(raw: string): string {
  const s = raw.trim();
  const urlMatch = s.match(/\/u\/([A-Za-z0-9\-]+)/);
  if (urlMatch) return urlMatch[1];
  const m = s.match(/(MATANG-[A-Za-z0-9\-]+|MC-DEMO-\d+)/i);
  if (m) return m[1];
  return s;
}

async function decodeQrFromImageBitmap(bitmap: ImageBitmap): Promise<string | null> {
  const Detector = (typeof window !== "undefined" && (window as any).BarcodeDetector) || null;
  if (!Detector) return null;
  try {
    const detector = new Detector({ formats: ["qr_code"] });
    const codes = await detector.detect(bitmap);
    if (codes?.length) return String(codes[0].rawValue || "") || null;
  } catch {
    try {
      const detector = new Detector();
      const codes = await detector.detect(bitmap);
      if (codes?.length) return String(codes[0].rawValue || "") || null;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function ScanPageInner() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const isStaff = STAFF.includes(user?.role || "");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemberResult | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [camError, setCamError] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef("");

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const lookup = useCallback(
    async (raw: string) => {
      const q = extractCode(raw);
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
        setCode(q);
        stopCamera();
        toast("Member found", "success");
      } catch {
        toast(t("common.error"), "error");
      } finally {
        setLoading(false);
      }
    },
    [t, toast, stopCamera]
  );

  const startCamera = async () => {
    setCamError("");
    setResult(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError("Camera not supported — use file upload or type code");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.setAttribute("playsinline", "true");
          v.play().catch(() => {});
        }
      });
      scanningRef.current = true;
      runScanLoop();
    } catch (e: any) {
      setCamError(e?.message || "Camera permission denied — try file upload");
      setCameraOn(false);
    }
  };

  const runScanLoop = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) return;
    let detector: any;
    try {
      detector = new Detector({ formats: ["qr_code"] });
    } catch {
      try {
        detector = new Detector();
      } catch {
        return;
      }
    }
    const tick = async () => {
      if (!scanningRef.current) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        try {
          const codes = await detector.detect(v);
          if (codes?.length) {
            const raw = String(codes[0].rawValue || "");
            if (raw && raw !== lastCodeRef.current) {
              lastCodeRef.current = raw;
              await lookup(raw);
              return;
            }
          }
        } catch {
          /* skip frame */
        }
      }
      if (scanningRef.current) {
        requestAnimationFrame(() => setTimeout(tick, 250));
      }
    };
    tick();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFileBusy(true);
    setResult(null);
    try {
      const bitmap = await createImageBitmap(f);
      const decoded = await decodeQrFromImageBitmap(bitmap);
      bitmap.close?.();
      if (decoded) {
        await lookup(decoded);
      } else {
        toast(
          "Could not read QR from image. Use Chrome/Edge, or type QR ID / phone.",
          "error"
        );
      }
    } catch {
      toast("Could not open image", "error");
    } finally {
      setFileBusy(false);
    }
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (userLoading) {
    return <div className="p-8 text-center text-sm text-gray-400">Loading…</div>;
  }

  if (!isStaff) {
    return (
      <div className="p-8 max-w-sm mx-auto text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
          <Lock className="text-gray-400" size={28} />
        </div>
        <h2 className="text-lg font-bold text-matang-navy">Scan for staff only</h2>
        <p className="text-sm text-gray-500">
          QR scan is available to Volunteer, Core Committee and Super Admin — not normal members.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm font-semibold text-matang-gold"
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <QrCode className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">{t("nav.scan") || "Scan QR"}</h1>
      </div>

      <Card className="border-matang-gold/30 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {!cameraOn ? (
            <>
              <p className="text-sm text-gray-600">
                Open camera, upload a QR photo, or type QR ID / phone.
              </p>
              <Button className="w-full" onClick={startCamera}>
                <Camera size={16} /> Open camera & scan
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFile}
              />
              <Button
                variant="outline"
                className="w-full"
                isLoading={fileBusy}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={16} /> Upload QR image from gallery
              </Button>
              {camError && <p className="text-xs text-red-600">{camError}</p>}
            </>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] max-h-[55vh]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <div className="absolute inset-0 pointer-events-none border-2 border-matang-gold/50 m-10 rounded-xl" />
                <p className="absolute bottom-3 left-0 right-0 text-center text-white text-xs bg-black/40 py-1">
                  Point at Matang QR code
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={stopCamera}>
                <X size={16} /> Close camera
              </Button>
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <Input
              label="QR ID or Phone"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="MATANG-… or 98xxxxxxxx"
              onKeyDown={(e) => e.key === "Enter" && lookup(code)}
            />
            <Button className="w-full" isLoading={loading} onClick={() => lookup(code)}>
              <Search size={16} /> Look up
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <button
          type="button"
          className="w-full text-left"
          onClick={() => router.push(`/admin/directory?user=${result.id}`)}
        >
        <Card className="border-2 border-matang-gold/40 overflow-hidden active:scale-[0.99] transition-transform">
          <div className="bg-gradient-to-r from-matang-navy to-blue-900 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center text-xl font-bold overflow-hidden shrink-0">
                {result.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  result.full_name?.[0] || "?"
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold truncate">{result.full_name}</h2>
                <p className="text-sm text-white/70 flex items-center gap-1">
                  <Shield size={12} /> {result.role || "member"} ·{" "}
                  {result.verification_status || "-"}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-4 space-y-2 text-sm">
            {result.phone && (
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400" />
                <a href={`tel:${result.phone}`} className="text-matang-navy font-medium">
                  {result.phone}
                </a>
              </p>
            )}
            <p className="flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" />
              {result.native_village || "-"}
              {result.cities?.name ? ` · ${result.cities.name}` : ""}
            </p>
            {result.qr_code_id && (
              <p className="flex items-center gap-2 text-xs font-mono text-gray-500">
                <User size={14} /> {result.qr_code_id}
              </p>
            )}
            <p className="text-xs text-matang-gold font-medium pt-1">Tap to open full profile →</p>
          </CardContent>
        </Card>
        </button>
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

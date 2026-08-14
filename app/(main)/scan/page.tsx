"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { QrCode, Search, User, MapPin, Phone, Shield, Camera, X } from "lucide-react";

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

function extractCode(raw: string): string {
  const s = raw.trim();
  const urlMatch = s.match(/\/u\/([A-Za-z0-9\-]+)/);
  if (urlMatch) return urlMatch[1];
  // Matang QR ids
  const m = s.match(/(MATANG-[A-Za-z0-9\-]+|MC-DEMO-\d+)/i);
  if (m) return m[1];
  return s;
}

function ScanPageInner() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemberResult | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [camError, setCamError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef("");

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
        // stop camera after successful scan
        stopCamera();
        toast("Member found", "success");
      } catch {
        toast(t("common.error"), "error");
      } finally {
        setLoading(false);
      }
    },
    [t, toast]
  );

  const stopCamera = () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setCamError("");
    setResult(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError("Camera not supported on this browser");
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
      // wait for video element
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
      setCamError(e?.message || "Camera permission denied");
      setCameraOn(false);
    }
  };

  const runScanLoop = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) {
      // Polling message — manual still works
      return;
    }
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
          /* frame skip */
        }
      }
      if (scanningRef.current) {
        requestAnimationFrame(() => setTimeout(tick, 250));
      }
    };
    tick();
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

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
                Open camera to scan member QR, or type QR ID / phone below.
              </p>
              <Button className="w-full" onClick={startCamera}>
                <Camera size={16} /> Open camera & scan
              </Button>
              {camError && <p className="text-xs text-red-600">{camError}</p>}
              {typeof window !== "undefined" && !(window as any).BarcodeDetector && (
                <p className="text-[11px] text-gray-400">
                  Live QR decode works best in Chrome / Edge. You can still enter code manually.
                </p>
              )}
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
        <Card className="border-2 border-matang-gold/40 overflow-hidden">
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

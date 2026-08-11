"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/Toaster";
import { AlertTriangle, Droplets, HeartPulse, Share2 } from "lucide-react";

export default function SOSPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHold = () => {
    setHolding(false);
    setProgress(0);
    if (progressTimer.current) clearInterval(progressTimer.current);
  };

  const triggerSOS = async (type: string) => {
    toast(`${type.toUpperCase()} SOS triggered!`, "error");
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) toast("Alert shared, but could not be saved", "error");
      else toast(t("sos.sosSent") || "SOS sent to community!", "success");
    } catch {
      toast(t("common.error"), "error");
    }
  };

  const startHold = () => {
    setHolding(true);
    let prog = 0;
    progressTimer.current = setInterval(() => {
      prog += 2;
      setProgress(prog);
      if (prog >= 100) {
        triggerSOS("medical");
        stopHold();
      }
    }, 60);
  };

  const shareToWhatsApp = (msg: string, type: string) => {
    triggerSOS(type);
    const url = `https://wa.me/?text=${encodeURIComponent(msg + "\n\n— Matang Connect SOS")}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-matang-navy">{t("sos.title")}</h1>
      <Card className="border-red-200 bg-red-50">
        <div className="p-6 flex flex-col items-center">
          <button
            onMouseDown={startHold}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={startHold}
            onTouchEnd={stopHold}
            className="relative w-48 h-48 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-xl flex flex-col items-center justify-center text-white active:scale-95 transition-transform"
          >
            <div
              className="absolute inset-0 rounded-full border-4 border-white/30"
              style={{
                background: `conic-gradient(white ${progress * 3.6}deg, transparent 0deg)`,
                opacity: holding ? 1 : 0,
              }}
            />
            <HeartPulse size={48} className="mb-2" />
            <span className="font-bold text-lg">SOS</span>
            <span className="text-xs opacity-80">{t("sos.tapAndHold")}</span>
          </button>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => shareToWhatsApp("URGENT: Blood donation needed! Please contact immediately.", "blood")}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95"
        >
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Droplets className="text-red-600" size={22} />
          </div>
          <span className="text-sm font-medium">{t("sos.bloodRequest")}</span>
          <span className="text-xs text-gray-400 flex items-center gap-1"><Share2 size={12} /> WhatsApp</span>
        </button>
        <button
          onClick={() => shareToWhatsApp("URGENT: Medical emergency! Need immediate help.", "medical")}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <HeartPulse className="text-orange-600" size={22} />
          </div>
          <span className="text-sm font-medium">{t("sos.medicalEmergency")}</span>
          <span className="text-xs text-gray-400 flex items-center gap-1"><Share2 size={12} /> WhatsApp</span>
        </button>
      </div>
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-800">
            <strong>Emergency:</strong> Ambulance 108 · Police 100
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

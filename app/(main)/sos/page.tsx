"use client";
import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { HeartPulse, Droplets, Pill, Send } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => ({ value: g, label: g }));

export default function SOSPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"main" | "blood" | "medicine">("main");
  const [sending, setSending] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [blood, setBlood] = useState({ group: "O+", units: "1", location: "", hospital: "", contact: "", notes: "" });
  const [med, setMed] = useState({ medicine: "", quantity: "", location: "", urgency: "high", contact: "", notes: "" });

  const stopHold = () => {
    setHolding(false);
    setProgress(0);
    if (timer.current) clearInterval(timer.current);
  };

  const postSOS = async (type: string, details: Record<string, string>) => {
    setSending(true);
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details }),
      });
      if (!res.ok) { toast("Could not save SOS alert", "error"); return false; }
      toast(t("sos.sosSent") || "SOS posted to community!", "success");
      return true;
    } catch {
      toast(t("common.error"), "error");
      return false;
    } finally {
      setSending(false);
    }
  };

  const shareWA = (msg: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const startHold = () => {
    setHolding(true);
    let p = 0;
    timer.current = setInterval(() => {
      p += 2.5;
      setProgress(p);
      if (p >= 100) {
        stopHold();
        postSOS("medical", { note: "Emergency SOS - immediate help needed" });
      }
    }, 50);
  };

  const submitBlood = async () => {
    if (!blood.group || !blood.location) { toast("Blood group and location required", "error"); return; }
    const msg = `🩸 BLOOD NEEDED\nGroup: ${blood.group}\nUnits: ${blood.units}\nLocation: ${blood.location}\nHospital: ${blood.hospital || "-"}\nContact: ${blood.contact || user?.phone || "-"}\n${blood.notes}\n\n— Matang Connect SOS`;
    const ok = await postSOS("blood", blood);
    if (ok) shareWA(msg);
    setMode("main");
  };

  const submitMed = async () => {
    if (!med.medicine || !med.location) { toast("Medicine name and location required", "error"); return; }
    const msg = `💊 MEDICINE HELP\nMedicine: ${med.medicine}\nQty: ${med.quantity || "-"}\nUrgency: ${med.urgency}\nLocation: ${med.location}\nContact: ${med.contact || user?.phone || "-"}\n${med.notes}\n\n— Matang Connect SOS`;
    const ok = await postSOS("medicine", med);
    if (ok) shareWA(msg);
    setMode("main");
  };

  if (mode === "blood") {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setMode("main")} className="text-sm text-matang-gold font-medium">← Back</button>
        <h1 className="text-xl font-bold text-matang-navy">🩸 Blood Request</h1>
        <Card><CardContent className="p-4 space-y-3">
          <Select label="Blood Group *" value={blood.group} onChange={(e) => setBlood({ ...blood, group: e.target.value })} options={BLOOD_GROUPS} />
          <Select label="Units Needed" value={blood.units} onChange={(e) => setBlood({ ...blood, units: e.target.value })}
            options={["1", "2", "3", "4", "5+"].map((u) => ({ value: u, label: u + " unit(s)" }))} />
          <Input label="Location / City *" value={blood.location} onChange={(e) => setBlood({ ...blood, location: e.target.value })} />
          <Input label="Hospital Name" value={blood.hospital} onChange={(e) => setBlood({ ...blood, hospital: e.target.value })} />
          <Input label="Contact Number" type="tel" value={blood.contact} onChange={(e) => setBlood({ ...blood, contact: e.target.value })} />
          <Input label="Additional Notes" value={blood.notes} onChange={(e) => setBlood({ ...blood, notes: e.target.value })} />
          <Button className="w-full" isLoading={sending} onClick={submitBlood}><Send size={16} /> Post in App + Share WhatsApp</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (mode === "medicine") {
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setMode("main")} className="text-sm text-matang-gold font-medium">← Back</button>
        <h1 className="text-xl font-bold text-matang-navy">💊 Medicine Help</h1>
        <Card><CardContent className="p-4 space-y-3">
          <Input label="Medicine Name *" value={med.medicine} onChange={(e) => setMed({ ...med, medicine: e.target.value })} />
          <Input label="Quantity" value={med.quantity} onChange={(e) => setMed({ ...med, quantity: e.target.value })} />
          <Select label="Urgency" value={med.urgency} onChange={(e) => setMed({ ...med, urgency: e.target.value })}
            options={[{ value: "critical", label: "Critical (today)" }, { value: "high", label: "High (1-2 days)" }, { value: "normal", label: "Normal" }]} />
          <Input label="Location / City *" value={med.location} onChange={(e) => setMed({ ...med, location: e.target.value })} />
          <Input label="Contact Number" type="tel" value={med.contact} onChange={(e) => setMed({ ...med, contact: e.target.value })} />
          <Input label="Notes" value={med.notes} onChange={(e) => setMed({ ...med, notes: e.target.value })} />
          <Button className="w-full" isLoading={sending} onClick={submitMed}><Send size={16} /> Post in App + Share WhatsApp</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-matang-navy">{t("sos.title")}</h1>
      <Card className="border-red-200 bg-gradient-to-b from-red-50 to-white overflow-hidden">
        <div className="p-6 flex flex-col items-center">
          <button
            onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
            onTouchStart={startHold} onTouchEnd={stopHold}
            className="relative w-44 h-44 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-2xl flex flex-col items-center justify-center text-white select-none"
            style={{ animation: holding ? "none" : "heartbeat 1.2s ease-in-out infinite", transform: holding ? `scale(${1 + progress / 400})` : undefined }}
          >
            <div className="absolute inset-0 rounded-full" style={{
              background: `conic-gradient(#fff ${progress * 3.6}deg, transparent 0deg)`,
              opacity: holding ? 0.35 : 0,
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
            }} />
            <HeartPulse size={48} style={{ animation: holding ? "heartbeat 0.4s ease-in-out infinite" : undefined }} />
            <span className="font-bold text-lg mt-1">SOS</span>
            <span className="text-[11px] opacity-80 px-2 text-center">{t("sos.tapAndHold")}</span>
          </button>
          <p className="text-xs text-gray-500 mt-3 text-center">Hold 3 seconds → alert community</p>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setMode("blood")} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border active:scale-95">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><Droplets className="text-red-600" size={22} /></div>
          <span className="text-sm font-medium">{t("sos.bloodRequest")}</span>
          <span className="text-[10px] text-gray-400">Form + App + WhatsApp</span>
        </button>
        <button onClick={() => setMode("medicine")} className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border active:scale-95">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center"><Pill className="text-orange-600" size={22} /></div>
          <span className="text-sm font-medium">Medicine Help</span>
          <span className="text-[10px] text-gray-400">Form + App + WhatsApp</span>
        </button>
      </div>
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-900"><strong>Emergency:</strong> Ambulance 108 · Police 100 · Fire 101</p>
        </CardContent>
      </Card>
    </div>
  );
}

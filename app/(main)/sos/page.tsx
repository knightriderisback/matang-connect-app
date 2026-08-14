"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import {
  HeartPulse,
  Droplets,
  Pill,
  Send,
  MapPin,
  Navigation,
  Users,
  CheckCircle2,
} from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => ({
  value: g,
  label: g,
}));

const RESPONSE_STATUSES = [
  { value: "interested", label: "I'm interested to help" },
  { value: "en_route", label: "On the way" },
  { value: "arrived", label: "Arrived on site" },
  { value: "completed", label: "Help completed" },
  { value: "fake", label: "Mark as fake / false alarm" },
  { value: "cancelled", label: "Cancel my response" },
];

function playSosSound() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.22, 0.44].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + t);
      o.stop(now + t + 0.2);
    });
  } catch {
    /* ignore */
  }
}

function getLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

function parseMsg(message?: string) {
  if (!message) return {};
  try {
    return JSON.parse(message);
  } catch {
    return { note: message };
  }
}

export default function SOSPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"main" | "blood" | "medicine" | "detail">("main");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [blood, setBlood] = useState({
    group: "O+",
    units: "1",
    location: "",
    hospital: "",
    contact: "",
    notes: "",
  });
  const [med, setMed] = useState({
    medicine: "",
    quantity: "1",
    urgency: "high",
    location: "",
    contact: "",
    notes: "",
  });

  const loadAlerts = useCallback(() => {
    fetch("/api/sos")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAlerts();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [loadAlerts]);

  const stopHold = () => {
    setHolding(false);
    setProgress(0);
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const postSOS = async (type: string, details: Record<string, string>) => {
    setSending(true);
    try {
      const loc = await getLocation();
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          details,
          lat: loc?.lat,
          lng: loc?.lng,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.detail || data.error || "Could not save SOS", "error");
        return null;
      }
      playSosSound();
      toast(
        type === "medical"
          ? "SOS sent — volunteers & core notified"
          : "Request posted to app + feed",
        "success"
      );
      loadAlerts();
      return data;
    } catch {
      toast(t("common.error"), "error");
      return null;
    } finally {
      setSending(false);
    }
  };

  const shareWA = (msg: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const confirmAndSendMedical = async () => {
    setConfirmOpen(false);
    playSosSound();
    await postSOS("medical", { note: "Emergency SOS - immediate help needed" });
  };

  const startHold = (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    if (sending) return;
    if (timer.current) clearInterval(timer.current);
    setHolding(true);
    setProgress(0);
    let p = 0;
    timer.current = setInterval(() => {
      p += 3.5;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        stopHold();
        setConfirmOpen(true);
        playSosSound();
      }
    }, 50);
  };

  const submitBlood = async () => {
    if (!blood.group || !blood.location) {
      toast("Blood group and location required", "error");
      return;
    }
    if (!blood.contact || blood.contact.replace(/\D/g, "").length < 10) {
      toast("Contact phone is mandatory", "error");
      return;
    }
    const data = await postSOS("blood", blood as any);
    if (data) {
      shareWA(
        `🩸 BLOOD NEEDED\nGroup: ${blood.group}\nUnits: ${blood.units}\nLocation: ${blood.location}\nHospital: ${blood.hospital || "-"}\nContact: ${blood.contact}\n${blood.notes}\n${data.mapsLink ? "Map: " + data.mapsLink + "\n" : ""}\n— Matang Connect`
      );
    }
    setMode("main");
  };

  const submitMed = async () => {
    if (!med.medicine || !med.location) {
      toast("Medicine name and location required", "error");
      return;
    }
    if (!med.contact || med.contact.replace(/\D/g, "").length < 10) {
      toast("Contact phone is mandatory", "error");
      return;
    }
    const data = await postSOS("medicine", med as any);
    if (data) {
      shareWA(
        `💊 MEDICINE HELP\n${med.medicine} x${med.quantity}\nUrgency: ${med.urgency}\nLocation: ${med.location}\nContact: ${med.contact}\n${data.mapsLink ? "Map: " + data.mapsLink + "\n" : ""}\n— Matang Connect`
      );
    }
    setMode("main");
  };

  const openDetail = async (a: any) => {
    setSelected(a);
    setMode("detail");
    const r = await fetch(`/api/sos?id=${a.id}`);
    const d = await r.json();
    setDetail(d);
  };

  const respond = async (status: string) => {
    if (!selected?.id) return;
    const res = await fetch("/api/sos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId: selected.id, status }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(d.error || d.hint || "Response failed", "error");
      return;
    }
    toast("Status updated: " + status, "success");
    openDetail(selected);
    loadAlerts();
  };

  // ---- Blood form ----
  if (mode === "blood") {
    return (
      <div className="p-4 space-y-4 pb-24">
        <button type="button" onClick={() => setMode("main")} className="text-sm text-matang-gold font-medium">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-matang-navy">🩸 Blood Request</h1>
        <p className="text-xs text-gray-500">Goes to Feed + SOS list + WhatsApp + staff alerts</p>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Select label="Blood Group *" value={blood.group} onChange={(e) => setBlood({ ...blood, group: e.target.value })} options={BLOOD_GROUPS} />
            <Select
              label="Units Needed"
              value={blood.units}
              onChange={(e) => setBlood({ ...blood, units: e.target.value })}
              options={["1", "2", "3", "4", "5+"].map((u) => ({ value: u, label: u + " unit(s)" }))}
            />
            <Input label="Location / City *" value={blood.location} onChange={(e) => setBlood({ ...blood, location: e.target.value })} />
            <Input label="Hospital Name" value={blood.hospital} onChange={(e) => setBlood({ ...blood, hospital: e.target.value })} />
            <Input label="Contact Phone *" type="tel" value={blood.contact} onChange={(e) => setBlood({ ...blood, contact: e.target.value })} />
            <Input label="Notes" value={blood.notes} onChange={(e) => setBlood({ ...blood, notes: e.target.value })} />
            <Button className="w-full" isLoading={sending} onClick={submitBlood}>
              <Send size={16} /> Post + WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "medicine") {
    return (
      <div className="p-4 space-y-4 pb-24">
        <button type="button" onClick={() => setMode("main")} className="text-sm text-matang-gold font-medium">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-matang-navy">💊 Medicine Help</h1>
        <p className="text-xs text-gray-500">Feed + SOS list + WhatsApp + staff alerts</p>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input label="Medicine Name *" value={med.medicine} onChange={(e) => setMed({ ...med, medicine: e.target.value })} />
            <Input label="Quantity" value={med.quantity} onChange={(e) => setMed({ ...med, quantity: e.target.value })} />
            <Select
              label="Urgency"
              value={med.urgency}
              onChange={(e) => setMed({ ...med, urgency: e.target.value })}
              options={[
                { value: "critical", label: "Critical (today)" },
                { value: "high", label: "High (1-2 days)" },
                { value: "normal", label: "Normal" },
              ]}
            />
            <Input label="Location / City *" value={med.location} onChange={(e) => setMed({ ...med, location: e.target.value })} />
            <Input label="Contact Phone *" type="tel" value={med.contact} onChange={(e) => setMed({ ...med, contact: e.target.value })} />
            <Input label="Notes" value={med.notes} onChange={(e) => setMed({ ...med, notes: e.target.value })} />
            <Button className="w-full" isLoading={sending} onClick={submitMed}>
              <Send size={16} /> Post + WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "detail" && selected) {
    const msg = parseMsg(detail?.alert?.message || selected.message);
    const maps =
      msg.lat != null && msg.lng != null
        ? `https://maps.google.com/?q=${msg.lat},${msg.lng}`
        : null;
    return (
      <div className="p-4 space-y-4 pb-24">
        <button
          type="button"
          onClick={() => {
            setMode("main");
            setDetail(null);
            setSelected(null);
          }}
          className="text-sm text-matang-gold font-medium"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-matang-navy capitalize">
          {selected.type || "SOS"} detail
        </h1>
        <Card className="border-red-200">
          <CardContent className="p-4 space-y-2 text-sm">
            <p className="font-semibold text-matang-navy">
              {detail?.raiser?.full_name || selected.raiser_name || "Member"}
            </p>
            <p className="text-gray-600">📞 {detail?.raiser?.phone || msg.phone || "-"}</p>
            <p className="text-gray-600">Status: {detail?.alert?.status || selected.status}</p>
            <p className="text-gray-600 text-xs">
              {selected.created_at ? new Date(selected.created_at).toLocaleString() : ""}
            </p>
            {msg.note && <p className="text-gray-700">{msg.note}</p>}
            {msg.group && (
              <p>
                Blood: {msg.group} · {msg.units} units · {msg.location}
              </p>
            )}
            {msg.medicine && (
              <p>
                Medicine: {msg.medicine} · {msg.location}
              </p>
            )}
            {maps && (
              <a
                href={maps}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-blue-600 font-medium pt-2"
              >
                <MapPin size={16} /> Open live location on Map
              </a>
            )}
          </CardContent>
        </Card>

        {isStaff && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold text-sm text-matang-navy flex items-center gap-1">
                <Users size={16} /> Respond as volunteer / core
              </p>
              <div className="grid grid-cols-1 gap-2">
                {RESPONSE_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => respond(s.value)}
                    className="text-left text-sm px-3 py-2 rounded-xl border bg-white active:bg-matang-cream"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold text-sm text-matang-navy">Who is helping</p>
            {(detail?.responses || []).length === 0 && (
              <p className="text-xs text-gray-400">No responses yet</p>
            )}
            {(detail?.responses || []).map((r: any) => (
              <div key={r.id} className="text-sm border-b border-gray-50 py-1.5">
                <span className="font-medium">{r.responder?.full_name || "Staff"}</span>
                <span className="text-gray-500"> · {r.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      <h1 className="text-xl font-bold text-matang-navy">{t("sos.title") || "Emergency SOS"}</h1>

      {/* Confirm popup */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <p className="text-lg font-bold text-red-600 text-center">Send Emergency SOS?</p>
            <p className="text-sm text-gray-600 text-center">
              Volunteers & core members will be alerted in-app. Your location will be attached if GPS is allowed. No WhatsApp for this button.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 text-white" isLoading={sending} onClick={confirmAndSendMedical}>
                Confirm SOS
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="border-red-200 bg-gradient-to-b from-red-50 to-white overflow-hidden">
        <div className="p-6 flex flex-col items-center">
          <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerCancel={stopHold}
            onPointerLeave={stopHold}
            onContextMenu={(e) => e.preventDefault()}
            className="relative w-44 h-44 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-2xl flex flex-col items-center justify-center text-white select-none touch-none"
            style={{
              animation: holding ? "none" : "heartbeat 1.2s ease-in-out infinite",
              transform: holding ? `scale(${1 + progress / 400})` : undefined,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(#fff ${progress * 3.6}deg, transparent 0deg)`,
                opacity: holding ? 0.35 : 0,
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
              }}
            />
            <HeartPulse size={48} />
            <span className="font-bold text-lg mt-1">SOS</span>
            <span className="text-[11px] opacity-80 px-2 text-center">
              {t("sos.tapAndHold") || "Tap and hold"}
            </span>
          </button>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Hold → confirm popup + sound → alert staff (no WhatsApp)
          </p>
          <Button
            className="mt-4 w-full max-w-xs bg-red-600 hover:bg-red-700 text-white"
            isLoading={sending}
            onClick={() => {
              playSosSound();
              setConfirmOpen(true);
            }}
          >
            <Send size={16} /> Send SOS now
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("blood")}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border active:scale-95"
        >
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Droplets className="text-red-600" size={22} />
          </div>
          <span className="text-sm font-medium">{t("sos.bloodRequest") || "Blood Request"}</span>
          <span className="text-[10px] text-gray-400">Feed + WA</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("medicine")}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border active:scale-95"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Pill className="text-orange-600" size={22} />
          </div>
          <span className="text-sm font-medium">Medicine Help</span>
          <span className="text-[10px] text-gray-400">Feed + WA</span>
        </button>
      </div>

      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2 flex items-center gap-1">
          <Navigation size={14} /> Active / recent alerts
        </h2>
        {alerts.length === 0 && (
          <p className="text-xs text-gray-400">No alerts yet</p>
        )}
        <div className="space-y-2">
          {alerts.map((a) => {
            const msg = parseMsg(a.message);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => openDetail(a)}
                className="w-full text-left"
              >
                <Card className="border-red-100 active:scale-[0.99]">
                  <CardContent className="p-3 flex gap-3 items-start">
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      {a.type === "blood" ? (
                        <Droplets size={16} className="text-red-600" />
                      ) : a.type === "medicine" ? (
                        <Pill size={16} className="text-orange-600" />
                      ) : (
                        <HeartPulse size={16} className="text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-matang-navy truncate">
                        {(a.type || "sos").toUpperCase()} · {a.raiser_name || msg.name || "Member"}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {a.status} · {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                      </p>
                      {(msg.lat != null) && (
                        <p className="text-[10px] text-blue-600 flex items-center gap-0.5 mt-0.5">
                          <MapPin size={10} /> Location attached
                        </p>
                      )}
                    </div>
                    <CheckCircle2 size={14} className="text-gray-300 mt-1" />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-900">
            <strong>Emergency:</strong> Ambulance 108 · Police 100 · Fire 101
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

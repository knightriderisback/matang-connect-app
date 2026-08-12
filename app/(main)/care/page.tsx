"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { HeartHandshake, Plus, Share2 } from "lucide-react";

const TYPES = [
  { value: "medical", label: "Medical Help" },
  { value: "elderly", label: "Elderly Care" },
  { value: "disability", label: "Disability Support" },
  { value: "financial", label: "Financial Support" },
  { value: "educational", label: "Educational Support" },
  { value: "other", label: "Other Care" },
];
const URGENCY = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

interface CareReq { id: string; title?: string; description?: string; request_type?: string; care_type?: string; notes?: string; urgency: string; status: string; created_at: string; }

export default function CarePage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [requests, setRequests] = useState<CareReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", request_type: "medical", contact_phone: "", location: "", urgency: "normal" });

  const load = () => {
    fetch("/api/care").then(r => r.json()).then(d => setRequests(d.requests || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title) { toast("Title required", "error"); return; }
    if (!form.contact_phone) { toast("Contact phone mandatory", "error"); return; }
    const res = await fetch("/api/care", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Failed", "error"); return; }
    toast("Care request posted", "success");
    setShowForm(false);
    load();
    const msg = `🤝 *Care Request*\nType: ${form.request_type}\n${form.title}\n${form.description || ""}\n📍 ${form.location || "-"}\n📞 ${form.contact_phone}\n— Matang Connect`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const closeReq = async (id: string) => {
    await fetch("/api/care", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "completed" }) });
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartHandshake className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Care Requests</h1>
        </div>
        <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Request</Button>
      </div>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Select label="Type *" options={TYPES} value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })} />
            <Input label="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[80px]" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Input label="Contact Phone *" type="tel" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
            <Input label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <Select label="Urgency" options={URGENCY} value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submit}>Post + WhatsApp</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
      {!loading && requests.length === 0 && <p className="text-center text-gray-400 py-8">No care requests</p>}
      <div className="space-y-3">
        {requests.map(r => (
          <Card key={r.id} className={r.status === "closed" ? "opacity-60" : ""}>
            <CardContent className="p-4 space-y-1.5">
              <div className="flex justify-between gap-2">
                <h3 className="font-semibold text-matang-navy">{r.title || r.notes || r.care_type || "Care request"}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy font-medium">{r.care_type || r.request_type}</span>
              </div>
              {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
              <p className="text-xs text-gray-500">📍 {r.location || "-"} · 📞 {r.contact_phone || "-"} · {r.urgency}</p>
              <div className="flex gap-2 pt-1">
                {r.status === "open" && user?.role && user.role !== "normal" && (
                  <Button variant="outline" className="text-xs px-2 py-1" onClick={() => closeReq(r.id)}>Mark Closed</Button>
                )}
                <button
                  className="flex items-center gap-1 text-xs text-green-600 font-medium"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`🤝 ${r.title || r.notes || r.care_type || "Care request"}\n${r.description || ""}\n📞 ${r.contact_phone || ""}`)}`, "_blank")}
                >
                  <Share2 size={12} /> Share
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

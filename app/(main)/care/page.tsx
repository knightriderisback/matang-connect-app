"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { HeartHandshake, Plus, Share2 } from "lucide-react";
import { NameLink } from "@/components/shared/NameLink";

/** Matches live care_requests columns */
interface CareReq {
  id: string;
  requester_id?: string;
  family_member_id?: string | null;
  care_type: string;
  description?: string | null;
  urgency: string;
  status: string;
  assigned_to?: string | null;
  notes?: string | null;
  created_at: string;
}

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

function CarePageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [requests, setRequests] = useState<CareReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    care_type: "medical",
    description: "",
    urgency: "normal",
    notes: "",
  });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/care")
      .then((r) => r.json())
      .then((d) => setRequests(d.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.description.trim()) {
      toast("Description required", "error");
      return;
    }
    const res = await fetch("/api/care", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        care_type: form.care_type,
        description: form.description,
        urgency: form.urgency,
        notes: form.notes || form.description,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Care request submitted", "success");
    setShowForm(false);
    setForm({ care_type: "medical", description: "", urgency: "normal", notes: "" });
    load();
  };

  const closeReq = async (id: string) => {
    const res = await fetch("/api/care", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "completed" }),
    });
    if (!res.ok) {
      toast("Could not update", "error");
      return;
    }
    toast("Marked completed", "success");
    load();
  };

  const shareWA = (r: CareReq) => {
    const msg = `🤝 *Care Request*\nType: ${r.care_type}\n${r.description || ""}\nUrgency: ${r.urgency}\n— Matang Connect`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartHandshake className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Care / Vridh Seva</h1>
        </div>
        <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Request
        </Button>
      </div>
      <p className="text-sm text-gray-600">
        Medical, elderly, disability, financial or educational support from the community.
      </p>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <label className="block text-sm font-medium text-matang-navy">Care type</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              value={form.care_type}
              onChange={(e) => setForm({ ...form, care_type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-matang-navy">Description *</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[90px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What help is needed?"
            />
            <label className="block text-sm font-medium text-matang-navy">Urgency</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            >
              {URGENCY.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <Input
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={submit}>
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}
      {!loading && requests.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-400 text-sm">No care requests yet.</CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <h3 className="font-semibold text-matang-navy capitalize">
                  {r.care_type?.replace("_", " ") || "Care"} request
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy font-medium">
                  {r.status}
                </span>
              </div>
              {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
              {(r.requester_name || r.requester_id) && (
                <p className="text-[11px] text-gray-500">By: <NameLink id={r.requester_id} name={r.requester_name} /></p>
              )}
              <p className="text-xs text-gray-500">
                Urgency: {r.urgency}
                {r.notes ? ` · ${r.notes}` : ""}
              </p>
              <div className="flex gap-2 pt-1">
                {r.status === "open" && isStaff && (
                  <Button
                    variant="outline"
                    className="text-xs px-2 py-1"
                    onClick={() => closeReq(r.id)}
                  >
                    Mark Completed
                  </Button>
                )}
                <button
                  className="flex items-center gap-1 text-xs text-green-600 font-medium"
                  onClick={() => shareWA(r)}
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

export default function CarePage() {
  return (
    <FeatureGate moduleKey="care">
      <CarePageInner />
    </FeatureGate>
  );
}

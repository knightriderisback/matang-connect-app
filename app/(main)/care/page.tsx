"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { HeartHandshake, Plus, MapPin, Phone } from "lucide-react";

interface CareRequest {
  id: string;
  title: string;
  description?: string | null;
  request_type: string;
  contact_phone?: string | null;
  location?: string | null;
  urgency: string;
  status: string;
  created_at: string;
}

const TYPE_OPTIONS = [
  { value: "medical", label: "Medical / Health" },
  { value: "elder", label: "Elder Care" },
  { value: "education", label: "Education Support" },
  { value: "financial", label: "Financial Help" },
  { value: "other", label: "Other" },
];

const URGENCY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
];

export default function CarePage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    request_type: "medical",
    contact_phone: "",
    location: "",
    urgency: "normal",
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
    if (!form.title.trim()) {
      toast("Title required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/care", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      toast("Care request posted", "success");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        request_type: "medical",
        contact_phone: "",
        location: "",
        urgency: "normal",
      });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/care", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast("Could not update status", "error");
      return;
    }
    toast("Status updated", "success");
    load();
  };

  const urgencyColor = (u: string) => {
    if (u === "critical") return "text-red-600 bg-red-50";
    if (u === "high") return "text-orange-600 bg-orange-50";
    return "text-gray-600 bg-gray-50";
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartHandshake className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Care Requests</h1>
        </div>
        <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Request
        </Button>
      </div>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Select
              label="Type"
              value={form.request_type}
              onChange={(e) => setForm({ ...form, request_type: e.target.value })}
              options={TYPE_OPTIONS}
            />
            <Select
              label="Urgency"
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              options={URGENCY_OPTIONS}
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <Input
              label="Contact Phone"
              type="tel"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            />
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[80px]"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" isLoading={submitting} onClick={submit}>
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
      {!loading && requests.length === 0 && (
        <p className="text-center text-gray-400 py-8">No care requests yet</p>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-matang-navy">{r.title}</h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${urgencyColor(r.urgency)}`}
                >
                  {r.urgency}
                </span>
              </div>
              <p className="text-xs text-gray-500 capitalize">
                {r.request_type} · {r.status}
              </p>
              {r.description && <p className="text-sm text-gray-600">{r.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                {r.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {r.location}
                  </span>
                )}
                {r.contact_phone && (
                  <a
                    href={`tel:${r.contact_phone}`}
                    className="flex items-center gap-1 text-matang-gold font-medium"
                  >
                    <Phone size={12} />
                    {r.contact_phone}
                  </a>
                )}
              </div>
              {isStaff && r.status === "open" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="text-xs px-2 py-1"
                    onClick={() => updateStatus(r.id, "in_progress")}
                  >
                    In Progress
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs px-2 py-1"
                    onClick={() => updateStatus(r.id, "resolved")}
                  >
                    Resolve
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

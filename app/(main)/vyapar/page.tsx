"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Store, Plus, Phone, MapPin, MessageCircle, BadgeCheck } from "lucide-react";

interface Business {
  id: string;
  name: string;
  category: string;
  description?: string;
  address?: string;
  contact_phone?: string;
  whatsapp?: string;
  is_verified?: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "shop", label: "Shop" },
  { value: "service", label: "Service" },
  { value: "food", label: "Food" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "other", label: "Other" },
];

function VyaparPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [list, setList] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState({
    name: "",
    category: "shop",
    description: "",
    address: "",
    contact_phone: "",
    whatsapp: "",
  });

  const load = (cat = category) => {
    setLoading(true);
    fetch(`/api/vyapar?category=${cat}`)
      .then((r) => r.json())
      .then((d) => setList(d.businesses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.name || !form.category) {
      toast("Name and category required", "error");
      return;
    }
    const res = await fetch("/api/vyapar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Business listed", "success");
    setShowForm(false);
    setForm({ name: "", category: "shop", description: "", address: "", contact_phone: "", whatsapp: "" });
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Vyapar</h1>
        </div>
        <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> List Business
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => {
              setCategory(c.value);
              load(c.value);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              category === c.value ? "bg-matang-navy text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input label="Business Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="block text-sm font-medium text-matang-navy">Category *</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
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

      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">No businesses listed yet. Be the first!</CardContent>
        </Card>
      ) : (
        list.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-matang-navy flex items-center gap-1.5">
                  {b.name}
                  {b.is_verified && <BadgeCheck size={16} className="text-matang-gold shrink-0" />}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize shrink-0">{b.category}</span>
              </div>
              {b.description && <p className="text-sm text-gray-600">{b.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                {b.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {b.address}
                  </span>
                )}
                {b.contact_phone && (
                  <a href={`tel:${b.contact_phone}`} className="flex items-center gap-1 text-matang-gold font-medium">
                    <Phone size={12} />
                    {b.contact_phone}
                  </a>
                )}
                {b.whatsapp && (
                  <a
                    href={`https://wa.me/91${b.whatsapp.replace(/\D/g, "").slice(-10)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-green-600 font-medium"
                  >
                    <MessageCircle size={12} />
                    WhatsApp
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function VyaparPage() {
  return (
    <FeatureGate moduleKey="vyapar">
      <VyaparPageInner />
    </FeatureGate>
  );
}

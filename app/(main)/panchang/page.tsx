"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Calendar, Plus } from "lucide-react";

interface Festival {
  id: string;
  title: string;
  description?: string;
  festival_date: string;
  is_recurring?: boolean;
}

function PanchangPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [list, setList] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", festival_date: "", is_recurring: true });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/panchang")
      .then((r) => r.json())
      .then((d) => setList(d.festivals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.title || !form.festival_date) {
      toast("Title and date required", "error");
      return;
    }
    const res = await fetch("/api/panchang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Festival added", "success");
    setShowForm(false);
    setForm({ title: "", description: "", festival_date: "", is_recurring: true });
    load();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Panchang</h1>
        </div>
        {isStaff && (
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Add
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">Community festivals & important dates</p>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input label="Festival / Event *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input
              label="Date *"
              type="date"
              value={form.festival_date}
              onChange={(e) => setForm({ ...form, festival_date: e.target.value })}
            />
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
              />
              Recurring yearly
            </label>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={submit}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">No festivals listed yet.</CardContent>
        </Card>
      ) : (
        list.map((f) => {
          const isPast = f.festival_date < today;
          const isToday = f.festival_date === today;
          return (
            <Card key={f.id} className={isToday ? "border-2 border-matang-gold" : ""}>
              <CardContent className="p-4 flex gap-3">
                <div
                  className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                    isToday ? "bg-matang-gold text-matang-navy" : isPast ? "bg-gray-100 text-gray-500" : "bg-matang-navy text-white"
                  }`}
                >
                  <span className="text-lg font-bold leading-none">{new Date(f.festival_date).getDate()}</span>
                  <span className="text-[10px] uppercase">
                    {new Date(f.festival_date).toLocaleString("en", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-matang-navy">{f.title}</h3>
                  {f.description && <p className="text-sm text-gray-600 mt-0.5">{f.description}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(f.festival_date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {f.is_recurring ? " · Yearly" : ""}
                    {isToday ? " · Today" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

export default function PanchangPage() {
  return (
    <FeatureGate moduleKey="panchang">
      <PanchangPageInner />
    </FeatureGate>
  );
}

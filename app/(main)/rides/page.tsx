"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Car, Plus, Phone, MapPin } from "lucide-react";

interface Ride { id: string; ride_type: string; from_place: string; to_place: string; ride_date?: string; ride_time?: string; seats?: number; contact_phone?: string; notes?: string; }

function RidesPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ride_type: "offer", from_place: "", to_place: "", ride_date: "", ride_time: "", seats: "1", contact_phone: "", notes: "" });

  const load = () => {
    fetch("/api/rides").then((r) => r.json()).then((d) => setRides(d.rides || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.from_place || !form.to_place) { toast("From and To required", "error"); return; }
    const res = await fetch("/api/rides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, seats: parseInt(form.seats, 10) || 1 }) });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Failed", "error"); return; }
    toast("Ride posted", "success");
    setShowForm(false);
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Car className="text-matang-gold" size={22} /><h1 className="text-lg font-bold text-matang-navy">Ride Share</h1></div>
        <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Post</Button>
      </div>
      <p className="text-sm text-gray-600">Community carpool — offer a seat or request a ride within your city network.</p>
      {showForm && (
        <Card className="border-matang-gold/30"><CardContent className="p-4 space-y-3">
          <select className="w-full px-4 py-2.5 rounded-xl border text-sm" value={form.ride_type} onChange={(e) => setForm({ ...form, ride_type: e.target.value })}>
            <option value="offer">Offering seat</option>
            <option value="need">Need a ride</option>
          </select>
          <Input label="From *" value={form.from_place} onChange={(e) => setForm({ ...form, from_place: e.target.value })} />
          <Input label="To *" value={form.to_place} onChange={(e) => setForm({ ...form, to_place: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Date" type="date" value={form.ride_date} onChange={(e) => setForm({ ...form, ride_date: e.target.value })} />
            <Input label="Time" value={form.ride_time} onChange={(e) => setForm({ ...form, ride_time: e.target.value })} placeholder="e.g. 9 AM" />
          </div>
          <Input label="Seats" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
          <Input label="Contact phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="flex-1" onClick={submit}>Post</Button>
          </div>
        </CardContent></Card>
      )}
      {loading ? <p className="text-center text-gray-400 py-8">Loading…</p> : rides.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-400 text-sm">No rides yet. Be the first to post.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rides.map((r) => (
            <Card key={r.id}><CardContent className="p-4 space-y-1">
              <div className="flex justify-between items-start">
                <p className="font-semibold text-matang-navy flex items-center gap-1"><MapPin size={14} />{r.from_place} → {r.to_place}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.ride_type === "offer" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>{r.ride_type === "offer" ? "Offer" : "Need"}</span>
              </div>
              <p className="text-xs text-gray-500">{[r.ride_date, r.ride_time, r.seats ? `${r.seats} seat(s)` : ""].filter(Boolean).join(" · ")}</p>
              {r.notes && <p className="text-sm text-gray-600">{r.notes}</p>}
              {r.contact_phone && <a href={`tel:${r.contact_phone}`} className="text-sm text-matang-gold font-medium flex items-center gap-1"><Phone size={12} />{r.contact_phone}</a>}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RidesPage() {
  return (
    <FeatureGate moduleKey="rides">
      <RidesPageInner />
    </FeatureGate>
  );
}

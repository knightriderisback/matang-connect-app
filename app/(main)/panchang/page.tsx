"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Calendar, ChevronLeft, ChevronRight, Plus, X, RefreshCw } from "lucide-react";
import { festivalsForYear, hasVerifiedYear, drikPanchangUrl, VERIFIED_YEARS } from "@/lib/hinduFestivals2026";

interface Festival {
  id: string;
  title: string;
  description?: string;
  festival_date: string;
  is_recurring?: boolean;
  recurrence?: "none" | "monthly" | "yearly";
  source?: "staff" | "verified" | string;
}

const WEEK = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];
const MONTHS_HI = [
  "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}

function startWeekday(year: number, month0: number) {
  return new Date(year, month0, 1).getDay(); // 0 Sun
}

function PanchangPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const [list, setList] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    festival_date: "",
    recurrence: "yearly" as "none" | "monthly" | "yearly",
  });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    setLoading(true);
    fetch(`/api/panchang?year=${year}&month=${month0 + 1}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setList(d.festivals || []);
        if (d.verifiedMeta?.lastSyncAt) setLastSyncAt(d.verifiedMeta.lastSyncAt);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  const syncVerified = async () => {
    if (!hasVerifiedYear(year)) {
      toast(`${year} verified list mein nahi — Drik kholo`, "error");
      window.open(drikPanchangUrl(year), "_blank");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/panchang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_verified", year }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Sync fail", "error");
        return;
      }
      setLastSyncAt(data.lastSyncAt || new Date().toISOString());
      toast(`${year}: ${data.count} tyohar sync · staff data safe`, "success");
      load();
    } catch {
      toast("Network error", "error");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month0]);

  const allEvents = useMemo(() => {
    const map = new Map<string, Festival[]>();
    const add = (f: Festival) => {
      const k = f.festival_date?.slice(0, 10);
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(f);
    };
    festivalsForYear(year).forEach((e) =>
      add({
        id: e.id,
        title: e.titleHi || e.title,
        description: [e.tithi, e.note].filter(Boolean).join(" · "),
        festival_date: e.date,
        source: "verified",
      })
    );
    // Staff events — expand recurrence into visible year months
    for (const raw of list) {
      const src: Festival = {
        ...raw,
        source: raw.source || "staff",
        recurrence: raw.recurrence || (raw.is_recurring === false ? "none" : "yearly"),
      };
      const base = (src.festival_date || "").slice(0, 10);
      if (!base || base.length < 10) continue;
      const mm = base.slice(5, 7);
      const dd = base.slice(8, 10);
      const rec = src.recurrence || "none";
      if (rec === "none") {
        add(src);
        continue;
      }
      if (rec === "yearly") {
        add({ ...src, id: `${src.id}_${year}`, festival_date: `${year}-${mm}-${dd}` });
        continue;
      }
      if (rec === "monthly") {
        for (let m = 1; m <= 12; m++) {
          const dim = new Date(year, m, 0).getDate();
          const day = Math.min(Number(dd), dim);
          const ds = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          add({ ...src, id: `${src.id}_${year}_${m}`, festival_date: ds });
        }
      }
    }
    return map;
  }, [list, year]);

  const prevMonth = () => {
    if (month0 === 0) {
      setMonth0(11);
      setYear((y) => y - 1);
    } else setMonth0((m) => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month0 === 11) {
      setMonth0(0);
      setYear((y) => y + 1);
    } else setMonth0((m) => m + 1);
    setSelected(null);
  };

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
    setForm({ title: "", description: "", festival_date: "", recurrence: "yearly" });
    load();
  };

  const dim = daysInMonth(year, month0);
  const start = startWeekday(year, month0);
  const todayStr = now.toISOString().slice(0, 10);
  const cells: (number | null)[] = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);

  const selectedEvents = selected ? allEvents.get(selected) || [] : [];
  const selectedDateObj = selected ? new Date(selected + "T12:00:00") : null;

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">पंचांग</h1>
        </div>
        {isStaff && (
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Add
          </Button>
        )}
      </div>
      <p className="text-[11px] text-gray-500">
        कैलेंडर · त्योहार · समाज की तारीखें। तिथि पर टैप करें विवरण के लिए।
      </p>

      {showForm && isStaff && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="Date (pehli / base tithi)"
              type="date"
              value={form.festival_date}
              onChange={(e) => setForm({ ...form, festival_date: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">Repeat</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white"
                value={form.recurrence}
                onChange={(e) =>
                  setForm({
                    ...form,
                    recurrence: e.target.value as "none" | "monthly" | "yearly",
                  })
                }
              >
                <option value="none">Sirf ek baar (no repeat)</option>
                <option value="monthly">Har mahina (same date)</option>
                <option value="yearly">Har saal (same date)</option>
              </select>
              <p className="text-[10px] text-gray-500 mt-1">
                Monthly = har month usi date · Yearly = har year MM-DD
              </p>
            </div>
            <label className="block text-sm font-medium text-matang-navy">Description</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[70px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
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

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-matang-navy text-matang-gold rounded-2xl px-3 py-2.5">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg active:bg-white/10">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">
            {MONTHS_HI[month0]} {year}
          </p>
          <p className="text-[10px] text-matang-gold/70">Drik Panchang (Delhi) · verified years: 2025–2027</p>
        </div>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg active:bg-white/10">
          <ChevronRight size={20} />
        </button>
      </div>

      
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="text-xs gap-1.5"
          disabled={syncing}
          onClick={syncVerified}
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Updating…" : "Update / Sync"}
        </Button>
        {lastSyncAt && (
          <span className="text-[10px] text-gray-500">
            Last sync: {new Date(lastSyncAt).toLocaleString("en-IN")}
          </span>
        )}
        <span className="text-[10px] text-gray-400">Staff tyohar change nahi hote</span>
      </div>

      {!hasVerifiedYear(year) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 text-xs text-amber-900 space-y-2">
            <p>
              <strong>{year}</strong> ke built-in tyohar abhi app mein verify karke store nahi hain (sirf{" "}
              {VERIFIED_YEARS.join(", ")}). Hum dates invent nahi karte.
            </p>
            <a
              href={drikPanchangUrl(year)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-semibold text-matang-navy underline"
            >
              Drik Panchang {year} calendar kholo →
            </a>
          </CardContent>
        </Card>
      )}

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-2">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEK.map((w) => (
              <div key={w} className="text-center text-[10px] font-semibold text-matang-navy py-1">
                {w}
              </div>
            ))}
          </div>
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8">Loading…</p>
          ) : (
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                if (d == null) return <div key={`e${i}`} className="aspect-square" />;
                const dateStr = `${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const events = allEvents.get(dateStr) || [];
                const isToday = dateStr === todayStr;
                const isSel = selected === dateStr;
                const hasStaff = events.some((e) => e.source === "staff");
                const hasVerified = events.some((e) => e.source === "verified");
                const hasEvent = events.length > 0;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelected(dateStr)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs relative transition
                      ${isSel ? "bg-matang-navy text-matang-gold ring-2 ring-matang-gold" : ""}
                      ${!isSel && isToday ? "bg-emerald-500 text-white font-bold ring-2 ring-emerald-600 shadow-md scale-[1.02]" : ""}
                      ${!isSel && !isToday ? "hover:bg-gray-50 text-gray-800" : ""}
                    `}
                  >
                    <span className="leading-none">{d}</span>
                    {isToday && !isSel && (
                      <span className="text-[8px] leading-none font-bold opacity-90">आज</span>
                    )}
                    {hasEvent && (
                      <span className="mt-0.5 flex gap-0.5">
                        {hasVerified && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-matang-gold" : "bg-amber-500"}`} />
                        )}
                        {hasStaff && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-green-300" : "bg-green-500"}`} />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-600 px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> आज</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Verified tyohar</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Staff add</span>
      </div>

      {/* Day detail panel */}
      {selected && selectedDateObj && (
        <Card className="border-matang-gold/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-matang-navy">
                  {selectedDateObj.toLocaleDateString("hi-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="text-[11px] text-gray-500">{selected}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-1 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl bg-matang-navy/5 p-3 text-xs text-gray-700 space-y-1">
              <p>
                <span className="font-semibold text-matang-navy">वार:</span>{" "}
                {WEEK[selectedDateObj.getDay()]}
              </p>
              <p className="text-[10px] text-gray-500">
                त्योहार तिथियाँ: Drik Panchang (Delhi, 2026) से सत्यापित। शहर / मुहूर्त के अनुसार ±1 दिन अंतर हो सकता है।
                नक्षत्र–योग के लिए स्थानीय पंचांग देखें।
              </p>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">इस दिन कोई दर्ज त्योहार नहीं</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((ev) => {
                  const staff = ev.source === "staff";
                  return (
                  <div
                    key={ev.id}
                    className={`rounded-xl border p-3 space-y-1 ${
                      staff
                        ? "border-green-400 bg-green-50"
                        : "border-matang-gold/30 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${staff ? "text-green-900" : "text-matang-navy"}`}>
                        {ev.title}
                      </p>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        staff ? "bg-green-200 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {staff ? "Staff" : "Verified"}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-gray-600">{ev.description}</p>
                    )}
                    {staff && ev.recurrence && ev.recurrence !== "none" && (
                      <p className="text-[10px] text-green-700">
                        Repeat: {ev.recurrence === "monthly" ? "Har mahina" : "Har saal"}
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {isStaff && (
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  setForm((f) => ({ ...f, festival_date: selected }));
                  setShowForm(true);
                }}
              >
                + इस तारीख पर त्योहार जोड़ें
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming list this month */}
      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">इस महीने</h2>
        {Array.from(allEvents.entries())
          .filter(([date]) => date.startsWith(`${year}-${String(month0 + 1).padStart(2, "0")}`))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, evs]) => (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(date)}
              className="w-full text-left mb-2 rounded-xl border border-gray-100 bg-white p-3 active:scale-[0.99]"
            >
              <p className="text-[10px] text-matang-gold font-semibold">{date}</p>
              {evs.map((e) => (
                <p key={e.id} className={`text-sm font-medium ${
                  e.source === "staff" ? "text-green-700" : "text-matang-navy"
                }`}>
                  {e.title}
                </p>
              ))}
            </button>
          ))}
      </div>
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

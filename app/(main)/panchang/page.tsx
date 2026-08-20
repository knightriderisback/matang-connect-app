"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Calendar, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

interface Festival {
  id: string;
  title: string;
  description?: string;
  festival_date: string;
  is_recurring?: boolean;
}

const WEEK = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];
const MONTHS_HI = [
  "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

/** Built-in community / Hindu observances (approx civil dates — pilot) */
function builtInForYear(year: number): Festival[] {
  const y = String(year);
  return [
    { id: "bi_makar", title: "मकर संक्रांति", festival_date: `${y}-01-14`, description: "सूर्य मकर राशि में · तिल-गुड़" },
    { id: "bi_vasant", title: "वसंत पंचमी", festival_date: `${y}-02-02`, description: "सरस्वती पूजा (अनुमानित तिथि — स्थानीय पंचांग से मिलान करें)" },
    { id: "bi_maha", title: "महाशिवरात्रि", festival_date: `${y}-02-26`, description: "शिव उपासना" },
    { id: "bi_holi", title: "होली / धुलेंडी", festival_date: `${y}-03-14`, description: "रंगों का त्योहार · समाज मिलन" },
    { id: "bi_ugadi", title: "चैत्र शुक्ल प्रतिपदा / नव वर्ष", festival_date: `${y}-03-30`, description: "हिंदू नव वर्ष (क्षेत्रानुसार)" },
    { id: "bi_ram", title: "राम नवमी", festival_date: `${y}-04-06`, description: "भगवान राम जन्मोत्सव" },
    { id: "bi_hanuman", title: "हनुमान जयंती", festival_date: `${y}-04-12`, description: "हनुमान जयंती" },
    { id: "bi_akshaya", title: "अक्षय तृतीया", festival_date: `${y}-04-30`, description: "शुभ मुहूर्त" },
    { id: "bi_snan", title: "गंगा दशहरा", festival_date: `${y}-06-05`, description: "पवित्र स्नान" },
    { id: "bi_rath", title: "रथ यात्रा", festival_date: `${y}-07-06`, description: "जगन्नाथ रथ यात्रा" },
    { id: "bi_rakhi", title: "रक्षाबंधन", festival_date: `${y}-08-09`, description: "भाई-बहन का त्योहार" },
    { id: "bi_janmashtami", title: "जन्माष्टमी", festival_date: `${y}-08-15`, description: "श्रीकृष्ण जन्मोत्सव" },
    { id: "bi_ganesh", title: "गणेश चतुर्थी", festival_date: `${y}-08-27`, description: "गणपति स्थापना" },
    { id: "bi_navratri", title: "शारदीय नवरात्रि प्रारंभ", festival_date: `${y}-09-22`, description: "दुर्गा उपासना" },
    { id: "bi_dussehra", title: "दशहरा / विजयदशमी", festival_date: `${y}-10-02`, description: "बुराई पर अच्छाई की विजय" },
    { id: "bi_diwali", title: "दीपावली", festival_date: `${y}-10-20`, description: "प्रकाश पर्व · समाज मिलन" },
    { id: "bi_bhai", title: "भाई दूज", festival_date: `${y}-10-22`, description: "भाई-बहन स्नेह" },
    { id: "bi_chhath", title: "छठ पूजा", festival_date: `${y}-11-05`, description: "सूर्य उपासना · क्षेत्रीय महत्व" },
    { id: "bi_kartik", title: "कार्तिक पूर्णिमा", festival_date: `${y}-11-15`, description: "दीपदान · स्नान" },
  ];
}

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
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    festival_date: "",
    is_recurring: true,
  });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    setLoading(true);
    fetch(`/api/panchang?year=${year}&month=${month0 + 1}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setList(d.festivals || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
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
    builtInForYear(year).forEach(add);
    list.forEach(add);
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
    setForm({ title: "", description: "", festival_date: "", is_recurring: true });
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
              label="Date"
              type="date"
              value={form.festival_date}
              onChange={(e) => setForm({ ...form, festival_date: e.target.value })}
            />
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
          <p className="text-[10px] text-matang-gold/70">Hindu calendar view</p>
        </div>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg active:bg-white/10">
          <ChevronRight size={20} />
        </button>
      </div>

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
                const hasEvent = events.length > 0;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelected(dateStr)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs relative transition
                      ${isSel ? "bg-matang-navy text-matang-gold ring-2 ring-matang-gold" : ""}
                      ${!isSel && isToday ? "bg-matang-gold/25 text-matang-navy font-bold" : ""}
                      ${!isSel && !isToday ? "hover:bg-gray-50 text-gray-800" : ""}
                    `}
                  >
                    <span className="leading-none">{d}</span>
                    {hasEvent && (
                      <span
                        className={`mt-0.5 w-1.5 h-1.5 rounded-full ${
                          isSel ? "bg-matang-gold" : "bg-amber-500"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                सटीक तिथि / नक्षत्र / योग स्थानीय पंचांग या पुरोहित से मिलान करें। यहाँ समाज त्योहार +
                प्रमुख अनुमानित तिथियाँ दिखती हैं।
              </p>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">इस दिन कोई दर्ज त्योहार नहीं</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-matang-gold/30 bg-white p-3 space-y-1"
                  >
                    <p className="text-sm font-semibold text-matang-navy">{ev.title}</p>
                    {ev.description && (
                      <p className="text-xs text-gray-600">{ev.description}</p>
                    )}
                  </div>
                ))}
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
                <p key={e.id} className="text-sm text-matang-navy font-medium">
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

"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Calendar, ChevronLeft, ChevronRight, Plus, X, RefreshCw, Share2, Pencil, Trash2, LocateFixed } from "lucide-react";
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

const WEEK_I18N = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}

function startWeekday(year: number, month0: number) {
  return new Date(year, month0, 1).getDay(); // 0 Sun
}

function PanchangPageInner() {
  const { t, n, lang } = useI18n();
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");
  const cityLabel =
    user?.cities?.name ||
    user?.native_village ||
    (user?.city_id ? "Your city" : "Chhattisgarh");

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
      toast(`${n(year)} Drik Panchang`, "error");
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
      toast(`${n(year)}: ${n(data.count)} ${t("panchang.festivalToday")} sync`, "success");
      load();
    } catch {
      toast(t("common.error"), "error");
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
        title: lang === "en" ? e.title : e.titleHi || e.title,
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
  }, [list, year, lang]);

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
      toast(t("auth.invalidCredentials") || "Title and date required", "error");
      return;
    }
    if (editingId) {
      const res = await fetch("/api/panchang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Update failed", "error");
        return;
      }
      toast(t("common.success"), "success");
      setEditingId(null);
      setShowForm(false);
      setForm({ title: "", description: "", festival_date: "", recurrence: "yearly" });
      load();
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
    toast(t("common.success"), "success");
    setShowForm(false);
    setForm({ title: "", description: "", festival_date: "", recurrence: "yearly" });
    load();
  };

  const goToday = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth0(n.getMonth());
    setSelected(n.toISOString().slice(0, 10));
  };

  const startEdit = (ev: Festival) => {
    const baseId = list.find((l) => ev.id === l.id || String(ev.id).startsWith(String(l.id) + "_"))?.id || ev.id;
    const raw = list.find((l) => l.id === baseId) || ev;
    setEditingId(baseId);
    setForm({
      title: raw.title || "",
      description: raw.description || "",
      festival_date: (raw.festival_date || "").slice(0, 10),
      recurrence: (raw.recurrence as any) || "yearly",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteFest = async (ev: Festival) => {
    const baseId = list.find((l) => ev.id === l.id || String(ev.id).startsWith(String(l.id) + "_"))?.id || ev.id;
    if (!confirm(t("common.confirmDelete"))) return;
    const res = await fetch(`/api/panchang?id=${encodeURIComponent(baseId)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || "Delete failed", "error");
      return;
    }
    toast(t("common.success"), "success");
    load();
  };

  const shareWeekWhatsApp = () => {
    const n = new Date();
    const day = n.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(n);
    monday.setDate(n.getDate() + mondayOffset);
    const lines: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      const evs = allEvents.get(ds) || [];
      if (evs.length) {
        lines.push(`*${ds}*`);
        evs.forEach((e) => lines.push(`• ${e.title}`));
      }
    }
    const body =
      lines.length > 0
        ? lines.join("\n")
        : t("common.noData");
    const text = `🕉️ *${t("panchang.title")} — ${t("app.name")}*\n📍 ${cityLabel}\n\n${body}\n\n_${t("app.footer")}_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="text-matang-gold shrink-0" size={22} />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-matang-navy leading-tight">{t("panchang.title")}</h1>
            <p className="text-[10px] text-gray-500 truncate">📍 {cityLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button type="button" variant="outline" className="text-xs px-2 py-1.5 gap-1 cursor-pointer" onClick={goToday}>
            <LocateFixed size={14} /> {t("panchang.festivalToday")}
          </Button>
          {isStaff && (
            <Button
              className="text-sm px-3 py-1.5 cursor-pointer"
              onClick={() => {
                setEditingId(null);
                setForm({ title: "", description: "", festival_date: "", recurrence: "yearly" });
                setShowForm(!showForm);
              }}
            >
              <Plus size={16} /> {t("panchang.addFestival")}
            </Button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-500">{t("panchang.subtitle")}</p>

      {showForm && isStaff && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-matang-navy">
              {editingId ? t("common.edit") : t("panchang.addFestival")}
            </p>
            <Input
              label={`${t("dashboard.title")} *`}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label={`${t("common.date")} *`}
              type="date"
              value={form.festival_date}
              onChange={(e) => setForm({ ...form, festival_date: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">{t("common.details")}</label>
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
                <option value="none">Once</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <label className="block text-sm font-medium text-matang-navy">{t("dashboard.message")}</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[70px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 cursor-pointer"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button className="flex-1 cursor-pointer" onClick={submit}>
                {t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-matang-navy text-matang-gold rounded-2xl px-3 py-2.5">
        <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg active:bg-white/10 cursor-pointer">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">
            {MONTHS_NAMES[month0]} {n(year)}
          </p>
          <p className="text-[10px] text-matang-gold/70">
            📍 {cityLabel} · {n(year)}
          </p>
        </div>
        <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg active:bg-white/10 cursor-pointer">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="text-xs gap-1.5 cursor-pointer"
          disabled={syncing}
          onClick={syncVerified}
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? t("common.loading") : t("common.refresh")}
        </Button>
        <Button type="button" variant="outline" className="text-xs gap-1.5 text-green-700 border-green-300 cursor-pointer" onClick={shareWeekWhatsApp}>
          <Share2 size={14} /> {t("common.share")}
        </Button>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-2">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEK_I18N.map((w) => (
              <div key={w} className="text-center text-[10px] font-semibold text-matang-navy py-1">
                {t(w)}
              </div>
            ))}
          </div>
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8">{t("common.loading")}</p>
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
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs relative transition cursor-pointer
                      ${isSel ? "bg-matang-navy text-matang-gold ring-2 ring-matang-gold" : ""}
                      ${!isSel && isToday ? "bg-emerald-500 text-white font-bold ring-2 ring-emerald-600 shadow-md scale-[1.02]" : ""}
                      ${!isSel && !isToday ? "hover:bg-gray-50 text-gray-800" : ""}
                    `}
                  >
                    <span className="leading-none">{n(d)}</span>
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

      {/* Day detail panel */}
      {selected && selectedDateObj && (
        <Card className="border-matang-gold/40">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-matang-navy">
                  {selected}
                </p>
                <p className="text-[11px] text-gray-500">{selected}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-1 text-gray-400 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{t("common.noData")}</p>
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
                          {staff ? t("auth.volunteer") : t("common.verified")}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-gray-600">{ev.description}</p>
                      )}
                      {isStaff && staff && (
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] text-matang-navy font-medium cursor-pointer"
                            onClick={() => startEdit(ev)}
                          >
                            <Pencil size={12} /> {t("common.edit")}
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] text-red-600 font-medium cursor-pointer"
                            onClick={() => deleteFest(ev)}
                          >
                            <Trash2 size={12} /> {t("common.delete")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isStaff && (
              <Button
                variant="outline"
                className="w-full text-xs cursor-pointer"
                onClick={() => {
                  setForm((f) => ({ ...f, festival_date: selected }));
                  setShowForm(true);
                }}
              >
                + {t("panchang.addFestival")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming list this month */}
      <div>
        <h2 className="text-sm font-bold text-matang-navy mb-2">{t("panchang.upcomingFestivals")}</h2>
        {Array.from(allEvents.entries())
          .filter(([date]) => date.startsWith(`${year}-${String(month0 + 1).padStart(2, "0")}`))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, evs]) => (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(date)}
              className="w-full text-left mb-2 rounded-xl border border-gray-100 bg-white p-3 active:scale-[0.99] cursor-pointer"
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

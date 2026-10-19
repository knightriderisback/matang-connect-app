"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { FormSection, pickLabel } from "@/lib/parivar/form";
import { BarChart3, Bell, Pencil, Phone, MessageCircle } from "lucide-react";

interface PersonRow { name: string; age: number; phone: string | null; family_id: string }
interface MissingRow { family_id: string; head_name: string; head_phone: string | null; completion_percent: number }
interface Insights {
  totals: { families: number; members: number; avg_completion: number; low_completion: number };
  by_city: { name: string; families: number }[];
  blood_groups: { group: string; count: number }[];
  needs: { need: string; count: number }[];
  docs_gap: { ayushman: number; ration: number; e_shram: number };
  care_needed: number;
  unemployed_youth: { count: number; list: PersonRow[] };
  seniors_alone: { count: number; list: PersonRow[] };
  scholarship: { count: number; list: PersonRow[] };
  missing_data: MissingRow[];
}

const card = "p-3 rounded-2xl border bg-white";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 rounded-2xl bg-white border text-center">
      <p className="text-xl font-bold text-matang-navy">{value}</p>
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs"><span data-no-translate>{r.label}</span><span className="font-semibold">{r.value}</span></div>
          <div className="h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-matang-gold" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function ContactLinks({ phone }: { phone: string | null }) {
  if (!phone) return null;
  const p = phone.replace(/\D/g, "").slice(-10);
  return (
    <span className="flex gap-1.5">
      <a href={`tel:${p}`} className="p-1.5 rounded-lg border bg-white"><Phone size={13} /></a>
      <a href={`https://wa.me/91${p}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg border bg-white"><MessageCircle size={13} /></a>
    </span>
  );
}

function PeopleList({ title, count, rows, onOpen }: { title: string; count: number; rows: PersonRow[]; onOpen: (id: string) => void }) {
  return (
    <div className={card}>
      <p className="text-sm font-bold text-matang-navy mb-2">{title} <span className="text-gray-400 font-normal">({count})</span></p>
      {rows.length === 0 ? <p className="text-xs text-gray-400">—</p> : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={`${r.family_id}-${i}`} className="flex items-center justify-between gap-2 text-xs p-2 rounded-xl bg-gray-50">
              <button type="button" onClick={() => onOpen(r.family_id)} className="text-left min-w-0 cursor-pointer" data-no-translate>
                <span className="font-medium">{r.name}</span> · {r.age}y
              </button>
              <ContactLinks phone={r.phone} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParivarInsightsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const { lang } = useI18n();
  const router = useRouter();
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [needLabels, setNeedLabels] = useState<Record<string, string>>({});
  const [reminding, setReminding] = useState(false);

  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ins, cfg] = await Promise.all([
        fetch("/api/admin/parivar-insights", { cache: "no-store" }),
        fetch("/api/parivar/config", { cache: "no-store" }),
      ]);
      const d = await ins.json();
      if (!ins.ok) throw new Error(d.error || "Failed");
      setData(d.insights);
      if (cfg.ok) {
        const c = await cfg.json();
        const needs = ((c.sections as FormSection[]) || []).flatMap((s) => s.fields).find((f) => f.field_key === "needs");
        const map: Record<string, string> = {};
        (needs?.options || []).forEach((o) => { map[o.value] = pickLabel(o.label, lang); });
        setNeedLabels(map);
      }
    } catch (e: any) {
      toast(e.message || "Failed", "error");
    } finally { setLoading(false); }
  }, [toast, lang]);

  useEffect(() => { if (isStaff) load(); }, [isStaff, load]);

  const open = (familyId: string) => router.push(`/census?family=${familyId}`);

  const remind = async (ids: string[]) => {
    if (ids.length === 0) return;
    setReminding(true);
    try {
      const res = await fetch("/api/admin/parivar-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "remind", familyIds: ids }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast(`Reminders sent: ${d.sent}, skipped: ${d.skipped}`, "success");
    } catch (e: any) { toast(e.message || "Failed", "error"); }
    finally { setReminding(false); }
  };

  const needRows = useMemo(
    () => (data?.needs || []).map((n) => ({ label: needLabels[n.need] || n.need, value: n.count })),
    [data, needLabels]
  );

  if (userLoading || loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!isStaff) return <div className="p-8 text-center text-sm text-gray-500">Only volunteers, core committee and super admin can view this.</div>;
  if (!data) return <div className="p-8 text-center text-sm text-gray-500">No data.</div>;

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-lg font-bold text-matang-navy flex items-center gap-2">
          <BarChart3 size={20} className="text-matang-gold" /> Parivar Insights
        </h1>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {user?.role === "super_admin" ? "All cities" : "Your city"}. Contact details are for community seva only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Families" value={data.totals.families} />
        <Stat label="Members" value={data.totals.members} />
        <Stat label="Average completion %" value={`${data.totals.avg_completion}%`} />
        <Stat label="Need care" value={data.care_needed} />
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-2">Families by city</p>
        <Bars rows={data.by_city.map((c) => ({ label: c.name, value: c.families }))} />
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-2">Blood group donors</p>
        {data.blood_groups.length === 0 ? <p className="text-xs text-gray-400">No blood group data yet.</p> :
          <div className="flex flex-wrap gap-2">
            {data.blood_groups.map((b) => (
              <span key={b.group} className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-sm font-semibold" data-no-translate>{b.group} · {b.count}</span>
            ))}
          </div>}
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-2">Help needed (families)</p>
        {needRows.length === 0 ? <p className="text-xs text-gray-400">—</p> : <Bars rows={needRows} />}
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-2">Government document gaps (families)</p>
        <Bars rows={[
          { label: "No Ayushman card", value: data.docs_gap.ayushman },
          { label: "No Ration card", value: data.docs_gap.ration },
          { label: "No e-Shram card", value: data.docs_gap.e_shram },
        ]} />
      </div>

      <PeopleList title="Unemployed youth (18-35)" count={data.unemployed_youth.count} rows={data.unemployed_youth.list} onOpen={open} />
      <PeopleList title="Seniors living alone (60+)" count={data.seniors_alone.count} rows={data.seniors_alone.list} onOpen={open} />
      <PeopleList title="Students who may need a scholarship" count={data.scholarship.count} rows={data.scholarship.list} onOpen={open} />

      <div className={card}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-matang-navy">Incomplete forms <span className="text-gray-400 font-normal">({data.totals.low_completion} below 50%)</span></p>
          {data.missing_data.length > 0 && (
            <button type="button" disabled={reminding} onClick={() => remind(data.missing_data.map((m) => m.family_id))}
              className="px-3 py-1.5 rounded-xl bg-matang-navy text-matang-gold text-xs font-semibold disabled:opacity-50 cursor-pointer">
              <Bell size={12} className="inline mr-1" />Remind all
            </button>
          )}
        </div>
        {data.missing_data.length === 0 ? <p className="text-xs text-gray-400">All forms are in good shape.</p> : (
          <div className="space-y-1.5">
            {data.missing_data.map((m) => (
              <div key={m.family_id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-50 text-xs">
                <div className="min-w-0" data-no-translate>
                  <p className="font-medium truncate">{m.head_name || "—"}</p>
                  <p className="text-gray-500">{m.completion_percent}% complete</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <ContactLinks phone={m.head_phone} />
                  <button type="button" className="p-1.5 rounded-lg border bg-white cursor-pointer" onClick={() => remind([m.family_id])}><Bell size={13} /></button>
                  <button type="button" className="p-1.5 rounded-lg border bg-white cursor-pointer" onClick={() => open(m.family_id)}><Pencil size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

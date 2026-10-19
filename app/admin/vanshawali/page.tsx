"use client";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import { TreePine, Check, X, Trash2, GitMerge, RefreshCw } from "lucide-react";

interface Overview {
  stats: { persons: number; links: number; components: number; without_gender: number; without_birth_year: number; registered: number };
  pending: { id: string; relation: string; from_name: string; to_name: string; created_at: string }[];
  duplicates: { id: string; name: string; registered: boolean; linked: boolean; birth_year: number | null }[][];
  isolated: { id: string; name: string; created_at: string }[];
  junk: { id: string; name: string; registered: boolean; linked: boolean }[];
}

const card = "p-3 rounded-2xl border bg-white";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-2xl bg-white border text-center">
      <p className="text-xl font-bold text-matang-navy">{value}</p>
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
    </div>
  );
}

async function post(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Failed");
  return d;
}

export default function AdminVanshawaliPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const allowed = ["core_committee", "super_admin"].includes(user?.role || "");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vanshawali", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setData(d);
    } catch (e: any) { toast(e.message || "Failed", "error"); }
  }, [toast]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const run = async (fn: () => Promise<any>, okMsg: string) => {
    setBusy(true);
    try { await fn(); toast(okMsg, "success"); await load(); }
    catch (e: any) { toast(e.message || "Failed", "error"); }
    finally { setBusy(false); }
  };

  if (userLoading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!allowed) return <div className="p-8 text-center text-sm text-gray-500">Only Core Committee and Super Admin can manage Vanshawali.</div>;
  if (!data) return <div className="p-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-lg font-bold text-matang-navy flex items-center gap-2">
        <TreePine size={20} className="text-matang-gold" /> Vanshawali Management
      </h1>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Persons" value={data.stats.persons} />
        <Stat label="Relations" value={data.stats.links} />
        <Stat label="Separate lineages" value={data.stats.components} />
        <Stat label="Registered" value={data.stats.registered} />
        <Stat label="No gender" value={data.stats.without_gender} />
        <Stat label="No birth year" value={data.stats.without_birth_year} />
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-1">Parivar Form se jodo</p>
        <p className="text-xs text-gray-500 mb-2">Parivar Form me bhare Wife/Husband, Son/Daughter, Father/Mother se Vanshawali me persons aur rishte apne aap banenge (jo pehle ban chuke wo dobara nahi).</p>
        <button type="button" disabled={busy}
          onClick={() => run(async () => { const d = await post("/api/admin/vanshawali", { op: "seed_from_families" }); toast(`Persons: ${d.createdPersons}, relations: ${d.createdLinks}, skipped: ${d.skipped}`, "success"); }, "Sync complete")}
          className="w-full py-2.5 rounded-xl bg-matang-navy text-matang-gold text-sm font-semibold disabled:opacity-50 cursor-pointer">
          <RefreshCw size={14} className="inline mr-1" /> Sync from Parivar Form
        </button>
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-2">Pending requests <span className="text-gray-400 font-normal">({data.pending.length})</span></p>
        {data.pending.length === 0 ? <p className="text-xs text-gray-400">Koi pending nahi.</p> : (
          <div className="space-y-1.5">
            {data.pending.map((p) => (
              <div key={p.id} className="p-2 rounded-xl bg-gray-50 text-xs space-y-1.5" data-no-translate>
                <p><strong>{p.from_name}</strong> → <strong>{p.to_name}</strong> <span className="text-gray-500">({p.relation})</span></p>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => run(() => post("/api/vanshawali", { action: "verify", link_id: p.id }), "Approved")}
                    className="flex-1 py-1.5 rounded-lg bg-green-600 text-white font-semibold cursor-pointer"><Check size={13} className="inline" /> Approve</button>
                  <button type="button" disabled={busy} onClick={() => run(() => post("/api/vanshawali", { action: "reject", link_id: p.id }), "Rejected")}
                    className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-semibold cursor-pointer"><X size={13} className="inline" /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-2">Possible duplicates <span className="text-gray-400 font-normal">({data.duplicates.length})</span></p>
        {data.duplicates.length === 0 ? <p className="text-xs text-gray-400">Koi duplicate naam nahi.</p> : (
          <div className="space-y-2">
            {data.duplicates.map((g, i) => (
              <div key={i} className="p-2 rounded-xl bg-gray-50 text-xs space-y-1.5" data-no-translate>
                <p className="font-semibold">{g[0].name} × {g.length}</p>
                {g.slice(1).map((dup) => (
                  <div key={dup.id} className="flex items-center justify-between gap-2">
                    <span className="text-gray-600">{dup.birth_year ? `b. ${dup.birth_year}` : "no year"} · {dup.linked ? "linked" : "isolated"}{dup.registered ? " · member" : ""}</span>
                    <button type="button" disabled={busy}
                      onClick={() => { if (window.confirm(`Merge this "${dup.name}" into the first one?`)) run(() => post("/api/admin/vanshawali", { op: "merge_persons", keep_id: g[0].id, remove_id: dup.id }), "Merged"); }}
                      className="px-2.5 py-1 rounded-lg border bg-white cursor-pointer"><GitMerge size={12} className="inline mr-1" />Merge</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-2">Bina rishte wale persons <span className="text-gray-400 font-normal">({data.isolated.length})</span></p>
        <p className="text-[11px] text-gray-500 mb-2">Ye kisi vanshawali me dikhte nahi (purane bug se bane). Chaho to hata do.</p>
        {data.isolated.length === 0 ? <p className="text-xs text-gray-400">Koi nahi.</p> : (
          <div className="space-y-1.5">
            {data.isolated.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-50 text-xs" data-no-translate>
                <span>{p.name} <span className="text-gray-400">· {new Date(p.created_at).toLocaleDateString()}</span></span>
                <button type="button" disabled={busy}
                  onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) run(() => post("/api/admin/vanshawali", { op: "delete_person", person_id: p.id }), "Deleted"); }}
                  className="p-1.5 rounded-lg border bg-white text-red-600 cursor-pointer"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={card}>
        <p className="text-sm font-bold text-matang-navy mb-2">Junk / adhure naam <span className="text-gray-400 font-normal">({data.junk.length})</span></p>
        {data.junk.length === 0 ? <p className="text-xs text-gray-400">Koi nahi.</p> : (
          <div className="flex flex-wrap gap-1.5" data-no-translate>
            {data.junk.map((j) => (
              <span key={j.id} className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 text-xs">{j.name}{j.registered ? " (member)" : ""}</span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-500 mt-2">Inka naam sahi karne ke liye Vanshawali page par us vyakti ko edit karo (ya upar se merge/delete).</p>
      </div>
    </div>
  );
}

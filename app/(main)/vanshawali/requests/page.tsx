"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { Check, X, ChevronLeft } from "lucide-react";

interface Item {
  id: string;
  relation: string;
  from_name: string;
  to_name: string;
  created_at: string;
}

const REL_TEXT: Record<string, (from: string, to: string) => string> = {
  father: (f, t) => `${f} → ${t} ke pita (father)`,
  mother: (f, t) => `${f} → ${t} ki mata (mother)`,
  spouse: (f, t) => `${f} aur ${t} pati-patni (spouse)`,
  child: (f, t) => `${t} → ${f} ki santaan (child)`,
};

export default function VanshRequestsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vanshawali?pending=1", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setItems(d.items || []);
    } catch (e: any) {
      toast(e.message || "Failed", "error");
      setItems([]);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: "verify" | "reject") => {
    setBusy(id);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, link_id: id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      toast(action === "verify" ? "Approved" : "Rejected", "success");
      await load();
    } catch (e: any) {
      toast(e.message || "Failed", "error");
    } finally { setBusy(null); }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <button type="button" onClick={() => router.push("/vanshawali")} className="flex items-center gap-1 text-sm text-matang-navy cursor-pointer">
        <ChevronLeft size={16} /> Vanshawali
      </button>
      <h1 className="text-lg font-bold text-matang-navy">Rishte ki requests</h1>
      <p className="text-xs text-gray-500">Jin rishton me aapka naam hai, unhe yahan approve ya reject karein.</p>

      {items === null && <p className="text-center text-sm text-gray-500">Loading…</p>}
      {items && items.length === 0 && <p className="text-center text-sm text-gray-500 py-8">Koi pending request nahi hai.</p>}

      {items?.map((it) => (
        <div key={it.id} className="p-3 rounded-2xl bg-white border space-y-2" data-no-translate>
          <p className="text-sm font-medium text-matang-navy">
            {(REL_TEXT[it.relation] || ((f: string, t: string) => `${f} – ${t}`))(it.from_name, it.to_name)}
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={busy === it.id} onClick={() => act(it.id, "verify")}
              className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer">
              <Check size={16} /> Approve
            </button>
            <button type="button" disabled={busy === it.id} onClick={() => act(it.id, "reject")}
              className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer">
              <X size={16} /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

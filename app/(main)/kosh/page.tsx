"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Heart, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { toLocalizedDigits } from "@/lib/numbers";
import { useI18n } from "@/lib/i18n/LanguageProvider";

interface Entry { id: string; entry_type: string; amount: number; description?: string; entry_date: string; }

function KoshPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { lang } = useI18n();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ entry_type: "income", amount: "", description: "", entry_date: new Date().toISOString().slice(0, 10) });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");
  const loc = lang || "en";

  const load = () => {
    fetch("/api/kosh").then(r => r.json()).then(d => {
      setEntries(d.entries || []); setCampaigns(d.campaigns || []);
      setSummary(d.summary || { income: 0, expense: 0, balance: 0 });
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.amount) { toast("Amount required", "error"); return; }
    const res = await fetch("/api/kosh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Failed", "error"); return; }
    toast("Entry added", "success");
    setShowForm(false);
    load();
  };

  const fmt = (n: number) => toLocalizedDigits(n.toLocaleString("en-IN"), loc);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Sahyog Kosh</h1>
        </div>
        {isStaff && <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Entry</Button>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-green-50 border-green-100"><CardContent className="p-3 text-center">
          <TrendingUp size={16} className="mx-auto text-green-600 mb-1" />
          <p className="text-sm font-bold text-green-700">₹{fmt(summary.income)}</p>
          <p className="text-[10px] text-green-600">Income</p>
        </CardContent></Card>
        <Card className="bg-red-50 border-red-100"><CardContent className="p-3 text-center">
          <TrendingDown size={16} className="mx-auto text-red-600 mb-1" />
          <p className="text-sm font-bold text-red-700">₹{fmt(summary.expense)}</p>
          <p className="text-[10px] text-red-600">Expense</p>
        </CardContent></Card>
        <Card className="bg-matang-gold/10 border-matang-gold/30"><CardContent className="p-3 text-center">
          <p className="text-sm font-bold text-matang-navy">₹{fmt(summary.balance)}</p>
          <p className="text-[10px] text-gray-500">Balance</p>
        </CardContent></Card>
      </div>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <Input label="Amount (₹) *" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <Input label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Input label="Date" type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submit}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
      <div className="space-y-2">
        
      {campaigns.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-matang-navy">Fundraising campaigns</h2>
          {campaigns.map((c: any) => {
            const pct = c.goal_amount > 0 ? Math.min(100, Math.round((Number(c.raised_amount||0) / Number(c.goal_amount)) * 100)) : 0;
            return (
              <Card key={c.id} className="border-matang-gold/20">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-matang-navy">{c.title}</span>
                    <span className="text-xs text-gray-500">{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-matang-gold to-yellow-500 rounded-full transition-all" style={{ width: pct + "%" }} />
                  </div>
                  <p className="text-[11px] text-gray-500">₹{Number(c.raised_amount||0).toLocaleString("en-IN")} / ₹{Number(c.goal_amount||0).toLocaleString("en-IN")}</p>
                  {c.description && <p className="text-xs text-gray-600">{c.description}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
{entries.map(e => (
          <Card key={e.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-matang-navy">{e.description || e.entry_type}</p>
                <p className="text-[10px] text-gray-400">{e.entry_date}</p>
              </div>
              <p className={`font-bold text-sm ${e.entry_type === "income" ? "text-green-600" : "text-red-600"}`}>
                {e.entry_type === "income" ? "+" : "-"}₹{fmt(Number(e.amount))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function KoshPage() {
  return (
    <FeatureGate moduleKey="kosh">
      <KoshPageInner />
    </FeatureGate>
  );
}

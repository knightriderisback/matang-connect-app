"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Heart, Plus, TrendingUp, TrendingDown, Clock, User } from "lucide-react";
import { NameLink } from "@/components/shared/NameLink";
import { toLocalizedDigits } from "@/lib/numbers";
import { useI18n } from "@/lib/i18n/LanguageProvider";

interface Entry {
  id: string;
  entry_type: string;
  amount: number;
  description?: string;
  category?: string;
  entry_date?: string;
  created_at?: string;
  recorded_by?: string;
  recorded_by_name?: string | null;
}

interface Contrib {
  id: string;
  amount: number;
  purpose?: string;
  created_at?: string;
  contributor_id?: string;
  contributor_name?: string | null;
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function KoshPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { lang } = useI18n();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [contributions, setContributions] = useState<Contrib[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    entry_type: "income",
    amount: "",
    description: "",
    entry_date: new Date().toISOString().slice(0, 10),
  });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");
  const loc = lang || "en";

  const load = () => {
    fetch("/api/kosh")
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries || []);
        setContributions(d.contributions || []);
        setCampaigns(d.campaigns || []);
        setSummary(d.summary || { income: 0, expense: 0, balance: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.amount) {
      toast("Amount required", "error");
      return;
    }
    const res = await fetch("/api/kosh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Entry added", "success");
    setShowForm(false);
    load();
  };

  const fmt = (n: number) => toLocalizedDigits(n.toLocaleString("en-IN"), loc);

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Sahyog Kosh</h1>
        </div>
        {isStaff && (
          <Button
            type="button"
            variant="outline"
            className="text-xs"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={14} className="inline mr-1" />
            Entry
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp size={16} className="mx-auto text-green-600 mb-1" />
            <p className="text-[10px] text-gray-500">Income</p>
            <p className="text-sm font-bold text-green-700">₹{fmt(summary.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown size={16} className="mx-auto text-red-600 mb-1" />
            <p className="text-[10px] text-gray-500">Expense</p>
            <p className="text-sm font-bold text-red-700">₹{fmt(summary.expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Heart size={16} className="mx-auto text-matang-gold mb-1" />
            <p className="text-[10px] text-gray-500">Balance</p>
            <p className="text-sm font-bold text-matang-navy">₹{fmt(summary.balance)}</p>
          </CardContent>
        </Card>
      </div>

      {showForm && isStaff && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <select
              className="w-full px-3 py-2 rounded-xl border text-sm"
              value={form.entry_type}
              onChange={(e) => setForm((f) => ({ ...f, entry_type: e.target.value }))}
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <Input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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

      {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}

      {campaigns.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-matang-navy">Fundraising campaigns</h2>
          {campaigns.map((c: any) => {
            const pct =
              c.goal_amount > 0
                ? Math.min(100, Math.round((Number(c.raised_amount || 0) / Number(c.goal_amount)) * 100))
                : 0;
            return (
              <Card key={c.id} className="border-matang-gold/20">
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-matang-navy">{c.title}</span>
                    <span className="text-xs text-gray-500">{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-matang-gold to-yellow-500 rounded-full"
                      style={{ width: pct + "%" }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    ₹{Number(c.raised_amount || 0).toLocaleString("en-IN")} / ₹
                    {Number(c.goal_amount || 0).toLocaleString("en-IN")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-matang-navy">Ledger entries</h2>
        {entries.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-3 flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-matang-navy">
                  {e.description || e.category || e.entry_type}
                </p>
                {(e.recorded_by_name || e.recorded_by) && (
                  <p className="text-[11px] text-gray-600 flex items-center gap-1 flex-wrap">
                    <User size={11} className="text-gray-400 shrink-0" />
                    Entry by:{" "}
                    <NameLink id={e.recorded_by} name={e.recorded_by_name} fallback="Staff" />
                  </p>
                )}
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock size={10} />
                  {formatWhen(e.created_at || e.entry_date)}
                </p>
              </div>
              <p
                className={`font-bold text-sm shrink-0 ${
                  e.entry_type === "income" ? "text-green-600" : "text-red-600"
                }`}
              >
                {e.entry_type === "income" ? "+" : "-"}₹{fmt(Number(e.amount))}
              </p>
            </CardContent>
          </Card>
        ))}
        {!loading && entries.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No ledger entries yet.</p>
        )}
      </div>

      {contributions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-matang-navy">Member contributions</h2>
          {contributions.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-matang-navy">
                    {c.purpose || "Contribution"}
                  </p>
                  <p className="text-[11px] text-gray-600 flex items-center gap-1 flex-wrap">
                    <User size={11} className="text-gray-400 shrink-0" />
                    <NameLink id={c.contributor_id} name={c.contributor_name} />
                  </p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock size={10} />
                    {formatWhen(c.created_at)}
                  </p>
                </div>
                <p className="font-bold text-sm text-green-600 shrink-0">+₹{fmt(Number(c.amount))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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

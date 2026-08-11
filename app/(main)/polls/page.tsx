"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { BarChart3, Plus } from "lucide-react";

interface Poll {
  id: string;
  question: string;
  options: string[];
  vote_counts: number[];
  total_votes: number;
  my_vote: number | null;
  ends_at?: string;
  created_at: string;
}

export default function PollsPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: "", opt1: "", opt2: "", opt3: "", opt4: "" });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/polls")
      .then((r) => r.json())
      .then((d) => setPolls(d.polls || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const vote = async (pollId: string, optionIndex: number) => {
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", poll_id: pollId, option_index: optionIndex }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Vote failed", "error");
      return;
    }
    toast("Vote recorded", "success");
    load();
  };

  const create = async () => {
    const options = [form.opt1, form.opt2, form.opt3, form.opt4].map((o) => o.trim()).filter(Boolean);
    if (!form.question || options.length < 2) {
      toast("Question + at least 2 options required", "error");
      return;
    }
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: form.question, options }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Poll created", "success");
    setShowForm(false);
    setForm({ question: "", opt1: "", opt2: "", opt3: "", opt4: "" });
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Polls</h1>
        </div>
        {isStaff && (
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> New Poll
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input label="Question *" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            <Input label="Option 1 *" value={form.opt1} onChange={(e) => setForm({ ...form, opt1: e.target.value })} />
            <Input label="Option 2 *" value={form.opt2} onChange={(e) => setForm({ ...form, opt2: e.target.value })} />
            <Input label="Option 3" value={form.opt3} onChange={(e) => setForm({ ...form, opt3: e.target.value })} />
            <Input label="Option 4" value={form.opt4} onChange={(e) => setForm({ ...form, opt4: e.target.value })} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={create}>
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      ) : polls.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">No active polls.</CardContent>
        </Card>
      ) : (
        polls.map((p) => {
          const max = Math.max(...(p.vote_counts || [0]), 1);
          return (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-matang-navy">{p.question}</h3>
                <div className="space-y-2">
                  {(p.options || []).map((opt, i) => {
                    const count = p.vote_counts?.[i] || 0;
                    const pct = p.total_votes ? Math.round((count / p.total_votes) * 100) : 0;
                    const selected = p.my_vote === i;
                    return (
                      <button
                        key={i}
                        onClick={() => vote(p.id, i)}
                        className={`w-full text-left relative overflow-hidden rounded-xl border px-3 py-2.5 text-sm transition ${
                          selected ? "border-matang-gold bg-matang-gold/10" : "border-gray-200 hover:border-matang-navy/30"
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-matang-navy/10"
                          style={{ width: `${p.total_votes ? (count / max) * 100 : 0}%` }}
                        />
                        <div className="relative flex justify-between items-center gap-2">
                          <span className={selected ? "font-semibold text-matang-navy" : "text-gray-700"}>{opt}</span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {count} ({pct}%)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400">{p.total_votes} vote{p.total_votes !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

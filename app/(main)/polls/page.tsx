"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { effectiveRole } from "@/lib/auth/roleCache";
import { BarChart3, Plus, Lock } from "lucide-react";

interface Poll {
  id: string;
  question: string;
  options: string[];
  vote_counts: number[];
  total_votes: number;
  my_vote: number | null;
  vote_locked?: boolean;
  ends_at?: string;
  created_at: string;
}

/** LOCKED C2 create path — staff only; vote lock + change request flow active */
function PollsPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const role = effectiveRole(user?.role);
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(role || "");
  const isApprover = ["core_committee", "super_admin"].includes(role || "");
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: "", opt1: "", opt2: "", opt3: "", opt4: "" });
  const [changeReqs, setChangeReqs] = useState<any[]>([]);
  const [myReqs, setMyReqs] = useState<any[]>([]);
  const [pendingChange, setPendingChange] = useState<{
    pollId: string;
    optionIndex: number;
  } | null>(null);
  const [changeReason, setChangeReason] = useState("");

  const load = () => {
    fetch("/api/polls")
      .then((r) => r.json())
      .then((d) => {
        setPolls(d.polls || []);
        setChangeReqs(d.change_requests || []);
        setMyReqs(d.my_requests || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const vote = async (pollId: string, optionIndex: number, locked: boolean, myVote: number | null) => {
    if (locked || myVote != null) {
      if (myVote === optionIndex) return;
      setPendingChange({ pollId, optionIndex });
      setChangeReason("");
      return;
    }
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "vote", poll_id: pollId, option_index: optionIndex }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.code === "VOTE_LOCKED") {
        toast("Vote locked — request a change", "error");
        setPendingChange({ pollId, optionIndex });
        return;
      }
      toast(data.error || "Vote failed", "error");
      return;
    }
    toast("Vote locked in ✓", "success");
    load();
  };

  const submitChangeRequest = async () => {
    if (!pendingChange) return;
    const poll = polls.find((p) => p.id === pendingChange.pollId);
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "request_change",
        poll_id: pendingChange.pollId,
        option_index: pendingChange.optionIndex,
        from_index: poll?.my_vote ?? null,
        reason: changeReason,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Request failed", "error");
      return;
    }
    toast("Change request sent to Core / Super Admin", "success");
    setPendingChange(null);
    load();
  };

  const resolve = async (requestId: string, decision: "accept" | "reject") => {
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve_change", request_id: requestId, decision }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast(decision === "accept" ? "Vote change approved" : "Request rejected", "success");
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
    <div className="p-4 space-y-4 pb-24">
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

      {isApprover && changeReqs.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="p-3 space-y-2">
            <p className="text-sm font-semibold text-matang-navy">Vote change requests</p>
            {changeReqs.map((r) => {
              const poll = polls.find((p) => p.id === r.poll_id);
              return (
                <div key={r.id} className="rounded-xl border bg-white p-3 text-sm space-y-1">
                  <p>
                    <span className="font-semibold">{r.user_name}</span> wants to change vote
                  </p>
                  <p className="text-xs text-gray-600">{poll?.question || r.poll_id}</p>
                  <p className="text-xs">
                    New option:{" "}
                    <strong>{poll?.options?.[r.option_index] ?? `#${r.option_index}`}</strong>
                  </p>
                  {r.reason && <p className="text-xs text-gray-500">Reason: {r.reason}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button className="text-xs px-3 py-1" onClick={() => resolve(r.id, "accept")}>
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs px-3 py-1"
                      onClick={() => resolve(r.id, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input
              label="Question *"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
            <Input
              label="Option 1 *"
              value={form.opt1}
              onChange={(e) => setForm({ ...form, opt1: e.target.value })}
            />
            <Input
              label="Option 2 *"
              value={form.opt2}
              onChange={(e) => setForm({ ...form, opt2: e.target.value })}
            />
            <Input
              label="Option 3"
              value={form.opt3}
              onChange={(e) => setForm({ ...form, opt3: e.target.value })}
            />
            <Input
              label="Option 4"
              value={form.opt4}
              onChange={(e) => setForm({ ...form, opt4: e.target.value })}
            />
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

      {pendingChange && (
        <Card className="border-matang-gold/40">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-matang-navy">Request vote change</p>
            <p className="text-xs text-gray-600">
              Core Committee / Super Admin must approve before your vote changes.
            </p>
            <Input
              label="Reason (optional)"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Why change?"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingChange(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={submitChangeRequest}>
                Send request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {myReqs.length > 0 && (
        <p className="text-xs text-amber-700">
          You have {myReqs.length} pending vote-change request(s).
        </p>
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
          const locked = p.my_vote != null;
          return (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-matang-navy">{p.question}</h3>
                  {locked && (
                    <span className="flex items-center gap-0.5 text-[10px] text-gray-500 shrink-0">
                      <Lock size={10} /> Locked
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {(p.options || []).map((opt, i) => {
                    const count = p.vote_counts?.[i] || 0;
                    const pct = p.total_votes ? Math.round((count / p.total_votes) * 100) : 0;
                    const selected = p.my_vote === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => vote(p.id, i, locked, p.my_vote)}
                        className={`w-full text-left relative overflow-hidden rounded-xl border px-3 py-2.5 text-sm transition ${
                          selected
                            ? "border-matang-gold bg-matang-gold/10"
                            : "border-gray-200 hover:border-matang-navy/30"
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-matang-navy/10"
                          style={{ width: `${p.total_votes ? (count / max) * 100 : 0}%` }}
                        />
                        <div className="relative flex justify-between items-center gap-2">
                          <span className={selected ? "font-semibold text-matang-navy" : "text-gray-700"}>
                            {opt}
                          </span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {count} ({pct}%)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400">
                  {p.total_votes} vote{p.total_votes !== 1 ? "s" : ""}
                  {locked ? " · Tap another option to request change" : ""}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

export default function PollsPage() {
  return (
    <FeatureGate moduleKey="polls">
      <PollsPageInner />
    </FeatureGate>
  );
}

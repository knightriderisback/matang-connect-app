"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Award, Plus } from "lucide-react";

interface Post { id: string; title: string; body: string; month_label?: string; created_at: string; }

export default function GauravPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", month_label: "" });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/gaurav").then((r) => r.json()).then((d) => setPosts(d.posts || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title || !form.body) { toast("Title and body required", "error"); return; }
    const res = await fetch("/api/gaurav", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Failed", "error"); return; }
    toast("Published", "success");
    setShowForm(false);
    setForm({ title: "", body: "", month_label: "" });
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Award className="text-matang-gold" size={22} /><h1 className="text-lg font-bold text-matang-navy">Matang Gaurav</h1></div>
        {isStaff && <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}><Plus size={16} /> New</Button>}
      </div>
      <p className="text-sm text-gray-600">Monthly highlights — achievements, positive news, and community pride.</p>
      {showForm && (
        <Card className="border-matang-gold/30"><CardContent className="p-4 space-y-3">
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Month label" value={form.month_label} onChange={(e) => setForm({ ...form, month_label: e.target.value })} placeholder="e.g. August 2026" />
          <textarea className="w-full px-4 py-3 rounded-xl border text-sm min-h-[100px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Story…" />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="flex-1" onClick={submit}>Publish</Button>
          </div>
        </CardContent></Card>
      )}
      {loading ? <p className="text-center text-gray-400 py-8">Loading…</p> : posts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-400 text-sm">No Gaurav posts yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="border-matang-gold/20"><CardContent className="p-4 space-y-1">
              {p.month_label && <span className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy font-medium">{p.month_label}</span>}
              <h3 className="font-semibold text-matang-navy">{p.title}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.body}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}

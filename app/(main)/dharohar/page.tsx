"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Landmark, Plus } from "lucide-react";

interface Post {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  is_global?: boolean;
}

const CATS = ["culture", "history", "festival", "art", "language"];

function DharoharPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "culture" });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/dharohar")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.title || !form.body) {
      toast("Title and body required", "error");
      return;
    }
    const res = await fetch("/api/dharohar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Published", "success");
    setShowForm(false);
    setForm({ title: "", body: "", category: "culture" });
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Dharohar</h1>
        </div>
        {isStaff && (
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Post
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">Matang heritage, culture, history & language</p>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label className="block text-sm font-medium text-matang-navy">Body *</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[120px]"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm capitalize"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={submit}>
                Publish
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">No heritage posts yet.</CardContent>
        </Card>
      ) : (
        posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-matang-navy">{p.title}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 capitalize shrink-0">{p.category}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.body}</p>
              <p className="text-[10px] text-gray-400">{new Date(p.created_at).toLocaleDateString("en-IN")}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function DharoharPage() {
  return (
    <FeatureGate moduleKey="dharohar">
      <DharoharPageInner />
    </FeatureGate>
  );
}

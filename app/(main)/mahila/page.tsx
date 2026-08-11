"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Flower2, Plus, Phone } from "lucide-react";

interface Post {
  id: string;
  title: string;
  body: string;
  post_type: string;
  event_date?: string;
  contact_phone?: string;
  created_at: string;
}

const TYPES = [
  { value: "resource", label: "Resource" },
  { value: "event", label: "Event" },
  { value: "success_story", label: "Success Story" },
  { value: "scheme", label: "Scheme" },
];

export default function MahilaPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    post_type: "resource",
    event_date: "",
    contact_phone: "",
  });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/mahila")
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
    const res = await fetch("/api/mahila", {
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
    setForm({ title: "", body: "", post_type: "resource", event_date: "", contact_phone: "" });
    load();
  };

  const typeColor: Record<string, string> = {
    resource: "bg-purple-100 text-purple-700",
    event: "bg-blue-100 text-blue-700",
    success_story: "bg-green-100 text-green-700",
    scheme: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flower2 className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Mahila Shakti</h1>
        </div>
        {isStaff && (
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Post
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-500">Women empowerment · schemes · events · stories</p>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label className="block text-sm font-medium text-matang-navy">Body *</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[100px]"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              value={form.post_type}
              onChange={(e) => setForm({ ...form, post_type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {form.post_type === "event" && (
              <Input
                label="Event Date"
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            )}
            <Input label="Contact Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
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
          <CardContent className="p-8 text-center text-gray-500">No posts yet.</CardContent>
        </Card>
      ) : (
        posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-matang-navy">{p.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${typeColor[p.post_type] || "bg-gray-100"}`}>
                  {TYPES.find((t) => t.value === p.post_type)?.label || p.post_type}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.body}</p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {p.event_date && <span>📅 {new Date(p.event_date).toLocaleDateString("en-IN")}</span>}
                {p.contact_phone && (
                  <a href={`tel:${p.contact_phone}`} className="flex items-center gap-1 text-matang-gold font-medium">
                    <Phone size={12} />
                    {p.contact_phone}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

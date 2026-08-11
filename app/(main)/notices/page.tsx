"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Bell, Plus, Share2 } from "lucide-react";

interface Notice { id: string; title: string; body: string; priority: string; category?: string; created_at: string; is_global?: boolean; }

export default function NoticesPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", priority: "normal", category: "general" });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/notices").then(r => r.json()).then(d => setNotices(d.notices || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title || !form.body) { toast("Title and body required", "error"); return; }
    const res = await fetch("/api/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Failed", "error"); return; }
    toast("Notice published", "success");
    setShowForm(false);
    setForm({ title: "", body: "", priority: "normal" });
    load();
  };

  const shareWA = (n: Notice) => {
    const msg = `📢 *${n.title}
                {n.category && n.category !== "general" && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{categoryLabel[n.category] || n.category}</span>
                )}*\n\n${n.body}\n\n— Matang Connect`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const categoryLabel: Record<string, string> = {
    shok_sandesh: "Shok Sandesh",
    meeting: "Meeting",
    announcement: "Announcement",
    general: "General",
    other: "Other",
  };
  const priorityColor: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    normal: "bg-blue-100 text-blue-700",
    low: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Notices</h1>
        </div>
        {isStaff && (
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> New
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input label="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <label className="block text-sm font-medium text-matang-navy">Body *</label>
            <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[100px]" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
            <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submit}>Publish</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
      {!loading && notices.length === 0 && <p className="text-center text-gray-400 py-8">No notices yet</p>}
      <div className="space-y-3">
        {notices.map(n => (
          <Card key={n.id} className="border-gray-100">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-matang-navy">{n.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColor[n.priority] || priorityColor.normal}`}>{n.priority}</span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.body}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                <button onClick={() => shareWA(n)} className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Share2 size={14} /> WhatsApp
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

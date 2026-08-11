"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Award, Trash2 } from "lucide-react";

interface TitleRow {
  id: string;
  title_key: string;
  title_label: string;
  user_id: string;
  users?: { full_name: string; phone: string } | null;
}
interface DirUser { id: string; full_name: string; phone: string; }

export default function TitlesPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [options, setOptions] = useState<{ key: string; label: string }[]>([]);
  const [members, setMembers] = useState<DirUser[]>([]);
  const [titleKey, setTitleKey] = useState("adhyaksh");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [tRes, mRes] = await Promise.all([fetch("/api/titles"), fetch("/api/admin/directory")]);
    const tData = await tRes.json();
    const mData = await mRes.json();
    setTitles(tData.titles || []);
    setOptions(tData.options || []);
    setMembers(mData.users || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const assign = async () => {
    if (!userId || !titleKey) { toast("Select title and member", "error"); return; }
    const res = await fetch("/api/titles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title_key: titleKey, user_id: userId }),
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Failed", "error"); return; }
    toast("Title assigned", "success");
    load();
  };

  const remove = async (id: string) => {
    const res = await fetch("/api/titles", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!res.ok) { toast("Could not remove", "error"); return; }
    toast("Title removed", "success");
    load();
  };

  if (!user || !["core_committee", "super_admin"].includes(user.role || "")) {
    return <div className="p-4 text-center text-sm text-gray-500">Core Committee / Super Admin only</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Award className="text-matang-gold" size={22} />
        <h1 className="text-lg font-bold text-matang-navy">City Titles</h1>
      </div>
      <p className="text-xs text-gray-500">One title per city (e.g. only one Adhyaksh per city).</p>

      <Card className="border-matang-gold/30">
        <CardContent className="p-4 space-y-3">
          <Select
            label="Title"
            options={options.map(o => ({ value: o.key, label: o.label }))}
            value={titleKey}
            onChange={e => setTitleKey(e.target.value)}
          />
          <Select
            label="Member"
            options={[{ value: "", label: "Select member..." }, ...members.map(m => ({ value: m.id, label: `${m.full_name} (${m.phone})` }))]}
            value={userId}
            onChange={e => setUserId(e.target.value)}
          />
          <Button className="w-full" onClick={assign}>Assign Title</Button>
        </CardContent>
      </Card>

      {loading && <p className="text-center text-gray-400">Loading...</p>}
      <div className="space-y-2">
        {titles.map(t => (
          <Card key={t.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-matang-navy text-sm">{t.title_label}</p>
                <p className="text-xs text-gray-500">{t.users?.full_name || t.user_id} · {t.users?.phone}</p>
              </div>
              <button onClick={() => remove(t.id)} className="text-red-400 p-2"><Trash2 size={16} /></button>
            </CardContent>
          </Card>
        ))}
        {!loading && titles.length === 0 && <p className="text-center text-gray-400 py-6">No titles assigned yet</p>}
      </div>
    </div>
  );
}

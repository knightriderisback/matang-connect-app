"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { TrendingUp, Plus, ExternalLink, Phone } from "lucide-react";

interface Scheme {
  id: string;
  title: string;
  body: string;
  category: string;
  contact_phone?: string;
  link_url?: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "skill", label: "Skill Training" },
  { value: "loan", label: "Loan / Credit" },
  { value: "scheme", label: "Govt Scheme" },
  { value: "self_help", label: "Self Help Group" },
  { value: "other", label: "Other" },
];

export default function ArthikPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [items, setItems] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "scheme",
    contact_phone: "",
    link_url: "",
  });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/arthik")
      .then((r) => r.json())
      .then((d) => setItems(d.schemes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.title || !form.body) {
      toast("Title and description required", "error");
      return;
    }
    const res = await fetch("/api/arthik", {
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
    setForm({ title: "", body: "", category: "scheme", contact_phone: "", link_url: "" });
    load();
  };

  const catLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label || c;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">{t("nav.arthik")}</h1>
        </div>
        {isStaff && (
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> New
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-600">
        Skill training, government schemes, loans and self-help group opportunities for Matang community.
      </p>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input
              label="Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <label className="block text-sm font-medium text-matang-navy">Description *</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[90px]"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Input
              label="Contact Phone"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            />
            <Input
              label="Link (optional)"
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              placeholder="https://..."
            />
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
        <p className="text-center text-gray-400 py-8">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-400 text-sm">
            No schemes yet. Staff can publish skill / loan / govt scheme info.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-matang-navy">{s.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    {catLabel(s.category)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{s.body}</p>
                <div className="flex flex-wrap gap-3 text-xs pt-1">
                  {s.contact_phone && (
                    <a
                      href={`tel:${s.contact_phone}`}
                      className="flex items-center gap-1 text-matang-gold font-medium"
                    >
                      <Phone size={12} />
                      {s.contact_phone}
                    </a>
                  )}
                  {s.link_url && (
                    <a
                      href={s.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 font-medium"
                    >
                      <ExternalLink size={12} /> Link
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

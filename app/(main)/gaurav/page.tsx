"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { Award, Plus } from "lucide-react";

interface Post {
  id: string;
  title: string;
  body: string;
  month_label?: string;
  created_at: string;
}

function GauravPageInner() {
  const { t, timeAgo } = useI18n();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", month_label: "" });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/gaurav")
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
      toast(t("auth.invalidCredentials") || "Title and body required", "error");
      return;
    }
    const res = await fetch("/api/gaurav", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast(t("common.success"), "success");
    setShowForm(false);
    setForm({ title: "", body: "", month_label: "" });
    load();
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">{t("gaurav.title")}</h1>
        </div>
        {isStaff && (
          <Button className="text-sm px-3 py-1.5 cursor-pointer" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> {t("common.post")}
          </Button>
        )}
      </div>
      <p className="text-sm text-gray-600">{t("gaurav.subtitle")}</p>
      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input
              label={`${t("dashboard.title")} *`}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label={t("common.date")}
              value={form.month_label}
              onChange={(e) => setForm({ ...form, month_label: e.target.value })}
            />
            <label className="block text-sm font-medium text-matang-navy">{t("dashboard.message")} *</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border text-sm min-h-[100px] border-gray-200"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setShowForm(false)}>
                {t("common.cancel")}
              </Button>
              <Button className="flex-1 cursor-pointer" onClick={submit}>
                {t("common.post")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {loading ? (
        <p className="text-center text-gray-400 py-8">{t("common.loading")}</p>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Award}
          title={t("gaurav.noAchievers")}
          description={t("gaurav.subtitle")}
          actionLabel={isStaff ? t("common.post") : undefined}
          onAction={isStaff ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="border-matang-gold/20">
              <CardContent className="p-4 space-y-1">
                {p.month_label && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-matang-gold/20 text-matang-navy font-medium">
                    {p.month_label}
                  </span>
                )}
                <h3 className="font-semibold text-matang-navy">{p.title}</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GauravPage() {
  return (
    <FeatureGate moduleKey="gaurav">
      <GauravPageInner />
    </FeatureGate>
  );
}

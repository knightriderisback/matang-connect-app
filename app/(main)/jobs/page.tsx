"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Briefcase, Plus, Phone, MapPin } from "lucide-react";

interface Job { id: string; title: string; description?: string; location?: string; contact_phone?: string; salary_range?: string; created_at: string; }

export default function JobsPage() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", contact_phone: "", salary_range: "" });
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const load = () => {
    fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.jobs || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title) { toast("Title required", "error"); return; }
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { toast(data.error || "Failed", "error"); return; }
    toast("Job posted", "success");
    setShowForm(false);
    setForm({ title: "", description: "", location: "", contact_phone: "", salary_range: "" });
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Jobs & Livelihood</h1>
        </div>
        {isStaff && <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Post</Button>}
      </div>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <Input label="Job Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input label="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <Input label="Contact Phone" type="tel" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
            <Input label="Salary Range" value={form.salary_range} onChange={e => setForm({ ...form, salary_range: e.target.value })} />
            <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[80px]" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submit}>Post Job</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
      {!loading && jobs.length === 0 && <p className="text-center text-gray-400 py-8">No jobs posted yet</p>}
      <div className="space-y-3">
        {jobs.map(j => (
          <Card key={j.id}>
            <CardContent className="p-4 space-y-1.5">
              <h3 className="font-semibold text-matang-navy">{j.title}</h3>
              {j.salary_range && <p className="text-sm text-matang-gold font-medium">{j.salary_range}</p>}
              {j.description && <p className="text-sm text-gray-600">{j.description}</p>}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                {j.location && <span className="flex items-center gap-1"><MapPin size={12} />{j.location}</span>}
                {j.contact_phone && (
                  <a href={`tel:${j.contact_phone}`} className="flex items-center gap-1 text-matang-gold font-medium">
                    <Phone size={12} />{j.contact_phone}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

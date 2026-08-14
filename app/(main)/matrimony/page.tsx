"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Heart, Plus, User } from "lucide-react";

interface Profile {
  id: string;
  gender: string;
  age?: number;
  height_cm?: number;
  education?: string;
  occupation?: string;
  native_village?: string;
  about?: string;
  looking_for?: string;
  photo_url?: string;
  contact_visible?: boolean;
}

function MatrimonyPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterGender, setFilterGender] = useState("all");
  const [form, setForm] = useState({
    gender: "male",
    age: "",
    height_cm: "",
    education: "",
    occupation: "",
    native_village: "",
    about: "",
    looking_for: "",
    contact_visible: false,
  });

  const load = (g = filterGender) => {
    setLoading(true);
    fetch(`/api/matrimony?gender=${g}`)
      .then((r) => r.json())
      .then((d) => setProfiles(d.profiles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.gender) {
      toast("Gender required", "error");
      return;
    }
    const res = await fetch("/api/matrimony", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        age: form.age ? Number(form.age) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Failed", "error");
      return;
    }
    toast("Profile saved", "success");
    setShowForm(false);
    load();
  };

  const deactivate = async () => {
    const res = await fetch("/api/matrimony", { method: "DELETE" });
    if (res.ok) {
      toast("Profile deactivated", "success");
      load();
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Matrimony</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-sm px-3 py-1.5" onClick={deactivate}>
            Hide Mine
          </Button>
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> My Profile
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {["all", "female", "male"].map((g) => (
          <button
            key={g}
            onClick={() => {
              setFilterGender(g);
              load(g);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
              filterGender === g ? "bg-matang-navy text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {g === "all" ? "All" : g}
          </button>
        ))}
      </div>

      {showForm && (
        <Card className="border-matang-gold/30">
          <CardContent className="p-4 space-y-3">
            <label className="block text-sm font-medium text-matang-navy">Gender *</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              <Input label="Height (cm)" type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
            </div>
            <Input label="Education" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
            <Input label="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
            <Input label="Native Village" value={form.native_village} onChange={(e) => setForm({ ...form, native_village: e.target.value })} />
            <label className="block text-sm font-medium text-matang-navy">About</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[80px]"
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
            />
            <label className="block text-sm font-medium text-matang-navy">Looking For</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[60px]"
              value={form.looking_for}
              onChange={(e) => setForm({ ...form, looking_for: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.contact_visible}
                onChange={(e) => setForm({ ...form, contact_visible: e.target.checked })}
              />
              Show contact to interested families
            </label>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={submit}>
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">No profiles yet. Create yours to start.</CardContent>
        </Card>
      ) : (
        profiles.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-matang-navy/10 flex items-center justify-center">
                  <User size={22} className="text-matang-navy" />
                </div>
                <div>
                  <p className="font-semibold text-matang-navy capitalize">
                    {p.gender}
                    {p.age ? `, ${p.age} yrs` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[p.education, p.occupation].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              </div>
              {p.height_cm && <p className="text-sm text-gray-600">Height: {p.height_cm} cm</p>}
              {p.native_village && <p className="text-sm text-gray-600">Village: {p.native_village}</p>}
              {p.about && <p className="text-sm text-gray-700">{p.about}</p>}
              {p.looking_for && (
                <p className="text-xs text-matang-gold">
                  <span className="font-medium">Looking for:</span> {p.looking_for}
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function MatrimonyPage() {
  return (
    <FeatureGate moduleKey="matrimony">
      <MatrimonyPageInner />
    </FeatureGate>
  );
}

"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { Heart, Plus, User } from "lucide-react";

const GENDER_OPTS = ["male", "female", "other"];
const EDUCATION_BASE = [
  "Below 10th",
  "10th",
  "12th",
  "Diploma",
  "Graduate",
  "Post Graduate",
  "Professional (CA/CS/etc)",
  "Doctorate",
  "Other",
];
const OCCUPATION_BASE = [
  "Student",
  "Government job",
  "Private job",
  "Business",
  "Teacher",
  "Doctor",
  "Engineer",
  "Farmer",
  "Self employed",
  "Homemaker",
  "Unemployed",
  "Other",
];
const LOOKING_BASE = [
  "Educated partner",
  "Working partner",
  "Homemaker",
  "Same city",
  "Same community values",
  "Flexible",
  "Other",
];

function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

function feetInchesToCm(feet: string, inches: string): number | null {
  const f = parseInt(feet || "0", 10);
  const i = parseInt(inches || "0", 10);
  if (!f && !i) return null;
  return Math.round(f * 30.48 + i * 2.54);
}

function cmToFeetInches(cm: number): { feet: string; inches: string } {
  if (!cm) return { feet: "", inches: "" };
  const totalIn = cm / 2.54;
  const feet = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  return { feet: String(feet), inches: String(inches) };
}

interface Profile {
  id: string;
  user_id?: string;
  gender: string;
  age?: number;
  dob?: string;
  height_cm?: number;
  education?: string;
  occupation?: string;
  native_village?: string;
  about?: string;
  looking_for?: string;
  photo_url?: string;
  contact_visible?: boolean;
  user_name?: string;
}

function MatrimonyPageInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterGender, setFilterGender] = useState("all");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [form, setForm] = useState({
    gender: "male",
    dob: "",
    height_cm: "",
    height_ft: "",
    height_in: "",
    education: "Graduate",
    education_other: "",
    occupation: "Private job",
    occupation_other: "",
    native_village: "",
    about: "",
    looking_for: "Flexible",
    looking_other: "",
    contact_visible: false,
  });

  // Learn custom options from existing profiles for future dropdowns
  const educationOpts = useMemo(() => {
    const extra = profiles
      .map((p) => p.education)
      .filter((x): x is string => !!x && !EDUCATION_BASE.includes(x));
    return Array.from(new Set([...EDUCATION_BASE.filter((x) => x !== "Other"), ...extra, "Other"]));
  }, [profiles]);

  const occupationOpts = useMemo(() => {
    const extra = profiles
      .map((p) => p.occupation)
      .filter((x): x is string => !!x && !OCCUPATION_BASE.includes(x));
    return Array.from(new Set([...OCCUPATION_BASE.filter((x) => x !== "Other"), ...extra, "Other"]));
  }, [profiles]);

  const lookingOpts = useMemo(() => {
    const extra = profiles
      .map((p) => p.looking_for)
      .filter((x): x is string => !!x && !LOOKING_BASE.includes(x));
    return Array.from(new Set([...LOOKING_BASE.filter((x) => x !== "Other"), ...extra, "Other"]));
  }, [profiles]);

  const load = (g = filterGender) => {
    setLoading(true);
    fetch(`/api/matrimony?gender=${g}`)
      .then((r) => r.json())
      .then((d) => {
        setProfiles(d.profiles || []);
        const mine = d.mine || (d.profiles || []).find((p: Profile) => p.user_id === user?.id);
        if (mine) {
          const fi = mine.height_cm ? cmToFeetInches(Number(mine.height_cm)) : { feet: "", inches: "" };
          setForm((f) => ({
            ...f,
            gender: mine.gender || f.gender,
            dob: mine.dob || "",
            height_cm: mine.height_cm ? String(mine.height_cm) : "",
            height_ft: fi.feet,
            height_in: fi.inches,
            education: mine.education && EDUCATION_BASE.includes(mine.education) ? mine.education : mine.education ? "Other" : f.education,
            education_other:
              mine.education && !EDUCATION_BASE.includes(mine.education) ? mine.education : "",
            occupation:
              mine.occupation && OCCUPATION_BASE.includes(mine.occupation)
                ? mine.occupation
                : mine.occupation
                  ? "Other"
                  : f.occupation,
            occupation_other:
              mine.occupation && !OCCUPATION_BASE.includes(mine.occupation) ? mine.occupation : "",
            native_village: mine.native_village || "",
            about: mine.about || "",
            looking_for:
              mine.looking_for && LOOKING_BASE.includes(mine.looking_for)
                ? mine.looking_for
                : mine.looking_for
                  ? "Other"
                  : f.looking_for,
            looking_other:
              mine.looking_for && !LOOKING_BASE.includes(mine.looking_for) ? mine.looking_for : "",
            contact_visible: !!mine.contact_visible,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveField = (value: string, other: string) =>
    value === "Other" ? other.trim() : value;

  const submit = async () => {
    if (!form.gender) {
      toast("Gender required", "error");
      return;
    }
    const education = resolveField(form.education, form.education_other);
    const occupation = resolveField(form.occupation, form.occupation_other);
    const looking_for = resolveField(form.looking_for, form.looking_other);
    if (form.education === "Other" && !education) {
      toast("Enter custom education", "error");
      return;
    }
    if (form.occupation === "Other" && !occupation) {
      toast("Enter custom occupation", "error");
      return;
    }

    let height_cm: number | null = null;
    if (heightUnit === "cm") {
      height_cm = form.height_cm ? Number(form.height_cm) : null;
    } else {
      height_cm = feetInchesToCm(form.height_ft, form.height_in);
    }

    const age = ageFromDob(form.dob);

    const res = await fetch("/api/matrimony", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gender: form.gender,
        dob: form.dob || null,
        age,
        height_cm,
        education: education || null,
        occupation: occupation || null,
        native_village: form.native_village || null,
        about: form.about || null,
        looking_for: looking_for || null,
        contact_visible: form.contact_visible,
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

  const selectCls = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white";

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="text-matang-gold" size={22} />
          <h1 className="text-lg font-bold text-matang-navy">Matrimony</h1>
        </div>
        <div className="flex gap-2">
          <Button className="text-sm px-3 py-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> My Profile
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {["all", "female", "male"].map((g) => (
          <button
            key={g}
            type="button"
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
            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">Gender *</label>
              <select
                className={selectCls}
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                {GENDER_OPTS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">
                Date of birth
              </label>
              <input
                type="date"
                className={selectCls}
                value={form.dob}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
              {form.dob && ageFromDob(form.dob) != null && (
                <p className="text-[11px] text-gray-500 mt-1">Age: {ageFromDob(form.dob)} years</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-matang-navy">Height</label>
                <div className="flex gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setHeightUnit("cm")}
                    className={`px-2 py-0.5 rounded-full border ${
                      heightUnit === "cm" ? "bg-matang-navy text-white" : "bg-white"
                    }`}
                  >
                    cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeightUnit("ft")}
                    className={`px-2 py-0.5 rounded-full border ${
                      heightUnit === "ft" ? "bg-matang-navy text-white" : "bg-white"
                    }`}
                  >
                    ft / in
                  </button>
                </div>
              </div>
              {heightUnit === "cm" ? (
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 170"
                  value={form.height_cm}
                  onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Feet"
                    type="number"
                    inputMode="numeric"
                    value={form.height_ft}
                    onChange={(e) => setForm({ ...form, height_ft: e.target.value })}
                  />
                  <Input
                    label="Inches"
                    type="number"
                    inputMode="numeric"
                    value={form.height_in}
                    onChange={(e) => setForm({ ...form, height_in: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">Education</label>
              <select
                className={selectCls}
                value={form.education}
                onChange={(e) => setForm({ ...form, education: e.target.value })}
              >
                {educationOpts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {form.education === "Other" && (
                <Input
                  className="mt-2"
                  placeholder="Custom education"
                  value={form.education_other}
                  onChange={(e) => setForm({ ...form, education_other: e.target.value })}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">Occupation</label>
              <select
                className={selectCls}
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              >
                {occupationOpts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {form.occupation === "Other" && (
                <Input
                  className="mt-2"
                  placeholder="Custom occupation"
                  value={form.occupation_other}
                  onChange={(e) => setForm({ ...form, occupation_other: e.target.value })}
                />
              )}
            </div>

            <Input
              label="Native Village"
              value={form.native_village}
              onChange={(e) => setForm({ ...form, native_village: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-matang-navy mb-1">Looking for</label>
              <select
                className={selectCls}
                value={form.looking_for}
                onChange={(e) => setForm({ ...form, looking_for: e.target.value })}
              >
                {lookingOpts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {form.looking_for === "Other" && (
                <Input
                  className="mt-2"
                  placeholder="Custom preference"
                  value={form.looking_other}
                  onChange={(e) => setForm({ ...form, looking_other: e.target.value })}
                />
              )}
            </div>

            <label className="block text-sm font-medium text-matang-navy">About</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm min-h-[80px]"
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
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
            <Button variant="outline" className="w-full text-xs" onClick={deactivate}>
              Deactivate my profile
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading...</p>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No profiles yet. Create yours to start.
          </CardContent>
        </Card>
      ) : (
        profiles.map((p) => (
          <Card key={p.id || p.user_id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-matang-navy/10 flex items-center justify-center">
                  <User size={22} className="text-matang-navy" />
                </div>
                <div className="min-w-0">
                  {p.user_name && p.user_id ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/member/${p.user_id}`)}
                      className="font-semibold text-matang-navy hover:underline text-left"
                    >
                      {p.user_name}
                      {p.user_id === user?.id ? " (You)" : ""}
                    </button>
                  ) : (
                    <p className="font-semibold text-matang-navy">Member</p>
                  )}
                  <p className="text-xs text-gray-500 capitalize">
                    {p.gender}
                    {p.age ? `, ${p.age} yrs` : ""}
                    {[p.education, p.occupation].filter(Boolean).length
                      ? " · " + [p.education, p.occupation].filter(Boolean).join(" · ")
                      : ""}
                  </p>
                </div>
              </div>
              {p.height_cm && <p className="text-sm text-gray-600">Height: {p.height_cm} cm</p>}
              {p.native_village && (
                <p className="text-sm text-gray-600">Village: {p.native_village}</p>
              )}
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

"use client";
import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/Toaster";
import { Plus, Trash2, ChevronRight, ChevronLeft, Users, Camera } from "lucide-react";

const RELATIONS = ["Self","Spouse","Son","Daughter","Father","Mother","Brother","Sister","Grandfather","Grandmother","Uncle","Aunt","Nephew","Niece","Other"].map(r=>({value:r,label:r}));
const GENDERS = ["Male","Female","Other"].map(g=>({value:g,label:g}));
const EDUCATION = ["No formal education","Primary (1-5)","Middle (6-8)","High School (9-10)","Higher Secondary (11-12)","Diploma","Graduate","Post Graduate","Professional (Eng/Med/Law)","Other"].map(e=>({value:e,label:e}));
const OCCUPATIONS = ["Student","Farmer","Labourer","Private Job","Government Job","Business","Self Employed","Homemaker","Unemployed","Retired","Other"].map(o=>({value:o,label:o}));
const BLOOD = ["Unknown","A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b=>({value:b,label:b}));
const MARITAL = ["Single","Married","Widowed","Divorced","Separated"].map(m=>({value:m,label:m}));
const EMPLOYMENT = [{value:"employed",label:"Employed"},{value:"unemployed",label:"Unemployed"},{value:"self_employed",label:"Self Employed"},{value:"student",label:"Student"},{value:"retired",label:"Retired"}];
const NEEDS_OPTS = ["Education support","Job / Employment","Medical help","Housing","Financial aid","Skill training","Elderly care","Disability support"];

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

interface Member {
  name: string; relation: string; dob: string; gender: string;
  education_level: string; occupation: string; blood_group: string;
  marital_status: string; phone: string; is_unemployed: boolean; needs_care: boolean; disability: string;
  photo?: string;
}

const emptyMember = (): Member => ({
  name: "", relation: "Son", dob: "", gender: "Male", education_level: "High School (9-10)",
  occupation: "Student", blood_group: "Unknown", marital_status: "Single", phone: "",
  is_unemployed: false, needs_care: false, disability: "",
});

export default function CensusPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const memberPhotoRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [familyPhoto, setFamilyPhoto] = useState("");
  const [family, setFamily] = useState({
    native_village: "", address: "", education_summary: "",
    employment_status: "employed", needs: [] as string[], contact_phone: "",
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [cur, setCur] = useState<Member>(emptyMember());
  const curAge = useMemo(() => calcAge(cur.dob), [cur.dob]);

  const toggleNeed = (n: string) => {
    setFamily((f) => ({
      ...f,
      needs: f.needs.includes(n) ? f.needs.filter((x) => x !== n) : [...f.needs, n],
    }));
  };

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const max = 800;
          let w = img.width, h = img.height;
          if (w > max || h > max) {
            if (w > h) { h = Math.round((h * max) / w); w = max; }
            else { w = Math.round((w * max) / h); h = max; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onFamilyPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast("Max 5MB image", "error"); return; }
    try { setFamilyPhoto(await compressImage(f)); } catch { toast("Could not read image", "error"); }
  };

  const onMemberPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setCur((c) => ({ ...c, photo: await compressImage(f) })); } catch { toast("Could not read image", "error"); }
  };

  const save = async () => {
    if (!family.contact_phone || family.contact_phone.replace(/\D/g, "").length < 10) {
      toast("Valid contact phone is mandatory", "error"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/census", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: { ...family, photo: familyPhoto },
          members: members.map((m) => ({ ...m, age: calcAge(m.dob) })),
        }),
      });
      const result = await res.json();
      if (!res.ok) { toast(result.error || t("common.error"), "error"); return; }
      toast(t("census.success") || "Family registered!", "success");
      router.push("/dashboard");
    } catch { toast(t("common.error"), "error"); }
    finally { setLoading(false); }
  };

  const addMember = () => {
    if (!cur.name || !cur.relation) { toast("Name and relation required", "error"); return; }
    if (!cur.dob) { toast("Date of birth required", "error"); return; }
    if (!cur.phone || cur.phone.replace(/\D/g, "").length < 10) {
      toast("Member phone is mandatory (10 digits)", "error"); return;
    }
    setMembers([...members, cur]);
    setCur(emptyMember());
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">{[1, 2, 3].map((s) => (
        <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? "bg-matang-gold" : "bg-gray-200"}`} />
      ))}</div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Family / Household</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-2xl border-2 border-dashed border-matang-gold/50 bg-matang-gold/5 flex flex-col items-center justify-center overflow-hidden">
                {familyPhoto ? <img src={familyPhoto} alt="Family" className="w-full h-full object-cover" /> : (
                  <><Camera size={24} className="text-matang-gold" /><span className="text-[10px] text-gray-500 mt-1">Family Photo</span></>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFamilyPhoto} />
            </div>
            <Input label="Native Village *" value={family.native_village} onChange={(e) => setFamily({ ...family, native_village: e.target.value })} required />
            <Input label="Current Address *" value={family.address} onChange={(e) => setFamily({ ...family, address: e.target.value })} required />
            <Input label="Contact Phone *" type="tel" placeholder="10-digit mobile" value={family.contact_phone}
              onChange={(e) => setFamily({ ...family, contact_phone: e.target.value })} required />
            <Select label="Head Employment Status" value={family.employment_status} onChange={(e) => setFamily({ ...family, employment_status: e.target.value })} options={EMPLOYMENT} />
            <Select label="Highest Education in Family" value={family.education_summary} onChange={(e) => setFamily({ ...family, education_summary: e.target.value })}
              options={[{ value: "", label: "Select..." }, ...EDUCATION]} />
            <div>
              <p className="text-sm font-medium text-matang-navy mb-2">Family Needs (select all)</p>
              <div className="flex flex-wrap gap-2">
                {NEEDS_OPTS.map((n) => (
                  <button key={n} type="button" onClick={() => toggleNeed(n)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${family.needs.includes(n) ? "bg-matang-gold text-matang-navy border-matang-gold" : "bg-white text-gray-600 border-gray-200"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => {
              if (!family.native_village || !family.address) { toast("Village & address required", "error"); return; }
              if (!family.contact_phone || family.contact_phone.replace(/\D/g, "").length < 10) {
                toast("Contact phone is mandatory", "error"); return;
              }
              setStep(2);
            }}>Next <ChevronRight size={18} /></Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Members ({members.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {members.map((m, i) => (
              <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {m.photo && <img src={m.photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.relation} · {calcAge(m.dob) ?? "?"}y · {m.blood_group}</p>
                  </div>
                </div>
                <button onClick={() => setMembers(members.filter((_, j) => j !== i))} className="text-red-500 p-1"><Trash2 size={16} /></button>
              </div>
            ))}
            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-center">
                <button type="button" onClick={() => memberPhotoRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden bg-gray-50">
                  {cur.photo ? <img src={cur.photo} alt="" className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-400" />}
                </button>
                <input ref={memberPhotoRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onMemberPhoto} />
              </div>
              <Input label="Full Name *" value={cur.name} onChange={(e) => setCur({ ...cur, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Relation *" value={cur.relation} onChange={(e) => setCur({ ...cur, relation: e.target.value })} options={RELATIONS} />
                <Select label="Gender" value={cur.gender} onChange={(e) => setCur({ ...cur, gender: e.target.value })} options={GENDERS} />
              </div>
              <div>
                <label className="block text-sm font-medium text-matang-navy mb-1">Date of Birth *</label>
                <div className="flex gap-2 items-center">
                  <input type="date" value={cur.dob} max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setCur({ ...cur, dob: e.target.value })}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:border-matang-gold focus:outline-none bg-white text-sm" required />
                  <span className="text-sm font-semibold text-matang-navy bg-matang-gold/20 px-3 py-2.5 rounded-xl whitespace-nowrap min-w-[4.5rem] text-center">
                    {curAge != null ? `${curAge} yrs` : "Age"}
                  </span>
                </div>
              </div>
              <Select label="Blood Group" value={cur.blood_group} onChange={(e) => setCur({ ...cur, blood_group: e.target.value })} options={BLOOD} />
              <Select label="Education" value={cur.education_level} onChange={(e) => setCur({ ...cur, education_level: e.target.value })} options={EDUCATION} />
              <Select label="Occupation" value={cur.occupation} onChange={(e) => setCur({ ...cur, occupation: e.target.value })} options={OCCUPATIONS} />
              <Select label="Marital Status" value={cur.marital_status} onChange={(e) => setCur({ ...cur, marital_status: e.target.value })} options={MARITAL} />
              <Input label="Phone *" type="tel" placeholder="10-digit mobile" value={cur.phone} onChange={(e) => setCur({ ...cur, phone: e.target.value })} required />
              <Input label="Disability (if any)" placeholder="None / specify" value={cur.disability} onChange={(e) => setCur({ ...cur, disability: e.target.value })} />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cur.is_unemployed} onChange={(e) => setCur({ ...cur, is_unemployed: e.target.checked })} /> Unemployed</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cur.needs_care} onChange={(e) => setCur({ ...cur, needs_care: e.target.checked })} /> Needs Care</label>
              </div>
              <Button variant="outline" className="w-full" onClick={addMember}><Plus size={16} /> Add Member</Button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}><ChevronLeft size={18} /> Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Next <ChevronRight size={18} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Review & Submit</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {familyPhoto && <img src={familyPhoto} alt="Family" className="w-full h-32 object-cover rounded-xl" />}
            <div className="bg-gray-50 p-3 rounded-xl text-sm space-y-1">
              <p><strong>Village:</strong> {family.native_village}</p>
              <p><strong>Address:</strong> {family.address}</p>
              <p><strong>Contact:</strong> {family.contact_phone}</p>
              <p><strong>Employment:</strong> {family.employment_status}</p>
              {family.needs.length > 0 && <p><strong>Needs:</strong> {family.needs.join(", ")}</p>}
              <p className="pt-2"><strong>Members ({members.length}):</strong></p>
              {members.map((m, i) => (
                <p key={i} className="text-gray-600">• {m.name} — {m.relation}, {calcAge(m.dob)}y, {m.phone}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}><ChevronLeft size={18} /> Back</Button>
              <Button className="flex-1" isLoading={loading} onClick={save}><Users size={18} /> Save Family</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

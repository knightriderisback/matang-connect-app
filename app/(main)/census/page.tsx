"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/Toaster";
import { Plus, Trash2, ChevronRight, ChevronLeft, Users } from "lucide-react";

interface Member {
  name: string; relation: string; age: string; education_level: string;
  occupation: string; is_unemployed: boolean; needs_care: boolean;
}

export default function CensusPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [family, setFamily] = useState({
    native_village: "", address: "", education_summary: "",
    employment_status: "employed", needs: [] as string[],
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [cur, setCur] = useState<Member>({
    name: "", relation: "", age: "", education_level: "", occupation: "",
    is_unemployed: false, needs_care: false,
  });

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/census", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family, members }),
      });
      const result = await res.json();
      if (!res.ok) { toast(result.error || t("common.error"), "error"); return; }
      toast(t("census.success") || "Family saved!", "success");
      router.push("/dashboard");
    } catch { toast(t("common.error"), "error"); }
    finally { setLoading(false); }
  };

  const addMember = () => {
    if (!cur.name || !cur.relation) { toast("Name and relation required", "error"); return; }
    setMembers([...members, cur]);
    setCur({ name: "", relation: "", age: "", education_level: "", occupation: "", is_unemployed: false, needs_care: false });
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-matang-navy">{t("census.title")}</h1>
      <div className="flex gap-2">{[1,2,3].map(s => (
        <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? "bg-matang-gold" : "bg-gray-200"}`} />
      ))}</div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>{t("census.familyDetails") || "Family Details"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input label={t("auth.nativeVillage")} value={family.native_village}
              onChange={(e) => setFamily({ ...family, native_village: e.target.value })} required />
            <Input label={t("census.address") || "Address"} value={family.address}
              onChange={(e) => setFamily({ ...family, address: e.target.value })} required />
            <Select label={t("census.employment") || "Employment"} value={family.employment_status}
              onChange={(e) => setFamily({ ...family, employment_status: e.target.value })}
              options={[
                { value: "employed", label: "Employed" },
                { value: "unemployed", label: "Unemployed" },
                { value: "self_employed", label: "Self Employed" },
                { value: "student", label: "Student" },
              ]} />
            <Input label={t("census.education") || "Education"} value={family.education_summary}
              onChange={(e) => setFamily({ ...family, education_summary: e.target.value })} />
            <Button className="w-full" onClick={() => {
              if (!family.native_village || !family.address) { toast("Village & address required", "error"); return; }
              setStep(2);
            }}>Next <ChevronRight size={18} /></Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>{t("census.addMember") || "Members"} ({members.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {members.map((m, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">{m.name} ({m.relation})</span>
                <button onClick={() => setMembers(members.filter((_, j) => j !== i))} className="text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
            <Input label="Name" value={cur.name} onChange={(e) => setCur({ ...cur, name: e.target.value })} />
            <Input label="Relation" placeholder="Son / Wife / Father..." value={cur.relation} onChange={(e) => setCur({ ...cur, relation: e.target.value })} />
            <Input label="Age" type="number" value={cur.age} onChange={(e) => setCur({ ...cur, age: e.target.value })} />
            <Input label="Education" value={cur.education_level} onChange={(e) => setCur({ ...cur, education_level: e.target.value })} />
            <Input label="Occupation" value={cur.occupation} onChange={(e) => setCur({ ...cur, occupation: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cur.is_unemployed} onChange={(e) => setCur({ ...cur, is_unemployed: e.target.checked })} /> Unemployed</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cur.needs_care} onChange={(e) => setCur({ ...cur, needs_care: e.target.checked })} /> Needs Care / Elderly</label>
            <Button variant="outline" className="w-full" onClick={addMember}><Plus size={16} /> Add Member</Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}><ChevronLeft size={18} /> Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Next <ChevronRight size={18} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Review & Save</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-xl text-sm space-y-1">
              <p><strong>Village:</strong> {family.native_village}</p>
              <p><strong>Address:</strong> {family.address}</p>
              <p><strong>Employment:</strong> {family.employment_status}</p>
              <p><strong>Members:</strong> {members.length}</p>
              {members.map((m, i) => <p key={i} className="text-gray-500">• {m.name} ({m.relation}, {m.age}y)</p>)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}><ChevronLeft size={18} /> Back</Button>
              <Button className="flex-1" isLoading={loading} onClick={save}>
                <Users size={18} /> {t("census.saveFamily") || "Save Family"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

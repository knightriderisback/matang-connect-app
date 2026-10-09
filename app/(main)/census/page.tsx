"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import FieldRenderer from "@/components/parivar/FieldRenderer";
import {
  Answers,
  FormField,
  FormSection,
  activeFields,
  calcAge,
  displayValue,
  isConditionMet,
  isEmptyValue,
  missingRequired,
  pickLabel,
} from "@/lib/parivar/form";
import { Plus, Trash2, ChevronRight, ChevronLeft, Users, Camera, ChevronDown, UserSearch } from "lucide-react";

interface MemberEntry {
  answers: Answers;
  photo?: string;
}

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

/** dob jaise source field badalne par auto_from wale fields (age) apne aap bharo */
function withAutoFrom(fields: FormField[], answers: Answers, key: string, value: any): Answers {
  const next: Answers = { ...answers, [key]: value };
  for (const f of fields) {
    if (f.config?.auto_from === key) {
      const age = typeof value === "string" ? calcAge(value) : null;
      if (age !== null) next[f.field_key] = String(age);
    }
  }
  return next;
}

function ParivarFormInner() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useCurrentUser();
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const [sections, setSections] = useState<FormSection[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [famAnswers, setFamAnswers] = useState<Answers>({});
  const [famPhoto, setFamPhoto] = useState("");
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [cur, setCur] = useState<MemberEntry>({ answers: {} });
  const [openSec, setOpenSec] = useState(0);

  const [draftLoaded, setDraftLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const submittedRef = useRef(false);

  const [assisted, setAssisted] = useState(false);
  const [forPhone, setForPhone] = useState("");
  const [forName, setForName] = useState("");

  const famFileRef = useRef<HTMLInputElement>(null);
  const memFileRef = useRef<HTMLInputElement>(null);

  const loadConfig = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/parivar/config", { cache: "no-store" });
      if (!res.ok) throw new Error("config");
      const d = await res.json();
      setSections(d.sections || []);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Draft restore
  const draftStep = useRef(0);
  useEffect(() => {
    fetch("/api/parivar/draft", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const dd = d?.draft?.data;
        if (dd && (Object.keys(dd.family || {}).length > 0 || (dd.members || []).length > 0)) {
          setFamAnswers(dd.family || {});
          setMembers((dd.members || []).map((a: Answers) => ({ answers: a })));
          draftStep.current = d.draft.current_step || 0;
          setStep(draftStep.current);
          setRestored(true);
        }
      })
      .catch(() => {})
      .finally(() => setDraftLoaded(true));
  }, []);

  const famSections = useMemo(
    () => (sections || []).filter((s) => s.scope === "family" && activeFields(s).length > 0),
    [sections]
  );
  const memSections = useMemo(
    () => (sections || []).filter((s) => s.scope === "member" && activeFields(s).length > 0),
    [sections]
  );
  const famFields = useMemo(() => famSections.flatMap(activeFields), [famSections]);
  const memFields = useMemo(() => memSections.flatMap(activeFields), [memSections]);

  const totalSteps = famSections.length + 2; // + members + review
  const safeStep = Math.min(step, Math.max(totalSteps - 1, 0));
  const isMembersStep = safeStep === famSections.length;
  const isReviewStep = safeStep === famSections.length + 1;
  const curFamSection = safeStep < famSections.length ? famSections[safeStep] : null;

  // Autosave draft (photos draft me nahi jaati)
  useEffect(() => {
    if (!draftLoaded || submittedRef.current || !sections) return;
    const hasData = Object.keys(famAnswers).length > 0 || members.length > 0;
    if (!hasData) return;
    const h = setTimeout(() => {
      fetch("/api/parivar/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { family: famAnswers, members: members.map((m) => m.answers) },
          step: safeStep,
        }),
      })
        .then((r) => { if (r.ok) setSavedAt(Date.now()); })
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(h);
  }, [famAnswers, members, safeStep, draftLoaded, sections]);

  const goStep = (n: number) => {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearDraft = async () => {
    await fetch("/api/parivar/draft", { method: "DELETE" }).catch(() => {});
    setFamAnswers({}); setMembers([]); setCur({ answers: {} }); setFamPhoto("");
    setRestored(false); setStep(0);
  };

  const missingNames = (list: FormField[]) => list.map((f) => pickLabel(f.label, lang)).join(", ");

  const nextFamily = () => {
    if (!curFamSection) return;
    const miss = missingRequired(activeFields(curFamSection), famAnswers);
    if (miss.length > 0) { toast(`Required: ${missingNames(miss)}`, "error"); return; }
    goStep(safeStep + 1);
  };

  const sectionHasRequired = (s: FormSection) => activeFields(s).some((f) => f.is_required);

  const validateMember = (m: MemberEntry): string | null => {
    const miss = missingRequired(memFields, m.answers);
    if (miss.length > 0) return `Required: ${missingNames(miss)}`;
    const hasAgeField = memFields.some((f) => f.system_column === "age");
    const hasDobField = memFields.some((f) => f.system_column === "dob");
    if ((hasAgeField || hasDobField) && !m.answers.dob && !m.answers.age) return "Age or date of birth is required";
    return null;
  };

  const addMember = (): boolean => {
    const err = validateMember(cur);
    if (err) { toast(err, "error"); return false; }
    setMembers((prev) => [...prev, cur]);
    setCur({ answers: {} });
    setOpenSec(0);
    return true;
  };

  const nextFromMembers = () => {
    const hasStarted = Object.keys(cur.answers).some((k) => !isEmptyValue(cur.answers[k]));
    if (hasStarted) {
      if (!addMember()) return;
    } else if (members.length === 0) {
      toast("Please add at least one family member", "error");
      return;
    }
    goStep(safeStep + 1);
  };

  const setCurAnswer = (key: string, value: any) =>
    setCur((c) => ({ ...c, answers: withAutoFrom(memFields, c.answers, key, value) }));
  const setFamAnswer = (key: string, value: any) =>
    setFamAnswers((a) => withAutoFrom(famFields, a, key, value));

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>, target: "family" | "member") => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast("Max 5MB image", "error"); return; }
    try {
      const data = await compressImage(f);
      if (target === "family") setFamPhoto(data);
      else setCur((c) => ({ ...c, photo: data }));
    } catch { toast("Could not read image", "error"); }
  };

  const lookupMember = async () => {
    try {
      const res = await fetch(`/api/parivar/lookup?phone=${encodeURIComponent(forPhone)}`);
      const d = await res.json();
      if (!res.ok) { setForName(""); toast(d.error || "Not found", "error"); return; }
      setForName(d.user.full_name);
    } catch { toast(t("common.error"), "error"); }
  };

  const submit = async () => {
    if (assisted && !forName) { toast("Find the member by phone first", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/census", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family: { answers: famAnswers, photo: famPhoto },
          members: members.map((m) => ({ answers: m.answers, photo: m.photo })),
          forPhone: assisted ? forPhone : undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) { toast(result.error || t("common.error"), "error"); return; }
      submittedRef.current = true;
      toast(t("census.success"), "success");
      router.push("/dashboard");
    } catch { toast(t("common.error"), "error"); }
    finally { setLoading(false); }
  };

  // Rough completion preview
  const completion = useMemo(() => {
    const famCount = famFields.filter((f) => !f.conditional);
    const memCount = memFields.filter((f) => !f.conditional);
    const total = famCount.length + memCount.length * Math.max(members.length, 1);
    if (total === 0) return 0;
    let done = famCount.filter((f) => !isEmptyValue(famAnswers[f.field_key])).length;
    const list = members.length ? members : [cur];
    for (const m of list) done += memCount.filter((f) => !isEmptyValue(m.answers[f.field_key])).length;
    return Math.min(100, Math.round((done * 100) / total));
  }, [famFields, memFields, famAnswers, members, cur]);

  if (loadError) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-gray-600">{t("common.error")}</p>
        <Button onClick={loadConfig}>{t("common.retry")}</Button>
      </div>
    );
  }
  if (!sections) return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
  if (famSections.length === 0 && memSections.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-500">{t("common.noData")}</div>;
  }

  const renderFields = (list: FormField[], answers: Answers, setter: (k: string, v: any) => void) => (
    <div className="space-y-4">
      {list.filter((f) => isConditionMet(f.conditional, answers)).map((f) => (
        <FieldRenderer
          key={f.id}
          field={f}
          lang={lang}
          value={answers[f.field_key]}
          disabled={!!f.config?.auto_from && !!answers[f.config.auto_from]}
          onChange={(v) => setter(f.field_key, v)}
        />
      ))}
    </div>
  );

  const stepTitle = curFamSection
    ? pickLabel(curFamSection.title, lang)
    : isMembersStep ? `${t("census.addMember")} (${members.length})` : t("common.done");

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Step {safeStep + 1}/{totalSteps}</span>
          <span>{t("census.title")}: {completion}%</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${safeStep >= s ? "bg-matang-gold" : "bg-gray-200"}`} />
          ))}
        </div>
        {savedAt > 0 && <p className="text-[10px] text-gray-400 mt-1 text-right">Draft saved ✓</p>}
      </div>

      {restored && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-matang-gold/10 border border-matang-gold/30 text-xs">
          <span className="text-matang-navy">Your saved draft was restored.</span>
          <button type="button" onClick={clearDraft} className="text-red-600 font-medium cursor-pointer">Start fresh</button>
        </div>
      )}

      {safeStep === 0 && isStaff && (
        <Card>
          <CardContent className="space-y-2 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium text-matang-navy">
              <input type="checkbox" checked={assisted} onChange={(e) => { setAssisted(e.target.checked); setForName(""); }} />
              Fill on behalf of another member (assisted entry)
            </label>
            {assisted && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="tel" inputMode="numeric" maxLength={10} placeholder="Member's 10-digit phone"
                    value={forPhone}
                    onChange={(e) => { setForPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setForName(""); }}
                    className="flex-1 px-3 py-3 rounded-xl border border-gray-200 text-base focus:border-matang-gold focus:outline-none"
                  />
                  <Button variant="outline" onClick={lookupMember}><UserSearch size={16} /> Find</Button>
                </div>
                {forName && <p className="text-xs text-green-700">Filling for: <strong>{forName}</strong></p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {curFamSection && (
        <Card>
          <CardHeader><CardTitle>{stepTitle}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {safeStep === 0 && (
              <div className="flex flex-col items-center gap-2">
                <button type="button" onClick={() => famFileRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-matang-gold/50 bg-matang-gold/5 flex flex-col items-center justify-center overflow-hidden cursor-pointer">
                  {famPhoto ? <img src={famPhoto} alt="Family" className="w-full h-full object-cover" /> : (
                    <><Camera size={24} className="text-matang-gold" /><span className="text-[10px] text-gray-500 mt-1">Family Photo</span></>
                  )}
                </button>
                <input ref={famFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e, "family")} />
              </div>
            )}
            {renderFields(activeFields(curFamSection), famAnswers, setFamAnswer)}
            <div className="flex gap-2 pt-2">
              {safeStep > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => goStep(safeStep - 1)}><ChevronLeft size={18} /> {t("common.back")}</Button>
              )}
              {!sectionHasRequired(curFamSection) && (
                <Button variant="outline" className="flex-1" onClick={() => goStep(safeStep + 1)}>{t("common.skip")}</Button>
              )}
              <Button className="flex-1" onClick={nextFamily}>{t("common.next")} <ChevronRight size={18} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isMembersStep && (
        <Card>
          <CardHeader><CardTitle>{stepTitle}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {members.map((m, i) => (
              <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {m.photo && <img src={m.photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />}
                  <div className="min-w-0" data-no-translate>
                    <p className="text-sm font-medium truncate">{String(m.answers.name || "—")}</p>
                    <p className="text-xs text-gray-500">
                      {String(m.answers.relation || "")} · {m.answers.age ?? calcAge(m.answers.dob) ?? "?"}y
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setMembers(members.filter((_, j) => j !== i))} className="text-red-500 p-1 cursor-pointer"><Trash2 size={16} /></button>
              </div>
            ))}

            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-center">
                <button type="button" onClick={() => memFileRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer">
                  {cur.photo ? <img src={cur.photo} alt="" className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-400" />}
                </button>
                <input ref={memFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e, "member")} />
              </div>

              {memSections.map((s, idx) => (
                <div key={s.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button type="button" onClick={() => setOpenSec(openSec === idx ? -1 : idx)}
                    className="w-full flex items-center justify-between px-3 py-3 bg-gray-50 text-sm font-semibold text-matang-navy cursor-pointer">
                    <span data-no-translate>{pickLabel(s.title, lang)}</span>
                    <ChevronDown size={16} className={openSec === idx ? "rotate-180" : ""} />
                  </button>
                  {openSec === idx && (
                    <div className="p-3">{renderFields(activeFields(s), cur.answers, setCurAnswer)}</div>
                  )}
                </div>
              ))}

              <Button variant="outline" className="w-full" onClick={addMember}><Plus size={16} /> {t("census.addMember")}</Button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => goStep(safeStep - 1)}><ChevronLeft size={18} /> {t("common.back")}</Button>
              <Button className="flex-1" onClick={nextFromMembers}>{t("common.next")} <ChevronRight size={18} /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isReviewStep && (
        <Card>
          <CardHeader><CardTitle>{t("common.confirm")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {famPhoto && <img src={famPhoto} alt="Family" className="w-full h-32 object-cover rounded-xl" />}
            {assisted && forName && <p className="text-xs text-matang-navy">Filling for: <strong>{forName}</strong></p>}
            <div className="bg-gray-50 p-3 rounded-xl text-sm space-y-1" data-no-translate>
              {famFields.filter((f) => isConditionMet(f.conditional, famAnswers)).map((f) => {
                const v = displayValue(f, famAnswers[f.field_key], lang);
                if (!v) return null;
                return <p key={f.id}><strong>{pickLabel(f.label, lang)}:</strong> {v}</p>;
              })}
              <p className="pt-2"><strong>{t("census.addMember")} ({members.length}):</strong></p>
              {members.map((m, i) => (
                <p key={i} className="text-gray-600">
                  • {String(m.answers.name || "—")}
                  {m.answers.relation ? ` — ${m.answers.relation}` : ""}
                  {(m.answers.age ?? calcAge(m.answers.dob)) != null ? `, ${m.answers.age ?? calcAge(m.answers.dob)}y` : ""}
                </p>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => goStep(safeStep - 1)}><ChevronLeft size={18} /> {t("common.back")}</Button>
              <Button className="flex-1" isLoading={loading} onClick={submit}><Users size={18} /> {t("census.saveFamily")}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ParivarFormPage() {
  return (
    <FeatureGate moduleKey="census">
      <ParivarFormInner />
    </FeatureGate>
  );
}

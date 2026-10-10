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
  LabelMap,
  activeFields,
  calcAge,
  displayValue,
  isConditionMet,
  isEmptyValue,
  missingRequired,
  pickLabel,
} from "@/lib/parivar/form";
import { Plus, Trash2, ChevronRight, ChevronLeft, Users, Camera, ChevronDown, UserSearch, Pencil, Lightbulb } from "lucide-react";

interface MemberEntry {
  id?: string;
  answers: Answers;
  photo?: string; // naya photo (data URL)
  photoUrl?: string | null; // pehle se saved photo
}

interface FamilySummary {
  id: string;
  completion_percent: number;
  answers: Answers;
  photo_url: string | null;
  members: { id: string; answers: Answers; photo_url: string | null }[];
  suggestions: { code: string; title: LabelMap; why: LabelMap }[];
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

type Mode = "checking" | "landing" | "form";

function ParivarFormInner() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useCurrentUser();
  const isStaff = ["volunteer", "core_committee", "super_admin"].includes(user?.role || "");

  const [sections, setSections] = useState<FormSection[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mode, setMode] = useState<Mode>("checking");
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openedViaLink, setOpenedViaLink] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [famAnswers, setFamAnswers] = useState<Answers>({});
  const [famPhoto, setFamPhoto] = useState("");
  const [famPhotoUrl, setFamPhotoUrl] = useState<string | null>(null);
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

  const resetForm = () => {
    setFamAnswers({}); setFamPhoto(""); setFamPhotoUrl(null); setMembers([]); setCur({ answers: {} });
    setStep(0); setOpenSec(0); setRestored(false); setAssisted(false); setForPhone(""); setForName("");
  };

  const startNew = useCallback(async () => {
    resetForm();
    setEditingId(null);
    setDraftLoaded(false);
    setMode("form");
    try {
      const r = await fetch("/api/parivar/draft", { cache: "no-store" });
      const d = r.ok ? await r.json() : null;
      const dd = d?.draft?.data;
      if (dd && (Object.keys(dd.family || {}).length > 0 || (dd.members || []).length > 0)) {
        setFamAnswers(dd.family || {});
        setMembers((dd.members || []).map((a: Answers) => ({ answers: a })));
        setStep(d.draft.current_step || 0);
        setRestored(true);
      }
    } catch { /* ignore */ }
    setDraftLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForEdit = useCallback(async (id: string, viaLink = false) => {
    try {
      const res = await fetch(`/api/census?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) { toast(d.error || t("common.error"), "error"); setMode("landing"); return; }
      const f = d.family as FamilySummary;
      resetForm();
      setEditingId(f.id);
      setOpenedViaLink(viaLink);
      setFamAnswers(f.answers || {});
      setFamPhotoUrl(f.photo_url);
      setMembers(f.members.map((m) => ({ id: m.id, answers: m.answers, photoUrl: m.photo_url })));
      setDraftLoaded(true);
      setMode("form");
    } catch { toast(t("common.error"), "error"); setMode("landing"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pehli load: ?family=ID (staff edit) ya meri families dekho
  useEffect(() => {
    (async () => {
      const familyParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("family") : null;
      if (familyParam) { await openForEdit(familyParam, true); return; }
      try {
        const res = await fetch("/api/census?mine=1", { cache: "no-store" });
        const d = res.ok ? await res.json() : { families: [] };
        const list: FamilySummary[] = d.families || [];
        setFamilies(list);
        if (list.length > 0) setMode("landing");
        else await startNew();
      } catch {
        await startNew();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Autosave draft: sirf naye form me (edit me nahi), photos draft me nahi jaati
  useEffect(() => {
    if (mode !== "form" || editingId || !draftLoaded || submittedRef.current || !sections) return;
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
  }, [famAnswers, members, safeStep, draftLoaded, sections, mode, editingId]);

  const goStep = (n: number) => {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearDraft = async () => {
    await fetch("/api/parivar/draft", { method: "DELETE" }).catch(() => {});
    resetForm();
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

  const editMember = (i: number) => {
    if (!isEmptyValue(cur.answers.name) && !addMember()) return;
    setCur(members[i]);
    setMembers((prev) => prev.filter((_, j) => j !== i));
    setOpenSec(0);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeMember = (i: number) => {
    const m = members[i];
    if (editingId && m.id && !window.confirm("Remove this member from the family?")) return;
    setMembers((prev) => prev.filter((_, j) => j !== i));
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

  const backToLanding = async () => {
    if (openedViaLink) { router.back(); return; }
    try {
      const res = await fetch("/api/census?mine=1", { cache: "no-store" });
      const d = res.ok ? await res.json() : { families: [] };
      setFamilies(d.families || []);
    } catch { /* ignore */ }
    resetForm();
    setEditingId(null);
    setMode("landing");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const submit = async () => {
    if (!editingId && assisted && !forName) { toast("Find the member by phone first", "error"); return; }
    setLoading(true);
    try {
      const payload = {
        family: { answers: famAnswers, photo: famPhoto || undefined },
        members: members.map((m) => ({ id: m.id, answers: m.answers, photo: m.photo })),
      };
      const res = await fetch("/api/census", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? { ...payload, familyId: editingId }
            : { ...payload, forPhone: assisted ? forPhone : undefined }
        ),
      });
      const result = await res.json();
      if (!res.ok) { toast(result.error || t("common.error"), "error"); return; }
      toast(result.warning || t("census.success"), result.warning ? "error" : "success");
      if (editingId) { await backToLanding(); return; }
      submittedRef.current = true;
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
  if (!sections || mode === "checking") return <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>;
  if (famSections.length === 0 && memSections.length === 0) {
    return <div className="p-8 text-center text-sm text-gray-500">{t("common.noData")}</div>;
  }

  /* ---------- Landing: pehle se bhari families ---------- */
  if (mode === "landing") {
    const allSuggestions = families.flatMap((f) => f.suggestions);
    const uniqueSuggestions = allSuggestions.filter((s, i) => allSuggestions.findIndex((x) => x.code === s.code) === i);
    return (
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-lg font-bold text-matang-navy">{t("census.title")}</h1>
        {families.map((f, idx) => (
          <Card key={f.id}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                {f.photo_url ? (
                  <img src={f.photo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-matang-gold/10 flex items-center justify-center"><Users size={22} className="text-matang-gold" /></div>
                )}
                <div className="min-w-0 flex-1" data-no-translate>
                  <p className="text-sm font-bold text-matang-navy truncate">
                    {String(f.answers.native_village || "—")}{families.length > 1 ? ` #${idx + 1}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">{f.members.length} members</p>
                  <div className="h-1.5 rounded-full bg-gray-100 mt-1.5">
                    <div className="h-1.5 rounded-full bg-matang-gold" style={{ width: `${f.completion_percent}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{f.completion_percent}% complete</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-gray-600" data-no-translate>
                {f.members.map((m) => (
                  <span key={m.id} className="px-2 py-1 rounded-full bg-gray-100">{String(m.answers.name || "—")}</span>
                ))}
              </div>
              <Button className="w-full" onClick={() => openForEdit(f.id)}><Pencil size={16} /> Edit</Button>
            </CardContent>
          </Card>
        ))}

        {uniqueSuggestions.length > 0 && (
          <Card>
            <CardHeader><CardTitle><Lightbulb size={16} className="inline text-matang-gold mr-1" />Schemes that may help your family</CardTitle></CardHeader>
            <CardContent className="space-y-2" data-no-translate>
              {uniqueSuggestions.map((s) => (
                <div key={s.code} className="p-2.5 rounded-xl bg-matang-gold/10">
                  <p className="text-sm font-semibold text-matang-navy">{pickLabel(s.title, lang)}</p>
                  <p className="text-xs text-gray-600">{pickLabel(s.why, lang)}</p>
                </div>
              ))}
              <p className="text-[11px] text-gray-500">
                {lang === "hi" || lang === "mr" || lang === "cg"
                  ? "यह सिर्फ़ सुझाव है। पात्रता सरकारी नियमों पर निर्भर है, पक्का करने के लिए अपने वॉलंटियर से पूछें।"
                  : "These are suggestions only. Eligibility depends on government rules; please confirm with your volunteer."}
              </p>
            </CardContent>
          </Card>
        )}

        <Button variant="outline" className="w-full" onClick={startNew}><Plus size={16} /> {isStaff ? "Fill a new form (also for another member)" : "Add another family form"}</Button>
      </div>
    );
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
  const famPhotoShown = famPhoto || famPhotoUrl || "";

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>{editingId ? "Edit · " : ""}Step {safeStep + 1}/{totalSteps}</span>
          <span>{t("census.title")}: {completion}%</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${safeStep >= s ? "bg-matang-gold" : "bg-gray-200"}`} />
          ))}
        </div>
        {!editingId && savedAt > 0 && <p className="text-[10px] text-gray-400 mt-1 text-right">Draft saved ✓</p>}
      </div>

      {editingId && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
          <span className="text-blue-900">You are editing a saved Parivar Form.</span>
          <button type="button" onClick={backToLanding} className="text-blue-700 font-medium cursor-pointer">Cancel</button>
        </div>
      )}

      {restored && !editingId && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-matang-gold/10 border border-matang-gold/30 text-xs">
          <span className="text-matang-navy">Your saved draft was restored.</span>
          <button type="button" onClick={clearDraft} className="text-red-600 font-medium cursor-pointer">Start fresh</button>
        </div>
      )}

      {safeStep === 0 && isStaff && !editingId && (
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
                  {famPhotoShown ? <img src={famPhotoShown} alt="Family" className="w-full h-full object-cover" /> : (
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
            {members.map((m, i) => {
              const thumb = m.photo || m.photoUrl;
              return (
                <div key={m.id || i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {thumb && <img src={thumb} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />}
                    <div className="min-w-0" data-no-translate>
                      <p className="text-sm font-medium truncate">{String(m.answers.name || "—")}</p>
                      <p className="text-xs text-gray-500">
                        {String(m.answers.relation || "")} · {m.answers.age ?? calcAge(m.answers.dob) ?? "?"}y
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => editMember(i)} className="text-matang-navy p-1.5 cursor-pointer"><Pencil size={16} /></button>
                    <button type="button" onClick={() => removeMember(i)} className="text-red-500 p-1.5 cursor-pointer"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-3 space-y-3">
              {cur.id && <p className="text-xs text-blue-700">Editing: <strong data-no-translate>{String(cur.answers.name || "")}</strong></p>}
              <div className="flex justify-center">
                <button type="button" onClick={() => memFileRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer">
                  {(cur.photo || cur.photoUrl) ? <img src={cur.photo || cur.photoUrl || ""} alt="" className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-400" />}
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

              <Button variant="outline" className="w-full" onClick={addMember}>
                <Plus size={16} /> {cur.id ? "Update member" : t("census.addMember")}
              </Button>
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
            {famPhotoShown && <img src={famPhotoShown} alt="Family" className="w-full h-32 object-cover rounded-xl" />}
            {assisted && forName && !editingId && <p className="text-xs text-matang-navy">Filling for: <strong>{forName}</strong></p>}
            <div className="bg-gray-50 p-3 rounded-xl text-sm space-y-1" data-no-translate>
              {famFields.filter((f) => isConditionMet(f.conditional, famAnswers)).map((f) => {
                const v = displayValue(f, famAnswers[f.field_key], lang);
                if (!v) return null;
                return <p key={f.id}><strong>{pickLabel(f.label, lang)}:</strong> {v}</p>;
              })}
              <p className="pt-2"><strong>{t("census.addMember")} ({members.length}):</strong></p>
              {members.map((m, i) => (
                <p key={m.id || i} className="text-gray-600">
                  • {String(m.answers.name || "—")}
                  {m.answers.relation ? ` — ${m.answers.relation}` : ""}
                  {(m.answers.age ?? calcAge(m.answers.dob)) != null ? `, ${m.answers.age ?? calcAge(m.answers.dob)}y` : ""}
                </p>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => goStep(safeStep - 1)}><ChevronLeft size={18} /> {t("common.back")}</Button>
              <Button className="flex-1" isLoading={loading} onClick={submit}><Users size={18} /> {editingId ? "Save changes" : t("census.saveFamily")}</Button>
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

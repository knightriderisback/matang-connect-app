"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useToast } from "@/components/ui/Toaster";
import FieldRenderer from "@/components/parivar/FieldRenderer";
import {
  Answers, Condition, FieldType, FormField, FormOption, FormSection, LabelMap, Scope, VisibilityLevel,
  activeFields, isConditionMet, pickLabel,
} from "@/lib/parivar/form";
import {
  ArrowUp, ArrowDown, Eye, EyeOff, Archive, ArchiveRestore, Trash2, Pencil, Plus, X, Lock,
  ChevronDown, History, LayoutList, Smartphone,
} from "lucide-react";

/* ---------- helpers ---------- */
async function api(op: string, payload: Record<string, any>) {
  const res = await fetch("/api/admin/parivar-form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, ...payload }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Failed");
  return d.data;
}

const slugify = (s: string) => {
  let x = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
  if (x.length < 2) x = "item";
  if (!/^[a-z]/.test(x)) x = "f_" + x;
  return x;
};
const rand3 = () => Math.random().toString(36).slice(2, 5);

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "phone", label: "Phone (10 digit)" },
  { value: "dropdown", label: "Dropdown" },
  { value: "multi_select", label: "Multi-select" },
  { value: "yes_no", label: "Yes / No" },
  { value: "yes_no_number", label: "Hai / Nahi / Pata nahi + number" },
];

const VIS_LABEL: Record<VisibilityLevel, string> = {
  admin: "Only Admin",
  core: "Core Committee + Admin",
  all: "All members",
};

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-matang-gold focus:outline-none bg-white";
const iconBtn = "p-1.5 rounded-lg border border-gray-200 text-gray-600 bg-white cursor-pointer disabled:opacity-30";

function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "gold" | "red" | "green" | "blue" }) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600", gold: "bg-matang-gold/20 text-matang-navy",
    red: "bg-red-100 text-red-700", green: "bg-green-100 text-green-700", blue: "bg-blue-100 text-blue-700",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tones[tone]}`}>{children}</span>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div className="w-full max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-matang-navy">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 cursor-pointer"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LabelEditor({ title, value, onChange }: { title: string; value: LabelMap; onChange: (v: LabelMap) => void }) {
  const [more, setMore] = useState(false);
  const row = (k: string, name: string) => (
    <input key={k} className={inputCls} placeholder={name} value={value[k] || ""}
      onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
  );
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-matang-navy">{title}</p>
      {row("en", "English")}
      {row("hi", "हिन्दी")}
      <button type="button" onClick={() => setMore(!more)} className="text-[11px] text-matang-navy underline cursor-pointer">
        {more ? "Hide other languages" : "Marathi / Chhattisgarhi / Hinglish"}
      </button>
      {more && (<>{row("mr", "मराठी")}{row("cg", "छत्तीसगढ़ी")}{row("hng", "Hinglish")}</>)}
    </div>
  );
}

/* ---------- option row ---------- */
function OptionRow({ opt, index, total, onAction, onSaveLabel }: {
  opt: FormOption; index: number; total: number;
  onAction: (a: "up" | "down" | "hide" | "show" | "archive" | "restore") => void;
  onSaveLabel: (label: LabelMap) => void;
}) {
  const [en, setEn] = useState(opt.label.en || "");
  const [hi, setHi] = useState(opt.label.hi || "");
  const dirty = en !== (opt.label.en || "") || hi !== (opt.label.hi || "");
  return (
    <div className={`p-2 rounded-xl border ${opt.is_archived ? "bg-gray-50 opacity-60" : "bg-white"} space-y-1.5`}>
      <div className="flex gap-1.5">
        <input className={inputCls} value={en} placeholder="English" onChange={(e) => setEn(e.target.value)} />
        <input className={inputCls} value={hi} placeholder="हिन्दी" onChange={(e) => setHi(e.target.value)} />
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <button type="button" className={iconBtn} disabled={index === 0} onClick={() => onAction("up")}><ArrowUp size={14} /></button>
        <button type="button" className={iconBtn} disabled={index === total - 1} onClick={() => onAction("down")}><ArrowDown size={14} /></button>
        <button type="button" className={iconBtn} onClick={() => onAction(opt.is_visible ? "hide" : "show")}>
          {opt.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button type="button" className={iconBtn} onClick={() => onAction(opt.is_archived ? "restore" : "archive")}>
          {opt.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        </button>
        {dirty && (
          <button type="button" onClick={() => onSaveLabel({ ...opt.label, en, hi })}
            className="ml-auto px-2.5 py-1 rounded-lg bg-matang-navy text-matang-gold text-xs font-semibold cursor-pointer">Save</button>
        )}
        <span className="text-[10px] text-gray-400 ml-auto">{opt.value}</span>
      </div>
    </div>
  );
}

/* ---------- field editor sheet ---------- */
function FieldEditor({ field, sectionId, scopeFields, onDone, onClose, notify }: {
  field: FormField | null; sectionId: string; scopeFields: FormField[];
  onDone: () => void; onClose: () => void; notify: (m: string, kind?: "success" | "error") => void;
}) {
  const isNew = !field;
  const [label, setLabel] = useState<LabelMap>(field?.label || { en: "", hi: "" });
  const [help, setHelp] = useState<LabelMap>(field?.help_text || {});
  const [required, setRequired] = useState(field?.is_required || false);
  const [vis, setVis] = useState<VisibilityLevel>(field?.visibility_level || "all");
  const [type, setType] = useState<FieldType>(field?.field_type || "dropdown");
  const [store, setStore] = useState<string>(field?.config?.store || "full");
  const [showArchivedOpts, setShowArchivedOpts] = useState(false);
  const [newEn, setNewEn] = useState("");
  const [newHi, setNewHi] = useState("");
  const [saving, setSaving] = useState(false);

  const cond = field?.conditional || null;
  const [condKey, setCondKey] = useState(cond?.field_key || "");
  const [condOp, setCondOp] = useState<Condition["op"]>(cond?.op || "eq");
  const [condVal, setCondVal] = useState<string>(
    Array.isArray(cond?.value) ? (cond?.value as string[]).join(", ") : String(cond?.value ?? "")
  );

  const [options, setOptions] = useState<FormOption[]>(field?.options || []);
  useEffect(() => { setOptions(field?.options || []); }, [field?.options]);

  const condSources = scopeFields.filter(
    (f) => f.id !== field?.id && !f.is_archived &&
      ["dropdown", "yes_no", "yes_no_number", "multi_select"].includes(f.field_type)
  );
  const src = condSources.find((f) => f.field_key === condKey);
  const srcIsYn = src && (src.field_type === "yes_no" || src.field_type === "yes_no_number");

  const save = async () => {
    if (!label.en?.trim() && !label.hi?.trim()) { notify("Enter a label", "error"); return; }
    setSaving(true);
    try {
      let conditional: Condition | null = null;
      if (condKey) {
        conditional = { field_key: condKey, op: condOp };
        if (src?.field_type === "yes_no_number") conditional.path = "status";
        if (condOp === "in" || condOp === "not_in") conditional.value = condVal.split(",").map((s) => s.trim()).filter(Boolean);
        else if (condOp !== "filled") conditional.value = condVal;
      }
      const config: Record<string, any> = { ...(field?.config || {}) };
      if (type === "yes_no_number") {
        config.store = store;
        if (store === "last4") { config.max_length = 4; config.digits_only = true; }
        else { delete config.max_length; delete config.digits_only; }
      }
      const data: Record<string, any> = {
        label, help_text: help, is_required: required, visibility_level: vis, conditional, config,
      };
      if (isNew) {
        data.section_id = sectionId;
        data.field_key = `${slugify(label.en || "field")}_${rand3()}`;
        data.field_type = type;
      } else {
        data.id = field!.id;
        if (!field!.is_system) data.field_type = type;
      }
      await api("upsert_field", { data });
      notify("Saved", "success");
      onDone();
      if (isNew) onClose();
    } catch (e: any) {
      notify(e.message, "error");
    } finally { setSaving(false); }
  };

  const optApi = async (fn: () => Promise<any>) => {
    try { await fn(); onDone(); } catch (e: any) { notify(e.message, "error"); }
  };
  const moveOpt = (i: number, dir: -1 | 1) => {
    const list = options.filter((o) => showArchivedOpts || !o.is_archived);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((o) => o.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    optApi(() => api("reorder", { entity: "option", ids }));
  };
  const addOption = () => {
    if (!newEn.trim() && !newHi.trim()) return;
    const base = slugify(newEn || newHi);
    let value = base;
    let n = 2;
    while (options.some((o) => o.value === value)) value = `${base}_${n++}`;
    optApi(async () => {
      await api("upsert_option", { data: { field_id: field!.id, value, label: { en: newEn.trim(), hi: newHi.trim() } } });
      setNewEn(""); setNewHi("");
    });
  };

  const hasOptions = type === "dropdown" || type === "multi_select";
  const visibleOpts = options.filter((o) => showArchivedOpts || !o.is_archived).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Sheet title={isNew ? "New field" : "Edit field"} onClose={onClose}>
      <LabelEditor title="Label (question)" value={label} onChange={setLabel} />
      <LabelEditor title="Help text (optional)" value={help} onChange={setHelp} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs font-semibold text-matang-navy mb-1">Type</p>
          <select className={inputCls} value={type} disabled={!!field?.is_system} onChange={(e) => setType(e.target.value as FieldType)}>
            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <p className="text-xs font-semibold text-matang-navy mb-1">Who can see answers</p>
          <select className={inputCls} value={vis} onChange={(e) => setVis(e.target.value as VisibilityLevel)}>
            {(Object.keys(VIS_LABEL) as VisibilityLevel[]).map((k) => <option key={k} value={k}>{VIS_LABEL[k]}</option>)}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={required} disabled={!!field?.is_locked} onChange={(e) => setRequired(e.target.checked)} />
        Required {field?.is_locked && <Badge tone="gold">core field</Badge>}
      </label>

      {type === "yes_no_number" && (
        <div>
          <p className="text-xs font-semibold text-matang-navy mb-1">Number / ID storage</p>
          <select className={inputCls} value={store} onChange={(e) => setStore(e.target.value)}>
            <option value="full">Full number (optional)</option>
            <option value="last4">Only last 4 digits (recommended for Aadhaar)</option>
          </select>
        </div>
      )}

      <div className="space-y-1.5 p-3 rounded-xl bg-gray-50">
        <p className="text-xs font-semibold text-matang-navy">Show only if… (conditional)</p>
        <select className={inputCls} value={condKey} onChange={(e) => { setCondKey(e.target.value); setCondVal(""); }}>
          <option value="">Always show</option>
          {condSources.map((f) => <option key={f.id} value={f.field_key}>{pickLabel(f.label, "en") || f.field_key}</option>)}
        </select>
        {condKey && (
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={condOp} onChange={(e) => setCondOp(e.target.value as Condition["op"])}>
              <option value="eq">is</option>
              <option value="neq">is not</option>
              <option value="in">is any of</option>
              <option value="not_in">is none of</option>
              <option value="filled">has any answer</option>
            </select>
            {condOp !== "filled" && (
              (condOp === "eq" || condOp === "neq") ? (
                <select className={inputCls} value={condVal} onChange={(e) => setCondVal(e.target.value)}>
                  <option value="">Select…</option>
                  {srcIsYn
                    ? ["yes", "no", ...(src?.field_type === "yes_no_number" ? ["unknown"] : [])].map((v) => <option key={v} value={v}>{v}</option>)
                    : (src?.options || []).filter((o) => !o.is_archived).map((o) => <option key={o.id} value={o.value}>{pickLabel(o.label, "en") || o.value}</option>)}
                </select>
              ) : (
                <input className={inputCls} placeholder="value1, value2" value={condVal} onChange={(e) => setCondVal(e.target.value)} />
              )
            )}
          </div>
        )}
      </div>

      <button type="button" disabled={saving} onClick={save}
        className="w-full py-3 rounded-xl bg-matang-navy text-matang-gold font-semibold text-sm disabled:opacity-50 cursor-pointer">
        {saving ? "Saving…" : isNew ? "Create field" : "Save field"}
      </button>

      {hasOptions && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-matang-navy">Dropdown options</p>
            <label className="text-[11px] flex items-center gap-1"><input type="checkbox" checked={showArchivedOpts} onChange={(e) => setShowArchivedOpts(e.target.checked)} /> archived</label>
          </div>
          {isNew ? (
            <p className="text-xs text-gray-500">Create the field first, then add options.</p>
          ) : (
            <>
              {visibleOpts.map((o, i) => (
                <OptionRow key={o.id} opt={o} index={i} total={visibleOpts.length}
                  onAction={(a) => {
                    if (a === "up") moveOpt(i, -1);
                    else if (a === "down") moveOpt(i, 1);
                    else optApi(() => api("state", { entity: "option", id: o.id, action: a }));
                  }}
                  onSaveLabel={(lab) => optApi(() => api("upsert_option", { data: { id: o.id, label: lab } }))} />
              ))}
              <div className="p-2 rounded-xl border border-dashed space-y-1.5">
                <div className="flex gap-1.5">
                  <input className={inputCls} placeholder="New option (English)" value={newEn} onChange={(e) => setNewEn(e.target.value)} />
                  <input className={inputCls} placeholder="हिन्दी" value={newHi} onChange={(e) => setNewHi(e.target.value)} />
                </div>
                <button type="button" onClick={addOption} className="w-full py-2 rounded-lg bg-matang-gold/20 text-matang-navy text-sm font-semibold cursor-pointer">
                  <Plus size={14} className="inline mr-1" />Add option
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ---------- section editor sheet ---------- */
function SectionEditor({ section, onDone, onClose, notify }: {
  section: FormSection | null; onDone: () => void; onClose: () => void;
  notify: (m: string, kind?: "success" | "error") => void;
}) {
  const [title, setTitle] = useState<LabelMap>(section?.title || { en: "", hi: "" });
  const [scope, setScope] = useState<Scope>(section?.scope || "family");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!title.en?.trim() && !title.hi?.trim()) { notify("Enter a title", "error"); return; }
    setSaving(true);
    try {
      const data: Record<string, any> = { title };
      if (section) data.id = section.id;
      else { data.slug = `${slugify(title.en || "section")}_${rand3()}`; data.scope = scope; }
      await api("upsert_section", { data });
      notify("Saved", "success");
      onDone(); onClose();
    } catch (e: any) { notify(e.message, "error"); } finally { setSaving(false); }
  };
  return (
    <Sheet title={section ? "Edit section" : "New section"} onClose={onClose}>
      <LabelEditor title="Section title" value={title} onChange={setTitle} />
      {!section && (
        <div>
          <p className="text-xs font-semibold text-matang-navy mb-1">Applies to</p>
          <select className={inputCls} value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
            <option value="family">Family (asked once)</option>
            <option value="member">Each member</option>
          </select>
        </div>
      )}
      <button type="button" disabled={saving} onClick={save}
        className="w-full py-3 rounded-xl bg-matang-navy text-matang-gold font-semibold text-sm disabled:opacity-50 cursor-pointer">
        {saving ? "Saving…" : "Save"}
      </button>
    </Sheet>
  );
}

/* ---------- page ---------- */
type SheetState =
  | null
  | { kind: "section"; section: FormSection | null }
  | { kind: "field"; fieldId: string | null; sectionId: string; scope: Scope };

export default function FormBuilderPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"form" | "preview" | "log">("form");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [log, setLog] = useState<any[]>([]);
  const [previewLang, setPreviewLang] = useState("hi");
  const [previewAnswers, setPreviewAnswers] = useState<Answers>({});

  const notify = useCallback((m: string, kind: "success" | "error" = "success") => toast(m, kind), [toast]);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/parivar-form", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setSections(d.sections || []);
    } catch (e: any) { notify(e.message, "error"); }
    finally { setLoading(false); }
  }, [notify]);

  const loadLog = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/parivar-form?log=1", { cache: "no-store" });
      const d = await res.json();
      if (res.ok) setLog(d.log || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (user?.role === "super_admin") reload(); }, [user?.role, reload]);
  useEffect(() => { if (tab === "log") loadLog(); }, [tab, loadLog]);

  const run = async (fn: () => Promise<any>) => {
    try { await fn(); await reload(); } catch (e: any) { notify(e.message, "error"); }
  };

  const visibleSections = useMemo(
    () => sections.filter((s) => showArchived || !s.is_archived),
    [sections, showArchived]
  );

  const scopeFields = (scope: Scope) =>
    sections.filter((s) => s.scope === scope).flatMap((s) => s.fields);

  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= visibleSections.length) return;
    const ids = visibleSections.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => api("reorder", { entity: "section", ids }));
  };
  const moveField = (list: FormField[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const ids = list.map((f) => f.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => api("reorder", { entity: "field", ids }));
  };
  const setState = (entity: "section" | "field", id: string, action: string) =>
    run(() => api("state", { entity, id, action }));
  const hardDelete = (entity: "section" | "field", id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? Saved answers stay in the database, but this question is gone for good.`)) return;
    run(() => api("delete", { entity, id, confirm: "DELETE" }));
  };

  if (userLoading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (user?.role !== "super_admin") {
    return <div className="p-8 text-center text-sm text-gray-500">Only Super Admin can edit the Parivar Form.</div>;
  }

  const editingField = sheet?.kind === "field" && sheet.fieldId
    ? sections.flatMap((s) => s.fields).find((f) => f.id === sheet.fieldId) || null
    : null;

  const previewSections = sections.filter((s) => s.is_visible && !s.is_archived && activeFields(s).length > 0);

  return (
    <div className="p-4 space-y-4 pb-24">
      <div>
        <h1 className="text-lg font-bold text-matang-navy flex items-center gap-2">
          <LayoutList size={20} className="text-matang-gold" /> Parivar Form Builder
        </h1>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Changes go live instantly. Hidden or archived questions keep their old answers safe.
        </p>
      </div>

      <div className="flex gap-1.5">
        {([["form", "Form", LayoutList], ["preview", "Preview", Smartphone], ["log", "Change log", History]] as const).map(([k, name, Icon]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${tab === k ? "bg-matang-navy text-matang-gold" : "bg-white border text-matang-navy"}`}>
            <Icon size={14} /> {name}
          </button>
        ))}
      </div>

      {tab === "form" && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-xs flex items-center gap-1.5">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
            </label>
            <button type="button" onClick={() => setSheet({ kind: "section", section: null })}
              className="px-3 py-2 rounded-xl bg-matang-gold text-matang-navy text-xs font-semibold cursor-pointer">
              <Plus size={14} className="inline mr-1" />New section
            </button>
          </div>

          {loading && <p className="text-center text-sm text-gray-500">Loading…</p>}

          {visibleSections.map((s, si) => {
            const fields = s.fields.filter((f) => showArchived || !f.is_archived).sort((a, b) => a.sort_order - b.sort_order);
            const isOpen = open === s.id;
            return (
              <div key={s.id} className={`rounded-2xl border bg-white ${s.is_archived ? "opacity-60" : ""}`}>
                <div className="p-3 space-y-2">
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="w-full flex items-center justify-between gap-2 text-left cursor-pointer">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-matang-navy truncate" data-no-translate>{pickLabel(s.title, "en") || pickLabel(s.title, "hi")}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge tone={s.scope === "family" ? "blue" : "green"}>{s.scope === "family" ? "Family" : "Each member"}</Badge>
                        <Badge>{fields.length} fields</Badge>
                        {!s.is_visible && <Badge tone="red">Hidden</Badge>}
                        {s.is_archived && <Badge tone="red">Archived</Badge>}
                      </div>
                    </div>
                    <ChevronDown size={18} className={isOpen ? "rotate-180" : ""} />
                  </button>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button type="button" className={iconBtn} disabled={si === 0} onClick={() => moveSection(si, -1)}><ArrowUp size={14} /></button>
                    <button type="button" className={iconBtn} disabled={si === visibleSections.length - 1} onClick={() => moveSection(si, 1)}><ArrowDown size={14} /></button>
                    <button type="button" className={iconBtn} onClick={() => setSheet({ kind: "section", section: s })}><Pencil size={14} /></button>
                    <button type="button" className={iconBtn} onClick={() => setState("section", s.id, s.is_visible ? "hide" : "show")}>
                      {s.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button type="button" className={iconBtn} onClick={() => setState("section", s.id, s.is_archived ? "restore" : "archive")}>
                      {s.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                    </button>
                    {s.is_archived && (
                      <button type="button" className={`${iconBtn} text-red-600`} onClick={() => hardDelete("section", s.id, pickLabel(s.title, "en"))}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t p-3 space-y-2 bg-gray-50 rounded-b-2xl">
                    {fields.map((f, fi) => (
                      <div key={f.id} className={`p-2.5 rounded-xl bg-white border ${f.is_archived ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" data-no-translate>
                              {pickLabel(f.label, "en") || pickLabel(f.label, "hi") || f.field_key}
                            </p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              <Badge>{FIELD_TYPES.find((t) => t.value === f.field_type)?.label || f.field_type}</Badge>
                              {f.is_required && <Badge tone="gold">Required</Badge>}
                              {f.is_locked && <Badge tone="gold"><Lock size={9} className="inline" /> Core</Badge>}
                              {f.conditional && <Badge tone="blue">Conditional</Badge>}
                              <Badge>{VIS_LABEL[f.visibility_level]}</Badge>
                              {!f.is_visible && <Badge tone="red">Hidden</Badge>}
                              {f.is_archived && <Badge tone="red">Archived</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <button type="button" className={iconBtn} disabled={fi === 0} onClick={() => moveField(fields, fi, -1)}><ArrowUp size={14} /></button>
                          <button type="button" className={iconBtn} disabled={fi === fields.length - 1} onClick={() => moveField(fields, fi, 1)}><ArrowDown size={14} /></button>
                          <button type="button" className={iconBtn} onClick={() => setSheet({ kind: "field", fieldId: f.id, sectionId: s.id, scope: s.scope })}><Pencil size={14} /></button>
                          <button type="button" className={iconBtn} disabled={f.is_locked} onClick={() => setState("field", f.id, f.is_visible ? "hide" : "show")}>
                            {f.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button type="button" className={iconBtn} disabled={f.is_locked} onClick={() => setState("field", f.id, f.is_archived ? "restore" : "archive")}>
                            {f.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                          </button>
                          {f.is_archived && !f.is_system && (
                            <button type="button" className={`${iconBtn} text-red-600`} onClick={() => hardDelete("field", f.id, pickLabel(f.label, "en"))}><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setSheet({ kind: "field", fieldId: null, sectionId: s.id, scope: s.scope })}
                      className="w-full py-2.5 rounded-xl border border-dashed border-matang-gold text-matang-navy text-sm font-semibold cursor-pointer">
                      <Plus size={14} className="inline mr-1" />Add field
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {tab === "preview" && (
        <div className="space-y-4">
          <select className={inputCls} value={previewLang} onChange={(e) => setPreviewLang(e.target.value)}>
            <option value="hi">हिन्दी</option><option value="en">English</option><option value="mr">मराठी</option>
            <option value="cg">छत्तीसगढ़ी</option><option value="hng">Hinglish</option>
          </select>
          <p className="text-[11px] text-gray-500">Preview only. Nothing here is saved.</p>
          {previewSections.map((s) => (
            <div key={s.id} className="p-3 rounded-2xl border bg-white space-y-4">
              <p className="text-sm font-bold text-matang-navy" data-no-translate>
                {pickLabel(s.title, previewLang)} <Badge tone={s.scope === "family" ? "blue" : "green"}>{s.scope}</Badge>
              </p>
              {activeFields(s).filter((f) => isConditionMet(f.conditional, previewAnswers)).map((f) => (
                <FieldRenderer key={f.id} field={f} lang={previewLang} value={previewAnswers[f.field_key]}
                  onChange={(v) => setPreviewAnswers((a) => ({ ...a, [f.field_key]: v }))} />
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "log" && (
        <div className="space-y-2">
          {log.length === 0 && <p className="text-center text-sm text-gray-500">No changes yet.</p>}
          {log.map((l) => {
            const d = l.after_data || l.before_data || {};
            const name = pickLabel(d.label || d.title, "en") || d.field_key || d.value || d.slug || "";
            return (
              <div key={l.id} className="p-2.5 rounded-xl bg-white border text-xs">
                <p className="font-semibold text-matang-navy" data-no-translate>
                  {l.action} · {l.entity}{name ? ` · ${name}` : ""}
                </p>
                <p className="text-gray-500" data-no-translate>{l.actor_name || "—"} · {new Date(l.created_at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}

      {sheet?.kind === "section" && (
        <SectionEditor section={sheet.section} onDone={reload} onClose={() => setSheet(null)} notify={notify} />
      )}
      {sheet?.kind === "field" && (
        <FieldEditor
          key={sheet.fieldId || "new"}
          field={editingField}
          sectionId={sheet.sectionId}
          scopeFields={scopeFields(sheet.scope)}
          onDone={reload}
          onClose={() => setSheet(null)}
          notify={notify}
        />
      )}
    </div>
  );
}

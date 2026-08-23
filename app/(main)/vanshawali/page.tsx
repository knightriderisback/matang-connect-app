"use client";
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Network, Plus, User, X, Focus, Trash2, ChevronRight } from "lucide-react";

type Node = {
  id: string;
  user_id?: string | null;
  display_name: string;
  gender?: string | null;
  birth_year?: number | null;
  age?: number | null;
  photo_url?: string | null;
  relation: string;
  status?: string;
  link_id?: string;
};

type Tree = {
  centre: Node;
  parents: Node[];
  spouses: Node[];
  children: Node[];
};

const REL_LABELS: Record<string, Record<string, string>> = {
  en: {
    self: "Self",
    father: "Father",
    mother: "Mother",
    spouse: "Spouse",
    child: "Child",
    son: "Son",
    daughter: "Daughter",
  },
  hi: {
    self: "स्वयं",
    father: "पिता",
    mother: "माता",
    spouse: "जीवनसाथी",
    child: "संतान",
    son: "पुत्र",
    daughter: "पुत्री",
  },
  mr: {
    self: "स्वतः",
    father: "वडील",
    mother: "आई",
    spouse: "जोडीदार",
    child: "मूल",
    son: "मुलगा",
    daughter: "मुलगी",
  },
};

const glassBg =
  "linear-gradient(135deg, rgba(252,231,243,0.55) 0%, rgba(243,232,255,0.45) 50%, rgba(237,233,254,0.4) 100%)";
const glassBorder = "border border-fuchsia-200/50";

function relLabel(lang: string, key: string, gender?: string | null) {
  const L = REL_LABELS[lang] || REL_LABELS.en;
  if (key === "child") {
    if (gender === "female" || gender === "F") return L.daughter;
    if (gender === "male" || gender === "M") return L.son;
  }
  return L[key] || key;
}

function MindNode({
  node,
  isCentre,
  lang,
  onOpen,
}: {
  node: Node;
  isCentre?: boolean;
  lang: string;
  onOpen: (n: Node) => void;
}) {
  const ageStr = node.age != null ? `${node.age}y` : "—";
  const rel = relLabel(lang, node.relation, node.gender);
  const pending = node.status === "pending";

  return (
    <button
      type="button"
      onClick={() => onOpen(node)}
      className="group flex flex-col items-center gap-1 max-w-[100px] active:scale-95 transition-transform"
    >
      <div
        className={`relative w-[4.25rem] h-[4.25rem] rounded-full overflow-hidden flex items-center justify-center border-2 transition-shadow ${
          isCentre
            ? "border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.55)] ring-2 ring-emerald-200/50"
            : pending
              ? "border-amber-300 border-dashed"
              : "border-white/80 shadow-lg shadow-fuchsia-200/40 group-hover:shadow-matang-gold/30"
        }`}
        style={{
          background: isCentre
            ? "linear-gradient(145deg,#ecfdf5,#d1fae5)"
            : "rgba(255,255,255,0.85)",
        }}
      >
        {node.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-rose-900/70">
            {node.display_name?.[0] || <User size={22} />}
          </span>
        )}
        {!isCentre && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white/90 text-[9px] text-rose-800/50 flex items-center justify-center border border-fuchsia-100 opacity-0 group-hover:opacity-100">
            ···
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold text-rose-950/85 text-center leading-tight truncate w-full">
        {node.display_name}
      </p>
      <p className="text-[9px] text-rose-800/45 text-center leading-none">
        {ageStr} ·{" "}
        <span className={isCentre ? "text-emerald-600 font-medium" : "text-amber-800/70"}>
          {rel}
        </span>
        {pending ? " · …" : ""}
      </p>
    </button>
  );
}

function AddSlot({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 max-w-[88px] active:scale-95 transition-transform"
    >
      <div
        className="w-[4.25rem] h-[4.25rem] rounded-full border-2 border-dashed border-fuchsia-300/60 flex items-center justify-center text-rose-800/40 hover:border-matang-gold hover:text-matang-gold hover:bg-white/40 transition-all"
        style={{ background: "rgba(255,255,255,0.35)" }}
      >
        <Plus size={22} strokeWidth={2.2} />
      </div>
      <p className="text-[9px] font-medium text-rose-800/45 text-center leading-tight">{label}</p>
    </button>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-0.5">
      <div
        className="w-0.5 h-5 rounded-full"
        style={{
          background: "linear-gradient(180deg,rgba(201,162,39,0.15),rgba(201,162,39,0.7),rgba(201,162,39,0.15))",
        }}
      />
    </div>
  );
}

function VanshawaliInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { lang } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const rootId = search.get("user") || user?.id || "";

  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [selected, setSelected] = useState<Node | null>(null);
  const [addRel, setAddRel] = useState<string | null>(null);
  const [form, setForm] = useState({ display_name: "", birth_year: "", gender: "" });
  const [saving, setSaving] = useState(false);

  const L = useMemo(() => REL_LABELS[lang] || REL_LABELS.en, [lang]);

  const load = useCallback(() => {
    if (!rootId) return;
    setLoading(true);
    fetch(`/api/vanshawali?userId=${rootId}`)
      .then((r) => r.json())
      .then((d) => {
        setTree(d.tree || null);
        setCanEdit(!!d.can_edit);
      })
      .catch(() => toast("Load failed", "error"))
      .finally(() => setLoading(false));
  }, [rootId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const addRelative = async () => {
    if (!addRel || !form.display_name.trim()) {
      toast(lang === "hi" ? "नाम लिखें" : "Enter name", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          centre_user_id: rootId,
          relation: addRel,
          display_name: form.display_name,
          birth_year: form.birth_year || null,
          gender: form.gender || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      toast(data.link?.status === "verified" ? "Added" : "Pending", "success");
      setAddRel(null);
      setForm({ display_name: "", birth_year: "", gender: "" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (node: Node) => {
    if (!node.link_id) {
      toast("Cannot remove", "error");
      return;
    }
    if (!confirm(lang === "hi" ? "Yeh rishta hataayein?" : "Remove this relation?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          link_id: node.link_id,
          centre_person_id: tree?.centre.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      toast(lang === "hi" ? "Hata diya" : "Removed", "success");
      setSelected(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const title = lang === "hi" || lang === "mr" ? "वंशावली" : "Vanshawali";

  const hasFather = tree?.parents.some((p) => p.relation === "father");
  const hasMother = tree?.parents.some((p) => p.relation === "mother");

  return (
    <div
      className="min-h-[70vh] p-4 pb-32 max-w-lg mx-auto space-y-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(252,231,243,0.4) 0%, rgba(250,245,255,0.55) 45%, rgba(255,255,255,0.95) 100%)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${glassBorder}`}
            style={{ background: "rgba(255,255,255,0.55)" }}
          >
            <Network className="text-amber-700/80" size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-rose-950/90 truncate">{title}</h1>
            <p className="text-[10px] text-rose-800/45">
              {lang === "hi"
                ? "Mind map · + add · node · remove · branch"
                : "Mind map · tap + to add · tap node to remove / branch"}
            </p>
          </div>
        </div>
      </div>

      {loading && <p className="text-center text-rose-800/40 py-16">Loading…</p>}

      {!loading && tree && (
        <div
          className={`rounded-[1.75rem] overflow-hidden ${glassBorder} shadow-sm`}
          style={{
            background: glassBg,
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <div className="p-4 sm:p-5 space-y-0">
            {/* PARENTS ZONE */}
            <div className="flex justify-center items-start gap-3 flex-wrap">
              {tree.parents.map((n) => (
                <MindNode key={n.id} node={n} lang={lang} onOpen={setSelected} />
              ))}
              {canEdit && !hasFather && (
                <AddSlot label={L.father} onClick={() => setAddRel("father")} />
              )}
              {canEdit && !hasMother && (
                <AddSlot label={L.mother} onClick={() => setAddRel("mother")} />
              )}
              {canEdit && hasFather && hasMother && tree.parents.length < 4 && (
                <AddSlot label={L.father + " / " + L.mother} onClick={() => setAddRel("father")} />
              )}
            </div>

            <Connector />

            {/* CENTRE + SPOUSE */}
            <div className="flex justify-center items-start gap-2 flex-wrap">
              <MindNode node={tree.centre} isCentre lang={lang} onOpen={setSelected} />
              {tree.spouses.map((n) => (
                <div key={n.id} className="flex items-center gap-1">
                  <div className="w-5 h-px bg-matang-gold/40" />
                  <MindNode node={n} lang={lang} onOpen={setSelected} />
                </div>
              ))}
              {canEdit && tree.spouses.length < 2 && (
                <AddSlot label={L.spouse} onClick={() => setAddRel("spouse")} />
              )}
            </div>

            <Connector />

            {/* CHILDREN — unlimited */}
            <div className="flex justify-center items-start gap-3 flex-wrap">
              {tree.children.map((n) => (
                <MindNode key={n.id} node={n} lang={lang} onOpen={setSelected} />
              ))}
              {canEdit && (
                <AddSlot label={L.child} onClick={() => setAddRel("child")} />
              )}
            </div>
          </div>

          <p className="px-4 pb-3 text-[9px] text-center text-rose-800/35">
            {lang === "hi"
              ? "टेम्पलेट: + जोड़ें · व्यक्ति टैप = मेनू · Branch = उनकी वंशावली"
              : "Template: + add · tap person = menu · Branch = their tree"}
          </p>
        </div>
      )}

      {/* NODE ACTION SHEET */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]"
          onClick={() => setSelected(null)}
        >
          <div
            className={`w-full max-w-sm mx-3 mb-6 sm:mb-0 rounded-3xl p-4 shadow-2xl ${glassBorder}`}
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-matang-gold/40 flex items-center justify-center text-lg font-bold">
                {selected.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  selected.display_name?.[0]
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-rose-950 truncate">{selected.display_name}</p>
                <p className="text-xs text-rose-800/50">
                  {relLabel(lang, selected.relation, selected.gender)}
                  {selected.age != null ? ` · ${selected.age} yrs` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-2 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              {selected.user_id && selected.relation !== "self" && (
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left text-sm font-medium text-rose-950/85 hover:bg-fuchsia-50"
                  onClick={() => {
                    router.push(`/vanshawali?user=${selected.user_id}`);
                    setSelected(null);
                  }}
                >
                  <Focus size={18} className="text-matang-gold" />
                  {lang === "hi" ? "Branch — उनकी वंशावली" : "Branch — open their tree"}
                  <ChevronRight size={16} className="ml-auto text-gray-300" />
                </button>
              )}
              {selected.user_id && (
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left text-sm font-medium text-rose-950/85 hover:bg-fuchsia-50"
                  onClick={() => {
                    router.push(`/member/${selected.user_id}`);
                    setSelected(null);
                  }}
                >
                  <User size={18} className="text-matang-gold" />
                  {lang === "hi" ? "प्रोफ़ाइल" : "Open profile"}
                  <ChevronRight size={16} className="ml-auto text-gray-300" />
                </button>
              )}
              {canEdit && selected.relation !== "self" && selected.link_id && (
                <button
                  type="button"
                  disabled={saving}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                  onClick={() => removeLink(selected)}
                >
                  <Trash2 size={18} />
                  {lang === "hi" ? "रिलेशन हटाएँ" : "Remove relation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD SHEET */}
      {addRel && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]"
          onClick={() => setAddRel(null)}
        >
          <div
            className={`w-full max-w-sm mx-3 mb-6 sm:mb-0 rounded-3xl p-4 shadow-2xl space-y-3 ${glassBorder}`}
            style={{ background: "rgba(255,255,255,0.94)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-950">
                + {relLabel(lang, addRel === "child" ? "child" : addRel)}
              </p>
              <button type="button" onClick={() => setAddRel(null)} className="p-1 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <Input
              label={lang === "hi" ? "नाम" : "Name"}
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Birth year"
                inputMode="numeric"
                value={form.birth_year}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    birth_year: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
              />
              <select
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-fuchsia-200/50 mt-6 bg-white/80"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={addRelative}
              className="w-full py-3 rounded-2xl text-sm font-bold text-rose-950/90 active:scale-[0.98] transition"
              style={{ background: glassBg, border: "1px solid rgba(244,114,182,0.35)" }}
            >
              {saving ? "…" : lang === "hi" ? "जोड़ें" : "Add to map"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VanshawaliPage() {
  return (
    <FeatureGate moduleKey="vanshawali">
      <Suspense fallback={<div className="p-8 text-center text-rose-800/40">Loading…</div>}>
        <VanshawaliInner />
      </Suspense>
    </FeatureGate>
  );
}

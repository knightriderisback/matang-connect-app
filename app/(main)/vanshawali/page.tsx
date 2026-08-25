"use client";
/**
 * Vertical-only infinite generations mind-map.
 * Each generation soft transparent colour band. No side scroll.
 */
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { useI18n } from "@/lib/i18n/LanguageProvider";
import { Plus, Trash2, X, Focus, User, Pencil, Search } from "lucide-react";

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
  via_id?: string;
};

type Tree = {
  centre: Node;
  spouses: Node[];
  parents?: Node[];
  children?: Node[];
  levels_up?: Node[][];
  levels_down?: Node[][];
};

type SearchHit = { id: string; full_name: string; native_village?: string; photo_url?: string };

const REL: Record<string, Record<string, string>> = {
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
};

function lbl(lang: string, key: string, gender?: string | null) {
  const L = REL[lang] || REL.en;
  if (key === "child") {
    if (gender === "female" || gender === "F") return L.daughter;
    if (gender === "male" || gender === "M") return L.son;
  }
  return L[key] || key;
}

/** Soft transparent generation colours (cycle) */
const GEN_UP = [
  "rgba(167, 139, 250, 0.18)", // violet
  "rgba(96, 165, 250, 0.18)", // blue
  "rgba(45, 212, 191, 0.18)", // teal
  "rgba(52, 211, 153, 0.16)", // emerald
  "rgba(251, 191, 36, 0.16)", // amber
  "rgba(251, 113, 133, 0.16)", // rose
];
const GEN_DOWN = [
  "rgba(52, 211, 153, 0.18)", // green
  "rgba(251, 146, 60, 0.18)", // orange
  "rgba(244, 114, 182, 0.16)", // pink
  "rgba(129, 140, 248, 0.16)", // indigo
  "rgba(56, 189, 248, 0.16)", // sky
  "rgba(163, 230, 53, 0.16)", // lime
];
const GEN_SELF = "rgba(251, 191, 36, 0.22)";

function genLabel(lang: string, dir: "up" | "down" | "self", depth: number) {
  if (dir === "self") return lang === "hi" ? "स्वयं" : "You";
  if (dir === "up") {
    if (depth === 0) return lang === "hi" ? "माता-पिता" : "Parents";
    if (depth === 1) return lang === "hi" ? "दादा-दादी" : "Grandparents";
    return lang === "hi" ? `पीढ़ी −${depth + 1}` : `Gen −${depth + 1}`;
  }
  if (depth === 0) return lang === "hi" ? "संतान" : "Children";
  if (depth === 1) return lang === "hi" ? "पोते-पोतियाँ" : "Grandchildren";
  return lang === "hi" ? `पीढ़ी +${depth + 1}` : `Gen +${depth + 1}`;
}

function VanshawaliInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootId = searchParams.get("user") || user?.id || "";

  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiCanEdit, setApiCanEdit] = useState(false);
  const [isSA, setIsSA] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [saEditMode, setSaEditMode] = useState(false);
  const [selected, setSelected] = useState<Node | null>(null);

  const [draft, setDraft] = useState<{
    relation: string;
    centre_person_id?: string;
    name: string;
    birth_year: string;
    member_user_id: string | null;
  } | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const L = useMemo(() => REL[lang] || REL.en, [lang]);
  const canEdit = apiCanEdit && (isOwner || (isSA && saEditMode));

  const levelsUp = tree?.levels_up || [];
  const levelsDown = tree?.levels_down || [];

  const load = useCallback(() => {
    if (!rootId) return;
    setLoading(true);
    fetch(`/api/vanshawali?userId=${rootId}`)
      .then((r) => r.json())
      .then((d) => {
        setTree(d.tree || null);
        setApiCanEdit(!!d.can_edit);
        setIsSA(!!d.is_super_admin);
        setIsOwner(!!d.is_owner);
      })
      .catch(() => toast("Load failed", "error"))
      .finally(() => setLoading(false));
  }, [rootId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!draft || q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`/api/vanshawali/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => setHits(d.users || []))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(t);
  }, [q, draft]);

  const saveAdd = async () => {
    if (!draft) return;
    if (!draft.member_user_id && !draft.name.trim()) {
      toast(lang === "hi" ? "Search ya name" : "Search or enter name", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vanshawali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          centre_user_id: draft.centre_person_id ? undefined : rootId,
          centre_person_id: draft.centre_person_id || undefined,
          root_user_id: rootId,
          relation: draft.relation,
          display_name: draft.name.trim() || undefined,
          birth_year: draft.birth_year || null,
          member_user_id: draft.member_user_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed", "error");
        return;
      }
      setDraft(null);
      setQ("");
      setHits([]);
      load();
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (node: Node) => {
    if (!node.link_id) return;
    if (!confirm(lang === "hi" ? "Rishta hataayein?" : "Remove relation?")) return;
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
      setSelected(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const openAdd = (relation: string, centrePersonId?: string) => {
    if (!canEdit) return;
    setDraft({
      relation,
      centre_person_id: centrePersonId,
      name: "",
      birth_year: "",
      member_user_id: null,
    });
    setQ("");
    setHits([]);
  };

  const Tag = ({ n }: { n: Node }) => (
    <button
      type="button"
      onClick={() => setSelected(n)}
      className="text-center m-1 max-w-[46%]"
    >
      <span
        className={`inline-block px-2.5 py-1.5 rounded-lg shadow-sm text-[12px] font-semibold leading-snug text-center border break-words whitespace-normal ${
          n.user_id
            ? "bg-amber-400/90 text-white border-amber-500/50"
            : "bg-white/90 text-gray-800 border-white/60"
        }`}
      >
        {n.display_name}
      </span>
      <span className="block text-[9px] text-gray-600/80 mt-0.5 leading-tight">
        {lbl(lang, n.relation, n.gender)}
        {n.age != null ? ` · ${n.age}` : ""}
      </span>
    </button>
  );

  const GenBand = ({
    bg,
    label,
    children,
  }: {
    bg: string;
    label: string;
    children: React.ReactNode;
  }) => (
    <div
      className="mx-3 my-1.5 rounded-2xl px-2 py-3 border border-white/40"
      style={{ background: bg }}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500/80 text-center mb-2">
        {label}
      </p>
      <div className="flex flex-wrap justify-center items-start gap-0">{children}</div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-[70vh] bg-[#f7f7f8] relative">
      {isSA && !isOwner && (
        <button
          type="button"
          onClick={() => setSaEditMode((v) => !v)}
          className={`absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold shadow border ${
            saEditMode
              ? "bg-amber-400 text-white border-amber-500"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          <Pencil size={12} />
          {saEditMode ? "Edit ON" : "Edit"}
        </button>
      )}

      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <p className="text-sm font-semibold text-gray-800 pl-14 sm:pl-0">
          {lang === "hi" ? "वंशावली" : "Vanshawali"}
        </p>
        <p className="text-[10px] text-gray-400">{canEdit ? "Edit mode" : "View only"}</p>
      </div>

      {loading && <p className="text-center text-gray-400 py-20">Loading…</p>}

      {!loading && tree && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-36">
          {/* UP generations: farthest first */}
          {[...levelsUp].reverse().map((level, revIdx) => {
            const depth = levelsUp.length - 1 - revIdx;
            const bg = GEN_UP[depth % GEN_UP.length];
            return (
              <GenBand key={`up-${depth}`} bg={bg} label={genLabel(lang, "up", depth)}>
                {level.map((n) => (
                  <div key={n.id} className="flex flex-col items-center">
                    <Tag n={n} />
                    {canEdit && (
                      <button
                        type="button"
                        className="w-5 h-5 mb-1 rounded-full bg-white/70 text-violet-600 flex items-center justify-center border border-violet-200"
                        title="Add parent of this person"
                        onClick={() => openAdd("father", n.id)}
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </GenBand>
            );
          })}

          {/* Add parents at centre's parent level */}
          {canEdit && (
            <div className="flex justify-center my-1">
              <button
                type="button"
                onClick={() =>
                  openAdd(
                    (levelsUp[0] || []).some((p) => p.relation === "father")
                      ? "mother"
                      : "father"
                  )
                }
                className="text-[11px] border border-dashed border-violet-300 bg-violet-50/80 px-3 py-1 rounded-full text-violet-700"
              >
                + {L.father} / {L.mother}
              </button>
            </div>
          )}

          {/* SELF + spouse */}
          <GenBand bg={GEN_SELF} label={genLabel(lang, "self", 0)}>
            <button
              type="button"
              onClick={() => setSelected(tree.centre)}
              className="m-1 text-center max-w-[70%]"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-white text-[13px] font-bold shadow leading-snug">
                {tree.centre.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tree.centre.photo_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : null}
                <span className="break-words whitespace-normal text-left">
                  {tree.centre.display_name}
                </span>
              </span>
              <span className="block text-[9px] text-emerald-700 font-medium mt-0.5">{L.self}</span>
            </button>
            {(tree.spouses || []).map((n) => (
              <Tag key={n.id} n={n} />
            ))}
            {canEdit && (tree.spouses || []).length < 2 && (
              <button
                type="button"
                onClick={() => openAdd("spouse")}
                className="m-1 text-[11px] border border-dashed border-amber-400 bg-white/70 px-2 py-1 rounded-lg text-amber-800"
              >
                + {L.spouse}
              </button>
            )}
          </GenBand>

          {/* DOWN generations */}
          {levelsDown.map((level, depth) => {
            const bg = GEN_DOWN[depth % GEN_DOWN.length];
            return (
              <GenBand key={`down-${depth}`} bg={bg} label={genLabel(lang, "down", depth)}>
                {level.map((n) => (
                  <div key={n.id} className="flex flex-col items-center">
                    <Tag n={n} />
                    {canEdit && (
                      <button
                        type="button"
                        className="w-5 h-5 mb-1 rounded-full bg-white/70 text-emerald-700 flex items-center justify-center border border-emerald-200"
                        title="Add child of this person"
                        onClick={() => openAdd("child", n.id)}
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </GenBand>
            );
          })}

          {canEdit && (
            <div className="flex justify-center my-2">
              <button
                type="button"
                onClick={() => openAdd("child")}
                className="text-[11px] border border-dashed border-emerald-400 bg-emerald-50/80 px-3 py-1 rounded-full text-emerald-800"
              >
                + {L.child}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ADD */}
      {draft && canEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center"
          onClick={() => setDraft(null)}
        >
          <div
            className="w-full max-w-sm mx-3 mb-6 bg-white rounded-3xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold text-gray-900">
                {lang === "hi" ? "रिश्तेदार जोड़ें" : "Add relative"}
              </p>
              <button type="button" onClick={() => setDraft(null)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1 block">
                {lang === "hi" ? "रिश्ता" : "Relationship"}
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border text-sm"
                value={draft.relation}
                onChange={(e) => setDraft({ ...draft, relation: e.target.value })}
              >
                <option value="father">{L.father}</option>
                <option value="mother">{L.mother}</option>
                <option value="spouse">{L.spouse}</option>
                <option value="child">{L.child}</option>
              </select>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-gray-50"
                placeholder={lang === "hi" ? "Member search…" : "Search registered…"}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setDraft({ ...draft, member_user_id: null });
                }}
              />
            </div>
            {searching && <p className="text-[10px] text-gray-400">Searching…</p>}
            {hits.length > 0 && (
              <ul className="max-h-36 overflow-y-auto rounded-xl border divide-y">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                      onClick={() => {
                        setDraft({ ...draft, member_user_id: h.id, name: h.full_name });
                        setQ(h.full_name);
                        setHits([]);
                      }}
                    >
                      <span className="font-medium">{h.full_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!draft.member_user_id && (
              <>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  placeholder={lang === "hi" ? "पूरा नाम" : "Full name"}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({ ...draft, name: e.target.value, member_user_id: null })
                  }
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  placeholder="Birth year"
                  inputMode="numeric"
                  value={draft.birth_year}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      birth_year: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                />
              </>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={saveAdd}
              className="w-full py-3 rounded-2xl bg-amber-400 text-white text-sm font-bold"
            >
              {saving ? "…" : lang === "hi" ? "जोड़ें" : "Add"}
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/25 flex items-end sm:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm mx-3 mb-8 bg-white rounded-3xl p-4 shadow-2xl space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-gray-900 break-words">{selected.display_name}</p>
            <p className="text-xs text-gray-500 mb-2">
              {lbl(lang, selected.relation, selected.gender)}
              {selected.age != null ? ` · ${selected.age} yrs` : ""}
            </p>
            {selected.user_id && (
              <>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
                  onClick={() => {
                    router.push(`/vanshawali?user=${selected.user_id}`);
                    setSelected(null);
                  }}
                >
                  <Focus size={16} className="text-amber-500" /> Open their tree
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium hover:bg-gray-50"
                  onClick={() => {
                    router.push(`/member/${selected.user_id}`);
                    setSelected(null);
                  }}
                >
                  <User size={16} className="text-amber-500" /> Profile
                </button>
              </>
            )}
            {canEdit && selected.relation !== "self" && selected.link_id && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50"
                onClick={() => removeLink(selected)}
              >
                <Trash2 size={16} /> Remove
              </button>
            )}
            <button
              type="button"
              className="w-full py-2 text-sm text-gray-400"
              onClick={() => setSelected(null)}
            >
              Close
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
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
        <VanshawaliInner />
      </Suspense>
    </FeatureGate>
  );
}

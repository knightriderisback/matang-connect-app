"use client";
/**
 * Vertical 2-way mind-map — no overlap, search registered members,
 * multi-gen, edit only owner or SA (left Edit toggle).
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
  via_parent_id?: string;
  via_child_id?: string;
};

type Tree = {
  centre: Node;
  parents: Node[];
  spouses: Node[];
  children: Node[];
  grandparents?: Node[];
  grandchildren?: Node[];
};

type SearchHit = {
  id: string;
  full_name: string;
  native_village?: string;
  photo_url?: string;
};

const REL: Record<string, Record<string, string>> = {
  en: {
    self: "Self",
    father: "Father",
    mother: "Mother",
    spouse: "Spouse",
    child: "Child",
    son: "Son",
    daughter: "Daughter",
    grandfather: "Grandfather",
    grandmother: "Grandmother",
    grandchild: "Grandchild",
  },
  hi: {
    self: "स्वयं",
    father: "पिता",
    mother: "माता",
    spouse: "जीवनसाथी",
    child: "संतान",
    son: "पुत्र",
    daughter: "पुत्री",
    grandfather: "दादा/नाना",
    grandmother: "दादी/नानी",
    grandchild: "पोता/पोती",
  },
};

function lbl(lang: string, key: string, gender?: string | null) {
  const L = REL[lang] || REL.en;
  if (key === "child") {
    if (gender === "female" || gender === "F") return L.daughter;
    if (gender === "male" || gender === "M") return L.son;
  }
  if (key === "father" && false) return L.father;
  return L[key] || key;
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

function slotXs(count: number, cx: number, gap = 88) {
  if (count <= 0) return [] as number[];
  if (count === 1) return [cx];
  const span = gap * (count - 1);
  const start = cx - span / 2;
  return Array.from({ length: count }, (_, i) => start + i * gap);
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

  // add form
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

  // Layout
  const W = 400;
  const parents = tree?.parents || [];
  const spouses = tree?.spouses || [];
  const children = tree?.children || [];
  const grandparents = tree?.grandparents || [];
  const grandchildren = tree?.grandchildren || [];

  const nParentSlots = parents.length + (canEdit ? 1 : 0);
  const nChildSlots = children.length + (canEdit ? 1 : 0);
  const nGpSlots = grandparents.length;
  const nGcSlots = grandchildren.length;

  const gap = 96;
  const cx = W / 2;

  // Vertical bands (no overlap)
  const yGp = 28;
  const yPar = grandparents.length || canEdit ? 110 : 36;
  const yMid = yPar + 100;
  const yChild = yMid + 100;
  const yGc = yChild + 95;
  const H = (grandchildren.length ? yGc : yChild) + 90;

  const gpXs = slotXs(Math.max(nGpSlots, 1), cx, gap);
  const parXs = slotXs(Math.max(nParentSlots, 1), cx, gap);
  const chXs = slotXs(Math.max(nChildSlots, 1), cx, gap);
  const gcXs = slotXs(Math.max(nGcSlots, 1), cx, gap);

  const line = "#E8A317";

  const Tag = ({
    n,
    extra,
  }: {
    n: Node;
    extra?: string;
  }) => (
    <button
      type="button"
      onClick={() => setSelected(n)}
      className="text-center max-w-[92px]"
    >
      <span
        className={`inline-block px-2 py-1 rounded-lg shadow-sm text-[11px] font-semibold truncate max-w-[92px] border ${
          n.user_id
            ? "bg-amber-400 text-white border-amber-500"
            : "bg-white text-gray-800 border-amber-200"
        }`}
      >
        {n.display_name}
      </span>
      <span className="block text-[8px] text-amber-800/70 mt-0.5 leading-tight">
        {extra || lbl(lang, n.relation, n.gender)}
        {n.age != null ? ` · ${n.age}` : ""}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col min-h-[70vh] bg-[#fafafa] relative">
      {/* SA edit toggle — left corner */}
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

      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800 pl-14 sm:pl-0">
          {lang === "hi" ? "वंशावली" : "Vanshawali"}
        </p>
        <p className="text-[10px] text-gray-400">
          {canEdit ? "Edit mode" : "View only"}
        </p>
      </div>

      {loading && <p className="text-center text-gray-400 py-20">Loading…</p>}

      {!loading && tree && (
        <div className="flex-1 overflow-auto px-2 pb-36">
          <div className="relative mx-auto" style={{ width: "100%", maxWidth: 420, height: H }}>
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* GP -> parents */}
              {grandparents.map((g, i) => {
                const gx = gpXs[i] ?? cx;
                const pi = parents.findIndex((p) => p.id === g.via_parent_id);
                const px = pi >= 0 ? parXs[pi] ?? cx : cx;
                return (
                  <path
                    key={`gpl-${g.id}`}
                    d={curve(px, yPar - 8, gx, yGp + 20)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                );
              })}
              {/* parents -> centre */}
              {parents.map((_, i) => (
                <path
                  key={`pl-${i}`}
                  d={curve(cx, yMid - 18, parXs[i] ?? cx, yPar + 22)}
                  fill="none"
                  stroke={line}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              ))}
              {canEdit && nParentSlots > parents.length && (
                <path
                  d={curve(cx, yMid - 18, parXs[parents.length] ?? cx, yPar + 22)}
                  fill="none"
                  stroke={line}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  opacity={0.5}
                />
              )}
              {/* spouse */}
              {spouses.map((_, i) => (
                <path
                  key={`sl-${i}`}
                  d={`M${cx + 36} ${yMid} C${cx + 60} ${yMid - 10}, ${cx + 90} ${yMid + 10}, ${cx + 108 + i * 8} ${yMid}`}
                  fill="none"
                  stroke={line}
                  strokeWidth={2.2}
                />
              ))}
              {/* centre -> children */}
              {children.map((_, i) => (
                <path
                  key={`cl-${i}`}
                  d={curve(cx, yMid + 18, chXs[i] ?? cx, yChild - 6)}
                  fill="none"
                  stroke={line}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              ))}
              {canEdit && nChildSlots > children.length && (
                <path
                  d={curve(cx, yMid + 18, chXs[children.length] ?? cx, yChild - 6)}
                  fill="none"
                  stroke={line}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  opacity={0.5}
                />
              )}
              {/* children -> grandchildren */}
              {grandchildren.map((g, i) => {
                const gx = gcXs[i] ?? cx;
                const ci = children.findIndex((c) => c.id === g.via_child_id);
                const px = ci >= 0 ? chXs[ci] ?? cx : cx;
                return (
                  <path
                    key={`gcl-${g.id}`}
                    d={curve(px, yChild + 22, gx, yGc - 6)}
                    fill="none"
                    stroke={line}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Grandparents row */}
            {grandparents.map((n, i) => (
              <div
                key={n.id}
                className="absolute -translate-x-1/2 z-10"
                style={{ left: `${((gpXs[i] ?? cx) / W) * 100}%`, top: yGp - 4 }}
              >
                <Tag
                  n={n}
                  extra={
                    n.relation === "mother" ? L.grandmother || "Grandmother" : L.grandfather || "Grandfather"
                  }
                />
              </div>
            ))}

            {/* Parents */}
            {parents.map((n, i) => (
              <div
                key={n.id}
                className="absolute -translate-x-1/2 z-10"
                style={{ left: `${((parXs[i] ?? cx) / W) * 100}%`, top: yPar - 4 }}
              >
                <Tag n={n} />
                {canEdit && (
                  <button
                    type="button"
                    className="mt-0.5 mx-auto flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[9px]"
                    title="Add grandparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAdd("father", n.id);
                    }}
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  openAdd(parents.some((p) => p.relation === "father") ? "mother" : "father")
                }
                className="absolute z-10 -translate-x-1/2 flex items-center gap-0.5"
                style={{
                  left: `${((parXs[parents.length] ?? cx) / W) * 100}%`,
                  top: yPar + 4,
                }}
              >
                <span className="text-[10px] text-gray-400 border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 rounded">
                  +
                </span>
              </button>
            )}

            {/* Centre */}
            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: "50%", top: yMid }}
            >
              <button type="button" onClick={() => setSelected(tree.centre)} className="text-center">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 text-white text-[12px] font-bold shadow-md max-w-[130px]">
                  {tree.centre.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tree.centre.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : null}
                  <span className="truncate">{tree.centre.display_name}</span>
                </span>
                <span className="block text-[9px] text-emerald-600 font-medium mt-0.5">{L.self}</span>
              </button>
            </div>

            {/* Spouse */}
            {spouses.map((n, i) => (
              <div
                key={n.id}
                className="absolute z-10 -translate-y-1/2"
                style={{ left: `${((cx + 100 + i * 8) / W) * 100}%`, top: yMid }}
              >
                <Tag n={n} extra={L.spouse} />
              </div>
            ))}
            {canEdit && spouses.length < 2 && (
              <button
                type="button"
                onClick={() => openAdd("spouse")}
                className="absolute z-10 -translate-y-1/2"
                style={{ left: `${((cx + 100) / W) * 100}%`, top: yMid }}
              >
                <span className="text-[10px] border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 rounded text-gray-500">
                  + {L.spouse}
                </span>
              </button>
            )}

            {/* Children */}
            {children.map((n, i) => (
              <div
                key={n.id}
                className="absolute -translate-x-1/2 z-10"
                style={{ left: `${((chXs[i] ?? cx) / W) * 100}%`, top: yChild - 4 }}
              >
                <Tag n={n} />
                {canEdit && (
                  <button
                    type="button"
                    className="mt-0.5 mx-auto flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700"
                    title="Add grandchild"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAdd("child", n.id);
                    }}
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <button
                type="button"
                onClick={() => openAdd("child")}
                className="absolute z-10 -translate-x-1/2"
                style={{
                  left: `${((chXs[children.length] ?? cx) / W) * 100}%`,
                  top: yChild + 4,
                }}
              >
                <span className="text-[10px] border border-dashed border-amber-300 bg-amber-50 px-1.5 py-0.5 rounded text-gray-500">
                  + {L.child}
                </span>
              </button>
            )}

            {/* Grandchildren */}
            {grandchildren.map((n, i) => (
              <div
                key={n.id}
                className="absolute -translate-x-1/2 z-10"
                style={{ left: `${((gcXs[i] ?? cx) / W) * 100}%`, top: yGc - 4 }}
              >
                <Tag n={n} extra={L.grandchild || "Grandchild"} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD sheet with search */}
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
                + {lbl(lang, draft.relation === "child" ? "child" : draft.relation)}
              </p>
              <button type="button" onClick={() => setDraft(null)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 outline-none focus:border-amber-400"
                placeholder={lang === "hi" ? "Member search (app)…" : "Search registered member…"}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setDraft({ ...draft, member_user_id: null });
                }}
              />
            </div>
            {searching && <p className="text-[10px] text-gray-400">Searching…</p>}
            {hits.length > 0 && (
              <ul className="max-h-36 overflow-y-auto rounded-xl border border-gray-100 divide-y">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 flex items-center gap-2 ${
                        draft.member_user_id === h.id ? "bg-amber-50" : ""
                      }`}
                      onClick={() => {
                        setDraft({
                          ...draft,
                          member_user_id: h.id,
                          name: h.full_name,
                        });
                        setQ(h.full_name);
                        setHits([]);
                      }}
                    >
                      <span className="font-medium truncate">{h.full_name}</span>
                      {h.native_village && (
                        <span className="text-[10px] text-gray-400 truncate">{h.native_village}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!draft.member_user_id && (
              <>
                <p className="text-[10px] text-gray-400">
                  {lang === "hi"
                    ? "App mein nahi? Neeche name / age bharo"
                    : "Not registered? Fill name & year below"}
                </p>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder={lang === "hi" ? "नाम" : "Name"}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value, member_user_id: null })}
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="Birth year (optional)"
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

            {draft.member_user_id && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
                ✓ Linked member — profile fetch / clickable tag
              </p>
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

      {/* Node actions */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/25 flex items-end sm:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-sm mx-3 mb-8 bg-white rounded-3xl p-4 shadow-2xl space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-gray-900">{selected.display_name}</p>
            <p className="text-xs text-gray-500 mb-2">
              {lbl(lang, selected.relation, selected.gender)}
              {selected.age != null ? ` · ${selected.age} yrs` : ""}
              {selected.user_id ? " · Registered" : " · Manual"}
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
                  <User size={16} className="text-amber-500" /> Profile / info
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
            <button type="button" className="w-full py-2 text-sm text-gray-400" onClick={() => setSelected(null)}>
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

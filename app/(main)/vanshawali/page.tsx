"use client";
/**
 * Mind-map canvas: generation-coloured bubbles, infinite up/down,
 * vertical scroll only, single-line names, smart non-overlap packing.
 */
import { FeatureGate } from "@/components/shared/FeatureGate";
import { useCallback, useEffect, useMemo, useState, Suspense, useRef } from "react";
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
  grandparents?: Node[];
  grandchildren?: Node[];
  levels_up?: Node[][];
  levels_down?: Node[][];
};

type SearchHit = { id: string; full_name: string; native_village?: string };

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

/** Soft generation bubble fills (tag only) */
const BUBBLE_UP = [
  { bg: "rgba(167,139,250,0.55)", border: "rgba(139,92,246,0.5)", text: "#4c1d95" },
  { bg: "rgba(96,165,250,0.5)", border: "rgba(59,130,246,0.45)", text: "#1e3a8a" },
  { bg: "rgba(45,212,191,0.45)", border: "rgba(20,184,166,0.45)", text: "#134e4a" },
  { bg: "rgba(251,191,36,0.4)", border: "rgba(245,158,11,0.45)", text: "#78350f" },
  { bg: "rgba(251,113,133,0.4)", border: "rgba(244,63,94,0.4)", text: "#881337" },
];
const BUBBLE_DOWN = [
  { bg: "rgba(52,211,153,0.5)", border: "rgba(16,185,129,0.45)", text: "#064e3b" },
  { bg: "rgba(251,146,60,0.48)", border: "rgba(249,115,22,0.45)", text: "#7c2d12" },
  { bg: "rgba(244,114,182,0.45)", border: "rgba(236,72,153,0.4)", text: "#831843" },
  { bg: "rgba(129,140,248,0.45)", border: "rgba(99,102,241,0.4)", text: "#312e81" },
  { bg: "rgba(56,189,248,0.45)", border: "rgba(14,165,233,0.4)", text: "#0c4a6e" },
];
const BUBBLE_SELF = { bg: "rgba(251,191,36,0.95)", border: "rgba(217,119,6,0.6)", text: "#fff" };
const BUBBLE_MANUAL = { bg: "rgba(255,255,255,0.92)", border: "rgba(201,162,39,0.45)", text: "#1f2937" };

function lbl(lang: string, key: string, gender?: string | null) {
  const L = REL[lang] || REL.en;
  if (key === "child") {
    if (gender === "female" || gender === "F") return L.daughter;
    if (gender === "male" || gender === "M") return L.son;
  }
  return L[key] || key;
}

function nameWidth(name: string, max = 160) {
  const len = Math.max((name || "?").length, 3);
  return Math.min(max, Math.max(56, Math.round(len * 7.6 + 24)));
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const my = (y1 + y2) / 2;
  return `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

/** Pack items into rows within maxW — overflow goes to next row (vertical adjust) */
function packRows(
  widths: number[],
  maxW: number,
  gap = 10
): { x: number; row: number; w: number }[] {
  const out: { x: number; row: number; w: number }[] = [];
  let row = 0;
  let x = 0;
  let rowW = 0;
  const rowItems: number[][] = [[]];

  widths.forEach((w, i) => {
    if (rowW > 0 && rowW + gap + w > maxW) {
      row++;
      rowItems.push([]);
      rowW = 0;
    }
    rowItems[row].push(i);
    rowW += (rowW > 0 ? gap : 0) + w;
  });

  rowItems.forEach((idxs, r) => {
    const total = idxs.reduce((s, i) => s + widths[i], 0) + gap * Math.max(0, idxs.length - 1);
    let cursor = (maxW - total) / 2;
    idxs.forEach((i) => {
      const w = widths[i];
      out[i] = { x: cursor + w / 2, row: r, w };
      cursor += w + gap;
    });
  });
  return out;
}

function VanshawaliInner() {
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rootId = searchParams.get("user") || user?.id || "";
  const wrapRef = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(360);

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

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVw(Math.max(300, el.clientWidth - 8)));
    ro.observe(el);
    setVw(Math.max(300, el.clientWidth - 8));
    return () => ro.disconnect();
  }, [tree]);

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

  const levelsUp = tree?.levels_up || [];
  const levelsDown = tree?.levels_down || [];

  const layout = useMemo(() => {
    if (!tree) return null;
    const maxW = vw;
    const cx = maxW / 2;
    const rowH = 58;
    const subRowH = 52;
    const gapY = 28;

    type Placed = {
      n: Node | null;
      x: number;
      y: number;
      w: number;
      kind: "node" | "add";
      gen: number; // negative up, 0 self, positive down
      style: typeof BUBBLE_SELF;
    };

    const placed: Placed[] = [];
    let y = 16;

    // UP levels farthest first
    for (let d = levelsUp.length - 1; d >= 0; d--) {
      const level = levelsUp[d];
      const items: { n: Node | null; w: number; kind: "node" | "add" }[] = level.map((n) => ({
        n,
        w: nameWidth(n.display_name),
        kind: "node",
      }));
      if (canEdit && d === 0) items.push({ n: null, w: 52, kind: "add" });
      const widths = items.map((i) => i.w);
      const pack = packRows(widths, maxW - 16, 10);
      const maxRow = Math.max(0, ...pack.map((p) => p.row));
      items.forEach((it, i) => {
        const p = pack[i];
        placed.push({
          n: it.n,
          x: p.x + 8,
          y: y + p.row * subRowH,
          w: it.w,
          kind: it.kind,
          gen: -(d + 1),
          style: it.n?.user_id
            ? BUBBLE_UP[d % BUBBLE_UP.length]
            : it.n
              ? BUBBLE_MANUAL
              : BUBBLE_MANUAL,
        });
      });
      y += (maxRow + 1) * subRowH + gapY;
    }

    if (canEdit && levelsUp.length === 0) {
      placed.push({
        n: null,
        x: cx,
        y,
        w: 72,
        kind: "add",
        gen: -1,
        style: BUBBLE_MANUAL,
      });
      y += subRowH + gapY;
    }

    const yMid = y + 10;
    // centre
    const centreW = nameWidth(tree.centre.display_name, 180) + (tree.centre.photo_url ? 28 : 0);
    placed.push({
      n: tree.centre,
      x: cx,
      y: yMid,
      w: centreW,
      kind: "node",
      gen: 0,
      style: BUBBLE_SELF,
    });

    // spouses right of centre — if overflow, place below centre slightly
    let spX = cx + centreW / 2 + 16;
    (tree.spouses || []).forEach((n, i) => {
      const w = nameWidth(n.display_name);
      let x = spX + w / 2;
      let yy = yMid;
      if (x + w / 2 > maxW - 8) {
        yy = yMid + subRowH;
        x = cx + (i + 1) * 20;
      }
      placed.push({
        n,
        x,
        y: yy,
        w,
        kind: "node",
        gen: 0,
        style: n.user_id ? BUBBLE_UP[0] : BUBBLE_MANUAL,
      });
      spX = x + w / 2 + 12;
    });
    if (canEdit && (tree.spouses || []).length < 2) {
      placed.push({
        n: null,
        x: Math.min(spX + 30, maxW - 40),
        y: yMid,
        w: 64,
        kind: "add",
        gen: 0,
        style: BUBBLE_MANUAL,
      });
    }

    y = yMid + rowH + gapY;

    // DOWN levels
    for (let d = 0; d < levelsDown.length; d++) {
      const level = levelsDown[d];
      const items: { n: Node | null; w: number; kind: "node" | "add" }[] = level.map((n) => ({
        n,
        w: nameWidth(n.display_name),
        kind: "node",
      }));
      if (canEdit) items.push({ n: null, w: 52, kind: "add" });
      const widths = items.map((i) => i.w);
      const pack = packRows(widths, maxW - 16, 10);
      const maxRow = Math.max(0, ...pack.map((p) => p.row));
      items.forEach((it, i) => {
        const p = pack[i];
        placed.push({
          n: it.n,
          x: p.x + 8,
          y: y + p.row * subRowH,
          w: it.w,
          kind: it.kind,
          gen: d + 1,
          style: it.n?.user_id
            ? BUBBLE_DOWN[d % BUBBLE_DOWN.length]
            : it.n
              ? BUBBLE_MANUAL
              : BUBBLE_MANUAL,
        });
      });
      y += (maxRow + 1) * subRowH + gapY;
    }

    if (canEdit && levelsDown.length === 0) {
      placed.push({
        n: null,
        x: cx,
        y,
        w: 64,
        kind: "add",
        gen: 1,
        style: BUBBLE_MANUAL,
      });
      y += subRowH + gapY;
    }

    // Lines: connect via_id
    const byId = new Map<string, Placed>();
    placed.forEach((p) => {
      if (p.n) byId.set(p.n.id, p);
    });
    const centreP = placed.find((p) => p.n?.id === tree.centre.id)!;
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

    placed.forEach((p) => {
      if (!p.n || p.gen === 0) return;
      const parent = p.n.via_id ? byId.get(p.n.via_id) : centreP;
      const from = parent || centreP;
      lines.push({
        x1: from.x,
        y1: from.y + (p.gen > 0 ? 14 : -14),
        x2: p.x,
        y2: p.y + (p.gen > 0 ? -10 : 14),
      });
    });
    // spouses to centre
    placed.forEach((p) => {
      if (p.n && p.gen === 0 && p.n.relation === "spouse") {
        lines.push({
          x1: centreP.x + centreW / 2 - 4,
          y1: centreP.y,
          x2: p.x - p.w / 2,
          y2: p.y,
        });
      }
    });

    return { W: maxW, H: y + 40, placed, lines, centreP };
  }, [tree, canEdit, levelsUp, levelsDown, vw]);

  return (
    <div className="flex flex-col min-h-[70vh] bg-[#fafafa] relative">
      {isSA && !isOwner && (
        <button
          type="button"
          onClick={() => setSaEditMode((v) => !v)}
          className={`absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold shadow border ${
            saEditMode ? "bg-amber-400 text-white border-amber-500" : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          <Pencil size={12} />
          {saEditMode ? "Edit ON" : "Edit"}
        </button>
      )}

      <div className="px-4 pt-3 pb-1 flex justify-between shrink-0">
        <p className="text-sm font-semibold text-gray-800 pl-14 sm:pl-0">
          {lang === "hi" ? "वंशावली" : "Vanshawali"}
        </p>
        <p className="text-[10px] text-gray-400">{canEdit ? "Edit" : "View"}</p>
      </div>

      {loading && <p className="text-center text-gray-400 py-20">Loading…</p>}

      <div ref={wrapRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-36 w-full">
        {!loading && tree && layout && (
          <div className="relative mx-auto" style={{ width: layout.W, height: layout.H }}>
            <svg className="absolute inset-0 pointer-events-none" width={layout.W} height={layout.H}>
              {layout.lines.map((ln, i) => (
                <path
                  key={i}
                  d={curve(ln.x1, ln.y1, ln.x2, ln.y2)}
                  fill="none"
                  stroke="#E8A317"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {layout.placed.map((p, i) => {
              if (p.kind === "add") {
                const isUp = p.gen < 0;
                const isSpouse = p.gen === 0;
                return (
                  <button
                    key={`add-${i}`}
                    type="button"
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[10px] border border-dashed border-amber-400 bg-amber-50 px-2 py-1 rounded-full text-amber-800 whitespace-nowrap"
                    style={{ left: p.x, top: p.y }}
                    onClick={() => {
                      if (isSpouse) openAdd("spouse");
                      else if (isUp) openAdd("father");
                      else openAdd("child");
                    }}
                  >
                    + {isSpouse ? L.spouse : isUp ? "Parent" : L.child}
                  </button>
                );
              }
              const n = p.n!;
              const isSelf = n.relation === "self" || n.id === tree.centre.id;
              const st = isSelf ? BUBBLE_SELF : p.style;
              return (
                <div
                  key={n.id + "-" + i}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: p.x, top: p.y }}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(n)}
                    className="px-2.5 py-1.5 rounded-lg shadow-sm text-[12px] font-semibold border whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{
                      maxWidth: Math.min(p.w, vw - 24),
                      background: st.bg,
                      borderColor: st.border,
                      color: st.text,
                    }}
                  >
                    {isSelf && n.photo_url ? (
                      <span className="inline-flex items-center gap-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={n.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        {n.display_name}
                      </span>
                    ) : (
                      n.display_name
                    )}
                  </button>
                  <p className="text-[8px] text-gray-500 mt-0.5 whitespace-nowrap">
                    {lbl(lang, n.relation, n.gender)}
                    {n.age != null ? ` · ${n.age}` : ""}
                  </p>
                  {canEdit && !isSelf && (
                    <button
                      type="button"
                      className="mx-auto mt-0.5 w-5 h-5 rounded-full bg-white border border-amber-200 text-amber-700 flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAdd(p.gen < 0 ? "father" : "child", n.id);
                      }}
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD sheet */}
      {draft && canEdit && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center" onClick={() => setDraft(null)}>
          <div className="w-full max-w-sm mx-3 mb-6 bg-white rounded-3xl p-4 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <p className="font-bold">{lang === "hi" ? "रिश्तेदार जोड़ें" : "Add relative"}</p>
              <button type="button" onClick={() => setDraft(null)}><X size={18} className="text-gray-400" /></button>
            </div>
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
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm bg-gray-50"
                placeholder="Search member…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setDraft({ ...draft, member_user_id: null });
                }}
              />
            </div>
            {hits.map((h) => (
              <button
                key={h.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 rounded-lg"
                onClick={() => {
                  setDraft({ ...draft, member_user_id: h.id, name: h.full_name });
                  setQ(h.full_name);
                  setHits([]);
                }}
              >
                {h.full_name}
              </button>
            ))}
            {!draft.member_user_id && (
              <>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  placeholder="Full name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
                <input
                  className="w-full px-3 py-2.5 rounded-xl border text-sm"
                  placeholder="Birth year"
                  inputMode="numeric"
                  value={draft.birth_year}
                  onChange={(e) =>
                    setDraft({ ...draft, birth_year: e.target.value.replace(/\D/g, "").slice(0, 4) })
                  }
                />
              </>
            )}
            <button type="button" disabled={saving} onClick={saveAdd} className="w-full py-3 rounded-2xl bg-amber-400 text-white font-bold text-sm">
              {saving ? "…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/25 flex items-end sm:items-center justify-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm mx-3 mb-8 bg-white rounded-3xl p-4 shadow-2xl space-y-1" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold break-words">{selected.display_name}</p>
            <p className="text-xs text-gray-500 mb-2">
              {lbl(lang, selected.relation, selected.gender)}
              {selected.age != null ? ` · ${selected.age}` : ""}
            </p>
            {selected.user_id && (
              <>
                <button type="button" className="w-full flex items-center gap-2 px-3 py-3 text-sm font-medium hover:bg-gray-50 rounded-xl" onClick={() => { router.push(`/vanshawali?user=${selected.user_id}`); setSelected(null); }}>
                  <Focus size={16} className="text-amber-500" /> Their tree
                </button>
                <button type="button" className="w-full flex items-center gap-2 px-3 py-3 text-sm font-medium hover:bg-gray-50 rounded-xl" onClick={() => { router.push(`/member/${selected.user_id}`); setSelected(null); }}>
                  <User size={16} className="text-amber-500" /> Profile
                </button>
              </>
            )}
            {canEdit && selected.relation !== "self" && selected.link_id && (
              <button type="button" className="w-full flex items-center gap-2 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl" onClick={() => removeLink(selected)}>
                <Trash2 size={16} /> Remove
              </button>
            )}
            <button type="button" className="w-full py-2 text-sm text-gray-400" onClick={() => setSelected(null)}>Close</button>
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

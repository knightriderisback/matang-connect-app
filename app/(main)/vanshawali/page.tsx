"use client";
/**
 * God-level hierarchical family map:
 * - Centre fixed; spouse RIGHT same row (horizontal link only)
 * - Children ALWAYS under centre (never under spouse)
 * - Parents above centre; grandparents stacked above each parent (column)
 * - Infinite gens; gen-coloured bubbles; vertical scroll only
 * - Full single-line names; no crossing trunk lines
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

type BubbleStyle = { bg: string; border: string; text: string };

const UP: BubbleStyle[] = [
  { bg: "rgba(167,139,250,0.55)", border: "rgba(139,92,246,0.55)", text: "#4c1d95" },
  { bg: "rgba(96,165,250,0.55)", border: "rgba(59,130,246,0.5)", text: "#1e3a8a" },
  { bg: "rgba(45,212,191,0.5)", border: "rgba(20,184,166,0.5)", text: "#134e4a" },
  { bg: "rgba(251,191,36,0.45)", border: "rgba(245,158,11,0.5)", text: "#78350f" },
  { bg: "rgba(251,113,133,0.45)", border: "rgba(244,63,94,0.45)", text: "#881337" },
];
const DOWN: BubbleStyle[] = [
  { bg: "rgba(52,211,153,0.55)", border: "rgba(16,185,129,0.5)", text: "#064e3b" },
  { bg: "rgba(251,146,60,0.55)", border: "rgba(249,115,22,0.5)", text: "#7c2d12" },
  { bg: "rgba(244,114,182,0.5)", border: "rgba(236,72,153,0.45)", text: "#831843" },
  { bg: "rgba(129,140,248,0.5)", border: "rgba(99,102,241,0.45)", text: "#312e81" },
  { bg: "rgba(56,189,248,0.5)", border: "rgba(14,165,233,0.45)", text: "#0c4a6e" },
];
const SELF: BubbleStyle = { bg: "#F5B942", border: "#D97706", text: "#fff" };
const SPOUSE: BubbleStyle = { bg: "rgba(167,139,250,0.65)", border: "rgba(124,58,237,0.5)", text: "#4c1d95" };

function lbl(lang: string, key: string, gender?: string | null) {
  const L = REL[lang] || REL.en;
  if (key === "child") {
    if (gender === "female" || gender === "F") return L.daughter;
    if (gender === "male" || gender === "M") return L.son;
  }
  return L[key] || key;
}

function nw(name: string, max = 150) {
  return Math.min(max, Math.max(52, Math.round(Math.max((name || "?").length, 3) * 7.5 + 22)));
}

/** Orthogonal connector: vertical then horizontal then vertical — no diagonal mess */
function orthoPath(x1: number, y1: number, x2: number, y2: number) {
  const midY = (y1 + y2) / 2;
  return `M${x1} ${y1} L${x1} ${midY} L${x2} ${midY} L${x2} ${y2}`;
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
  const [saving, setSaving] = useState(false);

  const L = useMemo(() => REL[lang] || REL.en, [lang]);
  const canEdit = apiCanEdit && (isOwner || (isSA && saEditMode));
  const levelsUp = tree?.levels_up || [];
  const levelsDown = tree?.levels_down || [];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVw(Math.max(300, el.clientWidth)));
    ro.observe(el);
    setVw(Math.max(300, el.clientWidth));
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
      fetch(`/api/vanshawali/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d) => setHits(d.users || []))
        .catch(() => setHits([]));
    }, 280);
    return () => clearTimeout(t);
  }, [q, draft]);

  const saveAdd = async () => {
    if (!draft) return;
    if (!draft.member_user_id && !draft.name.trim()) {
      toast("Name or search required", "error");
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
    if (!confirm("Remove relation?")) return;
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

  /**
   * Hierarchical layout:
   * 1. Place centre at (cx, yMid)
   * 2. Spouse to the RIGHT of centre, same Y
   * 3. Parents row above centre — father left, mother right of cx
   * 4. Higher ancestors: above their child (column alignment by via_id)
   * 5. Children row BELOW centre, centered on cx (ignore spouse)
   * 6. Deeper descendants under their parent column
   */
  const layout = useMemo(() => {
    if (!tree) return null;

    const pad = 12;
    const W = vw;
    const cx = W / 2;
    const rowGap = 56;
    const bubbleH = 36;

    type P = {
      id: string;
      n: Node | null;
      x: number;
      y: number;
      w: number;
      kind: "node" | "add";
      gen: number;
      style: BubbleStyle;
      addRel?: string;
      addCentre?: string;
    };

    const placed: P[] = [];
    const pos = new Map<string, { x: number; y: number; w: number }>();

    // —— Centre ——
    const centreW = nw(tree.centre.display_name, 170) + (tree.centre.photo_url ? 26 : 0);
    // yMid computed after ancestors height
    // First measure ancestor depth
    const upDepth = levelsUp.length;
    let yCursor = pad + 8;

    // Place UP levels from farthest to nearest, column-aligned
    // Strategy: for each parent of centre, allocate a column; grandparents stack in that column
    const parents = [...(levelsUp[0] || [])].sort((a, b) => {
      const ra = a.relation === "father" ? 0 : a.relation === "mother" ? 1 : 2;
      const rb = b.relation === "father" ? 0 : b.relation === "mother" ? 1 : 2;
      return ra - rb;
    });

    // Column X for each person id (built bottom-up from parents)
    const colX = new Map<string, number>();
    const parentCount = Math.max(parents.length, 1);
    const parentSpan = Math.min(W - 40, parentCount * 130);
    parents.forEach((p, i) => {
      const x =
        parentCount === 1
          ? cx
          : cx - parentSpan / 2 + (i * parentSpan) / (parentCount - 1);
      colX.set(p.id, x);
    });

    // Higher gens: group by via_id under parent columns
    for (let d = upDepth - 1; d >= 1; d--) {
      const level = levelsUp[d] || [];
      // group by via
      const groups = new Map<string, Node[]>();
      level.forEach((n) => {
        const k = n.via_id || "_";
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(n);
      });
      let maxH = bubbleH;
      groups.forEach((nodes, via) => {
        const baseX = colX.get(via) ?? cx;
        const sorted = [...nodes].sort((a, b) => {
          const ra = a.relation === "father" ? 0 : 1;
          const rb = b.relation === "father" ? 0 : 1;
          return ra - rb;
        });
        const widths = sorted.map((n) => nw(n.display_name));
        const total = widths.reduce((s, w) => s + w, 0) + 8 * (sorted.length - 1);
        let x0 = baseX - total / 2;
        sorted.forEach((n, i) => {
          const w = widths[i];
          const x = x0 + w / 2;
          x0 += w + 8;
          colX.set(n.id, x);
          placed.push({
            id: n.id,
            n,
            x,
            y: yCursor,
            w,
            kind: "node",
            gen: -(d + 1),
            style: UP[d % UP.length],
          });
          pos.set(n.id, { x, y: yCursor, w });
        });
      });
      yCursor += maxH + rowGap - 8;
    }

    // Parents row
    const yParents = yCursor;
    parents.forEach((p) => {
      const w = nw(p.display_name);
      const x = colX.get(p.id) ?? cx;
      placed.push({
        id: p.id,
        n: p,
        x,
        y: yParents,
        w,
        kind: "node",
        gen: -1,
        style: UP[0],
      });
      pos.set(p.id, { x, y: yParents, w });
    });
    if (canEdit) {
      placed.push({
        id: "add-parent",
        n: null,
        x: cx + parentSpan / 2 + 40,
        y: yParents,
        w: 56,
        kind: "add",
        gen: -1,
        style: UP[0],
        addRel: parents.some((p) => p.relation === "father") ? "mother" : "father",
      });
    }
    yCursor = yParents + bubbleH + rowGap;

    // —— Centre + Spouse (same row) ——
    const yMid = yCursor;
    const centreX = Math.min(cx - ((tree.spouses || []).length ? 30 : 0), W - 100);
    placed.push({
      id: tree.centre.id,
      n: tree.centre,
      x: centreX,
      y: yMid,
      w: centreW,
      kind: "node",
      gen: 0,
      style: SELF,
    });
    pos.set(tree.centre.id, { x: centreX, y: yMid, w: centreW });

    let spouseX = centreX + centreW / 2 + 20;
    (tree.spouses || []).forEach((s, i) => {
      const w = nw(s.display_name);
      const x = spouseX + w / 2;
      // keep on screen
      const finalX = Math.min(x, W - w / 2 - pad);
      placed.push({
        id: s.id,
        n: s,
        x: finalX,
        y: yMid,
        w,
        kind: "node",
        gen: 0,
        style: SPOUSE,
      });
      pos.set(s.id, { x: finalX, y: yMid, w });
      spouseX = finalX + w / 2 + 12;
    });
    if (canEdit && (tree.spouses || []).length < 2) {
      placed.push({
        id: "add-spouse",
        n: null,
        x: Math.min(spouseX + 28, W - 40),
        y: yMid,
        w: 60,
        kind: "add",
        gen: 0,
        style: SPOUSE,
        addRel: "spouse",
      });
    }
    yCursor = yMid + bubbleH + rowGap;

    // —— DOWN: children centered under CENTRE only ——
    // Assign column under each parent for deeper gens
    const downCol = new Map<string, number>();
    downCol.set(tree.centre.id, centreX);

    for (let d = 0; d < levelsDown.length; d++) {
      const level = levelsDown[d] || [];
      // group by via_id
      const groups = new Map<string, Node[]>();
      level.forEach((n) => {
        const k = n.via_id || tree.centre.id;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(n);
      });

      // For depth 0, force via = centre
      if (d === 0) {
        groups.clear();
        groups.set(tree.centre.id, level);
      }

      let rowMaxY = yCursor;
      groups.forEach((nodes, via) => {
        const baseX = downCol.get(via) ?? centreX;
        const widths = nodes.map((n) => nw(n.display_name));
        const total = widths.reduce((s, w) => s + w, 0) + 10 * Math.max(0, nodes.length - 1);
        // clamp group into screen
        let start = baseX - total / 2;
        if (start < pad) start = pad;
        if (start + total > W - pad) start = Math.max(pad, W - pad - total);

        let x0 = start;
        nodes.forEach((n, i) => {
          const w = widths[i];
          const x = x0 + w / 2;
          x0 += w + 10;
          downCol.set(n.id, x);
          placed.push({
            id: n.id,
            n,
            x,
            y: yCursor,
            w,
            kind: "node",
            gen: d + 1,
            style: DOWN[d % DOWN.length],
          });
          pos.set(n.id, { x, y: yCursor, w });
        });
      });

      if (canEdit && d === levelsDown.length - 1) {
        // add child under centre
        placed.push({
          id: `add-child-${d}`,
          n: null,
          x: centreX,
          y: yCursor + bubbleH + 6,
          w: 56,
          kind: "add",
          gen: d + 1,
          style: DOWN[d % DOWN.length],
          addRel: "child",
          addCentre: d === 0 ? undefined : undefined,
        });
        rowMaxY = yCursor + bubbleH + 28;
      }

      // per-node + for extend
      if (canEdit) {
        level.forEach((n) => {
          const p = pos.get(n.id);
          if (p) {
            placed.push({
              id: `add-under-${n.id}`,
              n: null,
              x: p.x,
              y: p.y + 28,
              w: 22,
              kind: "add",
              gen: d + 1,
              style: DOWN[d % DOWN.length],
              addRel: "child",
              addCentre: n.id,
            });
          }
        });
      }

      yCursor += bubbleH + rowGap + (canEdit ? 14 : 0);
    }

    if (canEdit && levelsDown.length === 0) {
      placed.push({
        id: "add-child-0",
        n: null,
        x: centreX,
        y: yCursor,
        w: 56,
        kind: "add",
        gen: 1,
        style: DOWN[0],
        addRel: "child",
      });
      yCursor += 40;
    }

    // —— Lines (orthogonal, no cross trunk) ——
    const lines: { d: string; spouse?: boolean }[] = [];

    // ancestors → their child (via)
    placed.forEach((p) => {
      if (!p.n || p.gen >= 0) return;
      const via = p.n.via_id;
      const target = via ? pos.get(via) : pos.get(tree.centre.id);
      if (!target) return;
      // from bottom of ancestor to top of target
      lines.push({
        d: orthoPath(p.x, p.y + 14, target.x, target.y - 14),
      });
    });

    // parents already connected via via_id; for parents via is centre conceptually
    parents.forEach((p) => {
      const from = pos.get(p.id);
      const to = pos.get(tree.centre.id);
      if (from && to) {
        lines.push({ d: orthoPath(from.x, from.y + 14, to.x, to.y - 14) });
      }
    });

    // spouse — horizontal only
    (tree.spouses || []).forEach((s) => {
      const sp = pos.get(s.id);
      const c = pos.get(tree.centre.id);
      if (sp && c) {
        const x1 = c.x + c.w / 2;
        const x2 = sp.x - sp.w / 2;
        lines.push({
          d: `M${x1} ${c.y} L${x2} ${sp.y}`,
          spouse: true,
        });
      }
    });

    // descendants → parent (via), depth 0 → centre
    levelsDown.forEach((level, d) => {
      level.forEach((n) => {
        const child = pos.get(n.id);
        if (!child) return;
        const parentId = d === 0 ? tree.centre.id : n.via_id || tree.centre.id;
        const parent = pos.get(parentId);
        if (!parent) return;
        lines.push({
          d: orthoPath(parent.x, parent.y + 14, child.x, child.y - 14),
        });
      });
    });

    // Deduplicate parent→centre if double-added
    const uniq = Array.from(new Set(lines.map((l) => l.d))).map((d) => ({
      d,
      spouse: lines.find((l) => l.d === d)?.spouse,
    }));

    return { W, H: yCursor + 48, placed, lines: uniq, centreX };
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
                  d={ln.d}
                  fill="none"
                  stroke="#E8A317"
                  strokeWidth={ln.spouse ? 2 : 2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>

            {layout.placed.map((p) => {
              if (p.kind === "add") {
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[10px] border border-dashed border-amber-400 bg-white px-2 py-0.5 rounded-full text-amber-800 whitespace-nowrap shadow-sm"
                    style={{ left: p.x, top: p.y }}
                    onClick={() => openAdd(p.addRel || "child", p.addCentre)}
                  >
                    +
                  </button>
                );
              }
              const n = p.n!;
              const isSelf = n.id === tree.centre.id;
              return (
                <div
                  key={p.id}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: p.x, top: p.y }}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(n)}
                    className="px-2.5 py-1.5 rounded-lg shadow-sm text-[12px] font-semibold border whitespace-nowrap"
                    style={{
                      maxWidth: Math.min(p.w + 4, vw - 24),
                      background: p.style.bg,
                      borderColor: p.style.border,
                      color: p.style.text,
                    }}
                  >
                    {isSelf && n.photo_url ? (
                      <span className="inline-flex items-center gap-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={n.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                        {n.display_name}
                      </span>
                    ) : (
                      n.display_name
                    )}
                  </button>
                  <p className="text-[8px] text-gray-500 mt-0.5 whitespace-nowrap">
                    {lbl(lang, isSelf ? "self" : n.relation, n.gender)}
                    {n.age != null ? ` · ${n.age}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {draft && canEdit && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center" onClick={() => setDraft(null)}>
          <div className="w-full max-w-sm mx-3 mb-6 bg-white rounded-3xl p-4 shadow-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <p className="font-bold">Add relative</p>
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
